import { locations } from "@/data/limaLocations";
import { Fare, Pickup, Size, Subscription } from "@/types/models";
import { tariff, time24 } from "../../shared/tariff";
export { peakHour } from "../../shared/tariff";
export function calculateFare(
  distanceKm: number,
  size: Size,
  promoUsed: boolean,
  subscription: Subscription | null,
  now = Date.now(),
  baseMinutes = 26,
  time = "08:00 AM",
  verified = true,
  insuranceSelected = false,
  insuranceFee = 2,
): Fare {
  let validTime = time;
  try {
    time24(time);
  } catch {
    validTime = "08:00 AM";
  }
  return tariff({
    km: distanceKm,
    baseMinutes,
    size,
    time: validTime,
    promoUsed,
    subscription,
    verified,
    now,
    insuranceSelected,
    insuranceFee,
  });
}
export const money = (value: number) => `S/ ${value.toFixed(2)}`;
export function reverseGeocode(x: number, y: number): Pickup {
  x = Math.max(74, Math.min(340, x));
  y = Math.max(12, Math.min(365, y));
  const nearest = locations.reduce((a, b) =>
    Math.hypot(a.x - x, a.y - y) < Math.hypot(b.x - x, b.y - y) ? a : b,
  );
  const km = Math.max(
    1.4,
    Math.round(Math.hypot(x - 112, y - 178) * 1.48) / 10,
  );
  const number = Math.floor(120 + ((x * 7 + y * 13) % 1850));
  return {
    address: `${nearest.address.split(/\s\d/)[0]} ${number}, ${nearest.district}`,
    district: nearest.district,
    km,
    min: Math.max(6, Math.round(km * 2.1 + 4)),
    x,
    y,
    latitude: nearest.latitude - (y - nearest.y) / 700,
    longitude: nearest.longitude + (x - nearest.x) / 1050,
  };
}
