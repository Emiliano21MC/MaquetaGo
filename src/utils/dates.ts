export function dateKey(date = new Date()) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}
export function dateLabel(key: string) {
  return new Date(`${key}T12:00:00`).toLocaleDateString("es-PE", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}
export function isFutureSlot(date: string, time: string, now = new Date()) {
  const match = /^(\d{1,2}):(\d{2})(?:\s(AM|PM))?$/.exec(time);
  if (!match) return false;
  let hour = Number(match[1]);
  const minute = Number(match[2]);
  if (minute > 59 || (match[3] ? hour < 1 || hour > 12 : hour > 23))
    return false;
  if (match[3]) hour = (hour % 12) + (match[3] === "PM" ? 12 : 0);
  return (
    new Date(
      `${date}T${String(hour).padStart(2, "0")}:${match[2]}:00`,
    ).getTime() > now.getTime()
  );
}
