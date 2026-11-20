import nodemailer from "nodemailer";
import "../config/env";
import { HttpError } from "../http";

export const hasSmtpCredentials = () =>
  !!process.env.SMTP_USER?.trim() && !!process.env.SMTP_PASS?.trim();
export function createMailer() {
  if (!hasSmtpCredentials())
    throw new HttpError(503, "El servicio de correo no está configurado.");
  return nodemailer.createTransport({
    host: process.env.SMTP_HOST || "smtp.gmail.com",
    port: Number(process.env.SMTP_PORT) || 465,
    secure: true,
    auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS },
    connectionTimeout: 8000,
    greetingTimeout: 8000,
    socketTimeout: 10000,
    logger: false,
    debug: false,
  });
}
export function otpEmail(code: string) {
  if (!/^\d{6}$/.test(code)) throw new Error("Código OTP inválido.");
  return {
    subject: "Tu código de verificación de MaquetaGo",
    text: `Tu código de MaquetaGo es ${code}. Vence en 10 minutos. No lo compartas. Si no solicitaste este acceso, ignora este correo.`,
    html: `<!doctype html><html lang="es"><body style="margin:0;padding:24px;background:#F8FAFC;font-family:Arial,sans-serif;color:#0F2537"><table role="presentation" style="width:100%;max-width:560px;margin:auto;border:1px solid #E2E8F0;border-radius:10px;background:#FFFFFF;border-spacing:0;overflow:hidden"><tr><td style="padding:26px;background:#0F2537;color:white;font-size:26px;font-weight:bold">Maqueta<span style="color:#00A896">Go</span><p style="font-size:10px;letter-spacing:2px;font-weight:normal;margin:10px 0 0">MOVILIDAD PARA ARQUITECTURA</p></td></tr><tr><td style="padding:28px"><h1 style="font-size:22px;margin:0 0 14px">Verifica tu correo institucional</h1><p style="font-size:14px;line-height:22px;color:#475569">Usa este código para continuar de forma segura en MaquetaGo:</p><div style="padding:22px 12px;margin:24px 0;border:1px solid #00A896;border-radius:8px;background:#F0FDFA;text-align:center;font-size:34px;letter-spacing:7px;font-weight:bold;color:#0F2537">${code}</div><p style="font-size:14px;line-height:22px">El código vence en <strong>10 minutos</strong>. No lo compartas con nadie.</p><p style="font-size:12px;line-height:20px;color:#64748B">Si no solicitaste este acceso, puedes ignorar este correo.</p></td></tr><tr><td style="padding:18px 28px;border-top:1px solid #E2E8F0;font-size:11px;color:#64748B">MaquetaGo · Traslado especializado de maquetas</td></tr></table></body></html>`,
  };
}
export async function sendOtpEmail(email: string, code: string) {
  try {
    const result = await createMailer().sendMail({
      from: process.env.SMTP_FROM || {
        name: "MaquetaGo",
        address: process.env.SMTP_USER!,
      },
      to: email,
      ...otpEmail(code),
    });
    if (!result.accepted?.length) throw new Error("Correo rechazado por SMTP.");
  } catch {
    throw new HttpError(
      503,
      "No pudimos enviar el código a tu correo. Inténtalo nuevamente en unos momentos.",
    );
  }
}
