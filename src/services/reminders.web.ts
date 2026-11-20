import type { AcademicEvent } from "@/types/models";
// Browser keeps the preference on the server. Native builds schedule the device alert.
export async function scheduleReminder(
  _studentId: number,
  _event: AcademicEvent,
  _active: boolean,
): Promise<void> {}
export async function cancelReminders(_studentId: number): Promise<void> {}
