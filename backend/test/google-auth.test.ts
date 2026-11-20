import { test } from "node:test";
import assert from "node:assert/strict";
import {
  GoogleIdentityProvider,
  googleTokenSchema,
  verifyGoogleIdentity,
} from "../src/services/googleIdentity";
const identity = {
  sub: "google-subject",
  email: "student@pucp.edu.pe",
  email_verified: true,
  hd: "pucp.edu.pe",
  name: "Estudiante PUCP",
};
const provider: GoogleIdentityProvider = {
  id: async () => identity,
  accessInfo: async () => ({
    aud: "expected-client",
    expiry_date: Date.now() + 60000,
    sub: identity.sub,
  }),
  userInfo: async () => identity,
};
test("Google acepta ID token, access token y los nombres de campo anteriores", async () => {
  for (const tokens of [
    { id_token: "id" },
    { access_token: "access" },
    { idToken: "id" },
    { accessToken: "access" },
  ])
    assert.equal(
      (
        await verifyGoogleIdentity(
          googleTokenSchema.parse(tokens),
          ["expected-client"],
          provider,
        )
      ).email,
      identity.email,
    );
  assert.equal(googleTokenSchema.safeParse({}).success, false);
});
test("Access token debe pertenecer al cliente, estar vigente y coincidir con el perfil", async () => {
  for (const info of [
    { aud: "other-client", expiry_date: Date.now() + 60000, sub: identity.sub },
    { aud: "expected-client", expiry_date: Date.now() - 1, sub: identity.sub },
    {
      aud: "expected-client",
      expiry_date: Date.now() + 60000,
      sub: "another-subject",
    },
  ])
    await assert.rejects(
      verifyGoogleIdentity({ access_token: "access" }, ["expected-client"], {
        ...provider,
        accessInfo: async () => info,
      }),
      { status: 401 },
    );
});
test("Google rechaza correos ajenos a PUCP y correos sin verificar", async () => {
  for (const profile of [
    { ...identity, email: "student@gmail.com", hd: "gmail.com" },
    { ...identity, email_verified: false },
    { ...identity, hd: undefined },
  ])
    await assert.rejects(
      verifyGoogleIdentity({ id_token: "id" }, ["expected-client"], {
        ...provider,
        id: async () => profile,
      }),
      { status: 403 },
    );
});
test("Google comunica fallos del proveedor sin aceptar datos de perfil del cliente", async () => {
  await assert.rejects(
    verifyGoogleIdentity({ access_token: "bad" }, ["expected-client"], {
      ...provider,
      accessInfo: async () => {
        throw new Error("Rejected");
      },
    }),
    { status: 401 },
  );
  await assert.rejects(verifyGoogleIdentity({ id_token: "id" }, [], provider), {
    status: 503,
  });
});
