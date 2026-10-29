import type { GradingStatus } from "@/types/grading";
import type { Question } from "@/types/question";

export type DifficultyRating = "easy" | "medium" | "hard";

export type ConfidenceRating = "sure" | "unsure" | "guessed";

export type QuestionAttempt = {
  questionId: string;
  userAnswer?: unknown;
  difficulty?: DifficultyRating;
  startedAt?: string;
  deadline?: string;
  timeSpentMs?: number;
  timedOut?: boolean;
  /**
   * Grading outcome captured on the question itself at the moment it was
   * checked (Learn mode). Never recomputed afterwards.
   */
  result?: GradingStatus;
  checkedAt?: string;
  /** Partial credit captured together with a Learn-mode check result. */
  partialCredit?: number;
  /** Self-assessed confidence before the answer was revealed (Learn mode). */
  confidence?: ConfidenceRating;
  /** Manual grade the user assigned to an ungradeable question in review. */
  selfGrading?: "correct" | "incorrect";
};

export type TimeLimitMode = "none" | "session" | "question" | "both";

/**
 * How a session runs.
 *
 * - `learn`: the user checks each answer for instant feedback and explanation.
 * - `test`: exam-like — feedback only at the end (default for older sessions,
 *   which have no `mode` recorded at all).
 */
export type SessionMode = "learn" | "test";

export type QuestionSelectionMode = "all" | "count";

export type PracticeFocus =
  | "all"
  | "unanswered"
  | "incorrect"
  | "hard"
  | "weak";

export type BankDistribution = "combined" | "balanced";

export type SessionKind = "set" | "subject";

export type SessionConfiguration = {
  mode?: SessionMode;
  selectionMode: QuestionSelectionMode;
  questionCount: number;
  randomizeQuestions: boolean;
  timeLimitMode: TimeLimitMode;
  sessionTimeLimitMinutes?: number;
  perQuestionMinutes?: number;
  practiceFocus?: PracticeFocus;
  selectedSetIds?: string[];
  distribution?: BankDistribution;
};

export type StudySessionStatus = "in_progress" | "completed";

export type SessionCompletionReason =
  | "finished"
  | "session_timer"
  | "question_timer";

export type StudySession = {
  id: string;
  questionSetId: string;
  questionSetTitle: string;
  kind?: SessionKind;
  subjectKey?: string;
  subjectName?: string;
  /** Recorded for content versioning; older sessions have no mode. */
  mode?: SessionMode;
  sourceSetIds?: string[];
  sourceSetTitles?: Record<string, string>;
  questionSourceSetIds?: Record<string, string>;
  questionIds: string[];
  currentIndex: number;
  attempts: Record<string, QuestionAttempt>;
  configuration: SessionConfiguration;
  questionSnapshots?: Record<string, Question>;
  gradingResults?: Record<string, GradingStatus>;
  /** Optional partial-credit values keyed by question id. */
  gradingCredits?: Record<string, number>;
  /**
   * Written by the repository on save; sessions without it predate the
   * field and are treated as version 1.
   */
  schemaVersion?: number;
  questionTimeLimitMs?: number;
  status: StudySessionStatus;
  startedAt: string;
  sessionDeadline?: string;
  completedAt?: string;
  completionReason?: SessionCompletionReason;
  scheduledEventId?: string;
};
