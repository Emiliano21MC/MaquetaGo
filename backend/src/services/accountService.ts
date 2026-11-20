import { DB, rows } from "../config/db";
export function planModel(row: Record<string, unknown>) {
  return {
    id: String(row.code).toLowerCase(),
    name: String(row.name),
    price: Number(row.price_pen),
    rides: Number(row.included_rides),
    validityDays: Number(row.validity_days),
    period: String(row.period_label),
    badge: row.badge_text || undefined,
    insuranceLimit: Number(row.insurance_limit_pen),
    discountPercent: Number(row.discount_percent),
    highlight: `${row.discount_percent}% de descuento en cada traslado`,
  };
}
export function locationModel(row: Record<string, unknown>) {
  return {
    address: String(row.sample_address),
    district: String(row.district_name),
    km: Number(row.distance_km_to_pucp),
    min: Number(row.base_duration_min),
    latitude: Number(row.latitude),
    longitude: Number(row.longitude),
    x: Number(row.map_x),
    y: Number(row.map_y),
  };
}
export async function activeSubscription(db: DB, studentId: number) {
  const [sub] = await rows(
    db,
    "SELECT s.*,p.*,s.id AS subscription_id FROM student_subscriptions s JOIN subscription_plans p ON p.id=s.plan_id WHERE s.student_id=? AND s.is_active=1 AND s.start_date<=DATE(CONVERT_TZ(UTC_TIMESTAMP(),'+00:00','-05:00')) AND s.end_date>=DATE(CONVERT_TZ(UTC_TIMESTAMP(),'+00:00','-05:00')) ORDER BY s.id DESC LIMIT 1",
    [studentId],
  );
  return sub
    ? {
        ...planModel(sub),
        dbId: sub.subscription_id,
        status: "ACTIVE" as const,
        startsAt: new Date(`${sub.start_date}T00:00:00-05:00`).getTime(),
        remainingRides: sub.remaining_rides,
        expiresAt: new Date(`${sub.end_date}T23:59:59-05:00`).getTime(),
      }
    : null;
}
export async function getAccount(db: DB, id: number) {
  const [s] = await rows(
    db,
    "SELECT id,full_name,institutional_email,is_verified_pucp,promo_80_used,plans_unlocked FROM students WHERE id=?",
    [id],
  );
  if (!s) throw new Error("Estudiante no encontrado");
  const subscription = await activeSubscription(db, id);
  const trips = await rows(
    db,
    `SELECT t.*,r.stars,r.praise_tags,r.comment FROM trips t LEFT JOIN trip_ratings r ON r.trip_id=t.id WHERE t.student_id=? ORDER BY t.id DESC`,
    [id],
  );
  const photos = await rows(
    db,
    "SELECT p.trip_id,p.stage,p.captured_location,p.captured_at,p.verified,SHA2(p.photo_url,256) AS revision FROM safety_photo_acts p JOIN trips t ON t.id=p.trip_id WHERE t.student_id=?",
    [id],
  );
  const [setting] = await rows(
    db,
    "SELECT numeric_value FROM app_settings WHERE setting_key='MICRO_INSURANCE_FEE'",
  );
  return {
    promo_80_used: !!s.promo_80_used,
    plans_unlocked: !!s.plans_unlocked,
    active_subscription: subscription,
    pricing: { microInsuranceFee: Number(setting?.numeric_value ?? 2) },
    user: {
      id: s.id,
      name: s.full_name,
      email: s.institutional_email,
      verified: !!s.is_verified_pucp,
    },
    promoUsed: !!s.promo_80_used,
    plansUnlocked: !!s.plans_unlocked,
    subscription,
    trips: trips.map((t) => ({
      id: String(t.id),
      code: t.reservation_code,
      pickup: {
        address: t.pickup_address,
        district: t.pickup_district,
        latitude: t.pickup_lat,
        longitude: t.pickup_lng,
        km: t.distance_km,
        min: t.traffic_minutes,
        x: 112 + (t.pickup_lng + 77.0794) * 1050,
        y: 178 - (t.pickup_lat + 12.0692) * 700,
      },
      date: t.scheduled_date,
      time: t.scheduled_time,
      size: t.model_size,
      material: t.model_material,
      notes: t.care_notes || "",
      insuranceSelected: !!t.insurance_policy_code && t.insurance_limit_pen > 0,
      step: ["CONFIRMED", "AT_PICKUP", "IN_TRANSIT", "COMPLETED"].indexOf(
        t.status,
      ),
      completed: t.status === "COMPLETED",
      totalPaid: t.total_paid,
      paymentLabel: t.payment_method,
      insuranceCode: t.insurance_policy_code,
      insuranceLimit: t.insurance_limit_pen,
      fare: {
        baseRate: t.base_fare,
        distanceRate: t.distance_fare,
        trafficRate: t.traffic_fare,
        trafficMinutes: t.traffic_minutes,
        peak: !!t.is_peak_hour,
        sizeFee: t.size_fare,
        subtotal:
          Math.round(
            (t.base_fare + t.distance_fare + t.traffic_fare + t.size_fare) * 10,
          ) / 10,
        discount: t.discount_amount,
        total: t.total_paid,
        covered: t.discount_kind === "LEGACY_INCLUDED",
        promotional: t.discount_kind === "FIRST_TRIP",
        discountPercent: Number(t.discount_percent),
        discountKind: t.discount_kind,
        insuranceFee: Number(t.insurance_fee),
        insuranceSelected:
          !!t.insurance_policy_code && t.insurance_limit_pen > 0,
        insuranceLimit: t.insurance_limit_pen,
      },
      rating: t.stars || undefined,
      praise:
        typeof t.praise_tags === "string"
          ? JSON.parse(t.praise_tags)
          : t.praise_tags || [],
      ratingComment: t.comment || "",
      photos: photos
        .filter((p) => p.trip_id === t.id)
        .map((p) => ({
          stage: p.stage,
          revision: p.revision,
          uri: `/trips/${t.id}/safety-photo/${p.stage}`,
          location: p.captured_location,
          capturedAt: new Date(String(p.captured_at).replace(" ","T")+"Z").toISOString(),
          verified: !!p.verified,
        })),
    })),
  };
}
