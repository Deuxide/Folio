import { useSyncExternalStore } from "react";
import { gradeQuestion } from "@/features/grading/gradeQuestion";
import { withAttemptSelfGrading } from "@/features/grading/attemptOutcome";
import { hasUserAnswer } from "@/features/questions/isAnswered";
import { updateMemoryForSession } from "@/features/mastery/memoryUpdate";
import { createStudySession } from "@/features/study/createSession";
import { withFinalResults } from "@/features/study/finalizeSession";
import { isDeadlinePassed } from "@/features/study/timer";
import { markScheduledEventStatus } from "@/features/scheduler/studyAction";
import { QuestionSetRepository } from "@/repositories/QuestionSetRepository";
import { SessionRepository } from "@/repositories/SessionRepository";
import type { Question, QuestionSet } from "@/types/question";
import type {
  ConfidenceRating,
  DifficultyRating,
  QuestionAttempt,
  SessionCompletionReason,
  SessionConfiguration,
  StudySession,
} from "@/types/session";

type SessionState = {
  session: StudySession | null;
  pendingResume: boolean;
};

let state: SessionState = { session: null, pendingResume: false };
const listeners = new Set<() => void>();

function emit() {
  for (const listener of listeners) {
    listener();
  }
}

function persist(session: StudySession | null) {
  if (!session) {
    return;
  }
  void SessionRepository.save(session).catch(() => {
    // Persistence failures are surfaced when starting/resuming a session.
  });
}

function setState(next: SessionState) {
  state = next;
  persist(next.session);
  emit();
}

function updateSession(updater: (session: StudySession) => StudySession) {
  if (!state.session) {
    return;
  }
  const previous = state.session;
  const nextSession = updater(previous);
  if (nextSession === previous) {
    return;
  }
  setState({ ...state, session: nextSession });
  // A session just finalized: fold its outcomes into the per-question
  // learning memory. Best-effort — must never block the study flow.
  if (
    nextSession.status === "completed" &&
    previous.status !== "completed"
  ) {
    void updateMemoryForSession(nextSession).catch(() => {
      // Memory can always be rebuilt from history if this fails.
    });
  }
}

export function getSessionState(): SessionState {
  return state;
}

export function subscribeToSession(listener: () => void): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

export function loadSession(
  session: StudySession,
  options?: { pendingResume?: boolean },
) {
  setState({
    session,
    pendingResume: options?.pendingResume ?? false,
  });
}

export type StartSessionResult =
  | { ok: true; session: StudySession }
  | { ok: false; reason: "conflict"; activeSession: StudySession };

/**
 * Starts a session for the given bank/pool. An unfinished session in the
 * same scope (question set or subject) is never deleted implicitly: the
 * caller receives `{ok: false, reason: "conflict"}` and may call again with
 * `discardActive: true` after the user has explicitly agreed.
 */
export async function startStudySession(
  questionSet: QuestionSet,
  configuration: SessionConfiguration,
  pool = questionSet.questions,
  options?: Parameters<typeof createStudySession>[3] & {
    discardActive?: boolean;
  },
): Promise<StartSessionResult> {
  const isSubjectSession =
    options?.kind === "subject" && Boolean(options.subjectKey);
  const activeSession = isSubjectSession
    ? await SessionRepository.getInProgressBySubjectKey(options!.subjectKey!)
    : await SessionRepository.getInProgressByQuestionSetId(questionSet.id);

  if (activeSession && !options?.discardActive) {
    return { ok: false, reason: "conflict", activeSession };
  }

  if (activeSession) {
    // The user consented to discarding the unfinished session.
    if (isSubjectSession) {
      await SessionRepository.deleteInProgressForSubject(options!.subjectKey!);
    } else {
      await SessionRepository.deleteInProgressForQuestionSet(questionSet.id);
    }
  }

  const session = createStudySession(questionSet, configuration, pool, options);
  setState({ session, pendingResume: false });
  await SessionRepository.save(session);
  return { ok: true, session };
}

export function acknowledgeResume() {
  if (!state.pendingResume) {
    return;
  }
  setState({ ...state, pendingResume: false });
}

export function setCurrentQuestionIndex(index: number) {
  updateSession((session) => {
    if (session.status !== "in_progress") {
      return session;
    }
    const lastIndex = Math.max(session.questionIds.length - 1, 0);
    const nextIndex = Math.min(Math.max(index, 0), lastIndex);
    if (nextIndex === session.currentIndex) {
      return session;
    }
    return stampTimeSpent(session, session.currentIndex, Date.now(), nextIndex);
  });
}

export function setDifficulty(
  questionId: string,
  difficulty: DifficultyRating | undefined,
) {
  const sessionForPersist = state.session;
  const persistSetId =
    sessionForPersist?.questionSourceSetIds?.[questionId] ??
    (sessionForPersist?.kind === "subject"
      ? undefined
      : sessionForPersist?.questionSetId);
  updateSession((session) => {
    if (session.status !== "in_progress") {
      return session;
    }
    const existing = session.attempts[questionId] ?? { questionId };
    const attempt: QuestionAttempt = {
      ...existing,
      questionId,
    };
    if (difficulty) {
      attempt.difficulty = difficulty;
    } else {
      delete attempt.difficulty;
    }
    return {
      ...session,
      attempts: {
        ...session.attempts,
        [questionId]: attempt,
      },
    };
  });
  if (persistSetId) {
    void QuestionSetRepository.updateQuestionDifficulty(
      persistSetId,
      questionId,
      difficulty,
    ).catch(() => {
      // The attempt still stores this session's rating.
    });
  }
}

export function setUserAnswer(questionId: string, userAnswer: unknown) {
  updateSession((session) => {
    if (session.status !== "in_progress") {
      return session;
    }
    const existing = session.attempts[questionId] ?? { questionId };
    const attempt: QuestionAttempt = {
      ...existing,
      questionId,
      userAnswer,
    };
    // A new answer invalidates a previously captured outcome (Learn mode
    // re-locks the question for checking); the old result is not historical
    // data, it belonged to the replaced answer.
    if (
      attempt.result !== undefined ||
      attempt.checkedAt !== undefined ||
      attempt.partialCredit !== undefined
    ) {
      delete attempt.result;
      delete attempt.checkedAt;
      delete attempt.partialCredit;
    }
    return {
      ...session,
      attempts: {
        ...session.attempts,
        [questionId]: attempt,
      },
    };
  });
}

/**
 * Learn mode: grade the current answer now and freeze the outcome on the
 * attempt. This is the only place session answers are graded mid-session;
 * the stored result is authoritative afterwards.
 */
export function checkCurrentAnswer(question: Question) {
  updateSession((session) => {
    if (session.status !== "in_progress") {
      return session;
    }
    const questionId = session.questionIds[session.currentIndex];
    if (!questionId || questionId !== question.id) {
      return session;
    }
    const attempt = session.attempts[questionId];
    if (!attempt || attempt.result !== undefined) {
      // Nothing answered, or the outcome is already recorded.
      return session;
    }
    if (!hasUserAnswer(attempt.userAnswer)) {
      return session;
    }
    const outcome = gradeQuestion(question, attempt.userAnswer);
    const checkedAttempt: QuestionAttempt = {
      ...attempt,
      questionId,
      result: outcome.status,
      checkedAt: new Date().toISOString(),
    };
    if (typeof outcome.credit === "number") {
      checkedAttempt.partialCredit = outcome.credit;
    }
    return {
      ...session,
      attempts: {
        ...session.attempts,
        [questionId]: checkedAttempt,
      },
    };
  });
}

export function setQuestionConfidence(
  questionId: string,
  confidence: ConfidenceRating | undefined,
) {
  updateSession((session) => {
    if (session.status !== "in_progress") {
      return session;
    }
    const attempt = session.attempts[questionId];
    if (attempt?.result !== undefined) {
      // The question has been checked; confidence was assessed before that.
      return session;
    }
    const base = attempt ?? { questionId };
    const next: QuestionAttempt = { ...base, questionId };
    if (confidence) {
      next.confidence = confidence;
    } else {
      delete next.confidence;
    }
    return {
      ...session,
      attempts: {
        ...session.attempts,
        [questionId]: next,
      },
    };
  });
}

/**
 * Records the user's manual grade for an ungraded question on a completed
 * session. Never touches outcomes for questions with an answer key.
 */
export function setSelfGrading(
  questionId: string,
  selfGrading: "correct" | "incorrect",
) {
  const before = state.session;
  updateSession((session) => {
    if (session.status !== "completed") {
      return session;
    }
    return withAttemptSelfGrading(session, questionId, selfGrading);
  });
  // Self-grading changes a stored outcome after completion → refresh the
  // question's memory so the replay uses the new result.
  const after = state.session;
  if (after && after !== before && after.status === "completed") {
    void updateMemoryForSession(after).catch(() => {
      // Memory can always be rebuilt from history if this fails.
    });
  }
}

export function ensureQuestionTiming(questionId: string) {
  updateSession((session) => {
    if (session.status !== "in_progress") {
      return session;
    }

    const existing = session.attempts[questionId] ?? { questionId };
    if (existing.startedAt) {
      return session;
    }

    const now = Date.now();
    const attempt: QuestionAttempt = {
      ...existing,
      questionId,
      startedAt: new Date(now).toISOString(),
    };

    if (session.questionTimeLimitMs) {
      const questionDeadline = now + session.questionTimeLimitMs;
      const sessionDeadline = session.sessionDeadline
        ? Date.parse(session.sessionDeadline)
        : Number.POSITIVE_INFINITY;
      attempt.deadline = new Date(
        Math.min(questionDeadline, sessionDeadline),
      ).toISOString();
    }

    return {
      ...session,
      attempts: {
        ...session.attempts,
        [questionId]: attempt,
      },
    };
  });
}

export function timeoutCurrentQuestionAndAdvance() {
  updateSession((session) => {
    if (session.status !== "in_progress") {
      return session;
    }

    const questionId = session.questionIds[session.currentIndex];
    if (!questionId) {
      return session;
    }

    const existing = session.attempts[questionId] ?? { questionId };
    if (existing.timedOut) {
      return session;
    }

    const now = Date.now();
    const startedAt = existing.startedAt ? Date.parse(existing.startedAt) : now;
    const attempts = {
      ...session.attempts,
      [questionId]: {
        ...existing,
        questionId,
        timedOut: true,
        timeSpentMs: Math.max(0, now - startedAt),
      },
    };

    const isLast = session.currentIndex >= session.questionIds.length - 1;
    if (isLast) {
      return withFinalResults({
        ...session,
        attempts,
        status: "completed",
        completedAt: new Date(now).toISOString(),
        completionReason: "question_timer",
      });
    }

    return {
      ...session,
      attempts,
      currentIndex: session.currentIndex + 1,
    };
  });
}

export function completeStudySession(
  reason: SessionCompletionReason = "finished",
) {
  updateSession((session) => {
    if (session.status === "completed") {
      return session;
    }
    const now = Date.now();
    return withFinalResults({
      ...stampTimeSpent(session, session.currentIndex, now, session.currentIndex),
      status: "completed",
      completedAt: new Date(now).toISOString(),
      completionReason: reason,
    });
  });
  const completed = state.session;
  if (completed?.scheduledEventId) {
    void markScheduledEventStatus(completed.scheduledEventId, "done");
  }
}

export function expireSessionIfNeeded(now = Date.now()): boolean {
  const session = state.session;
  if (!session || session.status !== "in_progress") {
    return false;
  }
  if (!isDeadlinePassed(session.sessionDeadline, now)) {
    return false;
  }
  completeStudySession("session_timer");
  return true;
}

export async function discardStudySession(): Promise<void> {
  const session = state.session;
  setState({ session: null, pendingResume: false });
  if (session?.status === "in_progress") {
    await SessionRepository.delete(session.id);
  }
}

export function clearStudySession() {
  setState({ session: null, pendingResume: false });
}

export function countAnsweredQuestions(session: StudySession): number {
  return Object.values(session.attempts).filter((attempt) =>
    hasUserAnswer(attempt.userAnswer),
  ).length;
}

export function countTimedOutQuestions(session: StudySession): number {
  return Object.values(session.attempts).filter((attempt) => attempt.timedOut)
    .length;
}

export function useStudySessionState(): SessionState {
  return useSyncExternalStore(
    subscribeToSession,
    getSessionState,
    getSessionState,
  );
}

function stampTimeSpent(
  session: StudySession,
  fromIndex: number,
  now: number,
  nextIndex: number,
): StudySession {
  const questionId = session.questionIds[fromIndex];
  if (!questionId) {
    return { ...session, currentIndex: nextIndex };
  }

  const existing = session.attempts[questionId];
  if (!existing?.startedAt) {
    return { ...session, currentIndex: nextIndex };
  }

  const startedAt = Date.parse(existing.startedAt);
  return {
    ...session,
    currentIndex: nextIndex,
    attempts: {
      ...session.attempts,
      [questionId]: {
        ...existing,
        timeSpentMs: Math.max(0, now - startedAt),
      },
    },
  };
}
