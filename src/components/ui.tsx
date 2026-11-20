import React from "react";
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TextInputProps,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { router } from "expo-router";
import { colors as c } from "@/theme/tokens";
export const s = StyleSheet.create({
  screen: { flex: 1, backgroundColor: c.paper },
  content: {
    padding: 24,
    gap: 16,
    width: "100%",
    maxWidth: 560,
    alignSelf: "center",
    flexGrow: 1,
  },
  title: {
    fontSize: 24,
    fontWeight: "700",
    color: c.navy,
    letterSpacing: -0.6,
  },
  subtitle: { fontSize: 13, color: c.muted, lineHeight: 20 },
  text: { fontSize: 14, color: c.navy, lineHeight: 21 },
  bold: { fontSize: 15, color: c.navy, fontWeight: "700", lineHeight: 22 },
  label: {
    fontSize: 10,
    fontWeight: "700",
    color: c.muted,
    letterSpacing: 0.8,
    textTransform: "uppercase",
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 10,
  },
  wrap: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  card: {
    padding: 18,
    borderWidth: 1,
    borderColor: c.border,
    borderRadius: 10,
    backgroundColor: c.white,
    gap: 12,
  },
  button: {
    minHeight: 48,
    paddingHorizontal: 16,
    paddingVertical: 13,
    borderRadius: 8,
    backgroundColor: c.teal,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: c.teal,
  },
  buttonText: {
    color: c.white,
    fontSize: 14,
    fontWeight: "600",
    textAlign: "center",
  },
  input: {
    borderWidth: 1,
    borderColor: c.strong,
    borderRadius: 8,
    minHeight: 48,
    paddingHorizontal: 13,
    paddingVertical: 12,
    color: c.navy,
    fontSize: 14,
    backgroundColor: c.white,
  },
  divider: { height: 1, backgroundColor: c.border },
  link: { color: c.teal, fontSize: 13, fontWeight: "600" },
  numeric: { fontVariant: ["tabular-nums"] },
  footer: {
    padding: 20,
    borderTopWidth: 1,
    borderColor: c.border,
    backgroundColor: c.white,
    gap: 10,
  },
  selected: { borderColor: c.teal, backgroundColor: "#F0FDFA" },
});
export function Button({
  title,
  onPress,
  secondary = false,
  disabled = false,
}: {
  title: string;
  onPress: () => void;
  secondary?: boolean;
  disabled?: boolean;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ disabled }}
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => [
        s.button,
        secondary && { backgroundColor: c.white, borderColor: c.strong },
        { opacity: disabled ? 0.4 : pressed ? 0.75 : 1 },
      ]}
    >
      <Text style={[s.buttonText, secondary && { color: c.navy }]}>
        {title}
      </Text>
    </Pressable>
  );
}
export function Card({
  children,
  dark = false,
}: {
  children: React.ReactNode;
  dark?: boolean;
}) {
  return (
    <View
      style={[s.card, dark && { backgroundColor: c.navy, borderColor: c.navy }]}
    >
      {children}
    </View>
  );
}
export function Badge({ children }: { children: React.ReactNode }) {
  return (
    <View
      style={{
        alignSelf: "flex-start",
        backgroundColor: c.tint,
        paddingHorizontal: 9,
        paddingVertical: 5,
        borderRadius: 5,
      }}
    >
      <Text style={{ color: c.tintText, fontSize: 10, fontWeight: "600" }}>
        {children}
      </Text>
    </View>
  );
}
export function Field({ label, ...props }: TextInputProps & { label: string }) {
  return (
    <View style={{ gap: 7 }}>
      <Text style={[s.text, { fontSize: 12, fontWeight: "600" }]}>{label}</Text>
      <TextInput
        accessibilityLabel={label}
        placeholderTextColor={c.muted}
        {...props}
        style={[s.input, props.style]}
      />
    </View>
  );
}
export function Chip({
  title,
  selected,
  onPress,
  disabled,
}: {
  title: string;
  selected: boolean;
  onPress: () => void;
  disabled?: boolean;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ selected, disabled }}
      disabled={disabled}
      onPress={onPress}
      style={[
        {
          minHeight: 40,
          borderWidth: 1,
          borderColor: c.border,
          borderRadius: 7,
          padding: 10,
          justifyContent: "center",
        },
        selected && s.selected,
        disabled && { opacity: 0.35 },
      ]}
    >
      <Text
        style={{
          fontSize: 12,
          color: selected ? c.tintText : c.secondary,
          fontWeight: selected ? "600" : "400",
        }}
      >
        {title}
      </Text>
    </Pressable>
  );
}
export function AppHeader({ title }: { title: string }) {
  return (
    <View
      style={[
        s.row,
        {
          paddingHorizontal: 14,
          minHeight: 56,
          backgroundColor: c.white,
          borderBottomWidth: 1,
          borderBottomColor: c.border,
        },
      ]}
    >
      <Pressable
        accessibilityLabel="Volver"
        accessibilityRole="button"
        onPress={() =>
          router.canGoBack() ? router.back() : router.replace("/(tabs)")
        }
        style={{ padding: 10 }}
      >
        <Text style={{ fontSize: 26, color: c.navy }}>‹</Text>
      </Pressable>
      <Text style={[s.bold, { flex: 1, textAlign: "center" }]}>{title}</Text>
      <View style={{ width: 36 }} />
    </View>
  );
}
export function Page({
  title,
  children,
  footer,
  white = false,
}: {
  title?: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
  white?: boolean;
}) {
  return (
    <SafeAreaView
      edges={["top", "left", "right", ...(title ? ["bottom" as const] : [])]}
      style={[s.screen, white && { backgroundColor: c.white }]}
    >
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        style={{ flex: 1 }}
      >
        {title && <AppHeader title={title} />}
        <ScrollView
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={s.content}
        >
          {children}
        </ScrollView>
        {footer && <View style={s.footer}>{footer}</View>}
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
