import { formatHistoryDate } from "@/features/history/formatDate";
import type { QuestionHistoryEntry } from "@/features/history/extractAttempts";
import { formatCountdown } from "@/features/study/timer";

const DIFFICULTY_LABEL = {
  easy: "Easy",
  medium: "Medium",
  hard: "Hard",
} as const;

const RESULT_LABEL: Record<QuestionHistoryEntry["result"], string> = {
  correct: "✓ Correct",
  incorrect: "✗ Incorrect",
  unanswered: "Unanswered",
  ungraded: "Not automatically graded",
};

type QuestionAttemptHistoryProps = {
  history: QuestionHistoryEntry[];
};

export function QuestionAttemptHistory({
  history,
}: QuestionAttemptHistoryProps) {
  if (history.length === 0) {
    return null;
  }

  const times = history
    .map((entry) => entry.timeSpentMs)
    .filter((value): value is number => typeof value === "number");
  const averageTimeMs =
    times.length > 0
      ? Math.round(times.reduce((sum, value) => sum + value, 0) / times.length)
      : null;

  return (
    <div>
      <p className="text-sm text-muted-foreground">
        Attempts: {history.length}
      </p>
      <ul className="mt-2 space-y-1.5 text-sm">
        {history.map((entry) => (
          <li
            key={`${entry.sessionId}-${entry.completedAt}`}
            className="flex flex-wrap items-center justify-between gap-2"
          >
            <span>{RESULT_LABEL[entry.result]}</span>
            <span className="text-muted-foreground">
              {formatHistoryDate(entry.completedAt)}
              {typeof entry.timeSpentMs === "number"
                ? ` · ${formatCountdown(entry.timeSpentMs)}`
                : ""}
              {entry.difficulty
                ? ` · ${DIFFICULTY_LABEL[entry.difficulty]}`
                : ""}
            </span>
          </li>
        ))}
      </ul>
      {averageTimeMs !== null ? (
        <p className="mt-2 text-sm text-muted-foreground">
          Average time: {formatCountdown(averageTimeMs)}
        </p>
      ) : null}
    </div>
  );
}
