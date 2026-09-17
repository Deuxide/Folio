import {
  addDays,
  addMonths,
  combineDateAndTime,
  dateKeyFromIso,
  formatDateKey,
  parseDateKey,
  timeFromIso,
} from "@/features/scheduler/dates";
import type {
  RecurrenceRule,
  StudyEvent,
  StudyOccurrence,
} from "@/types/scheduler";

export function isRecurring(event: StudyEvent): boolean {
  return Boolean(event.recurrence && event.recurrence.interval >= 1);
}

export function shiftDateTime(iso: string, dateKey: string): string {
  return combineDateAndTime(dateKey, timeFromIso(iso));
}

function validRule(rule: RecurrenceRule | null | undefined): RecurrenceRule | null {
  if (!rule) {
    return null;
  }
  if (rule.frequency !== "daily" && rule.frequency !== "weekly" && rule.frequency !== "monthly") {
    return null;
  }
  const interval = Number.isFinite(rule.interval) ? Math.max(1, Math.floor(rule.interval)) : 1;
  return {
    frequency: rule.frequency,
    interval,
    daysOfWeek: rule.daysOfWeek?.filter((day) => day >= 0 && day <= 6),
    endDate: rule.endDate,
  };
}

function inRange(dateKey: string, rangeStart: string, rangeEnd: string): boolean {
  return dateKey >= rangeStart && dateKey <= rangeEnd;
}

function occurrenceFrom(event: StudyEvent, dateKey: string): StudyOccurrence {
  const occurrence: StudyOccurrence = {
    source: event,
    startAt: event.allDay
      ? combineDateAndTime(dateKey, "00:00")
      : shiftDateTime(event.startAt, dateKey),
    dateKey,
  };
  if (event.endAt) {
    occurrence.endAt = shiftDateTime(event.endAt, dateKey);
  }
  return occurrence;
}

function weeklyDays(rule: RecurrenceRule, seed: Date): number[] {
  if (rule.daysOfWeek && rule.daysOfWeek.length > 0) {
    return [...new Set(rule.daysOfWeek)];
  }
  return [seed.getDay()];
}

export function expandEvents(
  events: StudyEvent[],
  rangeStartDate: Date,
  rangeEndDate: Date,
): StudyOccurrence[] {
  const rangeStart = formatDateKey(rangeStartDate);
  const rangeEnd = formatDateKey(rangeEndDate);
  const occurrences: StudyOccurrence[] = [];

  for (const event of events) {
    const exceptions = new Set(event.exceptionDates ?? []);
    const rule = validRule(event.recurrence ?? null);
    if (!rule) {
      const key = dateKeyFromIso(event.startAt);
      if (inRange(key, rangeStart, rangeEnd) && !exceptions.has(key)) {
        occurrences.push(occurrenceFrom(event, key));
      }
      continue;
    }

    const seed = new Date(event.startAt);
    const until = rule.endDate ? rule.endDate.slice(0, 10) : rangeEnd;
    const hardEnd = until < rangeEnd ? until : rangeEnd;
    let guard = 0;

    if (rule.frequency === "daily") {
      let cursor = new Date(seed);
      while (formatDateKey(cursor) < rangeStart && guard < 800) {
        cursor = addDays(cursor, rule.interval);
        guard += 1;
      }
      while (formatDateKey(cursor) <= hardEnd && guard < 800) {
        const key = formatDateKey(cursor);
        if (key >= dateKeyFromIso(event.startAt) && !exceptions.has(key)) {
          occurrences.push(occurrenceFrom(event, key));
        }
        cursor = addDays(cursor, rule.interval);
        guard += 1;
      }
    } else if (rule.frequency === "weekly") {
      const days = weeklyDays(rule, seed);
      let weekStart = new Date(seed);
      weekStart.setDate(weekStart.getDate() - weekStart.getDay());
      while (formatDateKey(addDays(weekStart, 6)) < rangeStart && guard < 400) {
        weekStart = addDays(weekStart, 7 * rule.interval);
        guard += 1;
      }
      while (formatDateKey(weekStart) <= hardEnd && guard < 400) {
        for (const weekday of days) {
          const day = addDays(weekStart, weekday);
          const key = formatDateKey(day);
          if (
            key >= dateKeyFromIso(event.startAt) &&
            key <= hardEnd &&
            key >= rangeStart &&
            !exceptions.has(key)
          ) {
            occurrences.push(occurrenceFrom(event, key));
          }
        }
        weekStart = addDays(weekStart, 7 * rule.interval);
        guard += 1;
      }
    } else {
      let cursor = new Date(seed.getFullYear(), seed.getMonth(), 1);
      while (formatDateKey(addMonths(cursor, 1)) <= rangeStart && guard < 240) {
        cursor = addMonths(cursor, rule.interval);
        guard += 1;
      }
      while (formatDateKey(cursor) <= hardEnd && guard < 240) {
        const candidate = new Date(
          cursor.getFullYear(),
          cursor.getMonth(),
          seed.getDate(),
          seed.getHours(),
          seed.getMinutes(),
        );
        if (candidate.getMonth() === cursor.getMonth()) {
          const key = formatDateKey(candidate);
          if (
            key >= dateKeyFromIso(event.startAt) &&
            key <= hardEnd &&
            key >= rangeStart &&
            !exceptions.has(key)
          ) {
            occurrences.push(occurrenceFrom(event, key));
          }
        }
        cursor = addMonths(cursor, rule.interval);
        guard += 1;
      }
    }
  }

  return occurrences.sort((left, right) => left.startAt.localeCompare(right.startAt));
}

export function upcomingOccurrences(
  events: StudyEvent[],
  from = new Date(),
  daysAhead = 28,
): StudyOccurrence[] {
  const start = new Date(from);
  start.setHours(0, 0, 0, 0);
  const end = addDays(start, daysAhead);
  return expandEvents(events, start, end).filter((occurrence) => {
    if (occurrence.source.status === "done") {
      return false;
    }
    return occurrence.startAt >= from.toISOString() || occurrence.dateKey >= formatDateKey(from);
  });
}

export function occurrenceKey(occurrence: StudyOccurrence): string {
  return `${occurrence.source.id}:${occurrence.dateKey}`;
}

export function applyException(event: StudyEvent, dateKey: string): StudyEvent {
  const existing = event.exceptionDates ?? [];
  if (existing.includes(dateKey)) {
    return event;
  }
  return {
    ...event,
    exceptionDates: [...existing, dateKey],
    updatedAt: new Date().toISOString(),
  };
}

export function ruleFromDraft(draft: {
  repeats: boolean;
  frequency: RecurrenceRule["frequency"];
  interval: number;
  daysOfWeek: number[];
  ends: boolean;
  endDate: string;
}): RecurrenceRule | null {
  if (!draft.repeats) {
    return null;
  }
  const rule: RecurrenceRule = {
    frequency: draft.frequency,
    interval: Math.max(1, draft.interval || 1),
  };
  if (draft.frequency === "weekly" && draft.daysOfWeek.length > 0) {
    rule.daysOfWeek = draft.daysOfWeek;
  }
  if (draft.ends && draft.endDate) {
    rule.endDate = draft.endDate;
  }
  return rule;
}

export function createDetachedOccurrence(
  series: StudyEvent,
  dateKey: string,
  updates: StudyEvent,
): StudyEvent {
  const detached: StudyEvent = {
    ...updates,
    id: `${series.id}:${dateKey}`,
    seriesId: series.id,
    recurrence: null,
    exceptionDates: undefined,
    startAt: updates.allDay
      ? combineDateAndTime(dateKey, "00:00")
      : shiftDateTime(updates.startAt, dateKey),
    createdAt: series.createdAt,
    updatedAt: new Date().toISOString(),
  };
  if (updates.endAt) {
    detached.endAt = shiftDateTime(updates.endAt, dateKey);
  }
  return detached;
}

export function parseDateKeySafe(key: string): Date {
  return parseDateKey(key);
}
