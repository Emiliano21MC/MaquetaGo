import { isSubscriptionActive } from "../../shared/subscriptions";
import { useNow } from "@/hooks/use-now";
import React, { useState } from "react";
import { Text, View } from "react-native";
import { router } from "expo-router";
import { useApp } from "@/context/AppContext";
import { Button, Card, Chip, s } from "@/components/ui";
import { dateLabel } from "@/utils/dates";
import { scheduleReminder } from "@/services/reminders";
export function AcademicAlerts() {
  const { events, account, dispatch, toggleReminder, offline } = useApp();
  const now = useNow();
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  if (offline || !isSubscriptionActive(account?.subscription, now)) return null;
  return (
    <Card>
      <Text style={s.label}>Alertas de calendario académico</Text>
      {!events.length && (
        <Text style={s.subtitle}>
          Consulta tus próximas entregas cuando el servicio esté disponible.
        </Text>
      )}
      {events.map((event) => (
        <View key={event.id} style={{ gap: 8, paddingVertical: 8 }}>
          <Text style={s.bold}>{event.title}</Text>
          <Text style={s.subtitle}>
            {event.course} · {dateLabel(event.date)}
          </Text>
          <View style={s.row}>
            <Chip
              title={event.reminder ? "✓ Aviso 48h" : "Avisarme 48h antes"}
              selected={!!event.reminder}
              disabled={busy}
              onPress={async () => {
                if (!account) return;
                setBusy(true);
                setError("");
                try {
                  await scheduleReminder(
                    account.user.id,
                    event,
                    !event.reminder,
                  );
                  try {
                    await toggleReminder(event.id, !event.reminder);
                  } catch (e) {
                    await scheduleReminder(
                      account.user.id,
                      event,
                      !!event.reminder,
                    );
                    throw e;
                  }
                } catch (e) {
                  setError(
                    e instanceof Error
                      ? e.message
                      : "No se pudo activar el aviso.",
                  );
                } finally {
                  setBusy(false);
                }
              }}
            />
            <Button
              secondary
              title="Agendar"
              onPress={() => {
                dispatch({
                  type: "DRAFT",
                  patch: { date: event.date, time: event.time },
                });
                router.push("/details");
              }}
            />
          </View>
        </View>
      ))}
      {!!error && (
        <Text accessibilityRole="alert" style={s.subtitle}>
          {error}
        </Text>
      )}
    </Card>
  );
}
