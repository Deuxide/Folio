import { gradeQuestion } from "@/features/grading/gradeQuestion";
import type { GradingStatus } from "@/types/grading";
import type { StudySession } from "@/types/session";

export function buildGradingResults(session: StudySession): Record<string, GradingStatus> {
  const results: Record<string, GradingStatus> = {};
  for (const questionId of session.questionIds) {
    const question = session.questionSnapshots?.[questionId];
    const attempt = session.attempts[questionId];
    results[questionId] = question
      ? gradeQuestion(question, attempt?.userAnswer).status
      : attempt?.userAnswer === undefined
        ? "unanswered"
        : "ungraded";
  }
  return results;
}

export function withFinalResults(session: StudySession): StudySession {
  if (session.gradingResults) {
    return session;
  }
  return {
    ...session,
    gradingResults: buildGradingResults(session),
  };
}
