import { useEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils";
import { formatCountdown, isTimerUrgent } from "@/features/study/timer";

type SessionTimerDisplayProps = {
  label: string;
  remainingMs: number;
  totalMs?: number;
};

type AnnouncementBoundary = {
  seconds: number;
  message: string;
};

/**
 * Screen readers must not hear a countdown every tick. The visible block is
 * silent (no aria-live); a separate polite live region announces only when a
 * remaining-time boundary is crossed, once per boundary.
 */
function announcementsFor(totalMs: number | undefined): AnnouncementBoundary[] {
  const shortTotal =
    typeof totalMs === "number" && totalMs > 0 && totalMs <= 120_000;
  if (shortTotal) {
    return [
      { seconds: 30, message: "30 seconds remaining" },
      { seconds: 10, message: "10 seconds remaining" },
    ];
  }
  return [
    { seconds: 300, message: "Five minutes remaining" },
    { seconds: 60, message: "One minute remaining" },
    { seconds: 30, message: "30 seconds remaining" },
    { seconds: 10, message: "10 seconds remaining" },
  ];
}

export function SessionTimerDisplay({
  label,
  remainingMs,
  totalMs,
}: SessionTimerDisplayProps) {
  const urgent = isTimerUrgent(remainingMs, totalMs);
  const boundariesRef = useRef<string | null>(null);
  const [announcement, setAnnouncement] = useState<string | null>(null);
  const remainingSeconds = Math.max(0, Math.floor(remainingMs / 1000));

  useEffect(() => {
    const boundary = announcementsFor(totalMs)
      .find((item) => remainingSeconds <= item.seconds)
      ?.message;
    if (boundary && boundary !== boundariesRef.current) {
      boundariesRef.current = boundary;
      setAnnouncement(boundary);
    }
  }, [remainingSeconds, totalMs]);

  return (
    <>
      <span aria-live="polite" className="sr-only">
        {announcement}
      </span>
      <div
        className={cn(
          "min-w-[8.25rem] rounded-xl border px-3 py-2",
          urgent
            ? "border-destructive/40 bg-destructive/8 text-destructive"
            : "border-border bg-card text-foreground",
        )}
        aria-hidden="true"
      >
        <p className="text-[11px] font-medium tracking-wide uppercase opacity-80">
          {label}
          {urgent ? " · low" : ""}
        </p>
        <p className="min-w-[4.5ch] font-serif text-xl font-semibold tabular-nums">
          {formatCountdown(remainingMs)}
        </p>
      </div>
    </>
  );
}
