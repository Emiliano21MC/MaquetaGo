import React, { useState } from "react";
import { Pressable, Text, View } from "react-native";
import { router } from "expo-router";
import { Badge, Button, Card, Chip, Page, s } from "@/components/ui";
import { useApp } from "@/context/AppContext";
import { sizes } from "@/data/limaLocations";
import { dateLabel } from "@/utils/dates";
import { money } from "@/utils/pricing";
export default function TripsScreen() {
  const { account } = useApp();
  const [history, setHistory] = useState(false);
  const trips = account?.trips.filter((t) => t.completed === history) ?? [];
  return (
    <Page>
      <Text style={s.title}>Mis viajes</Text>
      <View style={s.wrap}>
        <Chip
          title={`En curso (${account?.trips.filter((t) => !t.completed).length ?? 0})`}
          selected={!history}
          onPress={() => setHistory(false)}
        />
        <Chip
          title={`Historial (${account?.trips.filter((t) => t.completed).length ?? 0})`}
          selected={history}
          onPress={() => setHistory(true)}
        />
      </View>
      {!trips.length && (
        <Card>
          <Text style={s.bold}>
            {history
              ? "Aún no hay traslados completados"
              : "No tienes traslados en curso"}
          </Text>
          <Text style={s.subtitle}>
            {history
              ? "Tus entregas finalizadas y calificaciones aparecerán aquí."
              : "Programa tu próximo envío desde la pantalla de inicio."}
          </Text>
          <Button
            title="Programar traslado"
            onPress={() => router.push("/details")}
          />
        </Card>
      )}
      {trips.map((trip) => (
        <Pressable
          key={trip.id}
          accessibilityRole="button"
          onPress={() =>
            router.push({ pathname: "/trip", params: { id: trip.id } })
          }
        >
          <Card>
            <View style={s.row}>
              <Text style={s.bold}>{trip.code}</Text>
              <Badge>{trip.completed ? "Completado" : "En curso"}</Badge>
            </View>
            <Text style={s.bold}>
              {trip.pickup.district} → Facultad de Arquitectura PUCP
            </Text>
            <Text style={s.subtitle}>
              {dateLabel(trip.date)} · {trip.time}
            </Text>
            <Text style={s.subtitle}>
              Maqueta {sizes.find((z) => z.id === trip.size)?.name} ·{" "}
              {trip.pickup.km.toFixed(1)} km
            </Text>
            <View style={s.divider} />
            <View style={s.row}>
              <Text style={[s.bold, s.numeric]}>
                {money(trip.totalPaid)} · {trip.paymentLabel}
              </Text>
              {trip.rating && (
                <Text style={{ color: "#D97706" }}>
                  {"★".repeat(trip.rating)}
                </Text>
              )}
            </View>
            {!!trip.ratingComment && (
              <Text style={s.subtitle}>“{trip.ratingComment}”</Text>
            )}
          </Card>
        </Pressable>
      ))}
    </Page>
  );
}
