import {VehiclePhoto} from '@/components/VehiclePhoto';
import React, { useState } from "react";
import { SafetyPhotos } from "@/components/SafetyPhotos";
import { Text, View } from "react-native";
import { router, useLocalSearchParams } from "expo-router";
import { Badge, Button, Card, Page, s } from "@/components/ui";
import { useApp } from "@/context/AppContext";
import { destination, sizes, tripSteps } from "@/data/limaLocations";
import { dateLabel } from "@/utils/dates";
import { money } from "@/utils/pricing";
import { colors as c } from "@/theme/tokens";
export default function ActiveTripScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { account, status } = useApp();
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  async function update(next: string, finish = false) {
    if (!id) return;
    setBusy(true);
    setError("");
    try {
      await status(id, next);
      if (finish) router.replace({ pathname: "/rating", params: { id } });
    } catch (e) {
      setError(e instanceof Error ? e.message : "No se pudo actualizar.");
    } finally {
      setBusy(false);
    }
  }
  const trip = account?.trips.find((t) => t.id === id);
  if (!trip)
    return (
      <Page title="Tu traslado">
        <Text style={s.text}>No se encontró el traslado.</Text>
        <Button title="Ir a inicio" onPress={() => router.replace("/(tabs)")} />
      </Page>
    );
  return (
    <Page title="Detalle del traslado">
      <View style={s.row}>
        <Text style={s.title}>{trip.code}</Text>
        <Badge>{trip.completed ? "Completado" : "En curso"}</Badge>
      </View>
      <Text style={s.subtitle}>
        {dateLabel(trip.date)} · {trip.time}
      </Text>
      <Card>
        <Text style={s.label}>Estado del recorrido</Text>
        {tripSteps.map((step, index) => (
          <View
            key={step}
            style={[
              s.row,
              {
                alignItems: "flex-start",
                justifyContent: "flex-start",
                paddingVertical: 8,
              },
            ]}
          >
            <View
              style={{
                width: 26,
                height: 26,
                borderRadius: 20,
                backgroundColor: index <= trip.step ? c.teal : c.border,
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <Text
                style={{
                  color: index <= trip.step ? c.white : c.muted,
                  fontSize: 12,
                }}
              >
                {index < trip.step || trip.completed ? "✓" : index + 1}
              </Text>
            </View>
            <Text
              style={[
                s.text,
                {
                  flex: 1,
                  fontWeight: index === trip.step ? "700" : "400",
                  color: index <= trip.step ? c.navy : c.muted,
                },
              ]}
            >
              {step}
            </Text>
          </View>
        ))}
      </Card>
      <Card>
        <Text style={s.label}>Conductor asignado</Text>
        <View style={s.row}>
          <View
            style={{
              width: 44,
              height: 44,
              borderRadius: 30,
              backgroundColor: c.navy,
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <Text style={{ color: "white", fontWeight: "700" }}>CM</Text>
          </View>
          <View style={{ flex: 1 }}>
            <Text style={s.bold}>Carlos Mendoza</Text>
            <Text style={s.subtitle}>4.9 ★ · 342 traslados universitarios</Text>
          </View>
        </View>
        <View style={s.divider} />
        <View style={s.row}><View style={{flex:1,gap:8}}><Text style={s.bold}>Toyota Avanza 2024 · Gris Plata</Text><Text style={[s.title,s.numeric,{fontSize:20}]}>B4K-819</Text></View><VehiclePhoto/></View>
        <Badge>Unidad con plataforma plana antideslizante</Badge>
      </Card>
      {trip.insuranceSelected ? (
        <Card>
          <Badge>Garantía MaquetaSegura</Badge>
          <Text style={s.bold}>{trip.insuranceCode}</Text>
          <Text style={s.subtitle}>
            Protección hasta {money(trip.insuranceLimit)}
          </Text>
        </Card>
      ) : (
        <Card>
          <Text style={s.subtitle}>
            MaquetaSegura no contratado para este traslado.
          </Text>
        </Card>
      )}
      <SafetyPhotos trip={trip} />
      <Card>
        <Text style={s.label}>Resumen del servicio</Text>
        <Text style={s.bold}>{trip.pickup.address}</Text>
        <Text style={s.subtitle}>→ {destination}</Text>
        <Text style={s.text}>
          Maqueta {sizes.find((z) => z.id === trip.size)?.name} ·{" "}
          {trip.pickup.km.toFixed(1)} km
        </Text>
        <Text style={s.subtitle}>{trip.material}</Text>
        {!!trip.notes && <Text style={s.subtitle}>{trip.notes}</Text>}
        <View style={s.divider} />
        <View style={s.row}>
          <Text style={s.subtitle}>{trip.paymentLabel}</Text>
          <Text style={[s.bold, s.numeric]}>{money(trip.totalPaid)}</Text>
        </View>
        {trip.rating && (
          <>
            <Text style={{ color: "#D97706" }}>{"★".repeat(trip.rating)}</Text>
            <Text style={s.subtitle}>{trip.praise?.join(" · ")}</Text>
            {!!trip.ratingComment && (
              <Text style={s.text}>{trip.ratingComment}</Text>
            )}
          </>
        )}
      </Card>
      {!!error && (
        <Text accessibilityRole="alert" style={s.subtitle}>
          {error}
        </Text>
      )}
      {!trip.completed && (
        <>
          <Button
            secondary
            title="Actualizar estado del recorrido"
            disabled={busy || trip.step >= 2}
            onPress={() => update(trip.step === 0 ? "AT_PICKUP" : "IN_TRANSIT")}
          />
          <Button
            title="Marcar viaje como completado"
            disabled={busy || trip.step < 2 || (trip.photos?.length ?? 0) < 2}
            onPress={() => update("COMPLETED", true)}
          />
        </>
      )}
      {trip.completed && !trip.rating && (
        <Button
          title="Calificar servicio"
          onPress={() =>
            router.push({ pathname: "/rating", params: { id: trip.id } })
          }
        />
      )}
      <Button
        secondary
        title="Volver a mis viajes"
        onPress={() => router.replace("/(tabs)/trips")}
      />
    </Page>
  );
}
