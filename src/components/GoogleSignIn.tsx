import React, { useEffect, useRef, useState } from "react";
import { Platform } from "react-native";
import { Button } from "@/components/ui";
import * as Google from "expo-auth-session/providers/google";
import * as AuthSession from "expo-auth-session";
import * as WebBrowser from "expo-web-browser";
import { useApp } from "@/context/AppContext";
import { router } from "expo-router";
import { extractGoogleTokens } from "@/utils/google-auth";
WebBrowser.maybeCompleteAuthSession();
export function GoogleSignIn({
  onError,
}: {
  onError: (message: string) => void;
}) {
  const { beginGoogle } = useApp();
  const [busy, setBusy] = useState(false);
  const handled = useRef<AuthSession.AuthSessionResult | null>(null);
  const redirectUri =
    Platform.OS === "web" && typeof window !== "undefined"
      ? window.location.origin
      : AuthSession.makeRedirectUri();
  const [request, response, promptAsync] = Google.useAuthRequest({
    webClientId:
      process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID || "not-configured",
    androidClientId:
      process.env.EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID || "not-configured",
    iosClientId:
      process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID || "not-configured",
    redirectUri,
    scopes: ["openid", "profile", "email"],
    selectAccount: true,
    extraParams: { hd: "pucp.edu.pe" },
  });
  useEffect(() => {
    if (!response || handled.current === response) return;
    handled.current = response;
    void Promise.resolve().then(async () => {
      if (response.type === "error") {
        onError(
          response.error?.message ||
            response.params.error_description ||
            "Google no pudo completar el acceso.",
        );
        setBusy(false);
        return;
      }
      if (response.type !== "success") {
        setBusy(false);
        return;
      }
      try {
        await beginGoogle(extractGoogleTokens(response));
        router.replace("/(tabs)");
      } catch (e) {
        onError(
          e instanceof Error ? e.message : "No se pudo acceder con Google.",
        );
      } finally {
        setBusy(false);
      }
    });
  }, [response, beginGoogle, onError]);
  return (
    <Button
      secondary
      title={busy ? "Conectando con Google…" : "Continuar con Google"}
      disabled={busy || !request}
      onPress={async () => {
        onError("");
        const clientId =
          Platform.OS === "android"
            ? process.env.EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID
            : Platform.OS === "ios"
              ? process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID
              : process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID;
        if (!clientId) {
          onError(
            "Google no está configurado para esta plataforma. Continúa con tu correo institucional.",
          );
          return;
        }
        setBusy(true);
        try {
          const result = await promptAsync();
          if (result.type !== "success" && result.type !== "error")
            setBusy(false);
        } catch (e) {
          setBusy(false);
          onError(
            e instanceof Error
              ? e.message
              : "No se pudo abrir la ventana de Google.",
          );
        }
      }}
    />
  );
}
