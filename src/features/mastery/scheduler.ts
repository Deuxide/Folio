import type {
  MemoryOutcome,
  QuestionMemory,
} from "@/types/mastery";
import type { QuestionHistoryEntry } from "@/features/history/extractAttempts";

/**
 * SM-2-lite: a small, deterministic rule set for spaced-repetition scheduling.
 *
 * The math lives here and stays pure — a memory record plus an outcome
 * (and a timestamp) in, updated record out. No I/O, no clock reads.
 *
 * Interval ladder:
 * - new → first correct answer schedules 1 day ("learning").
 * - learning → second consecutive correct answer graduates to "review"
 *   with `round(1 × ease)` days.
 * - review → each further correct answer multiplies the current interval
 *   by the ease factor and rounds, capped at {@link MAX_INTERVAL_DAYS}.
 * - any lapse resets the interval to 1 day and drops the card back to
 *   "learning" (SM-2's "relearn" step), counting as a `lapse`.
 * - partially-correct MC answers (`status: "incorrect"` with positive
 *   credit) are treated as lapses: the answer was not fully known.
 *
 * Ease starts at 2.5 and moves within [1.3, 3.0]: +0.05 per correct
 * answer, −0.2 per lapse. "Confidently wrong" (user was sure but missed)
 * costs no extra ease, but is flagged via `lastOutcome` so due-review
 * selection can prioritize it.
 */

const DAY_MS = 86_400_000;
const MIN_EASE = 1.3;
const MAX_EASE = 3.0;
const DEFAULT_EASE = 2.5;
const EASE_STEP = 0.05;
const EASE_PENALTY = 0.2;
const MAX_INTERVAL_DAYS = 180;

export function createEmptyMemory(
  questionId: string,
  setId?: string,
): QuestionMemory {
  return {
    questionId,
    setIds: setId ? [setId] : [],
    ease: DEFAULT_EASE,
    intervalDays: 0,
    dueAt: "",
    cardState: "new",
    consecutiveCorrect: 0,
    lapses: 0,
    schemaVersion: 1,
  };
}

export type SchedulerOutcome = {
  outcome: MemoryOutcome;
  studiedAt: string;
};

export function applyMemoryOutcome(
  memory: QuestionMemory,
  outcome: SchedulerOutcome,
): QuestionMemory {
  const studiedMs = Date.parse(outcome.studiedAt);
  const nowMs = Number.isNaN(studiedMs) ? 0 : studiedMs;

  let ease = memory.ease;
  let intervalDays = memory.intervalDays;
  let cardState = memory.cardState;
  let lapses = memory.lapses;
  let consecutiveCorrect = memory.consecutiveCorrect;

  if (outcome.outcome === "correct") {
    ease = Math.min(MAX_EASE, ease + EASE_STEP);
    consecutiveCorrect = memory.consecutiveCorrect + 1;

    if (cardState === "new") {
      intervalDays = 1;
      cardState = "learning";
    } else if (cardState === "learning") {
      intervalDays = Math.min(
        MAX_INTERVAL_DAYS,
        Math.max(2, Math.round(1 * ease)),
      );
      cardState = "review";
    } else {
      intervalDays = Math.min(
        MAX_INTERVAL_DAYS,
        Math.max(1, Math.round(intervalDays * ease)),
      );
    }
  } else {
    // "lapsed" and "confident_wrong" both fail the card; confidently wrong
    // is only distinguishable through `lastOutcome`.
    ease = Math.max(MIN_EASE, ease - EASE_PENALTY);
    intervalDays = 1;
    cardState = "learning";
    lapses = memory.lapses + 1;
    consecutiveCorrect = 0;
  }

  return {
    ...memory,
    setIds: memory.setIds,
    ease,
    intervalDays,
    dueAt: new Date(nowMs + intervalDays * DAY_MS).toISOString(),
    cardState,
    consecutiveCorrect,
    lapses,
    lastStudiedAt: outcome.studiedAt,
    lastOutcome: outcome.outcome,
    schemaVersion: 1,
  };
}

/**
 * Maps a history entry onto a scheduler outcome. Sessions store self-graded
 * results in `entry.result` already (via `resolveAttemptOutcome`), so this is
 * a straight mapping; "sure-but-wrong" becomes the distinctly prioritized
 * `confident_wrong`.
 */
export function outcomeFromHistoryEntry(
  entry: QuestionHistoryEntry,
): SchedulerOutcome {
  let outcome: MemoryOutcome;
  if (entry.result === "correct") {
    outcome = "correct";
  } else if (entry.confidence === "sure") {
    outcome = "confident_wrong";
  } else {
    outcome = "lapsed";
  }
  return { outcome, studiedAt: entry.completedAt };
}
