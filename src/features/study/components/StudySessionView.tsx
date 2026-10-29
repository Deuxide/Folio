import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, ArrowRight, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { MathText } from "@/features/questions/components/MathText";
import { QuestionImages } from "@/features/questions/components/QuestionImages";
import { getQuestionImages } from "@/features/questions/media";
import { QuestionRenderer } from "@/features/questions/renderers/QuestionRenderer";
import { ConfidenceSelector } from "@/features/study/components/ConfidenceSelector";
import { LearnFeedbackPanel } from "@/features/study/components/LearnFeedbackPanel";
import { hasUserAnswer } from "@/features/questions/isAnswered";
import { DifficultySelector } from "@/features/study/components/DifficultySelector";
import { ExitSessionDialog } from "@/features/study/components/ExitSessionDialog";
import { QuestionNavigator } from "@/features/study/components/QuestionNavigator";
import { SessionTimerDisplay } from "@/features/study/components/SessionTimerDisplay";
import { StudyProgress } from "@/features/study/components/StudyProgress";
import { useSessionTimers } from "@/features/study/hooks/useSessionTimers";
import { minutesToMs } from "@/features/study/timer";
import {
  sessionCompletePath,
  sessionExitPath,
  questionSourceLabel,
} from "@/features/study/sessionPaths";
import {
  checkCurrentAnswer,
  completeStudySession,
  countAnsweredQuestions,
  discardStudySession,
  ensureQuestionTiming,
  expireSessionIfNeeded,
  setCurrentQuestionIndex,
  setDifficulty,
  setQuestionConfidence,
  setUserAnswer,
  timeoutCurrentQuestionAndAdvance,
} from "@/features/study/sessionStore";
import type { QuestionSet } from "@/types/question";
import type { StudySession } from "@/types/session";

type StudySessionViewProps = {
  questionSet: QuestionSet;
  session: StudySession;
  timersEnabled?: boolean;
};

export function StudySessionView({
  questionSet,
  session,
  timersEnabled = true,
}: StudySessionViewProps) {
  const navigate = useNavigate();
  const [isExitOpen, setIsExitOpen] = useState(false);

  const questionsById = useMemo(() => {
    return new Map(
      questionSet.questions.map((question) => [question.id, question]),
    );
  }, [questionSet.questions]);

  const total = session.questionIds.length;
  const currentIndex = session.currentIndex;
  const questionId = session.questionIds[currentIndex];
  const question = questionId
    ? (session.questionSnapshots?.[questionId] ?? questionsById.get(questionId))
    : undefined;
  const currentAttempt = questionId ? session.attempts[questionId] : undefined;
  const isAnswered = hasUserAnswer(currentAttempt?.userAnswer);
  const isTimedOut = Boolean(currentAttempt?.timedOut);
  const isLast = currentIndex >= total - 1;
  const answeredCount = countAnsweredQuestions(session);
  const isLearnMode = (session.mode ?? "test") === "learn";
  const isChecked = Boolean(currentAttempt?.result);
  const showLearnFeedback =
    isLearnMode &&
    question !== undefined &&
    currentAttempt !== undefined &&
    (isChecked || isTimedOut);

  const { sessionRemainingMs, questionRemainingMs } = useSessionTimers(session, {
    enabled: timersEnabled && session.status === "in_progress",
    onSessionExpired: () => {
      expireSessionIfNeeded();
    },
    onQuestionExpired: () => {
      timeoutCurrentQuestionAndAdvance();
    },
  });

  useEffect(() => {
    if (session.status === "completed") {
      void navigate(sessionCompletePath(session), { replace: true });
    }
  }, [navigate, session, session.status]);

  useEffect(() => {
    if (!questionId || session.status !== "in_progress" || !timersEnabled) {
      return;
    }
    if (session.questionTimeLimitMs) {
      ensureQuestionTiming(questionId);
    }
  }, [
    questionId,
    session.questionTimeLimitMs,
    session.status,
    timersEnabled,
  ]);

  const answeredIndexes = useMemo(() => {
    const indexes = new Set<number>();
    session.questionIds.forEach((id, index) => {
      const attempt = session.attempts[id];
      if (attempt && hasUserAnswer(attempt.userAnswer)) {
        indexes.add(index);
      }
    });
    return indexes;
  }, [session.attempts, session.questionIds]);

  const timedOutIndexes = useMemo(() => {
    const indexes = new Set<number>();
    session.questionIds.forEach((id, index) => {
      if (session.attempts[id]?.timedOut) {
        indexes.add(index);
      }
    });
    return indexes;
  }, [session.attempts, session.questionIds]);

  async function handleExit() {
    await discardStudySession();
    void navigate(sessionExitPath(session));
  }

  function handleFinish() {
    completeStudySession("finished");
    void navigate(sessionCompletePath(session));
  }

  if (!question || total === 0) {
    return (
      <div className="space-y-4">
        <p className="text-sm text-muted-foreground">
          This session has no questions to study.
        </p>
        <Button type="button" variant="outline" onClick={() => void handleExit()}>
          Back to question set
        </Button>
      </div>
    );
  }

  const sessionTotalMs = session.configuration.sessionTimeLimitMinutes
    ? minutesToMs(session.configuration.sessionTimeLimitMinutes)
    : undefined;

  return (
    <div className="mx-auto w-full max-w-3xl space-y-6">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-sm font-medium tracking-wide text-primary uppercase">
            Studying
          </p>
          <h1 className="mt-1 truncate font-serif text-2xl font-semibold tracking-tight sm:text-3xl">
            {questionSet.title}
          </h1>
        </div>
        <Button
          type="button"
          variant="ghost"
          onClick={() => {
            if (answeredCount > 0 || session.sessionDeadline) {
              setIsExitOpen(true);
              return;
            }
            void handleExit();
          }}
        >
          Exit Session
        </Button>
      </div>

      {sessionRemainingMs !== null || questionRemainingMs !== null ? (
        <div className="flex flex-wrap gap-2">
          {sessionRemainingMs !== null ? (
            <SessionTimerDisplay
              label="Time remaining"
              remainingMs={sessionRemainingMs}
              totalMs={sessionTotalMs}
            />
          ) : null}
          {questionRemainingMs !== null ? (
            <SessionTimerDisplay
              label="Question time"
              remainingMs={questionRemainingMs}
              totalMs={session.questionTimeLimitMs}
            />
          ) : null}
        </div>
      ) : null}

      <StudyProgress current={currentIndex + 1} total={total} />
      <QuestionNavigator
        total={total}
        currentIndex={currentIndex}
        answeredIndexes={answeredIndexes}
        timedOutIndexes={timedOutIndexes}
        onSelect={setCurrentQuestionIndex}
      />

      <section className="rounded-2xl border border-border bg-card p-5 sm:p-7">
        <div className="mb-3 flex flex-wrap items-center gap-2 text-xs font-medium">
          <span className="rounded-full bg-muted px-2.5 py-1 text-muted-foreground">
            Question {currentIndex + 1}
          </span>
          <span
            className={
              isTimedOut
                ? "rounded-full bg-destructive/10 px-2.5 py-1 text-destructive"
                : isChecked
                  ? "rounded-full bg-primary/10 px-2.5 py-1 text-primary"
                  : isAnswered
                    ? "rounded-full bg-muted px-2.5 py-1 text-muted-foreground"
                    : "rounded-full bg-muted px-2.5 py-1 text-muted-foreground"
            }
          >
            {isTimedOut
              ? "Timed out"
              : isChecked
                ? "Checked"
                : isAnswered
                  ? "Answered"
                  : "Unanswered"}
          </span>
        </div>
        {questionSourceLabel(session, question.id) ? (
          <p className="mb-2 text-sm text-muted-foreground">
            {questionSourceLabel(session, question.id)}
          </p>
        ) : null}
        {question.question.trim() ? (
          <MathText
            as="p"
            className="font-serif text-xl leading-snug break-words text-foreground sm:text-2xl"
            text={question.question}
          />
        ) : null}
        {getQuestionImages(question).length > 0 ? (
          <div className="mt-4">
            <QuestionImages images={getQuestionImages(question)} />
          </div>
        ) : null}
        {showLearnFeedback && question && currentAttempt ? (
          <div className="mt-6">
            <LearnFeedbackPanel question={question} attempt={currentAttempt} />
          </div>
        ) : (
          <div className="mt-6 rounded-xl border border-border/80 bg-background/70 p-4">
            <p className="mb-3 text-sm font-medium text-muted-foreground">
              Your answer
            </p>
            <QuestionRenderer
              question={question}
              value={currentAttempt?.userAnswer}
              onChange={(value) => setUserAnswer(question.id, value)}
            />
            {isLearnMode ? (
              <div className="mt-4 border-t border-border/80 pt-3">
                <ConfidenceSelector
                  value={currentAttempt?.confidence}
                  onChange={(confidence) =>
                    setQuestionConfidence(question.id, confidence)
                  }
                />
              </div>
            ) : null}
          </div>
        )}
        {!showLearnFeedback && isLearnMode && isAnswered ? (
          <div className="mt-4 flex justify-end">
            <Button
              type="button"
              onClick={() => {
                if (question) {
                  checkCurrentAnswer(question);
                }
              }}
            >
              <CheckCircle2 />
              Check answer
            </Button>
          </div>
        ) : null}
        <div className="mt-6 border-t border-border pt-5">
          <DifficultySelector
            value={currentAttempt?.difficulty ?? question.difficulty}
            onChange={(difficulty) => setDifficulty(question.id, difficulty)}
          />
        </div>
      </section>

      <div className="flex items-center justify-between gap-3">
        <Button
          type="button"
          variant="outline"
          disabled={currentIndex === 0}
          onClick={() => setCurrentQuestionIndex(currentIndex - 1)}
        >
          <ArrowLeft />
          Previous
        </Button>
        {isLast ? (
          <Button type="button" onClick={handleFinish}>
            <CheckCircle2 />
            Finish Session
          </Button>
        ) : (
          <Button
            type="button"
            onClick={() => setCurrentQuestionIndex(currentIndex + 1)}
          >
            Next
            <ArrowRight />
          </Button>
        )}
      </div>

      <p className="text-center text-xs text-muted-foreground">
        {answeredCount} of {total} answered
      </p>

      <ExitSessionDialog
        open={isExitOpen}
        hasAnswers={answeredCount > 0}
        onOpenChange={setIsExitOpen}
        onConfirm={() => {
          void handleExit();
        }}
      />
    </div>
  );
}
