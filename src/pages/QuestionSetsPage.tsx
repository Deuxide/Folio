import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { formatEventTimeRange, startOfDay } from "@/features/scheduler/dates";
import { expandEvents } from "@/features/scheduler/recurrence";
import { StudyEventRepository } from "@/repositories/StudyEventRepository";
import type { StudyOccurrence } from "@/types/scheduler";
import { ImportErrorDialog } from "@/features/question-sets/components/ImportErrorDialog";
import { ImportQuestionSetButton } from "@/features/question-sets/components/ImportQuestionSetButton";
import { QuestionSetCard } from "@/features/question-sets/components/QuestionSetCard";
import { QuestionSetEmptyState } from "@/features/question-sets/components/QuestionSetEmptyState";
import { ReimportConflictDialog } from "@/features/question-sets/components/ReimportConflictDialog";
import { getImportErrorMessage } from "@/features/question-sets/import/ImportValidationError";
import type { ImportConflict } from "@/features/question-sets/import/importQuestionSet";
import { useQuestionSets } from "@/features/question-sets/hooks/useQuestionSets";
import { formatHistoryDate } from "@/features/history/formatDate";
import { sessionAccuracy } from "@/features/statistics/computeStatistics";
import { SessionRepository } from "@/repositories/SessionRepository";
import type { StudySession } from "@/types/session";

export function QuestionSetsPage() {
  const { questionSets, isLoading, error, importFromFile, resolveImportConflict, remove } =
    useQuestionSets();
  const [importError, setImportError] = useState<{
    title: string;
    problems: string[];
  } | null>(null);
  const [importConflict, setImportConflict] = useState<ImportConflict | null>(
    null,
  );
  const [isResolvingImport, setIsResolvingImport] = useState(false);
  const [sessions, setSessions] = useState<StudySession[]>([]);
  const [todayStudy, setTodayStudy] = useState<StudyOccurrence[]>([]);

  useEffect(() => {
    let cancelled = false;
    async function loadSessions() {
      const completed = await SessionRepository.getCompleted();
      const events = await StudyEventRepository.getAll().catch(() => []);
      if (!cancelled) {
        setSessions(completed);
        const today = startOfDay(new Date());
        setTodayStudy(
          expandEvents(events, today, today).filter((item) => item.source.studyAction),
        );
      }
    }
    void loadSessions();
    return () => {
      cancelled = true;
    };
  }, [questionSets]);

  const statsBySet = useMemo(() => {
    const map = new Map<
      string,
      { count: number; last?: string; accuracy: number | null }
    >();
    for (const session of sessions) {
      const current = map.get(session.questionSetId) ?? {
        count: 0,
        accuracy: null,
      };
      current.count += 1;
      const completedAt = session.completedAt ?? session.startedAt;
      if (!current.last || completedAt > current.last) {
        current.last = completedAt;
        current.accuracy = sessionAccuracy(session).percent;
      }
      map.set(session.questionSetId, current);
    }
    return map;
  }, [sessions]);

  function handleImportError(cause: unknown) {
    setImportError(getImportErrorMessage(cause));
  }

  async function importSet(file: File) {
    const outcome = await importFromFile(file);
    if (outcome.status === "conflict") {
      setImportConflict(outcome);
    }
  }

  async function resolveConflict(
    resolution: "update" | "copy",
    conflict: ImportConflict,
  ) {
    setIsResolvingImport(true);
    try {
      await resolveImportConflict(resolution, conflict);
      setImportConflict(null);
    } catch (cause) {
      setImportConflict(null);
      handleImportError(cause);
    } finally {
      setIsResolvingImport(false);
    }
  }

  return (
    <div className="space-y-8">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-sm font-medium tracking-wide text-primary uppercase">
            Question bank
          </p>
          <h1 className="mt-1 font-serif text-3xl font-semibold tracking-tight sm:text-4xl">
            My Question Sets
          </h1>
          <p className="mt-2 max-w-xl text-sm leading-relaxed text-muted-foreground">
            Import a JSON question bank, then start a session. Everything stays
            on this device.
          </p>
        </div>
        {questionSets.length > 0 ? (
          <ImportQuestionSetButton
            onImport={importSet}
            onError={handleImportError}
          />
        ) : null}
      </div>

      {error ? (
        <Alert variant="destructive">
          <AlertTitle>Unable to load question sets</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      ) : null}

      {todayStudy.length > 0 ? (
        <section className="rounded-2xl border border-border bg-card px-5 py-4">
          <div className="flex items-center justify-between gap-3">
            <h2 className="font-serif text-xl font-semibold">Upcoming</h2>
            <Button asChild size="sm" variant="ghost">
              <Link to="/schedule">View Schedule</Link>
            </Button>
          </div>
          <ul className="mt-3 space-y-2 text-sm">
            {todayStudy.map((occurrence) => (
              <li key={`${occurrence.source.id}-${occurrence.dateKey}`}>
                <span className="text-muted-foreground">
                  {formatEventTimeRange(
                    occurrence.startAt,
                    occurrence.endAt,
                    occurrence.source.allDay,
                  )}
                </span>{" "}
                {occurrence.source.title}
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      {isLoading ? (
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="h-48 animate-pulse rounded-xl border border-border bg-card" />
          <div className="h-48 animate-pulse rounded-xl border border-border bg-card" />
        </div>
      ) : questionSets.length === 0 ? (
        <QuestionSetEmptyState
          onImport={importSet}
          onError={handleImportError}
        />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2">
          {questionSets.map((questionSet) => {
            const stats = statsBySet.get(questionSet.id);
            return (
              <QuestionSetCard
                key={questionSet.id}
                questionSet={questionSet}
                onDelete={remove}
                sessionCount={stats?.count ?? 0}
                recentAccuracy={stats?.accuracy}
                lastStudiedLabel={
                  stats?.last ? formatHistoryDate(stats.last) : undefined
                }
              />
            );
          })}
        </div>
      )}

      <ReimportConflictDialog
        conflict={importConflict}
        isResolving={isResolvingImport}
        onUpdate={(target) => resolveConflict("update", target)}
        onCopy={(target) => resolveConflict("copy", target)}
        onClose={() => setImportConflict(null)}
      />

      <ImportErrorDialog
        open={importError !== null}
        title={importError?.title ?? "Unable to import question set."}
        problems={importError?.problems ?? []}
        onOpenChange={(open) => {
          if (!open) {
            setImportError(null);
          }
        }}
      />
    </div>
  );
}
