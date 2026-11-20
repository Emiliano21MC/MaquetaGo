import dotenv from "dotenv";
import path from "node:path";
import { existsSync } from "node:fs";
// Resolve backend/.env from both source and compiled output, independently of cwd.
const envFile = [
  path.resolve(__dirname, "../..", ".env"),
  path.resolve(__dirname, "../../../..", ".env"),
].find((file) => existsSync(file));
if (envFile) dotenv.config({ path: envFile, quiet: true });
export const backendRoot = envFile ? path.dirname(envFile) : path.resolve(__dirname,"../..");
const localOrigins = [
  "http://localhost:8081",
  "http://localhost:8082",
  "http://localhost:8083",
  "http://localhost:19006",
];
const configuredOrigins = (process.env.CORS_ORIGINS || "")
  .split(",")
  .map((origin) => origin.trim())
  .filter(Boolean);
export const env = {
  port: Number(process.env.PORT || 3001),
  host: process.env.HOST || "127.0.0.1",
  dbHost: process.env.DB_HOST || "127.0.0.1",
  dbPort: Number(process.env.DB_PORT || 3306),
  dbUser: process.env.DB_USER || "root",
  dbPassword: process.env.DB_PASSWORD || "",
  dbName: process.env.DB_NAME || "maquetago_db",
  dbSsl: process.env.DB_SSL ? process.env.DB_SSL === "true" : /\.rds\.amazonaws\.com$/.test(process.env.DB_HOST || ""),
  dbSslCaFile: process.env.DB_SSL_CA_FILE || "certs/aws-rds-us-east-1-bundle.pem",
  dbInitOnStart: process.env.DB_INIT_ON_START !== "false",
  jwt: process.env.JWT_SECRET || "",
  production: process.env.NODE_ENV === "production",
  corsOrigins: [
    ...new Set([
      ...(process.env.NODE_ENV === "production" ? [] : localOrigins),
      ...configuredOrigins,
    ]),
  ],
  maps: process.env.GOOGLE_MAPS_API_KEY || "",
  otpDelivery:
    process.env.SMTP_USER?.trim() && process.env.SMTP_PASS?.trim()
      ? "smtp"
      : "console",
  paymentMode: process.env.PAYMENT_MODE || "disabled",
  googleClientId: (process.env.GOOGLE_CLIENT_ID || "").trim(),
  googleClientSecret: process.env.GOOGLE_CLIENT_SECRET || "",
  googleIds: [
    ...new Set(
      [
        process.env.GOOGLE_CLIENT_ID || "",
        ...(process.env.GOOGLE_CLIENT_IDS || "").split(","),
      ]
        .map((value) => value.trim())
        .filter(Boolean),
    ),
  ],
};
if (env.jwt.length < 32)
  throw new Error("Configura JWT_SECRET con al menos 32 caracteres");
if (
  env.production &&
  (env.otpDelivery === "console" || env.paymentMode === "local")
)
  throw new Error("Producción requiere entrega SMTP y un proveedor de pagos");
