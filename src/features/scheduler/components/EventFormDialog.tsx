import { useEffect, useState, type FormEvent } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { combineDateAndTime, dateKeyFromIso, formatDateKey, timeFromIso } from "@/features/scheduler/dates";
import { REMINDER_PRESETS } from "@/features/scheduler/reminders";
import { isRecurring, ruleFromDraft } from "@/features/scheduler/recurrence";
import { createId } from "@/lib/ids";
import { normalizeSubjectKey } from "@/features/question-sets/subject";
import type { QuestionSet } from "@/types/question";
import type {
  RecurrenceFrequency,
  StudyEvent,
  StudyEventDraft,
  StudyEventPriority,
  StudyEventStatus,
} from "@/types/scheduler";

const WEEK_DAYS = [
  { value: 1, label: "M", name: "Monday" },
  { value: 2, label: "T", name: "Tuesday" },
  { value: 3, label: "W", name: "Wednesday" },
  { value: 4, label: "T", name: "Thursday" },
  { value: 5, label: "F", name: "Friday" },
  { value: 6, label: "S", name: "Saturday" },
  { value: 0, label: "S", name: "Sunday" },
];

type EventFormDialogProps = {
  open: boolean;
  event?: StudyEvent | null;
  defaultDate?: Date;
  subjects: string[];
  questionSets?: QuestionSet[];
  error?: string | null;
  isSaving?: boolean;
  onOpenChange: (open: boolean) => void;
  onSave: (event: StudyEvent) => void;
};

function draftFromEvent(event: StudyEvent | null | undefined, defaultDate: Date): StudyEventDraft {
  if (!event) {
    return {
      title: "",
      description: "",
      subject: "",
      date: formatDateKey(defaultDate),
      startTime: "15:00",
      endTime: "16:00",
      allDay: false,
      priority: "medium",
      status: "todo",
      reminderMinutes: [],
      repeats: false,
      frequency: "weekly",
      interval: 1,
      daysOfWeek: [defaultDate.getDay()],
      ends: false,
      endDate: "",
      studyKind: "none",
      questionSetId: "",
      subjectKey: "",
    };
  }
  return {
    title: event.title,
    description: event.description ?? "",
    subject: event.subject ?? "",
    date: dateKeyFromIso(event.startAt),
    startTime: timeFromIso(event.startAt),
    endTime: event.endAt ? timeFromIso(event.endAt) : "",
    allDay: event.allDay,
    priority: event.priority,
    status: event.status,
    reminderMinutes: event.reminderMinutes ?? [],
    repeats: isRecurring(event),
    frequency: event.recurrence?.frequency ?? "weekly",
    interval: event.recurrence?.interval ?? 1,
    daysOfWeek: event.recurrence?.daysOfWeek ?? [new Date(event.startAt).getDay()],
    ends: Boolean(event.recurrence?.endDate),
    endDate: event.recurrence?.endDate?.slice(0, 10) ?? "",
    studyKind: event.studyAction?.type ?? "none",
    questionSetId:
      event.studyAction?.type === "question_bank"
        ? event.studyAction.questionSetId
        : "",
    subjectKey:
      event.studyAction?.type === "subject_test"
        ? event.studyAction.subjectKey
        : "",
  };
}

export function EventFormDialog({
  open,
  event,
  defaultDate = new Date(),
  subjects,
  questionSets = [],
  error,
  isSaving = false,
  onOpenChange,
  onSave,
}: EventFormDialogProps) {
  const [draft, setDraft] = useState<StudyEventDraft>(() =>
    draftFromEvent(event, defaultDate),
  );
  const [localError, setLocalError] = useState<string | null>(null);

  useEffect(() => {
    if (open) {
      setDraft(draftFromEvent(event, defaultDate));
      setLocalError(null);
    }
  }, [defaultDate, event, open]);

  if (!open) {
    return null;
  }

  function update<K extends keyof StudyEventDraft>(key: K, value: StudyEventDraft[K]) {
    setDraft((current) => ({ ...current, [key]: value }));
    setLocalError(null);
  }

  function handleSubmit(formEvent: FormEvent) {
    formEvent.preventDefault();
    const title = draft.title.trim();
    if (!title) {
      setLocalError("Give this event a title.");
      return;
    }
    const startAt = draft.allDay
      ? combineDateAndTime(draft.date, "00:00")
      : combineDateAndTime(draft.date, draft.startTime || "09:00");
    let endAt: string | undefined;
    if (!draft.allDay && draft.endTime) {
      endAt = combineDateAndTime(draft.date, draft.endTime);
      if (Date.parse(endAt) <= Date.parse(startAt)) {
        setLocalError("End time must be after the start time.");
        return;
      }
    }
    const now = new Date().toISOString();
    const next: StudyEvent = {
      id: event?.id ?? createId("event"),
      title,
      allDay: draft.allDay,
      startAt,
      status: draft.status,
      priority: draft.priority,
      createdAt: event?.createdAt ?? now,
      updatedAt: now,
    };
    if (draft.description.trim()) {
      next.description = draft.description.trim();
    }
    if (draft.subject.trim()) {
      next.subject = draft.subject.trim();
    }
    if (endAt) {
      next.endAt = endAt;
    }
    if (draft.reminderMinutes.length > 0) {
      next.reminderMinutes = [...draft.reminderMinutes].sort((left, right) => left - right);
    }
    const recurrence = ruleFromDraft(draft);
    if (recurrence) {
      next.recurrence = recurrence;
    } else {
      next.recurrence = null;
    }
    if (event?.exceptionDates) {
      next.exceptionDates = event.exceptionDates;
    }
    if (event?.seriesId) {
      next.seriesId = event.seriesId;
    }
    if (draft.studyKind === "question_bank" && draft.questionSetId) {
      next.studyAction = {
        type: "question_bank",
        questionSetId: draft.questionSetId,
      };
    } else if (draft.studyKind === "subject_test" && draft.subjectKey) {
      next.studyAction = {
        type: "subject_test",
        subjectKey: draft.subjectKey,
      };
    } else {
      next.studyAction = null;
    }
    onSave(next);
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 p-0 sm:items-center sm:p-4">
      <button
        type="button"
        className="absolute inset-0"
        aria-label="Close"
        onClick={() => onOpenChange(false)}
      />
      <form
        onSubmit={handleSubmit}
        className="relative z-10 max-h-[92dvh] w-full overflow-y-auto rounded-t-2xl border border-border bg-background p-5 shadow-lg sm:max-w-lg sm:rounded-2xl"
      >
        <h2 className="font-serif text-2xl font-semibold">
          {event ? "Edit event" : "Create event"}
        </h2>
        <div className="mt-5 space-y-4">
          <div className="space-y-2">
            <Label htmlFor="event-title">Title</Label>
            <Input
              id="event-title"
              value={draft.title}
              onChange={(change) => update("title", change.target.value)}
              placeholder="Physics revision"
              autoFocus
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="event-description">Description</Label>
            <textarea
              id="event-description"
              value={draft.description}
              onChange={(change) => update("description", change.target.value)}
              rows={3}
              className="w-full rounded-lg border border-input bg-background px-3.5 py-2 text-base text-foreground md:text-sm"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="event-subject">Subject</Label>
            <select
              id="event-subject"
              value={draft.subject}
              onChange={(change) => update("subject", change.target.value)}
              className="h-11 w-full rounded-lg border border-input bg-background px-3.5 text-sm"
            >
              <option value="">No subject</option>
              {subjects.map((subject) => (
                <option key={subject} value={subject}>
                  {subject}
                </option>
              ))}
            </select>
          </div>
          <fieldset className="space-y-3">
            <legend className="text-sm font-medium">Study activity</legend>
            <select
              aria-label="Study activity"
              value={draft.studyKind}
              onChange={(change) =>
                update(
                  "studyKind",
                  change.target.value as StudyEventDraft["studyKind"],
                )
              }
              className="h-11 w-full rounded-lg border border-input bg-background px-3.5 text-sm"
            >
              <option value="none">None</option>
              <option value="question_bank">Question bank</option>
              <option value="subject_test">Subject test</option>
            </select>
            {draft.studyKind === "question_bank" ? (
              questionSets.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  No question banks available.
                </p>
              ) : (
                <div className="space-y-2">
                  <Label htmlFor="event-bank">Question bank</Label>
                  <select
                    id="event-bank"
                    value={draft.questionSetId}
                    onChange={(change) => update("questionSetId", change.target.value)}
                    className="h-11 w-full rounded-lg border border-input bg-background px-3.5 text-sm"
                  >
                    <option value="">Select question bank</option>
                    {questionSets.map((set) => (
                      <option key={set.id} value={set.id}>
                        {set.subject ? `${set.subject} — ${set.title}` : set.title}
                      </option>
                    ))}
                  </select>
                </div>
              )
            ) : null}
            {draft.studyKind === "subject_test" ? (
              subjects.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  No subjects available.
                </p>
              ) : (
                <div className="space-y-2">
                  <Label htmlFor="event-study-subject">Subject</Label>
                  <select
                    id="event-study-subject"
                    value={draft.subjectKey}
                    onChange={(change) => update("subjectKey", change.target.value)}
                    className="h-11 w-full rounded-lg border border-input bg-background px-3.5 text-sm"
                  >
                    <option value="">Select subject</option>
                    {subjects.map((subject) => (
                      <option key={subject} value={normalizeSubjectKey(subject)}>
                        {subject}
                      </option>
                    ))}
                  </select>
                </div>
              )
            ) : null}
          </fieldset>
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="event-date">Date</Label>
              <Input
                id="event-date"
                type="date"
                value={draft.date}
                onChange={(change) => update("date", change.target.value)}
              />
            </div>
            <label className="flex items-end gap-2 pb-2 text-sm">
              <input
                type="checkbox"
                checked={draft.allDay}
                onChange={(change) => update("allDay", change.target.checked)}
                className="size-4 accent-primary"
              />
              All day
            </label>
          </div>
          {draft.allDay ? null : (
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="event-start">Start time</Label>
                <Input
                  id="event-start"
                  type="time"
                  value={draft.startTime}
                  onChange={(change) => update("startTime", change.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="event-end">End time</Label>
                <Input
                  id="event-end"
                  type="time"
                  value={draft.endTime}
                  onChange={(change) => update("endTime", change.target.value)}
                />
              </div>
            </div>
          )}
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="event-priority">Priority</Label>
              <select
                id="event-priority"
                value={draft.priority}
                onChange={(change) =>
                  update("priority", change.target.value as StudyEventPriority)
                }
                className="h-11 w-full rounded-lg border border-input bg-background px-3.5 text-sm"
              >
                <option value="low">Low</option>
                <option value="medium">Medium</option>
                <option value="high">High</option>
              </select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="event-status">Status</Label>
              <select
                id="event-status"
                value={draft.status}
                onChange={(change) =>
                  update("status", change.target.value as StudyEventStatus)
                }
                className="h-11 w-full rounded-lg border border-input bg-background px-3.5 text-sm"
              >
                <option value="todo">To do</option>
                <option value="in_progress">In progress</option>
                <option value="done">Done</option>
              </select>
            </div>
          </div>
          <fieldset className="space-y-3">
            <legend className="text-sm font-medium">Repeat</legend>
            <select
              aria-label="Repeat"
              value={draft.repeats ? draft.frequency : "none"}
              onChange={(change) => {
                const value = change.target.value;
                if (value === "none") {
                  update("repeats", false);
                  return;
                }
                update("repeats", true);
                update("frequency", value as RecurrenceFrequency);
              }}
              className="h-11 w-full rounded-lg border border-input bg-background px-3.5 text-sm"
            >
              <option value="none">Does not repeat</option>
              <option value="daily">Every day</option>
              <option value="weekly">Every week</option>
              <option value="monthly">Every month</option>
            </select>
            {draft.repeats ? (
              <>
                <div className="flex items-center gap-2">
                  <Label htmlFor="event-interval">Every</Label>
                  <Input
                    id="event-interval"
                    type="number"
                    min={1}
                    className="w-20"
                    value={draft.interval}
                    onChange={(change) =>
                      update("interval", Math.max(1, Number(change.target.value) || 1))
                    }
                  />
                  <span className="text-sm text-muted-foreground">
                    {draft.frequency === "daily"
                      ? draft.interval === 1
                        ? "day"
                        : "days"
                      : draft.frequency === "weekly"
                        ? draft.interval === 1
                          ? "week"
                          : "weeks"
                        : draft.interval === 1
                          ? "month"
                          : "months"}
                  </span>
                </div>
                {draft.frequency === "weekly" ? (
                  <div>
                    <p className="mb-2 text-sm">Repeat on</p>
                    <div className="flex flex-wrap gap-1">
                      {WEEK_DAYS.map((day) => {
                        const selected = draft.daysOfWeek.includes(day.value);
                        return (
                          <button
                            key={day.name}
                            type="button"
                            aria-pressed={selected}
                            aria-label={day.name}
                            className={
                              selected
                                ? "size-8 rounded-full bg-primary text-xs font-medium text-primary-foreground"
                                : "size-8 rounded-full border border-border text-xs"
                            }
                            onClick={() => {
                              const next = selected
                                ? draft.daysOfWeek.filter((item) => item !== day.value)
                                : [...draft.daysOfWeek, day.value];
                              update("daysOfWeek", next);
                            }}
                          >
                            {day.label}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                ) : null}
                <div className="space-y-2">
                  <Label htmlFor="event-ends">Ends</Label>
                  <select
                    id="event-ends"
                    value={draft.ends ? "on" : "never"}
                    onChange={(change) => update("ends", change.target.value === "on")}
                    className="h-11 w-full rounded-lg border border-input bg-background px-3.5 text-sm"
                  >
                    <option value="never">Never</option>
                    <option value="on">On date</option>
                  </select>
                  {draft.ends ? (
                    <Input
                      type="date"
                      aria-label="Recurrence end date"
                      value={draft.endDate}
                      onChange={(change) => update("endDate", change.target.value)}
                    />
                  ) : null}
                </div>
              </>
            ) : null}
          </fieldset>
          <fieldset className="space-y-2">
            <legend className="text-sm font-medium">Reminders</legend>
            <div className="space-y-2">
              {REMINDER_PRESETS.map((preset) => {
                const checked = draft.reminderMinutes.includes(preset.minutes);
                return (
                  <label key={preset.minutes} className="flex items-center gap-2 text-sm">
                    <input
                      type="checkbox"
                      className="size-4 accent-primary"
                      checked={checked}
                      onChange={() => {
                        update(
                          "reminderMinutes",
                          checked
                            ? draft.reminderMinutes.filter((item) => item !== preset.minutes)
                            : [...draft.reminderMinutes, preset.minutes],
                        );
                      }}
                    />
                    {preset.label}
                  </label>
                );
              })}
            </div>
          </fieldset>
          {localError || error ? (
            <p className="text-sm text-destructive" role="alert">
              {localError ?? error}
            </p>
          ) : null}
        </div>
        <div className="mt-6 flex justify-end gap-2">
          <Button type="button" variant="ghost" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button type="submit" disabled={isSaving}>
            {isSaving ? "Saving…" : "Save"}
          </Button>
        </div>
      </form>
    </div>
  );
}
