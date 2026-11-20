import React, { useState } from "react";
import { Modal, Pressable, Text, TextInput, View } from "react-native";
import { router } from "expo-router";
import { Brand } from "@/components/Brand";
import { Button, Field, Page, s } from "@/components/ui";
import { GoogleSignIn } from "@/components/GoogleSignIn";
import { useApp } from "@/context/AppContext";
import { colors as c } from "@/theme/tokens";
export default function AuthScreen({ signup = false }: { signup?: boolean }) {
  const { beginLogin } = useApp();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [visible, setVisible] = useState(false);
  const [error, setError] = useState("");
  const [googleError, setGoogleError] = useState("");
  const [busy, setBusy] = useState(false);
  const [reset, setReset] = useState(false);
  async function submit(recovery = false) {
    setError("");
    if (!/^[a-z0-9._%+-]+@pucp\.edu\.pe$/i.test(email.trim()))
      return setError("Usa tu correo institucional @pucp.edu.pe.");
    if (password.length < 6)
      return setError("La contraseña debe tener al menos 6 caracteres.");
    if (signup && name.trim().length < 3)
      return setError("Ingresa tu nombre completo.");
    setBusy(true);
    try {
      await beginLogin({
        email: email.trim(),
        password,
        ...(signup ? { name: name.trim() } : {}),
        recovery,
      });
      setReset(false);
      router.push("/verify-otp");
    } catch (e) {
      setError(e instanceof Error ? e.message : "No se pudo acceder.");
    } finally {
      setBusy(false);
    }
  }
  return (
    <Page white>
      <View style={{ paddingTop: 32, flex: 1, gap: 18 }}>
        <Brand />
        <View style={{ gap: 8 }}>
          <Text style={[s.title, { fontSize: 29 }]}>
            {signup ? "Crea tu cuenta" : "Inicia sesión"}
          </Text>
          <Text style={s.subtitle}>
            {signup
              ? "Recibe 80% de descuento en tu primer traslado."
              : "Programa el traslado seguro de tus maquetas."}
          </Text>
        </View>
        <GoogleSignIn onError={setGoogleError} />
        {!!googleError && (
          <Text
            accessibilityRole="alert"
            style={{ color: c.danger, fontSize: 12 }}
          >
            {googleError}
          </Text>
        )}
        <View style={s.row}>
          <View style={[s.divider, { flex: 1 }]} />
          <Text style={s.subtitle}>o</Text>
          <View style={[s.divider, { flex: 1 }]} />
        </View>
        {signup && (
          <Field
            label="Nombre completo"
            placeholder="Valeria Mendoza"
            value={name}
            onChangeText={setName}
            autoComplete="name"
          />
        )}
        <Field
          label="Correo institucional"
          placeholder="nombre@pucp.edu.pe"
          value={email}
          onChangeText={setEmail}
          keyboardType="email-address"
          autoCapitalize="none"
          autoComplete="email"
        />
        <View style={{ gap: 7 }}>
          <View style={s.row}>
            <Text style={[s.text, { fontSize: 12, fontWeight: "600" }]}>
              Contraseña
            </Text>
            {!signup && (
              <Pressable
                accessibilityRole="button"
                onPress={() => {
                  setReset(true);
                  setError("");
                }}
              >
                <Text style={[s.link, { fontSize: 11 }]}>
                  ¿Olvidaste tu contraseña?
                </Text>
              </Pressable>
            )}
          </View>
          <View style={[s.input, s.row, { paddingVertical: 0 }]}>
            <TextInput
              accessibilityLabel="Contraseña"
              style={{ flex: 1, minHeight: 46, color: c.navy }}
              placeholder="Mínimo 6 caracteres"
              value={password}
              onChangeText={setPassword}
              secureTextEntry={!visible}
              autoCapitalize="none"
              autoComplete={signup ? "new-password" : "current-password"}
            />
            <Pressable
              accessibilityRole="button"
              onPress={() => setVisible(!visible)}
            >
              <Text style={s.link}>{visible ? "Ocultar" : "Mostrar"}</Text>
            </Pressable>
          </View>
        </View>
        {!!error && (
          <Text
            accessibilityRole="alert"
            style={{ color: c.danger, fontSize: 12 }}
          >
            {error}
          </Text>
        )}
        <Button
          title={
            busy
              ? "Solicitando código…"
              : signup
                ? "Crear cuenta"
                : "Iniciar sesión"
          }
          disabled={busy}
          onPress={() => submit()}
        />
        <Text style={[s.subtitle, { fontSize: 11 }]}>
          Verificaremos tu correo institucional con un código de 6 dígitos.
        </Text>
        <View style={{ flex: 1, minHeight: 30 }} />
        <View
          style={[s.row, { justifyContent: "center", paddingVertical: 20 }]}
        >
          <Text style={s.subtitle}>
            {signup ? "¿Ya tienes cuenta?" : "¿No tienes cuenta?"}
          </Text>
          <Pressable
            accessibilityRole="button"
            onPress={() => router.replace(signup ? "/signin" : "/signup")}
          >
            <Text style={s.link}>
              {signup ? "Inicia sesión" : "Crear cuenta"}
            </Text>
          </Pressable>
        </View>
      </View>
      <Modal
        visible={reset}
        transparent
        animationType="slide"
        onRequestClose={() => setReset(false)}
      >
        <View
          style={{
            flex: 1,
            justifyContent: "flex-end",
            backgroundColor: "#09172466",
          }}
        >
          <Pressable
            accessibilityLabel="Cerrar"
            style={{ flex: 1 }}
            onPress={() => setReset(false)}
          />
          <View
            style={{
              backgroundColor: "white",
              padding: 24,
              paddingBottom: 42,
              gap: 18,
              borderTopLeftRadius: 20,
              borderTopRightRadius: 20,
            }}
          >
            <Text style={s.title}>Recuperar acceso</Text>
            <Text style={s.subtitle}>
              La nueva contraseña se guardará después de verificar el código
              enviado a tu correo.
            </Text>
            <Field
              label="Correo institucional"
              value={email}
              onChangeText={setEmail}
              autoCapitalize="none"
              keyboardType="email-address"
            />
            <Field
              label="Nueva contraseña"
              value={password}
              onChangeText={setPassword}
              secureTextEntry
              autoComplete="new-password"
            />
            {!!error && <Text style={s.subtitle}>{error}</Text>}
            <Button
              title="Solicitar código"
              disabled={busy}
              onPress={() => submit(true)}
            />
            <Button
              secondary
              title="Cancelar"
              onPress={() => setReset(false)}
            />
          </View>
        </View>
      </Modal>
    </Page>
  );
}
