import { Flag } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  formatDateKey,
  formatWeekdayShort,
  monthGrid,
  weekDays,
  weekdayHeaders,
} from "@/features/scheduler/dates";
import { PRIORITY_LABEL } from "@/features/scheduler/labels";
import type { StudyOccurrence } from "@/types/scheduler";

type CalendarViewsProps = {
  view: "month" | "week" | "day";
  anchor: Date;
  selectedDate: Date;
  occurrences: StudyOccurrence[];
  onSelectDate: (date: Date) => void;
  onOpenOccurrence: (occurrence: StudyOccurrence) => void;
};

function onDate(occurrences: StudyOccurrence[], date: Date): StudyOccurrence[] {
  const key = formatDateKey(date);
  return occurrences.filter((occurrence) => occurrence.dateKey === key);
}

export function CalendarViews({
  view,
  anchor,
  selectedDate,
  occurrences,
  onSelectDate,
  onOpenOccurrence,
}: CalendarViewsProps) {
  const todayKey = formatDateKey(new Date());
  const selectedKey = formatDateKey(selectedDate);

  if (view === "day") {
    const dayEvents = onDate(occurrences, selectedDate);
    return (
      <section className="rounded-2xl border border-border bg-card p-4">
        <p className="text-sm text-muted-foreground">
          {dayEvents.length === 0
            ? "Nothing scheduled for this day."
            : `${dayEvents.length} ${dayEvents.length === 1 ? "event" : "events"}`}
        </p>
        <ul className="mt-3 space-y-2">
          {dayEvents.map((occurrence) => (
            <li key={`${occurrence.source.id}-${occurrence.dateKey}`}>
              <button
                type="button"
                className="flex w-full items-start justify-between gap-2 rounded-xl border border-border px-3 py-2 text-left text-sm hover:bg-accent/40"
                onClick={() => onOpenOccurrence(occurrence)}
              >
                <span>
                  <span className="font-medium">{occurrence.source.title}</span>
                  {occurrence.source.subject ? (
                    <span className="mt-0.5 block text-muted-foreground">
                      {occurrence.source.subject}
                    </span>
                  ) : null}
                </span>
                <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
                  <Flag className="size-3" aria-hidden />
                  <span className="sr-only">Priority</span>
                  {PRIORITY_LABEL[occurrence.source.priority]}
                </span>
              </button>
            </li>
          ))}
        </ul>
      </section>
    );
  }

  if (view === "week") {
    const days = weekDays(anchor);
    return (
      <section className="overflow-x-auto rounded-2xl border border-border bg-card">
        <div className="grid min-w-[36rem] grid-cols-7">
          {days.map((day) => {
            const key = formatDateKey(day);
            const dayEvents = onDate(occurrences, day);
            return (
              <div key={key} className="min-h-40 border-r border-border last:border-r-0">
                <button
                  type="button"
                  onClick={() => onSelectDate(day)}
                  className={cn(
                    "flex w-full items-center justify-between px-2 py-2 text-left text-xs",
                    key === selectedKey ? "bg-accent/60" : "",
                  )}
                >
                  <span>{formatWeekdayShort(day)}</span>
                  <span
                    className={cn(
                      "inline-flex size-6 items-center justify-center rounded-full",
                      key === todayKey
                        ? "bg-primary text-primary-foreground"
                        : "text-foreground",
                    )}
                  >
                    {day.getDate()}
                  </span>
                </button>
                <ul className="space-y-1 px-2 pb-2">
                  {dayEvents.map((occurrence) => (
                    <li key={`${occurrence.source.id}-${occurrence.dateKey}`}>
                      <button
                        type="button"
                        className="flex w-full items-center gap-1 truncate rounded-md bg-muted px-2 py-1 text-left text-xs"
                        onClick={() => onOpenOccurrence(occurrence)}
                      >
                        {occurrence.source.priority === "high" ? (
                          <Flag className="size-3 shrink-0" aria-label="High priority" />
                        ) : null}
                        <span className="truncate">{occurrence.source.title}</span>
                      </button>
                    </li>
                  ))}
                </ul>
              </div>
            );
          })}
        </div>
      </section>
    );
  }

  const days = monthGrid(anchor);
  return (
    <section className="rounded-2xl border border-border bg-card p-2 sm:p-3">
      <div className="grid grid-cols-7 text-center text-xs text-muted-foreground">
        {weekdayHeaders().map((label) => (
          <div key={label} className="py-2">
            {label}
          </div>
        ))}
      </div>
      <div className="grid grid-cols-7 gap-px rounded-xl bg-border">
        {days.map((day) => {
          const key = formatDateKey(day);
          const inMonth = day.getMonth() === anchor.getMonth();
          const dayEvents = onDate(occurrences, day);
          return (
            <button
              key={key}
              type="button"
              onClick={() => onSelectDate(day)}
              className={cn(
                "min-h-16 bg-card p-1.5 text-left sm:min-h-24",
                key === selectedKey ? "ring-1 ring-primary ring-inset" : "",
                !inMonth ? "opacity-40" : "",
              )}
            >
              <span
                className={cn(
                  "inline-flex size-6 items-center justify-center rounded-full text-xs",
                  key === todayKey
                    ? "bg-primary text-primary-foreground"
                    : "text-foreground",
                )}
              >
                {day.getDate()}
              </span>
              <ul className="mt-1 hidden space-y-0.5 sm:block">
                {dayEvents.slice(0, 3).map((occurrence) => (
                  <li
                    key={`${occurrence.source.id}-${occurrence.dateKey}`}
                    className="flex items-center gap-1 truncate text-[11px] text-muted-foreground"
                  >
                    {occurrence.source.priority === "high" ? (
                      <Flag className="size-2.5 shrink-0" aria-hidden />
                    ) : (
                      <span className="size-1.5 shrink-0 rounded-full bg-muted-foreground/50" />
                    )}
                    <span className="truncate">{occurrence.source.title}</span>
                  </li>
                ))}
                {dayEvents.length > 3 ? (
                  <li className="text-[11px] text-muted-foreground">
                    +{dayEvents.length - 3}
                  </li>
                ) : null}
              </ul>
              {dayEvents.length > 0 ? (
                <div className="mt-1 flex justify-center gap-0.5 sm:hidden">
                  {dayEvents.slice(0, 3).map((occurrence) => (
                    <span
                      key={`${occurrence.source.id}-${occurrence.dateKey}`}
                      className="size-1.5 rounded-full bg-primary"
                    />
                  ))}
                </div>
              ) : null}
            </button>
          );
        })}
      </div>
    </section>
  );
}
