import { activeSubscription } from "./accountService";
import { DB, rows } from "../config/db";
import { HttpError } from "../http";
import { MICRO_INSURANCE_FEE } from "../../../shared/subscriptions";
export async function requireAcademicAccess(db: DB, studentId: number) {
  if (!(await activeSubscription(db, studentId)))
    throw new HttpError(
      403,
      "Las alertas académicas requieren una suscripción activa.",
    );
}
export async function pricingSettings(db: DB) {
  const [setting] = await rows(
    db,
    "SELECT numeric_value FROM app_settings WHERE setting_key='MICRO_INSURANCE_FEE'",
  );
  return {
    microInsuranceFee: setting
      ? Number(setting.numeric_value)
      : MICRO_INSURANCE_FEE,
  };
}
