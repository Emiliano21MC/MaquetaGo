import { validateSavedCard } from './payments';
import { quote } from '../services/tariffCalculator';
import { Router } from "express";
import { z } from "zod";
import { randomUUID } from "node:crypto";
import { ResultSetHeader } from "mysql2";
import { pool, rows, transaction } from "../config/db";
import { student, HttpError } from "../http";
import { getAccount, activeSubscription } from "../services/accountService";
import { assertPayment, paymentSchema, quoteSchema } from "./catalog";
import { time24 } from "../../../shared/tariff";
export const tripRoutes = Router();
tripRoutes.get("/:id/safety-photo/:stage", async (req, res) => {
    const stage = z
        .enum(["BEFORE_PICKUP", "AFTER_DELIVERY"])
        .parse(req.params.stage);
    const [photo] = await rows(pool, "SELECT p.photo_url FROM safety_photo_acts p JOIN trips t ON t.id=p.trip_id WHERE t.id=? AND t.student_id=? AND p.stage=?", [String(req.params.id), student(req), stage]);
    if (!photo)
        throw new HttpError(404, "Foto no encontrada.");
    res.setHeader("Cache-Control", "private, no-store");
    res.json({ uri: photo.photo_url });
});
tripRoutes.get("/", async (req, res) => res.json((await getAccount(pool, student(req))).trips));
tripRoutes.post('/quote', async (req, res) => {
    const body = z.object({ pickupLat: z.coerce.number(), pickupLng: z.coerce.number(), studentId: z.number().int().optional(), insuranceSelected: z.boolean().default(false), size: z.enum(['SMALL', 'MEDIUM', 'LARGE']).default('MEDIUM'), time: quoteSchema.shape.time.default('08:00 AM'), date: z.string().optional() }).parse(req.body);
    if (body.studentId !== undefined && body.studentId !== student(req))
        throw new HttpError(403, 'Acceso denegado.');
    res.json(await quote(pool, student(req), { latitude: body.pickupLat, longitude: body.pickupLng, ...body }));
});
tripRoutes.post("/", async (req, res) => {
    const body = paymentSchema
        .extend({
        pickup: quoteSchema.pick({ latitude: true, longitude: true }).extend({
            address: z.string().trim().min(5).max(255),
            district: z.string().min(2).max(80),
        }),
        date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
        time: z.string().max(15),
        size: z.enum(["SMALL", "MEDIUM", "LARGE"]),
        material: z.string().min(2).max(100),
        notes: z.string().max(600),
        insuranceSelected: z.boolean().default(false),
    })
        .parse(req.body);
    let normalizedTime: string;
    try {
        normalizedTime = time24(body.time);
    }
    catch {
        throw new HttpError(400, "Hora inválida.");
    }
    const day = new Date(body.date + "T12:00:00Z");
    if (!Number.isFinite(day.getTime()) ||
        day.toISOString().slice(0, 10) !== body.date)
        throw new HttpError(400, "Fecha inválida.");
    const scheduled = new Date(body.date + "T" + normalizedTime + ":00-05:00");
    if (scheduled.getTime() <= Date.now())
        throw new HttpError(400, "Elige una fecha y hora futuras.");
    const tripId = await transaction(async (db) => {
        const id = student(req);
        const [s] = await rows(db, "SELECT * FROM students WHERE id=? FOR UPDATE", [
            id,
        ]);
        if (!s.is_verified_pucp)
            throw new HttpError(403, "Verifica tu correo institucional.");
        const [existing] = await rows(db, "SELECT id FROM trips WHERE student_id=? AND request_key=?", [id, body.requestKey]);
        if (existing)
            return existing.id as number;
        const fare = await quote(db, id, {
            ...body.pickup,
            time: body.time,
            size: body.size,
            date: body.date,
            insuranceSelected: body.insuranceSelected,
        });
        if (body.method === "Suscripción")
            throw new HttpError(400, "El plan aplica un descuento. Selecciona Yape o tarjeta para pagar el traslado.");
        if (body.paymentMethodId) {
            if (body.method !== "Tarjeta")
                throw new HttpError(400, "Selecciona Tarjeta para usar una tarjeta guardada.");
            await validateSavedCard(db, id, body.paymentMethodId);
        }
        assertPayment(body.method, body.approvalCode);
        const sub = await activeSubscription(db, id);
        const [driver] = await rows(db, "SELECT id FROM drivers WHERE has_flat_platform=1 ORDER BY rating DESC LIMIT 1");
        if (!driver)
            throw new HttpError(503, "No hay unidades disponibles.");
        const code = `#MG-${randomUUID().slice(0, 8).toUpperCase()}`;
        const policy = body.insuranceSelected
            ? `#MS-${randomUUID().slice(0, 8).toUpperCase()}`
            : null;
        const [result] = await db.execute<ResultSetHeader>(`INSERT INTO trips(reservation_code,student_id,driver_id,student_subscription_id,request_key,pickup_address,pickup_district,pickup_lat,pickup_lng,destination_name,scheduled_date,scheduled_time,is_peak_hour,model_size,model_dimensions,model_material,care_notes,distance_km,traffic_minutes,base_fare,distance_fare,traffic_fare,size_fare,discount_amount,total_paid,insurance_policy_code,insurance_limit_pen,payment_method,payment_approval_code,insurance_fee,discount_percent,discount_kind) VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`, [
            code,
            id,
            driver.id,
            fare.discountKind === "PLAN" ? sub?.dbId : null,
            body.requestKey,
            body.pickup.address,
            body.pickup.district,
            body.pickup.latitude,
            body.pickup.longitude,
            "Facultad de Arquitectura y Urbanismo - PUCP",
            body.date,
            body.time,
            fare.peak,
            body.size,
            {
                SMALL: "Hasta 40 × 40 cm",
                MEDIUM: "Hasta 80 × 60 cm",
                LARGE: "Hasta 120 × 80 cm",
            }[body.size],
            body.material,
            body.notes,
            fare.km,
            fare.trafficMinutes,
            fare.baseRate,
            fare.distanceRate,
            fare.trafficRate,
            fare.sizeFee,
            fare.discount,
            fare.total,
            policy,
            fare.insuranceLimit,
            body.method,
            body.approvalCode || null,
            fare.insuranceFee,
            fare.discountPercent,
            fare.discountKind,
        ]);
        if (fare.promotional)
            await db.execute("UPDATE students SET promo_80_used=1 WHERE id=?", [id]);
        return result.insertId;
    });
    res.status(201).json({
        tripId: String(tripId),
        account: await getAccount(pool, student(req)),
    });
});
tripRoutes.post(["/:id/safety-photo", "/:id/evidence"], async (req, res) => {
    const body = z
        .object({
        stage: z.enum(["BEFORE_PICKUP", "AFTER_DELIVERY"]),
        photoUrl: z
            .string()
            .max(2000000)
            .regex(/^data:image\/(jpeg|png|webp);base64,[A-Za-z0-9+/=]+$/),
        location: z.string().min(2).max(255),
    })
        .parse(req.body);
    await transaction(async (db) => {
        const [t] = await rows(db, "SELECT * FROM trips WHERE id=? AND student_id=? FOR UPDATE", [String(req.params.id), student(req)]);
        if (!t)
            throw new HttpError(404, "Traslado no encontrado.");
        if (t.status === "COMPLETED")
            throw new HttpError(409, "El acta ya fue cerrada.");
        const [before] = await rows(db, "SELECT id FROM safety_photo_acts WHERE trip_id=? AND stage=?", [t.id, "BEFORE_PICKUP"]);
        if (body.stage === "AFTER_DELIVERY" && !before)
            throw new HttpError(409, "Registra primero el acta de recojo.");
        await db.execute("INSERT INTO safety_photo_acts(trip_id,stage,photo_url,captured_location,captured_at,verified) VALUES(?,?,?,?,UTC_TIMESTAMP(),0) ON DUPLICATE KEY UPDATE photo_url=VALUES(photo_url),captured_location=VALUES(captured_location),captured_at=UTC_TIMESTAMP(),verified=0", [t.id, body.stage, body.photoUrl, body.location]);
        const column = body.stage === "BEFORE_PICKUP" ? "before_photo_url" : "after_photo_url";
        await db.execute(`UPDATE trips SET ${column}=? WHERE id=?`, [`/trips/${t.id}/safety-photo/${body.stage}`, t.id]);
    });
    res.json(await getAccount(pool, student(req)));
});
tripRoutes.patch("/:id/status", async (req, res) => {
    const { status } = z
        .object({ status: z.enum(["AT_PICKUP", "IN_TRANSIT", "COMPLETED"]) })
        .parse(req.body);
    await transaction(async (db) => {
        const [t] = await rows(db, "SELECT * FROM trips WHERE id=? AND student_id=? FOR UPDATE", [String(req.params.id), student(req)]);
        if (!t)
            throw new HttpError(404, "Traslado no encontrado.");
        if (t.status === status)
            return;
        const order = ["CONFIRMED", "AT_PICKUP", "IN_TRANSIT", "COMPLETED"];
        if (order.indexOf(status) !== order.indexOf(t.status) + 1)
            throw new HttpError(409, "Actualiza el recorrido en orden.");
        const photos = await rows(db, "SELECT stage FROM safety_photo_acts WHERE trip_id=?", [t.id]);
        if ((status === "IN_TRANSIT" &&
            !photos.some((p) => p.stage === "BEFORE_PICKUP")) ||
            (status === "COMPLETED" && photos.length < 2))
            throw new HttpError(409, "Completa las actas fotográficas para continuar.");
        await db.execute("UPDATE trips SET status=? WHERE id=?", [status, t.id]);
    });
    res.json(await getAccount(pool, student(req)));
});
tripRoutes.post("/:id/rating", async (req, res) => {
    const body = z
        .object({
        stars: z.number().int().min(1).max(5),
        praise: z.array(z.string().max(50)).max(5),
        comment: z.string().max(600),
    })
        .parse(req.body);
    await transaction(async (db) => {
        const id = student(req);
        await rows(db, "SELECT id FROM students WHERE id=? FOR UPDATE", [id]);
        const [t] = await rows(db, "SELECT * FROM trips WHERE id=? AND student_id=? FOR UPDATE", [req.params.id, id]);
        if (!t)
            throw new HttpError(404, "Traslado no encontrado.");
        if (t.status !== "COMPLETED")
            throw new HttpError(409, "Completa el traslado antes de calificar.");
        await db.execute("INSERT INTO trip_ratings(trip_id,driver_id,stars,praise_tags,comment) VALUES(?,?,?,?,?) ON DUPLICATE KEY UPDATE id=id", [
            t.id,
            t.driver_id,
            body.stars,
            JSON.stringify(body.praise),
            body.comment,
        ]);
        await db.execute("UPDATE students SET plans_unlocked=1 WHERE id=?", [id]);
    });
    res.json(await getAccount(pool, student(req)));
});
