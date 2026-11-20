import { test } from "node:test";
import assert from "node:assert/strict";
import nodemailer from "nodemailer";
import { createMailer, otpEmail } from "../src/services/mailer";
import { deliverOtp, generateOtp } from "../src/services/otpService";
function credentials() {
  process.env.SMTP_HOST = "smtp.gmail.com";
  process.env.SMTP_PORT = "465";
  process.env.SMTP_USER = "test-sender@example.com";
  process.env.SMTP_PASS = "test-only-password";
}
test("SMTP usa TLS, SMTP_PASS y plantilla MaquetaGo; no revela el OTP", async (t) => {
  credentials();
  let options: Record<string, unknown> | undefined;
  let message: Record<string, unknown> | undefined;
  t.mock.method(
    nodemailer,
    "createTransport",
    (config: Record<string, unknown>) => {
      options = config;
      return {
        sendMail: async (mail: Record<string, unknown>) => {
          message = mail;
          return { accepted: ["student@pucp.edu.pe"] };
        },
      };
    },
  );
  const result = await deliverOtp("student@pucp.edu.pe", "123456");
  assert.equal(result.devCode, null);
  assert.equal(JSON.stringify(result).includes("123456"), false);
  assert.equal(options?.host, "smtp.gmail.com");
  assert.equal(options?.port, 465);
  assert.equal(options?.secure, true);
  assert.deepEqual(options?.auth, {
    user: "test-sender@example.com",
    pass: "test-only-password",
  });
  assert.equal(message?.to, "student@pucp.edu.pe");
  assert.match(String(message?.html), /#0F2537/);
  assert.match(String(message?.html), /#00A896/);
  assert.match(String(message?.html), /123456/);
  assert.match(String(message?.text), /10 minutos/);
});
test("Sin credenciales SMTP se permite el código local; error SMTP nunca hace fallback", async (t) => {
  process.env.SMTP_USER = "";
  process.env.SMTP_PASS = "";
  assert.deepEqual(await deliverOtp("student@pucp.edu.pe", "654321"), {
    devCode: "654321",
  });
  credentials();
  t.mock.method(nodemailer, "createTransport", () => ({
    sendMail: async () => {
      throw new Error("SMTP unavailable");
    },
  }));
  await assert.rejects(deliverOtp("student@pucp.edu.pe", "654321"), {
    status: 503,
  });
});
test("OTP generado siempre tiene seis dígitos y la plantilla rechaza otros valores", () => {
  for (let i = 0; i < 100; i++) assert.match(generateOtp(), /^\d{6}$/);
  assert.throws(() => otpEmail("<script>"));
  process.env.SMTP_USER = "";
  process.env.SMTP_PASS = "";
  assert.throws(() => createMailer(), { status: 503 });
});
