/**
 * Per-question learning-memory state (SM-2-lite), M2 data foundation for the
 * due-review queue. The scheduler math lives in
 * `features/mastery/scheduler.ts` and must stay a pure function of these
 * records plus an outcome — no I/O.
 */

export type MemoryOutcome = "correct" | "lapsed" | "confident_wrong";

export type QuestionCardState = "new" | "learning" | "review";

export type QuestionMemory = {
  /** Global key; question ids are treated as unique across banks. */
  questionId: string;
  /** Every bank this question has lived in (subject sessions attribute via
   *  `questionSourceSetIds` when available). */
  setIds: string[];
  /** SM-2-style ease factor. Kept in [1.3, 3.0]; starts at 2.5. */
  ease: number;
  /** Current scheduled interval in whole days. */
  intervalDays: number;
  /** When the question should be practiced again. Empty string for
   *  never-studied ("new") questions. */
  dueAt: string;
  cardState: QuestionCardState;
  consecutiveCorrect: number;
  lapses: number;
  lastStudiedAt?: string;
  lastOutcome?: MemoryOutcome;
  /** Content versioning for future migrations of memory records. */
  schemaVersion: 1;
};
