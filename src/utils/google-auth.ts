import type { GoogleTokens } from "@/types/models";
export function extractGoogleTokens(response: {
  params?: Record<string, string>;
  authentication?: { accessToken?: string; idToken?: string } | null;
}): GoogleTokens {
  const id_token =
    response.params?.id_token || response.authentication?.idToken;
  const access_token =
    response.authentication?.accessToken || response.params?.access_token;
  if (!id_token && !access_token)
    throw new Error(
      "Google no devolvió un token de acceso. Vuelve a intentarlo.",
    );
  return {
    ...(id_token ? { id_token } : {}),
    ...(access_token ? { access_token } : {}),
  };
}
