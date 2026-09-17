import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { ArrowLeft, Download, Play } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { QuestionListItem } from "@/features/question-sets/components/QuestionListItem";
import { QuestionSetSubjectForm } from "@/features/question-sets/components/QuestionSetSubjectForm";
import { downloadQuestionSetJson } from "@/features/question-sets/exportQuestionSet";
import { useQuestionSet } from "@/features/question-sets/hooks/useQuestionSet";
import { formatBankSubject } from "@/features/question-sets/subject";
import { extractHistoryEntries } from "@/features/history/extractAttempts";
import { formatHistoryDate } from "@/features/history/formatDate";
import {
  computeSetOverview,
  sessionAccuracy,
} from "@/features/statistics/computeStatistics";
import {
  formatDifficultyAverage,
  summarizeQuestionDifficulty,
} from "@/features/statistics/difficultySummary";
import { formatCountdown, getRemainingMs, isDeadlinePassed } from "@/features/study/timer";
import {
  completeStudySession,
  discardStudySession,
  loadSession,
} from "@/features/study/sessionStore";
import { SessionRepository } from "@/repositories/SessionRepository";
import type { StudySession } from "@/types/session";

export function QuestionSetDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { questionSet, isLoading, error, update } = useQuestionSet(id);
  const [activeSession, setActiveSession] = useState<StudySession | null>(null);
  const [completedSessions, setCompletedSessions] = useState<StudySession[]>(
    [],
  );

  useEffect(() => {
    let cancelled = false;
    async function loadActive() {
      if (!id) {
        return;
      }
      const [persisted, related] = await Promise.all([
        SessionRepository.getInProgressByQuestionSetId(id),
        SessionRepository.getByQuestionSetId(id),
      ]);
      if (cancelled) {
        return;
      }
      if (persisted && isDeadlinePassed(persisted.sessionDeadline)) {
        loadSession(persisted);
        completeStudySession("session_timer");
        setActiveSession(null);
      } else {
        setActiveSession(persisted ?? null);
      }
      setCompletedSessions(
        related
          .filter((session) => session.status === "completed")
          .sort((left, right) =>
            (right.completedAt ?? right.startedAt).localeCompare(
              left.completedAt ?? left.startedAt,
            ),
          ),
      );
    }
    void loadActive();
    return () => {
      cancelled = true;
    };
  }, [id]);

  const history = useMemo(
    () => extractHistoryEntries(completedSessions),
    [completedSessions],
  );
  const overview = useMemo(
    () =>
      computeSetOverview(questionSet?.questions.length ?? 0, completedSessions),
    [completedSessions, questionSet],
  );
  const difficulty = useMemo(
    () => summarizeQuestionDifficulty(questionSet?.questions ?? []),
    [questionSet],
  );
  const latestSession = completedSessions[0];
  const recentAccuracy = latestSession
    ? sessionAccuracy(latestSession).percent
    : null;

  function handleStartStudying() {
    if (!questionSet || questionSet.questions.length === 0) {
      return;
    }
    void navigate(`/sets/${questionSet.id}/setup`);
  }

  return (
    <div className="space-y-8">
      <Button asChild variant="ghost" className="-ml-2 w-fit">
        <Link to="/">
          <ArrowLeft />
          Back to question sets
        </Link>
      </Button>

      {isLoading ? (
        <div className="space-y-4">
          <div className="h-10 w-64 animate-pulse rounded-md bg-muted" />
          <div className="h-5 w-96 max-w-full animate-pulse rounded-md bg-muted" />
          <div className="h-40 animate-pulse rounded-xl border border-border bg-card" />
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
          <header className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
            <div className="space-y-3">
              <p className="text-sm font-medium tracking-wide text-primary uppercase">
                {formatBankSubject(questionSet.subject)}
              </p>
              <h1 className="font-serif text-3xl font-semibold tracking-tight sm:text-4xl">
                {questionSet.title}
              </h1>
              {questionSet.description ? (
                <p className="max-w-2xl text-base leading-relaxed text-muted-foreground">
                  {questionSet.description}
                </p>
              ) : null}
              <p className="text-sm font-medium text-foreground">
                {questionSet.questions.length === 1
                  ? "1 Question"
                  : `${questionSet.questions.length} Questions`}
              </p>
              {overview.sessions === 0 ? (
                <p className="text-sm text-muted-foreground">Not studied yet</p>
              ) : (
                <p className="text-sm text-muted-foreground">
                  Last studied{" "}
                  {overview.lastStudiedAt
                    ? formatHistoryDate(overview.lastStudiedAt)
                    : "—"}
                  {recentAccuracy === null
                    ? ""
                    : ` · Recent accuracy ${recentAccuracy}%`}
                  {` · ${overview.sessions} ${overview.sessions === 1 ? "session" : "sessions"} completed`}
                </p>
              )}
            </div>
            <div className="flex flex-wrap gap-2">
              {questionSet.questions.length > 0 ? (
                <Button type="button" size="lg" onClick={handleStartStudying}>
                  <Play />
                  Start Studying
                </Button>
              ) : null}
              <Button
                type="button"
                size="lg"
                variant="outline"
                onClick={() => downloadQuestionSetJson(questionSet)}
              >
                <Download />
                Export JSON
              </Button>
            </div>
          </header>

          <QuestionSetSubjectForm
            key={questionSet.subject ?? "uncategorized"}
            subject={questionSet.subject}
            onSave={async (subject) => {
              await update({ subject });
            }}
          />

          {activeSession ? (
            <Alert>
              <AlertTitle>Resume your session?</AlertTitle>
              <AlertDescription>
                <p>
                  {questionSet.title} · Question {activeSession.currentIndex + 1}{" "}
                  of {activeSession.questionIds.length}
                  {activeSession.sessionDeadline
                    ? ` · Time remaining: ${formatCountdown(getRemainingMs(activeSession.sessionDeadline) ?? 0)}`
                    : ""}
                </p>
                <div className="mt-3 flex flex-wrap gap-2">
                  <Button asChild size="sm">
                    <Link to={`/sets/${questionSet.id}/study`}>Resume</Link>
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    onClick={() => {
                      loadSession(activeSession);
                      void discardStudySession().then(() => {
                        setActiveSession(null);
                      });
                    }}
                  >
                    Discard
                  </Button>
                </div>
              </AlertDescription>
            </Alert>
          ) : null}

          <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            <StatCard label="Questions" value={String(overview.questionCount)} />
            <StatCard
              label="Questions attempted"
              value={String(overview.questionsAttempted)}
            />
            <StatCard
              label="Overall accuracy"
              value={
                overview.accuracy.percent === null
                  ? "—"
                  : `${overview.accuracy.percent}%`
              }
            />
            <StatCard
              label="Average time"
              value={
                overview.averageTimeMs === null
                  ? "—"
                  : formatCountdown(overview.averageTimeMs)
              }
            />
            <StatCard label="Sessions" value={String(overview.sessions)} />
            <StatCard
              label="Average difficulty"
              value={formatDifficultyAverage(difficulty.average)}
            />
          </section>

          {questionSet.questions.length === 0 ? (
            <p className="rounded-xl border border-dashed border-border px-5 py-10 text-center text-sm text-muted-foreground">
              This question set does not contain any questions yet.
            </p>
          ) : (
            <section className="rounded-xl border border-border bg-card px-5">
              {questionSet.questions.map((question, index) => (
                <QuestionListItem
                  key={question.id}
                  index={index}
                  question={question}
                  history={history.filter(
                    (entry) => entry.questionId === question.id,
                  )}
                />
              ))}
            </section>
          )}
        </>
      )}
    </div>
  );
}

function StatCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-border bg-card px-4 py-4">
      <p className="text-sm text-muted-foreground">{label}</p>
      <p className="mt-1 font-serif text-2xl font-semibold">{value}</p>
    </div>
  );
}
