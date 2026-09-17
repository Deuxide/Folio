import { useSyncExternalStore } from "react";
import { hasUserAnswer } from "@/features/questions/isAnswered";
import { createStudySession } from "@/features/study/createSession";
import { withFinalResults } from "@/features/study/finalizeSession";
import { isDeadlinePassed } from "@/features/study/timer";
import { markScheduledEventStatus } from "@/features/scheduler/studyAction";
import { QuestionSetRepository } from "@/repositories/QuestionSetRepository";
import { SessionRepository } from "@/repositories/SessionRepository";
import type { QuestionSet } from "@/types/question";
import type {
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
  const nextSession = updater(state.session);
  if (nextSession === state.session) {
    return;
  }
  setState({ ...state, session: nextSession });
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

export async function startStudySession(
  questionSet: QuestionSet,
  configuration: SessionConfiguration,
  pool = questionSet.questions,
  options?: Parameters<typeof createStudySession>[3],
): Promise<StudySession> {
  if (options?.kind === "subject" && options.subjectKey) {
    await SessionRepository.deleteInProgressForSubject(options.subjectKey);
  } else {
    await SessionRepository.deleteInProgressForQuestionSet(questionSet.id);
  }
  const session = createStudySession(questionSet, configuration, pool, options);
  setState({ session, pendingResume: false });
  await SessionRepository.save(session);
  return session;
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
    return {
      ...session,
      attempts: {
        ...session.attempts,
        [questionId]: attempt,
      },
    };
  });
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
