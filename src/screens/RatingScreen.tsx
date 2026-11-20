import React, { useRef, useState } from "react";
import { Pressable, Text, View } from "react-native";
import { router, useLocalSearchParams } from "expo-router";
import { Button, Card, Chip, Field, Page, s } from "@/components/ui";
import { useApp } from "@/context/AppContext";
import { praiseTags } from "@/data/limaLocations";
export default function RatingScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { account, rate } = useApp();
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [rating, setRating] = useState(5);
  const [praise, setPraise] = useState<string[]>([]);
  const [comment, setComment] = useState("");
  const sent = useRef(false);
  const trip = account?.trips.find((t) => t.id === id);
  if (!trip?.completed || trip.rating)
    return (
      <Page title="Calificar servicio">
        <Text style={s.text}>
          No hay una calificación pendiente para este traslado.
        </Text>
        <Button
          title="Mis viajes"
          onPress={() => router.replace("/(tabs)/trips")}
        />
      </Page>
    );
  return (
    <Page title="Calificar servicio">
      <Text style={s.title}>Tu maqueta llegó a destino</Text>
      <Text style={s.subtitle}>¿Cómo fue tu experiencia de traslado?</Text>
      <Card>
        <Text style={s.bold}>Carlos Mendoza</Text>
        <Text style={s.subtitle}>Toyota Avanza · B4K-819</Text>
      </Card>
      <View style={{ gap: 18, alignItems: "center", paddingVertical: 24 }}>
        <View style={s.row}>
          {[1, 2, 3, 4, 5].map((n) => (
            <Pressable
              key={n}
              accessibilityRole="button"
              accessibilityLabel={`${n} estrellas`}
              accessibilityState={{ selected: n === rating }}
              onPress={() => setRating(n)}
              style={{ padding: 3 }}
            >
              <Text
                style={{
                  fontSize: 40,
                  color: n <= rating ? "#D97706" : "#CBD5E1",
                }}
              >
                ★
              </Text>
            </Pressable>
          ))}
        </View>
        <Text style={s.bold}>
          {
            [
              "Muy deficiente",
              "Deficiente",
              "Regular",
              "Buen servicio",
              "Excelente servicio",
            ][rating - 1]
          }
        </Text>
      </View>
      <Text style={s.label}>¿Qué destacó del servicio?</Text>
      <View style={s.wrap}>
        {praiseTags.map((tag) => (
          <Chip
            key={tag}
            title={tag}
            selected={praise.includes(tag)}
            onPress={() =>
              setPraise(
                praise.includes(tag)
                  ? praise.filter((p) => p !== tag)
                  : [...praise, tag],
              )
            }
          />
        ))}
      </View>
      <Field
        label="Comentario adicional (opcional)"
        placeholder="Cuéntanos sobre tu experiencia"
        multiline
        maxLength={600}
        value={comment}
        onChangeText={setComment}
        style={{ minHeight: 110, textAlignVertical: "top" }}
      />
      {!!error && <Text style={s.subtitle}>{error}</Text>}
      <Button
        title={busy ? "Enviando…" : "Enviar calificación"}
        disabled={busy}
        onPress={async () => {
          if (sent.current) return;
          sent.current = true;
          const unlocked = account?.plansUnlocked;
          setBusy(true);
          try {
            await rate(trip.id, rating, praise, comment.trim());
            router.replace(
              unlocked
                ? "/(tabs)/trips"
                : { pathname: "/plans", params: { unlocked: "1" } },
            );
          } catch (e) {
            sent.current = false;
            setError(e instanceof Error ? e.message : "No se pudo guardar.");
          } finally {
            setBusy(false);
          }
        }}
      />
    </Page>
  );
}
