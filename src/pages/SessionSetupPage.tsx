import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useParams, useSearchParams } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { useQuestionSet } from "@/features/question-sets/hooks/useQuestionSet";
import { extractHistoryEntries } from "@/features/history/extractAttempts";
import { formatHistoryDate } from "@/features/history/formatDate";
import { getPracticePool } from "@/features/statistics/practicePool";
import { ResumeSessionBanner } from "@/features/study/components/ResumeSessionBanner";
import { SessionSetupForm } from "@/features/study/components/SessionSetupForm";
import {
  loadSession,
  discardStudySession,
  completeStudySession,
  startStudySession,
} from "@/features/study/sessionStore";
import { isDeadlinePassed } from "@/features/study/timer";
import { SessionRepository } from "@/repositories/SessionRepository";
import type { PracticeFocus, SessionConfiguration } from "@/types/session";
import type { StudySession } from "@/types/session";

export function SessionSetupPage() {
  const { id } = useParams();
  const [searchParams] = useSearchParams();
  const scheduledEventId = searchParams.get("event") ?? undefined;
  const navigate = useNavigate();
  const { questionSet, isLoading, error } = useQuestionSet(id);
  const [isStarting, setIsStarting] = useState(false);
  const [startError, setStartError] = useState<string | null>(null);
  const [sessions, setSessions] = useState<StudySession[]>([]);
  const [inProgress, setInProgress] = useState<StudySession | null>(null);
  const [pendingStart, setPendingStart] = useState<SessionConfiguration | null>(
    null,
  );

  useEffect(() => {
    let cancelled = false;
    async function loadHistory() {
      if (!id) {
        return;
      }
      const related = await SessionRepository.getByQuestionSetId(id);
      if (cancelled) {
        return;
      }
      setSessions(
        related.filter((session) => session.status === "completed"),
      );
      const active =
        related
          .filter((session) => session.status === "in_progress")
          .sort((left, right) => right.startedAt.localeCompare(left.startedAt))
          .at(0) ?? null;
      if (active && isDeadlinePassed(active.sessionDeadline)) {
        // Expired sessions finalize as soon as they are loaded, mirroring
        // the question set detail page; nothing resumable remains.
        loadSession(active);
        completeStudySession("session_timer");
        setInProgress(null);
      } else {
        setInProgress(active);
      }
    }
    void loadHistory();
    return () => {
      cancelled = true;
    };
  }, [id]);

  const history = useMemo(() => extractHistoryEntries(sessions), [sessions]);
  const practiceCounts = useMemo(() => {
    if (!questionSet) {
      return undefined;
    }
    const focuses: PracticeFocus[] = [
      "all",
      "unanswered",
      "incorrect",
      "hard",
      "weak",
    ];
    return Object.fromEntries(
      focuses.map((focus) => [
        focus,
        getPracticePool(questionSet.questions, focus, history).length,
      ]),
    ) as Record<PracticeFocus, number>;
  }, [history, questionSet]);

  async function performStart(
    configuration: SessionConfiguration,
    discardActive: boolean,
  ) {
    if (!questionSet) {
      return;
    }
    const pool = getPracticePool(
      questionSet.questions,
      configuration.practiceFocus,
      history,
    );
    setIsStarting(true);
    setStartError(null);
    try {
      const startOptions: Parameters<typeof startStudySession>[3] = {
        discardActive,
      };
      if (scheduledEventId) {
        startOptions.scheduledEventId = scheduledEventId;
      }
      const result = await startStudySession(
        questionSet,
        configuration,
        pool,
        startOptions,
      );
      if (!result.ok) {
        // An unfinished session exists; ask before discarding it.
        setPendingStart(configuration);
        return;
      }
      void navigate(`/sets/${questionSet.id}/study`);
    } catch (cause) {
      setStartError(
        cause instanceof Error
          ? cause.message
          : "Unable to start the study session.",
      );
    } finally {
      setIsStarting(false);
    }
  }

  function handleDiscardActive() {
    const active = inProgress;
    if (!active) {
      return;
    }
    loadSession(active);
    void discardStudySession().then(() => {
      setInProgress(null);
    });
  }

  return (
    <div className="mx-auto w-full max-w-3xl space-y-8">
      <Button asChild variant="ghost" className="-ml-2 w-fit">
        <Link to={id ? `/sets/${id}` : "/"}>
          <ArrowLeft />
          Back to question set
        </Link>
      </Button>

      {isLoading ? (
        <div className="space-y-4">
          <div className="h-10 w-64 animate-pulse rounded-md bg-muted" />
          <div className="h-64 animate-pulse rounded-xl border border-border bg-card" />
        </div>
      ) : error || !questionSet ? (
        <Alert variant="destructive">
          <AlertTitle>Question set unavailable</AlertTitle>
          <AlertDescription>
            {error ?? "This question set could not be found on this device."}
          </AlertDescription>
        </Alert>
      ) : (
        <>
          <header className="space-y-2">
            <p className="text-sm font-medium tracking-wide text-primary uppercase">
              Session setup
            </p>
            <h1 className="font-serif text-3xl font-semibold tracking-tight sm:text-4xl">
              {questionSet.title}
            </h1>
            <p className="text-sm text-muted-foreground">
              Choose how this practice session should run. You can start with
              the defaults if you just want to begin.
            </p>
          </header>
          {startError ? (
            <Alert variant="destructive">
              <AlertTitle>Unable to start</AlertTitle>
              <AlertDescription>{startError}</AlertDescription>
            </Alert>
          ) : null}
          {inProgress ? (
            <ResumeSessionBanner
              prompt="You have an unfinished session"
              description={
                <>
                  <p>
                    {questionSet.title} · Question{" "}
                    {inProgress.currentIndex + 1} of{" "}
                    {inProgress.questionIds.length} · started{" "}
                    {formatHistoryDate(inProgress.startedAt)}
                  </p>
                </>
              }
              resumeTo={`/sets/${questionSet.id}/study`}
              onDiscard={handleDiscardActive}
            />
          ) : null}
          <SessionSetupForm
            availableCount={questionSet.questions.length}
            practiceCounts={practiceCounts}
            isStarting={isStarting}
            onStart={(configuration) => void performStart(configuration, false)}
          />
        </>
      )}

      <AlertDialog
        open={pendingStart !== null}
        onOpenChange={(open) => {
          if (!open) {
            setPendingStart(null);
          }
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Discard unfinished session?</AlertDialogTitle>
            <AlertDialogDescription>
              Starting fresh will discard the unfinished session for this
              question set, including any answers you already gave in it.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Keep unfinished session</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                const configuration = pendingStart;
                setPendingStart(null);
                if (configuration) {
                  void performStart(configuration, true);
                }
              }}
            >
              Discard &amp; start fresh
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
