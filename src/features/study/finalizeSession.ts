import { resolveAttemptOutcome } from "@/features/grading/attemptOutcome";
import type { GradingStatus } from "@/types/grading";
import type { StudySession } from "@/types/session";

/**
 * Builds the frozen grading record for a completed session. Supported
 * outcomes captured on attempts ("Learn" mode stores the result on the
 * question at check time) take precedence over live recomputation so that
 * recorded answers are never silently re-graded.
 */
export function buildGradingResults(session: StudySession): {
  results: Record<string, GradingStatus>;
  credits: Record<string, number> | undefined;
} {
  const results: Record<string, GradingStatus> = {};
  const credits: Record<string, number> = {};

  for (const questionId of session.questionIds) {
    const question = session.questionSnapshots?.[questionId];
    const outcome = resolveAttemptOutcome(session, questionId, question);
    results[questionId] = outcome.status;
    if (typeof outcome.credit === "number") {
      credits[questionId] = outcome.credit;
    }
  }

  return {
    results,
    credits: Object.keys(credits).length > 0 ? credits : undefined,
  };
}

export function withFinalResults(session: StudySession): StudySession {
  // A session's grading record is written exactly once, when it completes.
  if (session.gradingResults) {
    return session;
  }
  const { results, credits } = buildGradingResults(session);
  return {
    ...session,
    gradingResults: results,
    gradingCredits: credits,
  };
}
