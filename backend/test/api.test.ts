import { after, before, test } from "node:test";
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { Server } from "node:http";
import { app } from "../src/server";
import { pool, rows } from "../src/config/db";
import { tariff } from "../../shared/tariff";
const realFetch = global.fetch;
global.fetch = (async (input: any, init: any) => {
    if (String(input).startsWith('https://router.project-osrm.org/'))
        return new Response(JSON.stringify({ code: 'Ok', routes: [{ distance: 2400, duration: 540, geometry: { type: 'LineString', coordinates: [[-77.09, -12.08], [-77.0794, -12.0695]] } }] }), { status: 200 });
    return realFetch(input, init);
}) as typeof fetch;
let server: Server;
let base: string;
let token = "";
let studentId = 0;
const email = `test.${randomUUID()}@pucp.edu.pe`;
async function call(path: string, method = "GET", body?: unknown, auth = token) {
    const response = await fetch(base + path, {
        method,
        headers: {
            "Content-Type": "application/json",
            ...(auth ? { Authorization: `Bearer ${auth}` } : {}),
        },
        body: body === undefined ? undefined : JSON.stringify(body),
    });
    return { status: response.status, data: await response.json() };
}
before(async () => {
    // This isolated test worker must never send real mail with workspace credentials.
    process.env.SMTP_USER = "";
    process.env.SMTP_PASS = "";
    server = app.listen(0, "127.0.0.1");
    await new Promise<void>((resolve) => server.once("listening", resolve));
    const address = server.address();
    if (!address || typeof address === "string")
        throw new Error();
    base = `http://127.0.0.1:${address.port}/api`;
});
after(async () => {
    if (studentId) {
        const [s] = await rows(pool, "SELECT institutional_email FROM students WHERE id=?", [studentId]);
        assert.equal(s?.institutional_email, email);
        await pool.execute("DELETE FROM trip_ratings WHERE trip_id IN (SELECT id FROM trips WHERE student_id=?)", [studentId]);
        await pool.execute("DELETE FROM safety_photo_acts WHERE trip_id IN (SELECT id FROM trips WHERE student_id=?)", [studentId]);
        await pool.execute("DELETE FROM trips WHERE student_id=?", [studentId]);
        await pool.execute("DELETE FROM student_subscriptions WHERE student_id=?", [
            studentId,
        ]);
        await pool.execute("DELETE FROM student_academic_reminders WHERE student_id=?", [studentId]);
        await pool.execute("DELETE FROM students WHERE id=? AND institutional_email=?", [studentId, email]);
    }
    await pool.end();
    if (server)
        await new Promise<void>((resolve) => server.close(() => resolve()));
});
test("Tarifa exacta, tráfico y beneficio verificado", () => {
    const regular = tariff({
        km: 2.4,
        baseMinutes: 9,
        size: "SMALL",
        time: "10:00 AM",
        promoUsed: true,
        verified: true,
    });
    assert.equal(regular.total, 14.6);
    const peak = tariff({
        km: 2.4,
        baseMinutes: 9,
        size: "MEDIUM",
        time: "08:00 AM",
        promoUsed: false,
        verified: true,
    });
    assert.equal(peak.trafficMinutes, 12);
    assert.equal(peak.total, 3.66);
    assert.equal(tariff({
        km: 2.4,
        baseMinutes: 9,
        size: "SMALL",
        time: "10:00 AM",
        promoUsed: false,
        verified: false,
    }).discount, 0);
});
test("API y MySQL: OTP, aislamiento, transacciones, actas y suscripciones", async () => {
    for (const origin of [
        "http://localhost:8081",
        "http://localhost:8082",
        "http://localhost:8083",
        "http://localhost:19006",
    ]) {
        const preflight = await fetch(base + "/auth/login-or-register", {
            method: "OPTIONS",
            headers: {
                Origin: origin,
                "Access-Control-Request-Method": "POST",
                "Access-Control-Request-Headers": "content-type",
            },
        });
        assert.equal(preflight.status, 204);
        assert.equal(preflight.headers.get("access-control-allow-origin"), origin);
    }
    assert.equal((await call("/health")).status, 200);
    assert.equal((await call("/me", "GET", undefined, "")).status, 401);
    assert.equal((await call("/auth/login-or-register", "POST", {
        email: "other@example.com",
        name: "Test",
        password: "Test-1234",
    })).status, 400);
    const login = await call("/auth/login-or-register", "POST", {
        email,
        name: "Prueba integración",
        password: "Test-1234",
    });
    assert.equal(login.status, 200);
    assert.match(login.data.devCode, /^\d{6}$/);
    [{ id: studentId }] = await rows(pool, "SELECT id FROM students WHERE institutional_email=?", [email]);
    const wrong = login.data.devCode === "000000" ? "111111" : "000000";
    assert.equal((await call("/auth/verify-otp", "POST", {
        challenge: login.data.challenge,
        code: wrong,
    })).status, 401);
    const verified = await call("/auth/verify-otp", "POST", {
        challenge: login.data.challenge,
        code: login.data.devCode,
    });
    assert.equal(verified.status, 200);
    token = verified.data.token;
    assert.equal(verified.data.account.user.verified, true);
    assert.equal(verified.data.account.promoUsed, false);
    assert.equal((await call("/auth/verify-otp", "POST", {
        challenge: login.data.challenge,
        code: login.data.devCode,
    })).status, 401);
    assert.equal((await call("/auth/login-or-register", "POST", {
        email,
        password: "incorrect",
    })).status, 401);
    const zones = await call("/locations");
    assert.equal(zones.data.length, 9);
    const pickup = zones.data.find((p: {
        district: string;
    }) => p.district === "San Miguel");
    const plans = await call("/plans");
    assert.equal(plans.data.find((p: {
        id: string;
    }) => p.id === "semester").price, 240);
    assert.equal((await call("/subscriptions", "POST", {
        planId: "semester",
        method: "Yape",
        approvalCode: "123456",
        requestKey: randomUUID(),
    })).status, 403);
    const date = new Date(Date.now() + 86400000 * 2).toISOString().slice(0, 10);
    const draft = {
        pickup,
        date,
        time: "08:00 AM",
        size: "MEDIUM",
        material: "Cartón pluma / Balsa",
        notes: "Cuidar bordes",
        method: "Yape",
        approvalCode: "123456",
        requestKey: randomUUID(),
    };
    const quote = await call(`/locations/quote?latitude=${pickup.latitude}&longitude=${pickup.longitude}&time=08%3A00%20AM&size=MEDIUM&date=${date}`);
    const routed = await call('/trips/quote', 'POST', { pickupLat: pickup.latitude, pickupLng: pickup.longitude, studentId, insuranceSelected: true });
    assert.equal(routed.status, 200);
    assert.equal(routed.data.source, 'osrm');
    assert.equal(routed.data.geometry.type, 'LineString');
    assert.equal(routed.data.trafficMinutes, 12);
    assert.equal(routed.data.insuranceFee, 2);
    assert.equal((await call('/trips/quote', 'POST', { pickupLat: pickup.latitude, pickupLng: pickup.longitude, studentId: studentId + 1 })).status, 403);
    assert.equal((await call('/maps/reverse?lat=0&lng=0')).status, 400);
    assert.equal((await call('/trips/quote', 'POST', { pickupLat: 0, pickupLng: 0 })).status, 400);
    assert.equal(quote.status, 200);
    assert.equal(quote.data.total, 3.66);
    const [first, duplicate] = await Promise.all([
        call("/trips", "POST", draft),
        call("/trips", "POST", draft),
    ]);
    assert.equal(first.status, 201);
    assert.equal(duplicate.status, 201);
    assert.equal(first.data.tripId, duplicate.data.tripId);
    assert.equal(first.data.account.trips.length, 1);
    assert.equal(first.data.account.promoUsed, true);
    const id = first.data.tripId;
    const image = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+jp1sAAAAASUVORK5CYII=";
    // Las evidencias están disponibles desde la reserva y persisten en trips.
    assert.equal((await call(`/trips/${id}/evidence`,'POST',{stage:'AFTER_DELIVERY',photoUrl:image,location:'PUCP'})).status,409);
    const early=await call(`/trips/${id}/evidence`,'POST',{stage:'BEFORE_PICKUP',photoUrl:image,location:pickup.address});
    assert.equal(early.status,200);assert.equal(early.data.trips[0].step,0);
    const revision=early.data.trips[0].photos[0].revision;
    const different='data:image/png;base64,'+require('node:fs').readFileSync(require('node:path').resolve(__dirname,'../../assets/images/yape-logo.png')).toString('base64');
    const replaced=await call(`/trips/${id}/evidence`,'POST',{stage:'BEFORE_PICKUP',photoUrl:different,location:pickup.address});
    assert.equal(replaced.status,200);assert.notEqual(replaced.data.trips[0].photos[0].revision,revision);
    assert.equal((await call(`/trips/${id}/safety-photo/BEFORE_PICKUP`)).data.uri,different);
    assert.equal((await call(`/trips/${id}/evidence`,'POST',{stage:'AFTER_DELIVERY',photoUrl:image,location:'PUCP'})).status,200);
    const [stored]=await rows(pool,'SELECT before_photo_url,after_photo_url FROM trips WHERE id=?',[Number(id)]);
    assert.match(stored.before_photo_url,/BEFORE_PICKUP$/);assert.match(stored.after_photo_url,/AFTER_DELIVERY$/);
    assert.equal((await call('/me')).data.trips[0].photos.length,2);
    // Reabrimos únicamente el fixture de prueba para verificar los guardas del recorrido.
    await pool.execute('DELETE FROM safety_photo_acts WHERE trip_id=?',[id]);

    assert.equal((await call(`/trips/${id}/status`, "PATCH", { status: "COMPLETED" }))
        .status, 409);
    assert.equal((await call(`/trips/${id}/rating`, "POST", {
        stars: 5,
        praise: [],
        comment: "",
    })).status, 409);
    assert.equal((await call(`/academic-events/${studentId + 999}`)).status, 403);
    assert.equal((await call(`/academic-events/${studentId}`)).status, 403);
    assert.equal((await call(`/trips/${id}/status`, "PATCH", { status: "AT_PICKUP" }))
        .status, 200);
    assert.equal((await call(`/trips/${id}/status`, "PATCH", { status: "IN_TRANSIT" }))
        .status, 409);
    assert.equal((await call(`/trips/${id}/safety-photo`, "POST", {
        stage: "BEFORE_PICKUP",
        photoUrl: image,
        location: pickup.address,
    })).status, 200);
    assert.equal((await call(`/trips/${id}/status`, "PATCH", { status: "IN_TRANSIT" }))
        .status, 200);
    assert.equal((await call(`/trips/${id}/safety-photo`, "POST", {
        stage: "AFTER_DELIVERY",
        photoUrl: image,
        location: "Arquitectura PUCP",
    })).status, 200);
    assert.equal((await call(`/trips/${id}/status`, "PATCH", { status: "COMPLETED" }))
        .status, 200);
    assert.equal((await call(`/trips/${id}/evidence`,'POST',{stage:'BEFORE_PICKUP',photoUrl:image,location:pickup.address})).status,409);
    const rated = await call(`/trips/${id}/rating`, "POST", {
        stars: 5,
        praise: ["Puntualidad"],
        comment: "Prueba automatizada",
    });
    assert.equal(rated.status, 200);
    assert.equal(rated.data.plansUnlocked, true);
    const photoPath = rated.data.trips[0].photos[0].uri;
    assert.match(photoPath, /^\/trips\/\d+\/safety-photo\//);
    assert.equal((await call(photoPath)).data.uri, image);
    assert.equal((await call(photoPath, "GET", undefined, "")).status, 401);
    // Omitir el plan permite reservar a tarifa regular, con seguro opcional.
    const standard = await call('/trips', 'POST', { ...draft, requestKey: randomUUID(), insuranceSelected: true, discountPercent: 100, total: 0 });
    assert.equal(standard.status, 201);
    assert.equal(standard.data.account.trips[0].fare.discountKind, 'REGULAR');
    assert.equal(standard.data.account.trips[0].fare.discountPercent, 0);
    assert.equal(standard.data.account.trips[0].totalPaid, 20.3);
    assert.equal(standard.data.account.trips[0].fare.insuranceFee, 2);
    const profile = await call('/me');
    assert.equal(profile.data.promo_80_used, true);
    assert.equal(profile.data.plans_unlocked, true);
    assert.equal(profile.data.active_subscription, null);
    const planKey = randomUUID();
    const sub = await call("/subscriptions", "POST", {
        planId: "semester",
        method: "Yape",
        approvalCode: "123456",
        requestKey: planKey,
    });
    assert.equal(sub.status, 201);
    assert.equal(sub.data.subscription.remainingRides, 0);
    assert.equal(sub.data.subscription.insuranceLimit, 300);
    const events = await call(`/academic-events/${studentId}`);
    assert.equal(events.data.length, 3);
    assert.equal((await call("/academic-events/toggle-reminder", "POST", {
        eventId: events.data[0].id,
        active: true,
    })).status, 200);
    const paid = await call("/trips", "POST", {
        ...draft,
        method: "Yape",
        requestKey: randomUUID(),
    });
    assert.equal(paid.status, 201);
    assert.equal(paid.data.account.trips[0].totalPaid, 13.72);
    assert.equal(paid.data.account.subscription.remainingRides, 0);
    assert.equal(paid.data.account.trips[0].fare.discountPercent, 25);
    assert.equal(paid.data.account.trips[0].fare.discountKind, 'PLAN');
    for (const [planId, percent] of [['monthly', 15], ['annual', 30]]) {
        const selected = await call('/subscriptions', 'POST', { planId, method: 'Yape', approvalCode: '123456', requestKey: randomUUID() });
        assert.equal(selected.status, 201);
        assert.equal(selected.data.active_subscription.discountPercent, percent);
        const quoted = await call(`/locations/quote?latitude=${pickup.latitude}&longitude=${pickup.longitude}&time=08%3A00%20AM&size=MEDIUM&date=${date}&insuranceSelected=true`);
        assert.equal(quoted.data.discountPercent, percent);
        assert.equal(quoted.data.insuranceFee, 2);
        assert.ok(quoted.data.total > 2);
    }
    // La API también excluye registros inactivos o con inicio futuro.
    await pool.execute('UPDATE student_subscriptions SET is_active=0 WHERE student_id=?', [studentId]);
    assert.equal((await call('/me')).data.active_subscription, null);
    assert.equal((await call(`/academic-events/${studentId}`)).status, 403);
    await pool.execute('UPDATE student_subscriptions SET is_active=1,start_date=DATE_ADD(CURRENT_DATE(),INTERVAL 1 DAY) WHERE student_id=? AND plan_id=(SELECT id FROM subscription_plans WHERE code=?)', [studentId, 'ANNUAL']);
    assert.equal((await call('/me')).data.active_subscription, null);
    await pool.execute('UPDATE student_subscriptions SET end_date=DATE_SUB(CURRENT_DATE(),INTERVAL 1 DAY) WHERE student_id=?', [studentId]);
    assert.equal((await call('/me')).data.active_subscription, null);
    assert.equal((await call(`/academic-events/${studentId}`)).status, 403);
    assert.equal((await call('/academic-events/toggle-reminder', 'POST', { eventId: events.data[0].id, active: true })).status, 403);
    const afterExpiry = await call('/trips', 'POST', { ...draft, requestKey: randomUUID() });
    assert.equal(afterExpiry.status, 201);
    assert.equal(afterExpiry.data.account.trips[0].totalPaid, 18.3);
    const repeat = await call("/subscriptions", "POST", {
        planId: "semester",
        method: "Yape",
        approvalCode: "123456",
        requestKey: planKey,
    });
    assert.equal(repeat.data.subscription, null);
    assert.equal((await call("/trips", "POST", {
        ...draft,
        time: "25:00",
        requestKey: randomUUID(),
    })).status, 400);
    await pool.execute("UPDATE students SET otp_requested_at=DATE_SUB(UTC_TIMESTAMP(),INTERVAL 2 MINUTE) WHERE id=?", [studentId]);
    const locked = await call("/auth/login-or-register", "POST", {
        email,
        password: "Test-1234",
    });
    assert.equal(locked.status, 200);
    for (let attempt = 0; attempt < 5; attempt++)
        assert.equal((await call("/auth/verify-otp", "POST", {
            challenge: locked.data.challenge,
            code: "000000",
        })).status, 401);
    assert.equal((await call("/auth/verify-otp", "POST", {
        challenge: locked.data.challenge,
        code: locked.data.devCode,
    })).status, 401);
    await pool.execute("UPDATE students SET otp_requested_at=DATE_SUB(UTC_TIMESTAMP(),INTERVAL 2 MINUTE) WHERE id=?", [studentId]);
    const expired = await call("/auth/login-or-register", "POST", {
        email,
        password: "Test-1234",
    });
    assert.equal(expired.status, 200);
    await pool.execute("UPDATE students SET otp_expires_at=DATE_SUB(UTC_TIMESTAMP(),INTERVAL 1 MINUTE) WHERE id=?", [studentId]);
    assert.equal((await call("/auth/verify-otp", "POST", {
        challenge: expired.data.challenge,
        code: expired.data.devCode,
    })).status, 401);
});
