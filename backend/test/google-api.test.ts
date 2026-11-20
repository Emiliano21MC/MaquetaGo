import { test } from "node:test";
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { OAuth2Client } from "google-auth-library";
import { app } from "../src/server";
import { pool, rows } from "../src/config/db";
import { env } from "../src/config/env";
test("Google crea sesión inmediata con ambos tokens, conserva beneficios y comunica errores SQL", async (t) => {
  const email = `test.google.${randomUUID()}@pucp.edu.pe`;
  let profile = {
    sub: "provider-subject",
    email,
    email_verified: true,
    hd: "pucp.edu.pe",
    name: "Prueba Google",
  };
  const nativeFetch = globalThis.fetch;
  t.mock.method(
    OAuth2Client.prototype,
    "verifyIdToken",
    async (options: { idToken: string }) => {
      if (options.idToken !== "valid-id") throw new Error("Invalid");
      return { getPayload: () => profile };
    },
  );
  t.mock.method(
    OAuth2Client.prototype,
    "getTokenInfo",
    async (token: string) => {
      if (token !== "valid-access") throw new Error("Invalid");
      return {
        aud: env.googleIds[0],
        expiry_date: Date.now() + 60000,
        sub: profile.sub,
        scopes: ["openid", "email", "profile"],
      };
    },
  );
  t.mock.method(
    globalThis,
    "fetch",
    async (input: Parameters<typeof fetch>[0], init?: RequestInit) =>
      String(input) === "https://openidconnect.googleapis.com/v1/userinfo"
        ? new Response(JSON.stringify(profile), {
            status: 200,
            headers: { "Content-Type": "application/json" },
          })
        : nativeFetch(input, init),
  );
  const server = app.listen(0, "127.0.0.1");
  await new Promise<void>((resolve) => server.once("listening", resolve));
  const address = server.address();
  if (!address || typeof address === "string") throw new Error();
  const base = `http://127.0.0.1:${address.port}/api`;
  const login = async (body: unknown) => {
    const response = await fetch(base + "/auth/google", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    return { status: response.status, data: await response.json() };
  };
  try {
    const first = await login({ id_token: "valid-id" });
    assert.equal(first.status, 200);
    assert.ok(first.data.token);
    assert.equal(first.data.account.user.verified, true);
    assert.equal(first.data.challenge, undefined);
    assert.equal(first.data.account.user.email, email);
    const id = first.data.account.user.id;
    const session = await nativeFetch(base + "/me", {
      headers: { Authorization: `Bearer ${first.data.token}` },
    });
    assert.equal(session.status, 200);
    await pool.execute(
      "UPDATE students SET promo_80_used=1,plans_unlocked=1 WHERE id=?",
      [id],
    );
    for (const body of [
      { access_token: "valid-access" },
      { idToken: "valid-id" },
      { accessToken: "valid-access" },
    ]) {
      const result = await login(body);
      assert.equal(result.status, 200);
      assert.equal(result.data.account.user.id, id);
      assert.equal(result.data.account.promoUsed, true);
      assert.equal(result.data.account.plansUnlocked, true);
    }
    assert.equal((await login({ access_token: "invalid" })).status, 401);
    profile = { ...profile, email: "other@gmail.com", hd: "gmail.com" };
    assert.equal((await login({ id_token: "valid-id" })).status, 403);
    profile = { ...profile, email, hd: "pucp.edu.pe" };
    const connection = t.mock.method(pool, "getConnection", async () => {
      throw Object.assign(new Error("Unavailable"), { code: "ECONNREFUSED" });
    });
    const failure = await login({ id_token: "valid-id" });
    assert.equal(failure.status, 503);
    assert.match(failure.data.error, /base de datos/);
    connection.mock.restore();
  } finally {
    const created = await rows(
      pool,
      "SELECT id FROM students WHERE institutional_email=?",
      [email],
    );
    for (const s of created)
      await pool.execute(
        "DELETE FROM students WHERE id=? AND institutional_email=?",
        [s.id, email],
      );
    await pool.end();
    await new Promise<void>((resolve) => server.close(() => resolve()));
  }
});
