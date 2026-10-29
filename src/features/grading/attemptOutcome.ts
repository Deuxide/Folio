import { gradeQuestion } from "@/features/grading/gradeQuestion";
import type { GradingResult } from "@/types/grading";
import type { Question } from "@/types/question";
import type { QuestionAttempt, StudySession } from "@/types/session";

/**
 * Resolves the outcome of a single attempt with a stable precedence so the
 * same question never flips between views:
 *
 * 1. `session.gradingResults` — frozen when the session completed. This is
 *    the historical record and is never recomputed.
 * 2. `attempt.result` — captured on the question itself at the moment it
 *    was checked in Learn mode.
 * 3. `attempt.selfGrading` — a grade the user assigned in review to an
 *    ungradeable question. Applies only where grading yielded "ungraded".
 * 4. Recomputation from the answer key, using legacy rules for sessions
 *    that predate per-question grading outcomes.
 *
 * The optional `credit` value (partial credit) is resolved the same way.
 */
export function resolveAttemptOutcome(
  session: StudySession,
  questionId: string,
  question?: Question,
): GradingResult {
  const attempt = session.attempts[questionId];
  const credit = tryGetCredit(session, questionId, attempt);
  const stored = session.gradingResults?.[questionId];
  if (stored) {
    return applySelfGrading(withCredit({ status: stored }, credit), attempt);
  }

  if (attempt?.result) {
    return applySelfGrading(withCredit({ status: attempt.result }, credit), attempt);
  }

  const grading = gradingModeForSession(session);
  const base: GradingResult = question
    ? gradeQuestion(question, attempt?.userAnswer, { grading })
    : {
        status:
          attempt?.userAnswer === undefined ? "unanswered" : "ungraded",
      };

  return applySelfGrading(withCredit(base, credit), attempt);
}

function tryGetCredit(
  session: StudySession,
  questionId: string,
  attempt: QuestionAttempt | undefined,
): number | undefined {
  const recorded = session.gradingCredits?.[questionId];
  if (typeof recorded === "number") {
    return recorded;
  }
  return typeof attempt?.partialCredit === "number"
    ? attempt.partialCredit
    : undefined;
}

function withCredit(
  result: GradingResult,
  credit: number | undefined,
): GradingResult {
  return typeof credit === "number" ? { ...result, credit } : result;
}

export function gradingModeForSession(session: StudySession) {
  return session.mode === undefined ? "legacy" : "enhanced";
}

function applySelfGrading(
  result: GradingResult,
  attempt: QuestionAttempt | undefined,
): GradingResult {
  if (result.status !== "ungraded" || !attempt?.selfGrading) {
    return result;
  }
  return { status: attempt.selfGrading };
}

/**
 * Pure reducer that records the user's manual grade for an answer on the
 * session. Used by the store (in-memory + persisted session) and directly
 * by results pages that loaded a session straight from the repository.
 */
export function withAttemptSelfGrading(
  session: StudySession,
  questionId: string,
  selfGrading: "correct" | "incorrect",
): StudySession {
  const existing = session.attempts[questionId] ?? { questionId };
  const attempt: QuestionAttempt = {
    ...existing,
    questionId,
    selfGrading,
  };
  return {
    ...session,
    attempts: {
      ...session.attempts,
      [questionId]: attempt,
    },
  };
}
