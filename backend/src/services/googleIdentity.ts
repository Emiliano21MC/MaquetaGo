import { OAuth2Client, TokenPayload } from "google-auth-library";
import { z } from "zod";
import { env } from "../config/env";
import { HttpError } from "../http";
export const googleTokenSchema = z
  .object({
    id_token: z.string().min(1).max(10000).optional(),
    access_token: z.string().min(1).max(10000).optional(),
    idToken: z.string().min(1).max(10000).optional(),
    accessToken: z.string().min(1).max(10000).optional(),
  })
  .refine(
    (t) => !!(t.id_token || t.idToken || t.access_token || t.accessToken),
    "Google no devolvió un token válido.",
  );
const identitySchema = z.object({
  sub: z.string().min(1),
  email: z.string().email(),
  email_verified: z.boolean(),
  hd: z.string().optional(),
  name: z.string().max(120).optional(),
});
export interface GoogleIdentity {
  sub: string;
  email: string;
  email_verified: boolean;
  hd?: string;
  name?: string;
}
export interface GoogleIdentityProvider {
  id: (token: string, audience: string[]) => Promise<Partial<TokenPayload>>;
  accessInfo: (
    token: string,
  ) => Promise<{
    aud: string;
    expiry_date: number;
    sub?: string;
    user_id?: string;
  }>;
  userInfo: (token: string) => Promise<unknown>;
}
const provider: GoogleIdentityProvider = {
  id: async (token, audience) =>
    (
      await new OAuth2Client(env.googleClientId || undefined).verifyIdToken({
        idToken: token,
        audience,
      })
    ).getPayload() || {},
  accessInfo: (token) =>
    new OAuth2Client(env.googleClientId || undefined).getTokenInfo(token),
  userInfo: async (token) => {
    const response = await fetch(
      "https://openidconnect.googleapis.com/v1/userinfo",
      {
        headers: { Authorization: `Bearer ${token}` },
        signal: AbortSignal.timeout(7000),
      },
    );
    if (!response.ok) throw new Error("Google rechazó el token.");
    return response.json();
  },
};
export async function verifyGoogleIdentity(
  tokens: z.infer<typeof googleTokenSchema>,
  audiences = env.googleIds,
  google: GoogleIdentityProvider = provider,
): Promise<GoogleIdentity> {
  if (!audiences.length)
    throw new HttpError(
      503,
      "Google no está habilitado. Continúa con tu correo institucional.",
    );
  let raw: unknown;
  try {
    const idToken = tokens.id_token || tokens.idToken;
    if (idToken) raw = await google.id(idToken, audiences);
    else {
      const accessToken = tokens.access_token || tokens.accessToken!;
      const info = await google.accessInfo(accessToken);
      if (
        !audiences.includes(info.aud) ||
        !Number.isFinite(info.expiry_date) ||
        info.expiry_date <= Date.now()
      )
        throw new Error("Audiencia o vigencia inválida.");
      raw = await google.userInfo(accessToken);
      const profile = identitySchema.parse(raw);
      const subject = info.sub || info.user_id;
      if (subject && subject !== profile.sub)
        throw new Error("Identidad no coincide.");
    }
    raw = identitySchema.parse(raw);
  } catch {
    throw new HttpError(
      401,
      "No se pudo validar la cuenta de Google. Vuelve a iniciar sesión.",
    );
  }
  const identity = raw as GoogleIdentity;
  if (
    !identity.email_verified ||
    identity.hd !== "pucp.edu.pe" ||
    !/^[-a-z0-9._%+]+@pucp\.edu\.pe$/i.test(identity.email)
  )
    throw new HttpError(
      403,
      "Selecciona tu cuenta institucional @pucp.edu.pe.",
    );
  return { ...identity, email: identity.email.toLowerCase() };
}
