import { isSubscriptionActive } from "../../shared/subscriptions";
import React, { useCallback, useState } from "react";
import { AcademicAlerts } from "@/components/AcademicAlerts";
import { Pressable, Text, View } from "react-native";
import { router, useFocusEffect } from "expo-router";
import { Badge, Button, Card, Page, s } from "@/components/ui";
import { useApp } from "@/context/AppContext";
import { destination } from "@/data/limaLocations";
import { colors as c } from "@/theme/tokens";
import { dateLabel } from "@/utils/dates";
import { useNow } from "@/hooks/use-now";
export default function HomeScreen() {
  const { state, account, storageError, offline, refresh } = useApp();
  const [error, setError] = useState("");
  const now = useNow();
  useFocusEffect(
    useCallback(() => {
      void refresh().catch(() => {});
    }, [refresh]),
  );
  if (!account) return null;
  const sub = account.subscription;
  const activeSub = isSubscriptionActive(sub, now);
  const trips = account.trips.filter((t) => !t.completed);
  return (
    <Page>
      {offline && (
        <Text style={s.subtitle}>
          Sin conexión · Mostrando los datos guardados
        </Text>
      )}
      {!!error && <Text style={s.subtitle}>{error}</Text>}
      <View style={[s.row, { alignItems: "flex-start", marginVertical: 8 }]}>
        <View>
          <Text style={s.title}>Hola, {state.user?.name.split(" ")[0]}</Text>
          <Text style={s.subtitle}>Traslado especializado a campus</Text>
        </View>
        <Badge>✓ Estudiante Verificado PUCP</Badge>
      </View>
      {storageError && (
        <Text accessibilityRole="alert" style={s.subtitle}>
          No se pudo guardar en este dispositivo. Revisa el almacenamiento
          disponible.
        </Text>
      )}
      {activeSub && (
        <Card dark>
          <Text style={[s.label, { color: c.bright }]}>{sub.name} Activo</Text>
          <Text style={{ color: c.white, fontSize: 28, fontWeight: "700" }}>
            {sub.discountPercent}% de descuento
          </Text>
          <Text style={{ color: c.strong, fontSize: 12 }}>
            En cada traslado · Vigencia:{" "}
            {Math.ceil((sub.expiresAt - now) / 86400000)} días
          </Text>
          <Text style={{ color: c.bright, fontSize: 12 }}>
            Alertas de Calendario Académico habilitadas
          </Text>
        </Card>
      )}
      {trips.map((t) => (
        <Pressable
          accessibilityRole="button"
          key={t.id}
          onPress={() =>
            router.push({ pathname: "/trip", params: { id: t.id } })
          }
        >
          <Card>
            <Text style={[s.label, { color: c.teal }]}>
              Traslado en curso · {t.code}
            </Text>
            <Text style={s.bold}>
              {dateLabel(t.date)} · {t.time}
            </Text>
            <Text style={s.subtitle}>Carlos Mendoza · B4K-819 →</Text>
          </Card>
        </Pressable>
      ))}
      <Card>
        {activeSub ? (
          <Badge>
            {sub.name} Activo • {sub.discountPercent}% dscto.
          </Badge>
        ) : !account.promoUsed ? (
          <Badge>80% de descuento en tu primer traslado</Badge>
        ) : (
          <View style={{ gap: 8 }}>
            <Badge>Tarifa estándar</Badge>
            <Pressable
              accessibilityRole="button"
              onPress={() => router.push("/plans")}
            >
              <Text style={s.link}>Ver planes con descuento</Text>
            </Pressable>
          </View>
        )}
        <Text style={[s.title, { fontSize: 21, lineHeight: 27 }]}>
          ¿A qué hora entregas tu maqueta?
        </Text>
        <View
          style={{
            paddingVertical: 12,
            gap: 24,
            paddingLeft: 22,
            borderLeftWidth: 1,
            borderLeftColor: c.border,
            marginLeft: 4,
          }}
        >
          <View
            style={{
              position: "absolute",
              left: -5,
              top: 20,
              width: 9,
              height: 9,
              borderRadius: 8,
              borderWidth: 2,
              borderColor: c.teal,
              backgroundColor: c.white,
            }}
          />
          <Pressable
            accessibilityRole="button"
            onPress={() => router.push("/map")}
            style={[s.input, { gap: 5, backgroundColor: c.paper }]}
          >
            <Text style={s.label}>
              Punto de recojo · {state.draft.pickup.district} (
              {state.draft.pickup.km.toFixed(1)} km)
            </Text>
            <Text style={[s.bold, { fontSize: 13 }]}>
              {state.draft.pickup.address}{" "}
              <Text style={{ color: c.teal }}>⌖</Text>
            </Text>
          </Pressable>
          <View>
            <View
              style={{
                position: "absolute",
                left: -27,
                top: 5,
                width: 9,
                height: 9,
                borderRadius: 8,
                backgroundColor: c.navy,
              }}
            />
            <Text style={s.label}>Destino</Text>
            <Text style={[s.bold, { fontSize: 14, marginTop: 4 }]}>
              {destination}
            </Text>
            <Text style={[s.subtitle, { fontSize: 11 }]}>
              Av. Universitaria 1801, San Miguel
            </Text>
          </View>
        </View>
        <Button
          title="Programar traslado"
          onPress={() => router.push("/details")}
        />
      </Card>
      {activeSub && !offline && <AcademicAlerts />}
      <Pressable
        accessibilityRole="button"
        onPress={() =>
          account.plansUnlocked ? router.push("/plans") : undefined
        }
      >
        <Card>
          <View style={s.row}>
            <Text style={{ fontSize: 22, color: c.teal }}>
              {account.plansUnlocked ? "◇" : "▣"}
            </Text>
            <View style={{ flex: 1 }}>
              <Text style={[s.bold, { fontSize: 13 }]}>
                Planes de suscripción
              </Text>
              <Text style={[s.subtitle, { fontSize: 11 }]}>
                {account.plansUnlocked
                  ? "Mensual, Semestral y Anual · Ver planes →"
                  : "Se habilitan al completar tu primer traslado"}
              </Text>
            </View>
          </View>
        </Card>
      </Pressable>
      <Button
        secondary
        title="Actualizar mis datos"
        onPress={async () => {
          setError("");
          try {
            await refresh();
          } catch (e) {
            setError(e instanceof Error ? e.message : "No se pudo actualizar.");
          }
        }}
      />
    </Page>
  );
}
