import { gradeQuestion, type GradingStatus } from "@/features/grading/gradeQuestion";
import { hasUserAnswer } from "@/features/questions/isAnswered";
import type { Question } from "@/types/question";
import type { DifficultyRating, StudySession } from "@/types/session";

export type ReviewedQuestion = {
  questionId: string;
  index: number;
  question?: Question;
  userAnswer: unknown;
  status: GradingStatus;
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
      const gradingStatus: GradingStatus =
        session.gradingResults?.[questionId] ??
        (question
          ? gradeQuestion(question, userAnswer).status
          : hasUserAnswer(userAnswer)
            ? "ungraded"
            : "unanswered");

      const review: ReviewedQuestion = {
        questionId,
        index,
        question,
        userAnswer,
        status: gradingStatus,
        timedOut: Boolean(attempt?.timedOut),
      };
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
