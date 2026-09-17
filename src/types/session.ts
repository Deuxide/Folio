import type { GradingStatus } from "@/types/grading";
import type { Question } from "@/types/question";

export type DifficultyRating = "easy" | "medium" | "hard";

export type QuestionAttempt = {
  questionId: string;
  userAnswer?: unknown;
  difficulty?: DifficultyRating;
  startedAt?: string;
  deadline?: string;
  timeSpentMs?: number;
  timedOut?: boolean;
};

export type TimeLimitMode = "none" | "session" | "question" | "both";

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
  sourceSetIds?: string[];
  sourceSetTitles?: Record<string, string>;
  questionSourceSetIds?: Record<string, string>;
  questionIds: string[];
  currentIndex: number;
  attempts: Record<string, QuestionAttempt>;
  configuration: SessionConfiguration;
  questionSnapshots?: Record<string, Question>;
  gradingResults?: Record<string, GradingStatus>;
  questionTimeLimitMs?: number;
  status: StudySessionStatus;
  startedAt: string;
  sessionDeadline?: string;
  completedAt?: string;
  completionReason?: SessionCompletionReason;
};
