import { resolveAttemptOutcome } from "@/features/grading/attemptOutcome";
import { QuestionSetRepository } from "@/repositories/QuestionSetRepository";
import { virtualSubjectSet } from "@/features/study/subjectPool";
import { isSubjectSession } from "@/features/study/sessionPaths";
import { startStudySession } from "@/features/study/sessionStore";
import type { Question, QuestionSet } from "@/types/question";
import type { SessionConfiguration, StudySession } from "@/types/session";

/**
 * "Practice missed" — the one-click error-review loop. A retry session is
 * assembled from the finished session's snapshots (the exact questions the
 * user saw, even if the source set changed since) and runs in Learn mode so
 * misses get immediate feedback and explanations.
 */

const RETRY_CONFIGURATION: SessionConfiguration = {
  mode: "learn",
  selectionMode: "all",
  questionCount: 0,
  randomizeQuestions: false,
  timeLimitMode: "none",
  practiceFocus: "all",
  distribution: "combined",
};

/** Questions missed by this session: incorrect answers and non-answers. */
export function getMissedQuestionIds(session: StudySession): string[] {
  return session.questionIds.filter((questionId) => {
    const question = session.questionSnapshots?.[questionId];
    const outcome = resolveAttemptOutcome(session, questionId, question);
    return outcome.status === "incorrect" || outcome.status === "unanswered";
  });
}

export type RetryPlan = {
  pool: Question[];
  questionSourceSetIds?: Record<string, string>;
  sourceSetTitles?: Record<string, string>;
};

export function buildRetryPlan(
  session: StudySession,
  missedIds: string[] = getMissedQuestionIds(session),
): RetryPlan {
  const snapshots = session.questionSnapshots ?? {};
  const pool: Question[] = [];
  for (const questionId of missedIds) {
    const snapshot = snapshots[questionId];
    if (snapshot) {
      pool.push(snapshot);
    }
  }

  const plan: RetryPlan = { pool };
  if (session.questionSourceSetIds) {
    const questionSourceSetIds = Object.fromEntries(
      missedIds.flatMap((questionId) => {
        const sourceId = session.questionSourceSetIds?.[questionId];
        return sourceId ? [[questionId, sourceId]] : [];
      }),
    );
    if (Object.keys(questionSourceSetIds).length > 0) {
      plan.questionSourceSetIds = questionSourceSetIds;
    }
  }

  const usedSetIds = new Set(Object.values(plan.questionSourceSetIds ?? {}));
  const titles = session.sourceSetTitles
    ? Object.fromEntries(
        Object.entries(session.sourceSetTitles).filter(
          ([setId]) => !usedSetIds.size || usedSetIds.has(setId),
        ),
      )
    : undefined;
  if (titles && Object.keys(titles).length > 0) {
    plan.sourceSetTitles = titles;
  }

  return plan;
}

export function buildRetryConfiguration(
  session: StudySession,
  count: number,
): SessionConfiguration {
  const usesQuestionTimer =
    session.configuration.timeLimitMode === "question" ||
    session.configuration.timeLimitMode === "both";

  return {
    ...RETRY_CONFIGURATION,
    questionCount: count,
    randomizeQuestions: session.configuration.randomizeQuestions,
    timeLimitMode: usesQuestionTimer ? "question" : "none",
    perQuestionMinutes: usesQuestionTimer
      ? session.configuration.perQuestionMinutes
      : undefined,
  };
}

/**
 * The retry session reuses the source bank when it still exists on the
 * device; otherwise a transient set is reconstructed from the session's
 * own snapshots so the missed questions can still be practiced.
 */
export async function resolveRetryQuestionSet(
  session: StudySession,
  pool: Question[],
): Promise<QuestionSet> {
  const existing = await QuestionSetRepository.getById(session.questionSetId);
  if (existing) {
    return existing;
  }
  if (isSubjectSession(session) && session.subjectKey) {
    return virtualSubjectSet(session.subjectKey, session.questionSetTitle, pool);
  }
  const now = new Date().toISOString();
  const snapshots = session.questionSnapshots ?? {};
  const allSessionQuestions = session.questionIds
    .map((questionId) => snapshots[questionId])
    .filter((question): question is Question => Boolean(question));
  return {
    id: session.questionSetId,
    title: session.questionSetTitle,
    questions: allSessionQuestions.length > 0 ? allSessionQuestions : pool,
    createdAt: session.startedAt,
    updatedAt: now,
  };
}

export type StartRetryResult =
  | { ok: true }
  | { ok: false; reason: "conflict" | "empty" };

/**
 * Starts a Learn-mode session over the questions missed in `session`.
 * Because starting a new session discards an unfinished one for the same
 * scope, callers receive `{ok: false, reason: "conflict"}` instead of
 * silently destroying in-progress work; they may retry with
 * `discardActive: true` after confirming with the user.
 */
export async function startRetrySession(
  session: StudySession,
  options?: { discardActive?: boolean },
): Promise<StartRetryResult> {
  if (session.status !== "completed") {
    return { ok: false, reason: "empty" };
  }

  const missedIds = getMissedQuestionIds(session);
  if (missedIds.length === 0) {
    return { ok: false, reason: "empty" };
  }

  const plan = buildRetryPlan(session, missedIds);
  if (plan.pool.length === 0) {
    return { ok: false, reason: "empty" };
  }

  const questionSet = await resolveRetryQuestionSet(session, plan.pool);

  const result = await startStudySession(
    questionSet,
    buildRetryConfiguration(session, plan.pool.length),
    plan.pool,
    {
      kind: isSubjectSession(session) ? "subject" : undefined,
      subjectKey: isSubjectSession(session) ? session.subjectKey : undefined,
      subjectName: isSubjectSession(session)
        ? session.subjectName
        : undefined,
      sourceSetTitles: plan.sourceSetTitles,
      questionSourceSetIds: plan.questionSourceSetIds,
      discardActive: options?.discardActive,
    },
  );

  return result.ok ? { ok: true } : { ok: false, reason: "conflict" };
}
