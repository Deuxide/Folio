import { cn } from "@/lib/utils";
import { formatCountdown, isTimerUrgent } from "@/features/study/timer";

type SessionTimerDisplayProps = {
  label: string;
  remainingMs: number;
  totalMs?: number;
};

export function SessionTimerDisplay({
  label,
  remainingMs,
  totalMs,
}: SessionTimerDisplayProps) {
  const urgent = isTimerUrgent(remainingMs, totalMs);

  return (
    <div
      className={cn(
        "min-w-[8.25rem] rounded-xl border px-3 py-2",
        urgent
          ? "border-destructive/40 bg-destructive/8 text-destructive"
          : "border-border bg-card text-foreground",
      )}
      aria-live="polite"
    >
      <p className="text-[11px] font-medium tracking-wide uppercase opacity-80">
        {label}
        {urgent ? " · low" : ""}
      </p>
      <p className="min-w-[4.5ch] font-serif text-xl font-semibold tabular-nums">
        {formatCountdown(remainingMs)}
      </p>
    </div>
  );
}
