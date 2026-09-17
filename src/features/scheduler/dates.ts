const WEEKDAY_SHORT = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
const MONTHS = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
];

export function startOfDay(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

export function formatDateKey(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export function parseDateKey(key: string): Date {
  const [year, month, day] = key.split("-").map(Number);
  return new Date(year ?? 1970, (month ?? 1) - 1, day ?? 1);
}

export function dateKeyFromIso(iso: string): string {
  return formatDateKey(new Date(iso));
}

export function isSameDay(left: Date, right: Date): boolean {
  return formatDateKey(left) === formatDateKey(right);
}

export function startOfWeek(date: Date): Date {
  const start = startOfDay(date);
  const weekday = start.getDay();
  const offset = weekday === 0 ? -6 : 1 - weekday;
  start.setDate(start.getDate() + offset);
  return start;
}

export function addDays(date: Date, amount: number): Date {
  const next = new Date(date);
  next.setDate(next.getDate() + amount);
  return next;
}

export function addMonths(date: Date, amount: number): Date {
  return new Date(date.getFullYear(), date.getMonth() + amount, 1);
}

export function monthGrid(anchor: Date): Date[] {
  const first = new Date(anchor.getFullYear(), anchor.getMonth(), 1);
  const start = startOfWeek(first);
  return Array.from({ length: 42 }, (_, index) => addDays(start, index));
}

export function weekDays(anchor: Date): Date[] {
  const start = startOfWeek(anchor);
  return Array.from({ length: 7 }, (_, index) => addDays(start, index));
}

export function formatMonthTitle(date: Date): string {
  return `${MONTHS[date.getMonth()]} ${date.getFullYear()}`;
}

export function formatWeekTitle(date: Date): string {
  const days = weekDays(date);
  const first = days[0];
  const last = days[6];
  if (!first || !last) {
    return formatMonthTitle(date);
  }
  if (first.getMonth() === last.getMonth()) {
    return `${first.getDate()}–${last.getDate()} ${MONTHS[first.getMonth()]} ${first.getFullYear()}`;
  }
  return `${first.getDate()} ${MONTHS[first.getMonth()]} – ${last.getDate()} ${MONTHS[last.getMonth()]}`;
}

export function formatDayTitle(date: Date): string {
  return date.toLocaleDateString(undefined, {
    weekday: "long",
    month: "long",
    day: "numeric",
  });
}

export function formatWeekdayShort(date: Date): string {
  const index = date.getDay() === 0 ? 6 : date.getDay() - 1;
  return WEEKDAY_SHORT[index] ?? "";
}

export function formatTime(iso: string): string {
  return new Date(iso).toLocaleTimeString(undefined, {
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function formatEventTimeRange(
  startAt: string,
  endAt: string | undefined,
  allDay: boolean,
): string {
  if (allDay) {
    return "All day";
  }
  if (endAt) {
    return `${formatTime(startAt)}–${formatTime(endAt)}`;
  }
  return formatTime(startAt);
}

export function combineDateAndTime(dateKey: string, time: string): string {
  const [hours, minutes] = time.split(":").map(Number);
  const date = parseDateKey(dateKey);
  date.setHours(hours ?? 0, minutes ?? 0, 0, 0);
  return date.toISOString();
}

export function timeFromIso(iso: string): string {
  const date = new Date(iso);
  return `${String(date.getHours()).padStart(2, "0")}:${String(date.getMinutes()).padStart(2, "0")}`;
}

export function weekdayHeaders(): string[] {
  return WEEKDAY_SHORT;
}
