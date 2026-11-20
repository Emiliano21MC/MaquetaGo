import React, { useState } from "react";
import { Text } from "react-native";
import { router } from "expo-router";
import { Badge, Button, Card, Field, Page, s } from "@/components/ui";
import { useApp } from "@/context/AppContext";
export default function VerifyOtpScreen() {
  const { pendingOtp, verifyOtp } = useApp();
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  return (
    <Page title="Verifica tu correo" white>
      <Badge>IDENTIDAD ESTUDIANTIL PUCP</Badge>
      <Text style={s.title}>Un paso más para empezar</Text>
      <Text style={s.subtitle}>
        Ingresa el código de 6 dígitos para verificar{" "}
        {pendingOtp?.email || "tu correo institucional"}.
      </Text>
      {pendingOtp?.devCode ? (
        <Card>
          <Text style={s.subtitle}>
            Código de acceso local: {pendingOtp.devCode}
          </Text>
        </Card>
      ) : pendingOtp ? (
        <Text style={s.subtitle}>
          Enviamos un código de 6 dígitos a tu correo PUCP. Revisa tu bandeja de
          entrada o spam.
        </Text>
      ) : null}
      <Field
        label="Código de verificación"
        placeholder="000000"
        keyboardType="number-pad"
        autoComplete="one-time-code"
        textContentType="oneTimeCode"
        value={code}
        onChangeText={(v) => setCode(v.replace(/\D/g, ""))}
        maxLength={6}
        style={{ fontSize: 28, letterSpacing: 12, textAlign: "center" }}
      />
      {!!error && (
        <Text accessibilityRole="alert" style={s.subtitle}>
          {error}
        </Text>
      )}
      <Button
        title={busy ? "Verificando…" : "Verificar y continuar"}
        disabled={busy || code.length !== 6 || !pendingOtp}
        onPress={async () => {
          setBusy(true);
          setError("");
          try {
            await verifyOtp(code);
            router.replace("/(tabs)");
          } catch (e) {
            setError(e instanceof Error ? e.message : "No se pudo verificar.");
          } finally {
            setBusy(false);
          }
        }}
      />
      <Button
        secondary
        title="Volver y solicitar otro código"
        onPress={() => router.replace("/signin")}
      />
    </Page>
  );
}
