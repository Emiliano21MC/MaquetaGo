import { Platform } from "react-native";
import * as Notifications from "expo-notifications";
import { AndroidImportance } from "expo-notifications";
import { AcademicEvent } from "@/types/models";
import { time24 } from "../../shared/tariff";
export async function scheduleReminder(
  studentId: number,
  event: AcademicEvent,
  active: boolean,
) {
  if (Platform.OS === "web") return;
  const identifier = `maquetago-${studentId}-${event.id}`;
  await Notifications.cancelScheduledNotificationAsync(identifier);
  if (!active) return;
  const date = new Date(
    new Date(`${event.date}T${time24(event.time)}:00-05:00`).getTime() -
      48 * 3600000,
  );
  if (date.getTime() <= Date.now())
    throw new Error("El aviso de 48 horas de esta entrega ya pasó.");
  if (Platform.OS === "android")
    await Notifications.setNotificationChannelAsync("academic", {
      name: "Entregas académicas",
      importance: AndroidImportance.DEFAULT,
    });
  const permission = await Notifications.requestPermissionsAsync();
  if (!permission.granted)
    throw new Error(
      "Autoriza las notificaciones para recibir el aviso en este dispositivo.",
    );
  await Notifications.scheduleNotificationAsync({
    identifier,
    content: {
      title: event.title,
      body: "Tu entrega es en 48 horas. Programa el traslado de tu maqueta.",
      data: { eventId: event.id },
    },
    trigger: {
      type: Notifications.SchedulableTriggerInputTypes.DATE,
      date,
      channelId: "academic",
    },
  });
}
export async function cancelReminders(studentId: number) {
  if (Platform.OS === "web") return;
  const list = await Notifications.getAllScheduledNotificationsAsync();
  await Promise.all(
    list
      .filter((n) => n.identifier.startsWith(`maquetago-${studentId}-`))
      .map((n) => Notifications.cancelScheduledNotificationAsync(n.identifier)),
  );
}
