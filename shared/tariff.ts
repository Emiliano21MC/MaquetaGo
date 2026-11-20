export type ModelSize = "SMALL" | "MEDIUM" | "LARGE";
import {
  ActivePlan,
  isSubscriptionActive,
  MICRO_INSURANCE_FEE,
} from "./subscriptions";
export const round = (value: number) =>
  Math.round((value + Number.EPSILON) * 10) / 10;
export function time24(time: string) {
  const match = /^(\d{1,2}):(\d{2})(?:\s(AM|PM))?$/.exec(time);
  if (!match) throw new Error("Hora inválida");
  let hour = Number(match[1]);
  const minute = Number(match[2]);
  if (minute > 59 || (match[3] ? hour < 1 || hour > 12 : hour > 23))
    throw new Error("Hora inválida");
  if (match[3]) hour = (hour % 12) + (match[3] === "PM" ? 12 : 0);
  return `${String(hour).padStart(2, "0")}:${match[2]}`;
}
export function peakHour(time: string) {
  const hour = Number(time24(time).split(":")[0]);
  return (hour >= 7 && hour < 9) || (hour >= 17 && hour < 20);
}
export function tariff(input: {
  km: number;
  baseMinutes: number;
  size: ModelSize;
  time: string;
  promoUsed: boolean;
  verified: boolean;
  subscription?: ActivePlan | null;
  insuranceSelected?: boolean;
  insuranceFee?: number;
  now?: number;
  trafficMinutes?: number;
}) {
  const now = input.now ?? Date.now();
  const peak = peakHour(input.time);
  const trafficMinutes =
    input.trafficMinutes ?? Math.round(input.baseMinutes * (peak ? 1.35 : 1));
  const baseRate = 8;
  const distanceRate = round(input.km * 1.8);
  const trafficRate = round(trafficMinutes * 0.25);
  const sizeFee = { SMALL: 0, MEDIUM: 3, LARGE: 6 }[input.size];
  const subtotal = round(baseRate + distanceRate + trafficRate + sizeFee);
  const active = isSubscriptionActive(input.subscription, now);
  const promotional = !active && !input.promoUsed && input.verified;
  const discountPercent = active
    ? input.subscription!.discountPercent
    : promotional
      ? 80
      : 0;
  const cents = (value: number) =>
    Math.round((value + Number.EPSILON) * 100) / 100;
  const discount = cents((subtotal * discountPercent) / 100);
  const insuranceFee = input.insuranceSelected
    ? (input.insuranceFee ?? MICRO_INSURANCE_FEE)
    : 0;
  return {
    baseRate,
    distanceRate,
    trafficRate,
    trafficMinutes,
    peak,
    sizeFee,
    subtotal,
    discount,
    total: cents(subtotal - discount + insuranceFee),
    covered: false,
    promotional,
    discountPercent,
    discountKind: active
      ? ("PLAN" as const)
      : promotional
        ? ("FIRST_TRIP" as const)
        : ("REGULAR" as const),
    insuranceFee,
    insuranceSelected: !!input.insuranceSelected,
    insuranceLimit: input.insuranceSelected
      ? active
        ? input.subscription!.insuranceLimit
        : 150
      : 0,
  };
}
export function haversine(
  lat: number,
  lng: number,
  destLat = -12.0692,
  destLng = -77.0794,
) {
  const radians = (n: number) => (n * Math.PI) / 180;
  const a =
    Math.sin(radians(destLat - lat) / 2) ** 2 +
    Math.cos(radians(lat)) *
      Math.cos(radians(destLat)) *
      Math.sin(radians(destLng - lng) / 2) ** 2;
  return 6371 * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}
