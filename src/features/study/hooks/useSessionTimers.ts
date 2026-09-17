import { useEffect, useRef } from "react";
import { useCountdown } from "@/features/study/hooks/useCountdown";
import type { StudySession } from "@/types/session";

type UseSessionTimersOptions = {
  enabled?: boolean;
  onSessionExpired: () => void;
  onQuestionExpired: () => void;
};

export function useSessionTimers(
  session: StudySession,
  { enabled = true, onSessionExpired, onQuestionExpired }: UseSessionTimersOptions,
) {
  const questionId = session.questionIds[session.currentIndex];
  const attempt = questionId ? session.attempts[questionId] : undefined;
  const sessionRemainingMs = useCountdown(
    enabled ? session.sessionDeadline : undefined,
  );
  const questionRemainingMs = useCountdown(
    enabled && !attempt?.timedOut ? attempt?.deadline : undefined,
  );

  const sessionHandlerRef = useRef(onSessionExpired);
  const questionHandlerRef = useRef(onQuestionExpired);

  useEffect(() => {
    sessionHandlerRef.current = onSessionExpired;
    questionHandlerRef.current = onQuestionExpired;
  }, [onQuestionExpired, onSessionExpired]);

  useEffect(() => {
    if (!enabled || session.status !== "in_progress") {
      return;
    }
    if (sessionRemainingMs === 0) {
      sessionHandlerRef.current();
    }
  }, [enabled, session.status, sessionRemainingMs]);

  useEffect(() => {
    if (!enabled || session.status !== "in_progress") {
      return;
    }
    if (questionRemainingMs === 0 && !attempt?.timedOut) {
      questionHandlerRef.current();
    }
  }, [enabled, session.status, questionRemainingMs, attempt?.timedOut]);

  return {
    sessionRemainingMs,
    questionRemainingMs,
  };
}
