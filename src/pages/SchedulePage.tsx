import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { AgendaView } from "@/features/scheduler/components/AgendaView";
import { CalendarViews } from "@/features/scheduler/components/CalendarViews";
import { DeleteEventDialog } from "@/features/scheduler/components/DeleteEventDialog";
import { EventDetailsDialog } from "@/features/scheduler/components/EventDetailsDialog";
import { EventFormDialog } from "@/features/scheduler/components/EventFormDialog";
import { EventListItem } from "@/features/scheduler/components/EventListItem";
import { NotificationSettings } from "@/features/scheduler/components/NotificationSettings";
import { RecurrenceEditDialog } from "@/features/scheduler/components/RecurrenceEditDialog";
import {
  addDays,
  addMonths,
  formatDateKey,
  formatDayTitle,
  formatMonthTitle,
  formatWeekTitle,
  isSameDay,
  monthGrid,
  startOfDay,
  startOfWeek,
} from "@/features/scheduler/dates";
import { nextStatus } from "@/features/scheduler/labels";
import {
  applyException,
  createDetachedOccurrence,
  expandEvents,
  isRecurring,
  upcomingOccurrences,
} from "@/features/scheduler/recurrence";
import {
  markScheduledEventStatus,
  withEventQuery,
} from "@/features/scheduler/studyAction";
import { QuestionSetRepository } from "@/repositories/QuestionSetRepository";
import { StudyEventRepository } from "@/repositories/StudyEventRepository";
import type { QuestionSet } from "@/types/question";
import type { StudyEvent, StudyOccurrence } from "@/types/scheduler";

type CalendarView = "month" | "week" | "day" | "agenda";
type EventFilter = "all" | "study" | "personal" | "todo" | "in_progress" | "done";

function upsertEvent(list: StudyEvent[], event: StudyEvent): StudyEvent[] {
  return [...list.filter((item) => item.id !== event.id), event].sort((left, right) =>
    left.startAt.localeCompare(right.startAt),
  );
}

function priorityRank(priority: StudyEvent["priority"]): number {
  if (priority === "high") {
    return 0;
  }
  if (priority === "medium") {
    return 1;
  }
  return 2;
}

export function SchedulePage() {
  const navigate = useNavigate();
  const [events, setEvents] = useState<StudyEvent[]>([]);
  const [questionSets, setQuestionSets] = useState<QuestionSet[]>([]);
  const [subjects, setSubjects] = useState<string[]>([]);
  const [details, setDetails] = useState<StudyOccurrence | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [view, setView] = useState<CalendarView>("month");
  const [filter, setFilter] = useState<EventFilter>("all");
  const [anchor, setAnchor] = useState(() => startOfDay(new Date()));
  const [selectedDate, setSelectedDate] = useState(() => startOfDay(new Date()));
  const [editorOpen, setEditorOpen] = useState(false);
  const [editing, setEditing] = useState<StudyEvent | null>(null);
  const [editingOccurrence, setEditingOccurrence] = useState<StudyOccurrence | null>(null);
  const [pendingDraft, setPendingDraft] = useState<StudyEvent | null>(null);
  const [scopeOpen, setScopeOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [pendingDelete, setPendingDelete] = useState<StudyEvent | null>(null);
  const [pendingDeleteOccurrence, setPendingDeleteOccurrence] =
    useState<StudyOccurrence | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        const [savedEvents, sets] = await Promise.all([
          StudyEventRepository.getAll(),
          QuestionSetRepository.getAll(),
        ]);
        if (cancelled) {
          return;
        }
        setEvents(savedEvents);
        setQuestionSets(sets);
        const unique = [
          ...new Set(
            sets
              .map((set) => set.subject?.trim())
              .filter((subject): subject is string => Boolean(subject)),
          ),
        ].sort((left, right) => left.localeCompare(right));
        setSubjects(unique);
      } catch (cause) {
        if (!cancelled) {
          setLoadError(
            cause instanceof Error
              ? cause.message
              : "Unable to load your schedule.",
          );
        }
      } finally {
        if (!cancelled) {
          setIsLoading(false);
        }
      }
    }
    void load();
    return () => {
      cancelled = true;
    };
  }, []);

  const visibleRange = useMemo(() => {
    if (view === "week") {
      const start = startOfWeek(anchor);
      return { start, end: addDays(start, 6) };
    }
    if (view === "day") {
      return { start: selectedDate, end: selectedDate };
    }
    if (view === "agenda") {
      const start = startOfDay(new Date());
      return { start, end: addDays(start, 14) };
    }
    const days = monthGrid(anchor);
    return { start: days[0] ?? anchor, end: days[41] ?? anchor };
  }, [anchor, selectedDate, view]);

  const occurrences = useMemo(() => {
    const expanded = expandEvents(events, visibleRange.start, visibleRange.end);
    return expanded.filter((occurrence) => {
      if (filter === "study") {
        return Boolean(occurrence.source.studyAction);
      }
      if (filter === "personal") {
        return !occurrence.source.studyAction;
      }
      if (filter === "todo" || filter === "in_progress" || filter === "done") {
        return occurrence.source.status === filter;
      }
      return true;
    });
  }, [events, filter, visibleRange.end, visibleRange.start]);
  const selectedKey = formatDateKey(selectedDate);
  const selectedOccurrences = useMemo(
    () => occurrences.filter((occurrence) => occurrence.dateKey === selectedKey),
    [occurrences, selectedKey],
  );
  const upcoming = useMemo(() => {
    return upcomingOccurrences(events)
      .filter((occurrence) => {
        if (filter === "study") {
          return Boolean(occurrence.source.studyAction);
        }
        if (filter === "personal") {
          return !occurrence.source.studyAction;
        }
        if (filter === "todo" || filter === "in_progress" || filter === "done") {
          return occurrence.source.status === filter;
        }
        return true;
      })
      .sort((left, right) => {
        const time = left.startAt.localeCompare(right.startAt);
        if (time !== 0) {
          return time;
        }
        return priorityRank(left.source.priority) - priorityRank(right.source.priority);
      })
      .slice(0, 12);
  }, [events, filter]);

  const title =
    view === "month"
      ? formatMonthTitle(anchor)
      : view === "week"
        ? formatWeekTitle(anchor)
        : view === "agenda"
          ? "Agenda"
          : formatDayTitle(selectedDate);

  function goToday() {
    const today = startOfDay(new Date());
    setAnchor(today);
    setSelectedDate(today);
  }

  function goPrevious() {
    if (view === "month") {
      setAnchor((current) => addMonths(current, -1));
      return;
    }
    const next = addDays(view === "week" ? anchor : selectedDate, view === "week" ? -7 : -1);
    setAnchor(next);
    setSelectedDate(next);
  }

  function goNext() {
    if (view === "month") {
      setAnchor((current) => addMonths(current, 1));
      return;
    }
    const next = addDays(view === "week" ? anchor : selectedDate, view === "week" ? 7 : 1);
    setAnchor(next);
    setSelectedDate(next);
  }

  function openCreate() {
    setEditing(null);
    setEditingOccurrence(null);
    setSaveError(null);
    setEditorOpen(true);
  }

  function openOccurrence(occurrence: StudyOccurrence) {
    setDetails(occurrence);
  }

  function openEditFromDetails() {
    if (!details) {
      return;
    }
    setEditing(details.source);
    setEditingOccurrence(details);
    setSaveError(null);
    setEditorOpen(true);
    setDetails(null);
  }

  async function persist(event: StudyEvent) {
    const saved = await StudyEventRepository.save(event);
    setEvents((current) => upsertEvent(current, saved));
    return saved;
  }

  async function commitSave(event: StudyEvent, mode: "series" | "occurrence" | "single") {
    setIsSaving(true);
    setSaveError(null);
    try {
      if (mode === "occurrence" && editingOccurrence && isRecurring(editingOccurrence.source)) {
        const series = applyException(editingOccurrence.source, editingOccurrence.dateKey);
        await persist(series);
        const detached = createDetachedOccurrence(
          editingOccurrence.source,
          editingOccurrence.dateKey,
          event,
        );
        await persist(detached);
      } else {
        await persist(event);
      }
      setSelectedDate(startOfDay(new Date(event.startAt)));
      setEditorOpen(false);
      setEditing(null);
      setEditingOccurrence(null);
      setPendingDraft(null);
      setScopeOpen(false);
    } catch (cause) {
      setSaveError(
        cause instanceof Error ? cause.message : "Unable to save this event.",
      );
    } finally {
      setIsSaving(false);
    }
  }

  function handleSaveRequest(event: StudyEvent) {
    if (editingOccurrence && isRecurring(editingOccurrence.source) && !event.seriesId) {
      setPendingDraft(event);
      setScopeOpen(true);
      return;
    }
    void commitSave(event, "single");
  }

  async function handleCycleStatus(event: StudyEvent) {
    const updated: StudyEvent = {
      ...event,
      status: nextStatus(event.status),
      updatedAt: new Date().toISOString(),
    };
    await persist(updated);
  }

  async function confirmDelete() {
    const target = pendingDelete;
    const occurrence = pendingDeleteOccurrence;
    if (!target) {
      return;
    }
    setIsDeleting(true);
    setDeleteError(null);
    try {
      if (occurrence && isRecurring(target) && !target.seriesId) {
        await persist(applyException(target, occurrence.dateKey));
      } else {
        await StudyEventRepository.delete(target.id);
        setEvents((current) => current.filter((item) => item.id !== target.id));
      }
      setPendingDelete(null);
      setPendingDeleteOccurrence(null);
    } catch (cause) {
      setDeleteError(
        cause instanceof Error ? cause.message : "Unable to delete this event.",
      );
    } finally {
      setIsDeleting(false);
    }
  }

  const groupedUpcoming = useMemo(() => {
    const groups = new Map<string, StudyOccurrence[]>();
    for (const occurrence of upcoming) {
      const list = groups.get(occurrence.dateKey) ?? [];
      list.push(occurrence);
      groups.set(occurrence.dateKey, list);
    }
    return [...groups.entries()];
  }, [upcoming]);

  return (
    <div className="space-y-8">
      <header className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-sm font-medium tracking-wide text-primary uppercase">
            Planner
          </p>
          <h1 className="mt-1 font-serif text-3xl font-semibold tracking-tight sm:text-4xl">
            Schedule
          </h1>
        </div>
        <Button type="button" onClick={openCreate}>
          <Plus />
          Create event
        </Button>
      </header>

      {isLoading ? (
        <div className="h-64 animate-pulse rounded-2xl border border-border bg-card" />
      ) : loadError ? (
        <p className="text-sm text-destructive">{loadError}</p>
      ) : (
        <>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <Button type="button" variant="outline" size="sm" onClick={goPrevious}>
                Previous
              </Button>
              <Button type="button" variant="outline" size="sm" onClick={goToday}>
                Today
              </Button>
              <Button type="button" variant="outline" size="sm" onClick={goNext}>
                Next
              </Button>
            </div>
            <div className="flex flex-wrap gap-1 rounded-lg border border-border p-1">
              {(["month", "week", "day", "agenda"] as const).map((item) => (
                <button
                  key={item}
                  type="button"
                  onClick={() => setView(item)}
                  className={
                    view === item
                      ? "rounded-md bg-accent px-3 py-1 text-sm font-medium"
                      : "rounded-md px-3 py-1 text-sm text-muted-foreground"
                  }
                >
                  {item[0]?.toUpperCase()}
                  {item.slice(1)}
                </button>
              ))}
            </div>
          </div>
          <h2 className="font-serif text-xl font-semibold">{title}</h2>
          <div className="flex flex-wrap gap-2">
            {(
              [
                ["all", "All"],
                ["study", "Study"],
                ["personal", "Personal"],
                ["todo", "To do"],
                ["in_progress", "In progress"],
                ["done", "Done"],
              ] as const
            ).map(([value, label]) => (
              <button
                key={value}
                type="button"
                onClick={() => setFilter(value)}
                className={
                  filter === value
                    ? "rounded-full bg-accent px-3 py-1 text-xs font-medium"
                    : "rounded-full border border-border px-3 py-1 text-xs text-muted-foreground"
                }
              >
                {label}
              </button>
            ))}
          </div>

          {events.length === 0 ? (
            <section className="rounded-2xl border border-dashed border-border px-6 py-16 text-center">
              <h2 className="font-serif text-2xl font-semibold">
                Nothing scheduled yet
              </h2>
              <p className="mx-auto mt-2 max-w-sm text-sm text-muted-foreground">
                Add an event to plan your next study session.
              </p>
              <Button type="button" className="mt-6" onClick={openCreate}>
                Create event
              </Button>
            </section>
          ) : view === "agenda" ? (
            <AgendaView
              groups={groupedUpcoming}
              emptyLabel="No upcoming events."
              onOpen={openOccurrence}
              onCycleStatus={(item) => {
                void handleCycleStatus(item);
              }}
              onDelete={(occurrence) => {
                setPendingDelete(occurrence.source);
                setPendingDeleteOccurrence(occurrence);
              }}
            />
          ) : (
            <CalendarViews
              view={view}
              anchor={anchor}
              selectedDate={selectedDate}
              occurrences={occurrences}
              onSelectDate={(date) => {
                setSelectedDate(date);
                if (view !== "month") {
                  setAnchor(date);
                }
              }}
              onOpenOccurrence={openOccurrence}
            />
          )}

          <section className="grid gap-6 lg:grid-cols-2">
            <div className="space-y-3">
              <h2 className="font-serif text-2xl font-semibold">
                {isSameDay(selectedDate, new Date())
                  ? "Today"
                  : formatDayTitle(selectedDate)}
              </h2>
              {selectedOccurrences.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  {isSameDay(selectedDate, new Date())
                    ? "Your day is clear. Add a study session or another event."
                    : "Nothing scheduled for this day."}
                </p>
              ) : (
                selectedOccurrences.map((occurrence) => (
                  <EventListItem
                    key={`${occurrence.source.id}-${occurrence.dateKey}`}
                    event={occurrence.source}
                    occurrenceStart={occurrence.startAt}
                    onOpen={() => openOccurrence(occurrence)}
                    onCycleStatus={(item) => {
                      void handleCycleStatus(item);
                    }}
                    onDelete={() => {
                      setPendingDelete(occurrence.source);
                      setPendingDeleteOccurrence(occurrence);
                    }}
                  />
                ))
              )}
            </div>
            <div className="space-y-3">
              <h2 className="font-serif text-2xl font-semibold">Upcoming</h2>
              {groupedUpcoming.length === 0 ? (
                <p className="text-sm text-muted-foreground">No upcoming events.</p>
              ) : (
                groupedUpcoming.map(([dateKey, items]) => (
                  <div key={dateKey} className="space-y-2">
                    <p className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
                      {dateKey === formatDateKey(new Date())
                        ? "Today"
                        : dateKey === formatDateKey(addDays(new Date(), 1))
                          ? "Tomorrow"
                          : formatDayTitle(new Date(`${dateKey}T00:00:00`))}
                    </p>
                    {items.map((occurrence) => (
                      <EventListItem
                        key={`${occurrence.source.id}-${occurrence.dateKey}`}
                        event={occurrence.source}
                        occurrenceStart={occurrence.startAt}
                        onOpen={() => openOccurrence(occurrence)}
                        onCycleStatus={(item) => {
                          void handleCycleStatus(item);
                        }}
                        onDelete={() => {
                          setPendingDelete(occurrence.source);
                          setPendingDeleteOccurrence(occurrence);
                        }}
                      />
                    ))}
                  </div>
                ))
              )}
            </div>
          </section>
          <NotificationSettings />
        </>
      )}

      <EventFormDialog
        open={editorOpen}
        event={
          editing && editingOccurrence
            ? { ...editing, startAt: editingOccurrence.startAt, endAt: editingOccurrence.endAt }
            : editing
        }
        defaultDate={selectedDate}
        subjects={subjects}
        questionSets={questionSets}
        error={saveError}
        isSaving={isSaving}
        onOpenChange={setEditorOpen}
        onSave={handleSaveRequest}
      />
      <EventDetailsDialog
        occurrence={details}
        questionSets={questionSets}
        onClose={() => setDetails(null)}
        onEdit={openEditFromDetails}
        onDelete={() => {
          if (!details) {
            return;
          }
          setPendingDelete(details.source);
          setPendingDeleteOccurrence(details);
          setDetails(null);
        }}
        onStartStudy={(href) => {
          if (!details) {
            return;
          }
          void markScheduledEventStatus(details.source.id, "in_progress");
          setEvents((current) =>
            current.map((item) =>
              item.id === details.source.id
                ? { ...item, status: "in_progress" }
                : item,
            ),
          );
          setDetails(null);
          void navigate(withEventQuery(href, details.source.id));
        }}
        onClearStudyAction={() => {
          if (!details) {
            return;
          }
          const updated = {
            ...details.source,
            studyAction: null,
            updatedAt: new Date().toISOString(),
          };
          void persist(updated);
          setDetails({ ...details, source: updated });
        }}
      />
      <RecurrenceEditDialog
        open={scopeOpen}
        onSeries={() => {
          if (pendingDraft) {
            void commitSave(pendingDraft, "series");
          }
        }}
        onOccurrence={() => {
          if (pendingDraft) {
            void commitSave(pendingDraft, "occurrence");
          }
        }}
        onCancel={() => {
          setScopeOpen(false);
          setPendingDraft(null);
        }}
      />
      <DeleteEventDialog
        open={pendingDelete !== null}
        title={pendingDelete?.title}
        isDeleting={isDeleting}
        error={deleteError}
        onOpenChange={(open) => {
          if (!open && !isDeleting) {
            setPendingDelete(null);
            setPendingDeleteOccurrence(null);
            setDeleteError(null);
          }
        }}
        onConfirm={() => {
          void confirmDelete();
        }}
      />
    </div>
  );
}
