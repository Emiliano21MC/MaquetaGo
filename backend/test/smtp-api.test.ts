import { test } from "node:test";
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import nodemailer from "nodemailer";
import { app } from "../src/server";
import { pool, rows } from "../src/config/db";
import { otpHash } from "../src/services/otpService";
test("Registro y recuperación guardan OTP antes de enviarlo; sin exposición ni códigos activos tras fallo SMTP", async (t) => {
  process.env.SMTP_USER = "test-sender@example.com";
  process.env.SMTP_PASS = "test-only-password";
  const email = `test.smtp.${randomUUID()}@pucp.edu.pe`;
  let lastCode = "";
  let fail = false;
  let delivered = 0;
  t.mock.method(nodemailer, "createTransport", () => ({
    sendMail: async (mail: { text: string; to: string }) => {
      if (fail) throw new Error("SMTP failure");
      lastCode = /es (\d{6})\./.exec(mail.text)![1];
      assert.equal(mail.to, email);
      const [stored] = await rows(
        pool,
        "SELECT otp_hash,otp_code,TIMESTAMPDIFF(SECOND,UTC_TIMESTAMP(),otp_expires_at) AS remaining FROM students WHERE institutional_email=?",
        [email],
      );
      assert.equal(stored.otp_hash, otpHash(email, lastCode));
      assert.equal(stored.otp_code, null);
      assert.ok(stored.remaining >= 590 && stored.remaining <= 600);
      delivered++;
      return { accepted: [email] };
    },
  }));
  const server = app.listen(0, "127.0.0.1");
  await new Promise<void>((resolve) => server.once("listening", resolve));
  const address = server.address();
  if (!address || typeof address === "string") throw new Error();
  const base = `http://127.0.0.1:${address.port}/api/auth`;
  const call = async (path: string, body: unknown) => {
    const response = await fetch(base + path, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    return { status: response.status, data: await response.json() };
  };
  try {
    const registration = await call("/login-or-register", {
      email,
      name: "Prueba SMTP",
      password: "Test-Smtp-1234",
    });
    assert.equal(registration.status, 200);
    assert.equal(registration.data.devCode, null);
    assert.equal("developmentCode" in registration.data, false);
    assert.equal(JSON.stringify(registration.data).includes(lastCode), false);
    const verified = await call("/verify-otp", {
      challenge: registration.data.challenge,
      code: lastCode,
    });
    assert.equal(verified.status, 200);
    await pool.execute(
      "UPDATE students SET otp_requested_at=NULL WHERE institutional_email=?",
      [email],
    );
    const recovery = await call("/login-or-register", {
      email,
      password: "Changed-Test-1234",
      recovery: true,
    });
    assert.equal(recovery.status, 200);
    assert.equal(recovery.data.devCode, null);
    assert.equal(delivered, 2);
    await pool.execute(
      "UPDATE students SET otp_requested_at=NULL WHERE institutional_email=?",
      [email],
    );
    fail = true;
    const failure = await call("/login-or-register", {
      email,
      password: "Test-Smtp-1234",
    });
    assert.equal(failure.status, 503);
    assert.equal("devCode" in failure.data, false);
    const [stored] = await rows(
      pool,
      "SELECT otp_hash,otp_expires_at,otp_requested_at,pending_password_hash FROM students WHERE institutional_email=?",
      [email],
    );
    assert.equal(stored.otp_hash, null);
    assert.equal(stored.otp_expires_at, null);
    assert.equal(stored.otp_requested_at, null);
    assert.equal(stored.pending_password_hash, null);
  } finally {
    await pool.execute("DELETE FROM students WHERE institutional_email=?", [
      email,
    ]);
    await pool.end();
    await new Promise<void>((resolve) => server.close(() => resolve()));
  }
});
