export function getRemainingMs(
  deadlineIso: string | undefined,
  now = Date.now(),
): number | null {
  if (!deadlineIso) {
    return null;
  }

  const deadline = Date.parse(deadlineIso);
  if (Number.isNaN(deadline)) {
    return null;
  }

  return Math.max(0, deadline - now);
}

export function isDeadlinePassed(
  deadlineIso: string | undefined,
  now = Date.now(),
): boolean {
  const remaining = getRemainingMs(deadlineIso, now);
  return remaining !== null && remaining <= 0;
}

export function formatCountdown(remainingMs: number): string {
  const totalSeconds = Math.max(0, Math.ceil(remainingMs / 1000));
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  if (hours > 0) {
    return `${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
  }

  return `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
}

export function isTimerUrgent(
  remainingMs: number,
  totalMs: number | undefined,
): boolean {
  if (remainingMs <= 15_000) {
    return true;
  }
  if (totalMs && totalMs > 0 && remainingMs <= totalMs * 0.1) {
    return true;
  }
  return remainingMs <= 30_000 && (totalMs === undefined || totalMs <= 180_000);
}

export function minutesToMs(minutes: number): number {
  return minutes * 60_000;
}
