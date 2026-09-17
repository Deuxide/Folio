import { upcomingOccurrences } from "@/features/scheduler/recurrence";
import type { StudyEvent, StudyOccurrence } from "@/types/scheduler";

export const REMINDER_PRESETS = [
  { minutes: 0, label: "At time of event" },
  { minutes: 5, label: "5 minutes before" },
  { minutes: 10, label: "10 minutes before" },
  { minutes: 15, label: "15 minutes before" },
  { minutes: 30, label: "30 minutes before" },
  { minutes: 60, label: "1 hour before" },
  { minutes: 1440, label: "1 day before" },
] as const;

export const FIRED_REMINDERS_KEY = "folio-scheduler-fired-reminders";
export const NOTIFY_PREF_KEY = "folio-scheduler-notify-enabled";

export function reminderLabel(minutes: number): string {
  const preset = REMINDER_PRESETS.find((item) => item.minutes === minutes);
  return preset?.label ?? `${minutes} minutes before`;
}

export function reminderId(occurrence: StudyOccurrence, minutes: number): string {
  return `${occurrence.source.id}:${occurrence.dateKey}:${minutes}`;
}

export function loadFiredReminders(): Set<string> {
  try {
    const raw = window.localStorage.getItem(FIRED_REMINDERS_KEY);
    if (!raw) {
      return new Set();
    }
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) {
      return new Set();
    }
    return new Set(parsed.filter((item): item is string => typeof item === "string"));
  } catch {
    return new Set();
  }
}

export function saveFiredReminders(ids: Set<string>) {
  const trimmed = [...ids].slice(-400);
  window.localStorage.setItem(FIRED_REMINDERS_KEY, JSON.stringify(trimmed));
}

export function notificationsEnabledPref(): boolean {
  return window.localStorage.getItem(NOTIFY_PREF_KEY) !== "off";
}

export function setNotificationsEnabledPref(enabled: boolean) {
  window.localStorage.setItem(NOTIFY_PREF_KEY, enabled ? "on" : "off");
}

export type DueReminder = {
  id: string;
  occurrence: StudyOccurrence;
  minutes: number;
  fireAt: number;
};

export function dueReminders(
  events: StudyEvent[],
  now = Date.now(),
  fired = loadFiredReminders(),
): DueReminder[] {
  const active = events.filter((event) => event.status !== "done");
  const occurrences = upcomingOccurrences(active, new Date(now - 24 * 60 * 60 * 1000), 3);
  const due: DueReminder[] = [];

  for (const occurrence of occurrences) {
    const reminders = (occurrence.source.reminderMinutes ?? []).filter(
      (minutes) => Number.isFinite(minutes) && minutes >= 0,
    );
    const start = Date.parse(occurrence.startAt);
    if (!Number.isFinite(start)) {
      continue;
    }
    for (const minutes of reminders) {
      const fireAt = start - minutes * 60_000;
      const id = reminderId(occurrence, minutes);
      if (fired.has(id)) {
        continue;
      }
      if (now >= fireAt && now <= start + 5 * 60_000) {
        due.push({ id, occurrence, minutes, fireAt });
      }
    }
  }

  return due;
}
