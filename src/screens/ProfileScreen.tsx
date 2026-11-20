import { isSubscriptionActive } from "../../shared/subscriptions";
import { Text, View } from "react-native";
import { router } from "expo-router";
import { Badge, Button, Card, Page, s } from "@/components/ui";
import { useApp } from "@/context/AppContext";
import { colors as c } from "@/theme/tokens";
import { useNow } from "@/hooks/use-now";
export default function ProfileScreen() {
  const { account, logout } = useApp();
  const now = useNow();
  if (!account) return null;
  const sub = account.subscription;
  const user = account.user;
  return (
    <Page>
      <Text style={s.title}>Perfil</Text>
      <Card>
        <View style={s.row}>
          <View
            style={{
              width: 46,
              height: 46,
              borderRadius: 30,
              backgroundColor: c.navy,
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <Text style={{ color: "white", fontWeight: "700" }}>
              {user.name
                .split(" ")
                .slice(0, 2)
                .map((v) => v[0])
                .join("")
                .toUpperCase()}
            </Text>
          </View>
          <View style={{ flex: 1 }}>
            <Text style={s.bold}>{user.name}</Text>
            <Text style={s.subtitle}>{user.email}</Text>
            <Text style={s.link}>Facultad de Arquitectura</Text>
          </View>
        </View>
      </Card>
      <Card>
        <Text style={s.label}>Suscripción</Text>
        {isSubscriptionActive(sub, now) ? (
          <>
            <Text style={s.bold}>{sub.name}</Text>
            <Text style={s.link}>
              {sub.discountPercent}% de descuento en cada traslado
            </Text>
            <Badge>
              {sub.expiresAt > now ? "Plan activo" : "Plan vencido"}
            </Badge>
            <Text style={s.subtitle}>
              Alertas de Calendario Académico habilitadas · Vigencia restante:{" "}
              {Math.max(0, Math.ceil((sub.expiresAt - now) / 86400000))} días
            </Text>
          </>
        ) : (
          <Text style={s.subtitle}>
            {account.plansUnlocked
              ? "No tienes una suscripción activa en este momento."
              : "Completa tu primer traslado con 80% de descuento para desbloquear los planes."}
          </Text>
        )}
        {account.plansUnlocked && (
          <Button
            title={sub ? "Cambiar o renovar plan" : "Ver planes disponibles"}
            secondary
            onPress={() => router.push("/plans")}
          />
        )}
      </Card>
      <Card>
        <Text style={s.label}>Método de pago predeterminado</Text>
        <View style={s.row}>
          <Text style={s.bold}>VISA •••• 4829</Text>
          <Text style={s.subtitle}>Principal</Text>
        </View>
      </Card>
      <Button
        title="Cerrar sesión"
        secondary
        onPress={async () => {
          await logout();
          router.replace("/signin");
        }}
      />
      <Text
        style={[
          s.subtitle,
          { fontSize: 11, textAlign: "center", marginTop: 6 },
        ]}
      >
        Servicio independiente de movilidad estudiantil · No afiliado
        oficialmente a la PUCP.
      </Text>
    </Page>
  );
}
