import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { AppProvider, useApp } from "@/context/AppContext";
import * as WebBrowser from "expo-web-browser";
import { Platform, Text, View } from "react-native";

// Complete the popup before mounting any Router redirects or session hydration.
const completingGoogleAuth =
  Platform.OS === "web" &&
  typeof window !== "undefined" &&
  !!window.opener &&
  /(?:^|[?#&])(access_token|id_token|code|error)=/.test(
    window.location.hash + window.location.search,
  );
WebBrowser.maybeCompleteAuthSession();
function Navigation() {
  const { state } = useApp();
  return (
    <>
      <StatusBar style="dark" />
      <Stack
        screenOptions={{
          headerShown: false,
          contentStyle: { backgroundColor: "#F8FAFC" },
        }}
      >
        <Stack.Screen name="index" />
        <Stack.Protected guard={!state.user}>
          <Stack.Screen name="signin" />
          <Stack.Screen name="signup" />
          <Stack.Screen name="verify-otp" />
        </Stack.Protected>
        <Stack.Protected guard={!!state.user}>
          <Stack.Screen name="(tabs)" />
          <Stack.Screen name="map" />
          <Stack.Screen name="details" />
          <Stack.Screen name="payment" />
          <Stack.Screen name="trip" />
          <Stack.Screen name="rating" />
          <Stack.Screen name="plans" />
        </Stack.Protected>
      </Stack>
    </>
  );
}
export default function RootLayout() {
  if (completingGoogleAuth)
    return (
      <View
        style={{
          flex: 1,
          alignItems: "center",
          justifyContent: "center",
          backgroundColor: "white",
        }}
      >
        <Text>Finalizando acceso con Google…</Text>
      </View>
    );
  return (
    <SafeAreaProvider>
      <AppProvider>
        <Navigation />
      </AppProvider>
    </SafeAreaProvider>
  );
}
