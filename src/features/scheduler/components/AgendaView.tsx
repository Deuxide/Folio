import { EventListItem } from "@/features/scheduler/components/EventListItem";
import { addDays, formatDateKey, formatDayTitle } from "@/features/scheduler/dates";
import type { StudyEvent, StudyOccurrence } from "@/types/scheduler";

type AgendaViewProps = {
  groups: Array<[string, StudyOccurrence[]]>;
  emptyLabel: string;
  onOpen: (occurrence: StudyOccurrence) => void;
  onCycleStatus: (event: StudyEvent) => void;
  onDelete: (occurrence: StudyOccurrence) => void;
};

export function AgendaView({
  groups,
  emptyLabel,
  onOpen,
  onCycleStatus,
  onDelete,
}: AgendaViewProps) {
  if (groups.length === 0) {
    return <p className="text-sm text-muted-foreground">{emptyLabel}</p>;
  }

  return (
    <div className="space-y-6">
      {groups.map(([dateKey, items]) => (
        <section key={dateKey} className="space-y-2">
          <h3 className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
            {dateKey === formatDateKey(new Date())
              ? "Today"
              : dateKey === formatDateKey(addDays(new Date(), 1))
                ? "Tomorrow"
                : formatDayTitle(new Date(`${dateKey}T00:00:00`))}
          </h3>
          {items.map((occurrence) => (
            <EventListItem
              key={`${occurrence.source.id}-${occurrence.dateKey}`}
              event={occurrence.source}
              occurrenceStart={occurrence.startAt}
              onOpen={() => onOpen(occurrence)}
              onCycleStatus={onCycleStatus}
              onDelete={() => onDelete(occurrence)}
            />
          ))}
        </section>
      ))}
    </div>
  );
}
