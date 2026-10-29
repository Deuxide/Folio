import { resolveAttemptOutcome } from "@/features/grading/attemptOutcome";
import type { GradingStatus } from "@/types/grading";
import type { Question } from "@/types/question";
import type { DifficultyRating, ConfidenceRating, StudySession } from "@/types/session";

export type QuestionHistoryEntry = {
  questionId: string;
  sessionId: string;
  questionSetId: string;
  questionSetTitle: string;
  userAnswer: unknown;
  result: GradingStatus;
  difficulty?: DifficultyRating;
  timeSpentMs?: number;
  timedOut?: boolean;
  /** Pre-reveal confidence (Learn mode); powers "confidently wrong". */
  confidence?: ConfidenceRating;
  completedAt: string;
};

export function getSessionQuestions(session: StudySession): Question[] {
  return session.questionIds.map((questionId) => {
    const snapshot = session.questionSnapshots?.[questionId];
    if (snapshot) {
      return snapshot;
    }
    return {
      id: questionId,
      question: "Question unavailable",
      type: "unknown",
    };
  });
}

export function getAttemptResult(
  session: StudySession,
  questionId: string,
  question?: Question,
): GradingStatus {
  return resolveAttemptOutcome(session, questionId, question).status;
}

export function extractHistoryEntries(
  sessions: StudySession[],
): QuestionHistoryEntry[] {
  const completed = sessions.filter(
    (session) => session.status === "completed" && session.completedAt,
  );

  const entries: QuestionHistoryEntry[] = [];

  for (const session of completed) {
    const completedAt = session.completedAt ?? session.startedAt;
    for (const questionId of session.questionIds) {
      const attempt = session.attempts[questionId];
      const question = session.questionSnapshots?.[questionId];
      const entry: QuestionHistoryEntry = {
        questionId,
        sessionId: session.id,
        questionSetId: session.questionSetId,
        questionSetTitle: session.questionSetTitle,
        userAnswer: attempt?.userAnswer,
        result: getAttemptResult(session, questionId, question),
        completedAt,
      };
      if (attempt?.difficulty) {
        entry.difficulty = attempt.difficulty;
      }
      if (typeof attempt?.timeSpentMs === "number") {
        entry.timeSpentMs = attempt.timeSpentMs;
      }
      if (attempt?.timedOut) {
        entry.timedOut = true;
      }
      if (attempt?.confidence) {
        entry.confidence = attempt.confidence;
      }
      entries.push(entry);
    }
  }

  return entries.sort((left, right) =>
    right.completedAt.localeCompare(left.completedAt),
  );
}

export function getHistoryForQuestion(
  entries: QuestionHistoryEntry[],
  questionId: string,
): QuestionHistoryEntry[] {
  return entries.filter((entry) => entry.questionId === questionId);
}
