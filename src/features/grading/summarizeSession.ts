import { resolveAttemptOutcome } from "@/features/grading/attemptOutcome";
import type { GradingStatus } from "@/types/grading";
import type { Question } from "@/types/question";
import type {
  ConfidenceRating,
  DifficultyRating,
  StudySession,
} from "@/types/session";

export type ReviewedQuestion = {
  questionId: string;
  index: number;
  question?: Question;
  userAnswer: unknown;
  status: GradingStatus;
  /** Partial credit (0–1) for multiple-choice questions that opted in. */
  credit?: number;
  /** True when the displayed outcome came from the user's own grade. */
  selfGraded?: boolean;
  confidence?: ConfidenceRating;
  difficulty?: DifficultyRating;
  timedOut: boolean;
  timeSpentMs?: number;
};

export type DifficultyBreakdown = {
  rating: DifficultyRating;
  total: number;
  correct: number;
  incorrect: number;
};

export type SessionSummary = {
  total: number;
  correct: number;
  incorrect: number;
  unanswered: number;
  ungraded: number;
  timedOut: number;
  accuracyPercent: number | null;
  totalTimeMs: number | null;
  difficulty: DifficultyBreakdown[];
  reviews: ReviewedQuestion[];
};

export function summarizeSession(
  session: StudySession,
  questions: Question[],
): SessionSummary {
  const questionsById = new Map(
    questions.map((question) => [question.id, question]),
  );

  const reviews: ReviewedQuestion[] = session.questionIds.map(
    (questionId, index) => {
      const question =
        session.questionSnapshots?.[questionId] ?? questionsById.get(questionId);
      const attempt = session.attempts[questionId];
      const userAnswer = attempt?.userAnswer;

      const outcome = resolveAttemptOutcome(session, questionId, question);

      const review: ReviewedQuestion = {
        questionId,
        index,
        question,
        userAnswer,
        status: outcome.status,
        timedOut: Boolean(attempt?.timedOut),
        selfGraded: isSelfGraded(session, questionId, outcome.status),
      };
      if (typeof outcome.credit === "number") {
        review.credit = outcome.credit;
      }
      if (attempt?.confidence) {
        review.confidence = attempt.confidence;
      }
      if (attempt?.difficulty) {
        review.difficulty = attempt.difficulty;
      }
      if (typeof attempt?.timeSpentMs === "number") {
        review.timeSpentMs = attempt.timeSpentMs;
      }
      return review;
    },
  );

  const correct = reviews.filter((item) => item.status === "correct").length;
  const incorrect = reviews.filter((item) => item.status === "incorrect").length;
  const unanswered = reviews.filter((item) => item.status === "unanswered").length;
  const ungraded = reviews.filter((item) => item.status === "ungraded").length;
  const timedOut = reviews.filter((item) => item.timedOut).length;
  const gradedAnswered = correct + incorrect;

  const ratings: DifficultyRating[] = ["easy", "medium", "hard"];
  const difficulty = ratings.map((rating) => {
    const items = reviews.filter((item) => item.difficulty === rating);
    return {
      rating,
      total: items.length,
      correct: items.filter((item) => item.status === "correct").length,
      incorrect: items.filter((item) => item.status === "incorrect").length,
    };
  });

  let totalTimeMs: number | null = null;
  if (session.completedAt) {
    const elapsed =
      Date.parse(session.completedAt) - Date.parse(session.startedAt);
    if (Number.isFinite(elapsed) && elapsed >= 0) {
      totalTimeMs = elapsed;
    }
  }

  return {
    total: reviews.length,
    correct,
    incorrect,
    unanswered,
    ungraded,
    timedOut,
    accuracyPercent:
      gradedAnswered > 0 ? Math.round((correct / gradedAnswered) * 100) : null,
    totalTimeMs,
    difficulty,
    reviews,
  };
}

function isSelfGraded(
  session: StudySession,
  questionId: string,
  status: GradingStatus,
): boolean {
  const attempt = session.attempts[questionId];
  if (!attempt?.selfGrading) {
    return false;
  }
  // The machine outcome (frozen record or Learn-mode check) must have been
  // "ungraded" — self-grading never overrides a real grading result.
  const machineOutcome =
    session.gradingResults?.[questionId] ?? attempt.result ?? "ungraded";
  return (
    machineOutcome === "ungraded" &&
    (status === "correct" || status === "incorrect")
  );
}

export type { GradingStatus };
