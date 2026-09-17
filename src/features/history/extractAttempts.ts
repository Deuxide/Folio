import { gradeQuestion, type GradingStatus } from "@/features/grading/gradeQuestion";
import type { Question } from "@/types/question";
import type { DifficultyRating, StudySession } from "@/types/session";

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
  const stored = session.gradingResults?.[questionId];
  if (stored) {
    return stored;
  }
  const attempt = session.attempts[questionId];
  if (question) {
    return gradeQuestion(question, attempt?.userAnswer).status;
  }
  return attempt?.userAnswer === undefined ? "unanswered" : "ungraded";
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
