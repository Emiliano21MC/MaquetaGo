import { createMailer } from "../src/services/mailer";
async function main() {
  const mailer = createMailer();
  try {
    await mailer.verify();
    console.log(
      "SMTP: conexión TLS y autenticación verificadas. No se enviaron correos.",
    );
  } finally {
    mailer.close();
  }
}
main().catch((error) => {
  const code =
    error && typeof error === "object" && "code" in error
      ? String(error.code)
      : "ERROR";
  console.error(`SMTP: no se pudo verificar la conexión (${code}).`);
  process.exitCode = 1;
});
