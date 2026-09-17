import type {
  StudyEvent,
  StudyEventPriority,
  StudyEventStatus,
} from "@/types/scheduler";

const WEEKDAY_NAMES = [
  "Sunday",
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
];

export const STATUS_LABEL: Record<StudyEventStatus, string> = {
  todo: "To do",
  in_progress: "In progress",
  done: "Done",
};

export const PRIORITY_LABEL: Record<StudyEventPriority, string> = {
  low: "Low",
  medium: "Medium",
  high: "High",
};

export function nextStatus(status: StudyEventStatus): StudyEventStatus {
  if (status === "todo") {
    return "in_progress";
  }
  if (status === "in_progress") {
    return "done";
  }
  return "todo";
}

export function recurrenceLabel(event: StudyEvent): string | undefined {
  const rule = event.recurrence;
  if (!rule || rule.interval < 1) {
    return undefined;
  }
  const count = rule.interval;
  if (rule.frequency === "daily") {
    return count === 1 ? "Repeats every day" : `Repeats every ${count} days`;
  }
  if (rule.frequency === "weekly") {
    if (rule.daysOfWeek && rule.daysOfWeek.length === 1) {
      const name = WEEKDAY_NAMES[rule.daysOfWeek[0] ?? 0];
      return `Repeats every ${name}`;
    }
    return count === 1 ? "Repeats every week" : `Repeats every ${count} weeks`;
  }
  return count === 1 ? "Repeats every month" : `Repeats every ${count} months`;
}

export function eventTimingState(
  startAt: string,
  status: StudyEventStatus,
  now = Date.now(),
): "upcoming" | "in_progress" | "completed" | "past" {
  if (status === "done") {
    return "completed";
  }
  if (status === "in_progress") {
    return "in_progress";
  }
  if (Date.parse(startAt) < now) {
    return "past";
  }
  return "upcoming";
}
