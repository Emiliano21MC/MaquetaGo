import { createHmac, randomInt } from "node:crypto";
import { env } from "../config/env";
import { hasSmtpCredentials, sendOtpEmail } from "./mailer";
export const otpHash = (email: string, code: string) =>
  createHmac("sha256", env.jwt).update(`${email}:${code}`).digest("hex");
export const generateOtp = () => String(randomInt(100000, 1000000));
export async function deliverOtp(
  email: string,
  code: string,
): Promise<{ devCode: string | null }> {
  if (hasSmtpCredentials()) {
    await sendOtpEmail(email, code);
    return { devCode: null };
  }
  if (env.production) throw new Error("SMTP requerido en producción.");
  return { devCode: code };
}
