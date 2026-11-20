import { Router } from "express";
import { z } from "zod";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { timingSafeEqual } from "node:crypto";
import {
  googleTokenSchema,
  verifyGoogleIdentity,
} from "../services/googleIdentity";
import { pool, rows, transaction } from "../config/db";
import { env } from "../config/env";
import { HttpError, session } from "../http";
import { deliverOtp, generateOtp, otpHash } from "../services/otpService";
import { getAccount } from "../services/accountService";
const emailSchema = z
  .string()
  .trim()
  .toLowerCase()
  .regex(
    /^[a-z0-9._%+-]+@pucp\.edu\.pe$/,
    "Usa tu correo institucional @pucp.edu.pe.",
  )
  .max(190);
export const authRoutes = Router();
async function issue(
  email: string,
  name?: string,
  password?: string,
  recovery = false,
  google = false,
) {
  const existing = await rows(
    pool,
    "SELECT * FROM students WHERE institutional_email=?",
    [email],
  );
  let s = existing[0];
  if (
    s?.password_hash &&
    !recovery &&
    !google &&
    (!password || !(await bcrypt.compare(password, s.password_hash)))
  )
    throw new HttpError(401, "Correo o contraseña incorrectos.");
  if (
    s?.otp_requested_at &&
    Date.now() - new Date(`${s.otp_requested_at}Z`).getTime() < 60000
  )
    throw new HttpError(
      429,
      "Espera un minuto antes de solicitar otro código.",
    );
  if (!s) {
    if (!name || (!password && !google))
      throw new HttpError(
        400,
        "Ingresa tu nombre y contraseña para crear la cuenta.",
      );
    await pool.execute(
      "INSERT INTO students(full_name,institutional_email) VALUES(?,?)",
      [name, email],
    );
    [s] = await rows(
      pool,
      "SELECT * FROM students WHERE institutional_email=?",
      [email],
    );
  }
  const code = generateOtp();
  const hash = otpHash(email, code);
  const pending =
    password && (!s.password_hash || recovery)
      ? await bcrypt.hash(password, 12)
      : null;
  await pool.execute(
    "UPDATE students SET otp_code=NULL,otp_hash=?,otp_expires_at=DATE_ADD(UTC_TIMESTAMP(),INTERVAL 10 MINUTE),otp_attempts=0,otp_requested_at=UTC_TIMESTAMP(),pending_password_hash=? WHERE id=?",
    [hash, pending, s.id],
  );
  let result: { devCode: string | null };
  try {
    result = await deliverOtp(email, code);
  } catch (error) {
    await pool.execute(
      "UPDATE students SET otp_hash=NULL,otp_code=NULL,otp_expires_at=NULL,otp_requested_at=NULL,pending_password_hash=NULL WHERE id=? AND otp_hash=?",
      [s.id, hash],
    );
    throw error;
  }
  return {
    challenge: jwt.sign({ purpose: "otp" }, env.jwt, {
      subject: String(s.id),
      expiresIn: "10m",
    }),
    email,
    expiresIn: 600,
    devCode: result.devCode,
  };
}
authRoutes.post("/login-or-register", async (req, res) => {
  const body = z
    .object({
      email: emailSchema,
      name: z.string().trim().min(3).max(120).optional(),
      password: z.string().min(6).max(128).optional(),
      recovery: z.boolean().optional(),
    })
    .parse(req.body);
  res.json(await issue(body.email, body.name, body.password, body.recovery));
});
authRoutes.post("/google", async (req, res) => {
  const identity = await verifyGoogleIdentity(
    googleTokenSchema.parse(req.body),
  );
  const id = await transaction(async (db) => {
    await db.execute(
      "INSERT INTO students(full_name,institutional_email,is_verified_pucp) VALUES(?,?,1) ON DUPLICATE KEY UPDATE is_verified_pucp=1",
      [identity.name || "Estudiante PUCP", identity.email],
    );
    const [s] = await rows(
      db,
      "SELECT id FROM students WHERE institutional_email=? FOR UPDATE",
      [identity.email],
    );
    await db.execute(
      "UPDATE students SET otp_hash=NULL,otp_code=NULL,otp_expires_at=NULL,pending_password_hash=NULL WHERE id=?",
      [s.id],
    );
    return Number(s.id);
  });
  const account = await getAccount(pool, id);
  res.json({ token: session(id), user: account.user, account });
});

authRoutes.post("/verify-otp", async (req, res) => {
  const { challenge, code } = z
    .object({ challenge: z.string(), code: z.string().regex(/^\d{6}$/) })
    .parse(req.body);
  let payload;
  try {
    payload = jwt.verify(challenge, env.jwt) as jwt.JwtPayload;
    if (payload.purpose !== "otp") throw new Error();
  } catch {
    throw new HttpError(401, "El código venció. Solicita uno nuevo.");
  }
  const id = Number(payload.sub);
  const success = await transaction(async (db) => {
    const [s] = await rows(db, "SELECT * FROM students WHERE id=? FOR UPDATE", [
      id,
    ]);
    if (
      !s?.otp_hash ||
      new Date(`${s.otp_expires_at}Z`).getTime() < Date.now() ||
      s.otp_attempts >= 5
    )
      return false;
    if (
      !timingSafeEqual(
        Buffer.from(s.otp_hash),
        Buffer.from(otpHash(s.institutional_email, code)),
      )
    ) {
      await db.execute(
        "UPDATE students SET otp_attempts=otp_attempts+1 WHERE id=?",
        [id],
      );
      return false;
    }
    await db.execute(
      "UPDATE students SET is_verified_pucp=1,password_hash=COALESCE(pending_password_hash,password_hash),pending_password_hash=NULL,otp_hash=NULL,otp_code=NULL,otp_expires_at=NULL WHERE id=?",
      [id],
    );
    return true;
  });
  if (!success)
    throw new HttpError(
      401,
      "Código incorrecto o vencido. Solicita otro si agotaste tus intentos.",
    );
  res.json({ token: session(id), account: await getAccount(pool, id) });
});
