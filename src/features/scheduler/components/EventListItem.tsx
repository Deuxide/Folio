import { BookOpen, Flag } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { formatEventTimeRange } from "@/features/scheduler/dates";
import { reminderLabel } from "@/features/scheduler/reminders";
import {
  PRIORITY_LABEL,
  STATUS_LABEL,
  eventTimingState,
  nextStatus,
  recurrenceLabel,
} from "@/features/scheduler/labels";
import { studyActionLabel } from "@/features/scheduler/studyAction";
import type { StudyEvent } from "@/types/scheduler";

type EventListItemProps = {
  event: StudyEvent;
  occurrenceStart?: string;
  onOpen: (event: StudyEvent) => void;
  onCycleStatus: (event: StudyEvent) => void;
  onDelete: (event: StudyEvent) => void;
};

export function EventListItem({
  event,
  occurrenceStart,
  onOpen,
  onCycleStatus,
  onDelete,
}: EventListItemProps) {
  return (
    <article
      className={
        eventTimingState(occurrenceStart ?? event.startAt, event.status) === "completed"
          ? "rounded-xl border border-border bg-muted/40 px-4 py-3"
          : eventTimingState(occurrenceStart ?? event.startAt, event.status) === "past"
            ? "rounded-xl border border-border bg-card px-4 py-3 opacity-80"
            : "rounded-xl border border-border bg-card px-4 py-3"
      }
    >
      <div className="flex items-start justify-between gap-3">
        <button
          type="button"
          className="min-w-0 text-left"
          onClick={() => onOpen(event)}
        >
          <h3 className="font-medium">
            {event.status === "done" ? `✓ ${event.title}` : event.title}
          </h3>
          <p className="mt-1 text-sm text-muted-foreground">
            {formatEventTimeRange(occurrenceStart ?? event.startAt, event.endAt, event.allDay)}
            {event.subject ? ` · ${event.subject}` : ""}
          </p>
          {event.studyAction ? (
            <p className="mt-1 inline-flex items-center gap-1 text-xs text-muted-foreground">
              <BookOpen className="size-3.5" aria-hidden />
              {studyActionLabel(event.studyAction)}
            </p>
          ) : null}
          {recurrenceLabel(event) ? (
            <p className="mt-1 text-xs text-muted-foreground">{recurrenceLabel(event)}</p>
          ) : null}
          {event.reminderMinutes && event.reminderMinutes.length > 0 ? (
            <p className="mt-1 text-xs text-muted-foreground">
              Reminder: {reminderLabel(event.reminderMinutes[0] ?? 0)}
            </p>
          ) : null}
        </button>
        <span className="inline-flex items-center gap-1 text-xs font-medium text-muted-foreground">
          <Flag
            className={
              event.priority === "high"
                ? "size-3.5 text-foreground"
                : "size-3.5 text-muted-foreground"
            }
          />
          {PRIORITY_LABEL[event.priority]}
        </span>
      </div>
      <div className="mt-3 flex flex-wrap items-center gap-2">
        <Badge variant={event.status === "done" ? "secondary" : "default"}>
          {STATUS_LABEL[event.status]}
        </Badge>
        <Button
          type="button"
          size="sm"
          variant="outline"
          onClick={() => onCycleStatus(event)}
        >
          Mark {STATUS_LABEL[nextStatus(event.status)].toLowerCase()}
        </Button>
        <Button type="button" size="sm" variant="ghost" onClick={() => onOpen(event)}>
          Edit
        </Button>
        <Button type="button" size="sm" variant="ghost" onClick={() => onDelete(event)}>
          Delete
        </Button>
      </div>
    </article>
  );
}
