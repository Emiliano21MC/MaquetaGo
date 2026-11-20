export const PLAN_DISCOUNTS = {
  monthly: 15,
  semester: 25,
  annual: 30,
} as const;
export const MICRO_INSURANCE_FEE = 2;
export interface ActivePlan {
  discountPercent: number;
  expiresAt: number;
  startsAt?: number;
  status: "ACTIVE" | "INACTIVE";
  insuranceLimit: number;
}
export function isSubscriptionActive(
  plan: ActivePlan | null | undefined,
  now: number,
): plan is ActivePlan {
  return (
    !!plan &&
    plan.status === "ACTIVE" &&
    (plan.startsAt ?? 0) <= now &&
    plan.expiresAt > now
  );
}
