import {validateSavedCard} from './payments';
import { searchPlaces } from '../services/mapsService';
import { requireAcademicAccess } from "../services/subscriptionService";
import { Router } from "express";
import { z } from "zod";
import { pool, rows, transaction } from "../config/db";
import { student, HttpError } from "../http";
import { getAccount, locationModel, planModel, } from "../services/accountService";
import { quote } from "../services/tariffCalculator";
import { env } from "../config/env";
import { time24 } from "../../../shared/tariff";
export const catalogRoutes = Router();
export const coordinateSchema = z.object({
    latitude: z.coerce.number().min(-12.35).max(-11.75),
    longitude: z.coerce.number().min(-77.25).max(-76.7),
});
export const quoteSchema = coordinateSchema.extend({
    insuranceSelected: z
        .enum(["true", "false"])
        .transform((value) => value === "true")
        .optional(),
    time: z
        .string()
        .max(15)
        .refine((value) => {
        try {
            time24(value);
            return true;
        }
        catch {
            return false;
        }
    }, "Hora inválida."),
    size: z.enum(["SMALL", "MEDIUM", "LARGE"]),
    date: z
        .string()
        .regex(/^\d{4}-\d{2}-\d{2}$/)
        .optional(),
});
catalogRoutes.get("/me", async (req, res) => res.json(await getAccount(pool, student(req))));
catalogRoutes.get("/plans", async (_req, res) => res.json((await rows(pool, "SELECT * FROM subscription_plans ORDER BY price_pen")).map(planModel)));
catalogRoutes.get("/locations", async (_req, res) => res.json((await rows(pool, "SELECT * FROM lima_pickup_zones ORDER BY id")).map(locationModel)));
catalogRoutes.get("/locations/quote", async (req, res) => res.json(await quote(pool, student(req), quoteSchema.parse(req.query))));
catalogRoutes.get('/locations/search', async (req, res) => { const { q } = z.object({ q: z.string().trim().min(3).max(200) }).parse(req.query); res.json(await searchPlaces(q)); });
catalogRoutes.get("/academic-events/:studentId", async (req, res) => {
    const id = student(req);
    if (Number(req.params.studentId) !== id)
        throw new HttpError(403, "Acceso denegado.");
    await requireAcademicAccess(pool, id);
    res.json(await rows(pool, `SELECT e.id,e.title,e.course_label AS course,e.event_date AS date,e.recommended_time AS time,e.semester_code AS semester,COALESCE(r.is_active,0) AS reminder FROM academic_calendar_events e LEFT JOIN student_academic_reminders r ON r.event_id=e.id AND r.student_id=? ORDER BY e.event_date`, [id]));
});
catalogRoutes.post("/academic-events/toggle-reminder", async (req, res) => {
    await requireAcademicAccess(pool, student(req));
    const body = z
        .object({ eventId: z.number().int().positive(), active: z.boolean() })
        .parse(req.body);
    await pool.execute("INSERT INTO student_academic_reminders(student_id,event_id,remind_hours_before,is_active) VALUES(?,?,48,?) ON DUPLICATE KEY UPDATE is_active=?", [student(req), body.eventId, body.active, body.active]);
    res.json({ ok: true });
});
export const paymentSchema = z.object({
    method: z.enum(["Yape", "Tarjeta", "Suscripción"]),
    approvalCode: z.string().max(80).optional(),
    requestKey: z.string().min(8).max(80),
    paymentMethodId:z.number().int().positive().optional(),
});
export function assertPayment(method: string, approval?: string) {
    if (env.paymentMode !== "local" || env.production)
        throw new HttpError(503, "El cobro en línea aún no está habilitado.");
    if (method === "Yape" && !/^\d{6}$/.test(approval || ""))
        throw new HttpError(400, "Ingresa el código de aprobación Yape de 6 dígitos.");
}
catalogRoutes.post("/subscriptions", async (req, res) => {
    const body = paymentSchema
        .extend({ planId: z.enum(["monthly", "semester", "annual"]) })
        .parse(req.body);
    if (body.method === "Suscripción")
        throw new HttpError(400, "Selecciona Yape o tarjeta.");
    assertPayment(body.method, body.approvalCode);
    await transaction(async (db) => {
        const id = student(req);
        const [s] = await rows(db, "SELECT * FROM students WHERE id=? FOR UPDATE", [
            id,
        ]);
        if(body.paymentMethodId){if(body.method!=="Tarjeta")throw new HttpError(400,"Selecciona Tarjeta para usar una tarjeta guardada.");await validateSavedCard(db,id,body.paymentMethodId);}
        if (!s.plans_unlocked)
            throw new HttpError(403, "Completa y califica tu primer traslado.");
        if ((await rows(db, "SELECT id FROM student_subscriptions WHERE student_id=? AND request_key=?", [id, body.requestKey])).length)
            return;
        const [plan] = await rows(db, "SELECT * FROM subscription_plans WHERE code=?", [body.planId.toUpperCase()]);
        if (!plan)
            throw new HttpError(404, "Plan no encontrado.");
        await db.execute("UPDATE student_subscriptions SET is_active=0 WHERE student_id=?", [id]);
        await db.execute("INSERT INTO student_subscriptions(student_id,plan_id,remaining_rides,start_date,end_date,payment_method,payment_ref,request_key) VALUES(?,?,?,DATE(CONVERT_TZ(UTC_TIMESTAMP(),'+00:00','-05:00')),DATE_ADD(DATE(CONVERT_TZ(UTC_TIMESTAMP(),'+00:00','-05:00')),INTERVAL ? DAY),?,?,?)", [
            id,
            plan.id,
            0,
            plan.validity_days,
            body.method,
            body.approvalCode || null,
            body.requestKey,
        ]);
    });
    res.status(201).json(await getAccount(pool, student(req)));
});
