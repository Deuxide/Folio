import { BookOpen } from "lucide-react";
import { Button } from "@/components/ui/button";
import { formatDayTitle, formatEventTimeRange } from "@/features/scheduler/dates";
import { reminderLabel } from "@/features/scheduler/reminders";
import { PRIORITY_LABEL, STATUS_LABEL, recurrenceLabel } from "@/features/scheduler/labels";
import {
  resolveStudyAction,
  studyActionLabel,
} from "@/features/scheduler/studyAction";
import type { QuestionSet } from "@/types/question";
import type { StudyOccurrence } from "@/types/scheduler";

type EventDetailsDialogProps = {
  occurrence: StudyOccurrence | null;
  questionSets: QuestionSet[];
  onClose: () => void;
  onEdit: () => void;
  onDelete: () => void;
  onStartStudy: (href: string) => void;
  onClearStudyAction: () => void;
};

export function EventDetailsDialog({
  occurrence,
  questionSets,
  onClose,
  onEdit,
  onDelete,
  onStartStudy,
  onClearStudyAction,
}: EventDetailsDialogProps) {
  if (!occurrence) {
    return null;
  }
  const event = occurrence.source;
  const resolved = resolveStudyAction(event.studyAction, questionSets);

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 p-0 sm:items-center sm:p-4">
      <button type="button" className="absolute inset-0" aria-label="Close" onClick={onClose} />
      <div className="relative z-10 w-full max-w-md rounded-t-2xl border border-border bg-background p-5 sm:rounded-2xl">
        <p className="text-sm text-muted-foreground">
          {formatDayTitle(new Date(occurrence.startAt))}
        </p>
        <h2 className="mt-1 font-serif text-2xl font-semibold">{event.title}</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          {formatEventTimeRange(occurrence.startAt, occurrence.endAt, event.allDay)}
          {` · ${PRIORITY_LABEL[event.priority]} priority`}
          {event.subject ? ` · ${event.subject}` : ""}
        </p>
        <p className="mt-1 text-sm text-muted-foreground">{STATUS_LABEL[event.status]}</p>
        {recurrenceLabel(event) ? (
          <p className="mt-1 text-sm text-muted-foreground">{recurrenceLabel(event)}</p>
        ) : null}
        {event.reminderMinutes && event.reminderMinutes.length > 0 ? (
          <p className="mt-1 text-sm text-muted-foreground">
            Reminder: {event.reminderMinutes.map((minutes) => reminderLabel(minutes)).join(", ")}
          </p>
        ) : null}

        <div className="mt-5 rounded-xl border border-border px-4 py-3">
          <p className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
            Study activity
          </p>
          {!event.studyAction ? (
            <p className="mt-1 text-sm">No study activity</p>
          ) : resolved?.ok ? (
            <div className="mt-2 flex items-start gap-2 text-sm">
              <BookOpen className="mt-0.5 size-4 shrink-0" aria-hidden />
              <div>
                <p className="font-medium">{studyActionLabel(event.studyAction)}</p>
                <p className="text-muted-foreground">{resolved.detail}</p>
              </div>
            </div>
          ) : (
            <div className="mt-2 space-y-2 text-sm">
              <p>Study activity unavailable</p>
              <p className="text-muted-foreground">
                {resolved?.reason ?? "This study activity is no longer available."}
              </p>
              <Button type="button" size="sm" variant="outline" onClick={onClearStudyAction}>
                Remove study activity
              </Button>
            </div>
          )}
        </div>

        {event.description ? (
          <p className="mt-4 text-sm">{event.description}</p>
        ) : null}

        <div className="mt-5 flex flex-col gap-2">
          {resolved?.ok ? (
            <Button type="button" onClick={() => onStartStudy(resolved.href)}>
              Start Study Session
            </Button>
          ) : null}
          <Button type="button" variant="outline" onClick={onEdit}>
            Edit
          </Button>
          <Button type="button" variant="ghost" onClick={onDelete}>
            Delete
          </Button>
        </div>
      </div>
    </div>
  );
}
