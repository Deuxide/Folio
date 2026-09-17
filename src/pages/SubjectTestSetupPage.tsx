import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useParams, useSearchParams } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { extractHistoryEntries } from "@/features/history/extractAttempts";
import {
  formatBankSubject,
  normalizeSubjectKey,
} from "@/features/question-sets/subject";
import { SessionSetupForm } from "@/features/study/components/SessionSetupForm";
import { startStudySession } from "@/features/study/sessionStore";
import {
  buildSubjectPool,
  virtualSubjectSet,
} from "@/features/study/subjectPool";
import { QuestionSetRepository } from "@/repositories/QuestionSetRepository";
import { SessionRepository } from "@/repositories/SessionRepository";
import type { PracticeFocus, SessionConfiguration } from "@/types/session";
import type { QuestionSet } from "@/types/question";
import type { StudySession } from "@/types/session";

export function SubjectTestSetupPage() {
  const { subjectKey: rawKey } = useParams();
  const subjectKey = rawKey ? decodeURIComponent(rawKey) : "";
  const [searchParams] = useSearchParams();
  const scheduledEventId = searchParams.get("event") ?? undefined;
  const navigate = useNavigate();
  const [sets, setSets] = useState<QuestionSet[]>([]);
  const [sessions, setSessions] = useState<StudySession[]>([]);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isStarting, setIsStarting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [startError, setStartError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        const [allSets, completed] = await Promise.all([
          QuestionSetRepository.getAll(),
          SessionRepository.getCompleted(),
        ]);
        if (cancelled) {
          return;
        }
        const matching = allSets.filter(
          (set) => normalizeSubjectKey(set.subject) === subjectKey,
        );
        setSets(matching);
        setSelectedIds(matching.map((set) => set.id));
        setSessions(
          completed.filter((session) =>
            matching.some((set) => set.id === session.questionSetId) ||
            session.subjectKey === subjectKey,
          ),
        );
      } catch (cause) {
        if (!cancelled) {
          setError(
            cause instanceof Error
              ? cause.message
              : "Unable to load this subject.",
          );
        }
      } finally {
        if (!cancelled) {
          setIsLoading(false);
        }
      }
    }
    void load();
    return () => {
      cancelled = true;
    };
  }, [subjectKey]);

  const subjectName = formatBankSubject(sets[0]?.subject);
  const selectedSets = useMemo(
    () => sets.filter((set) => selectedIds.includes(set.id)),
    [selectedIds, sets],
  );
  const history = useMemo(() => extractHistoryEntries(sessions), [sessions]);
  const practiceCounts = useMemo(() => {
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
        buildSubjectPool(selectedSets, focus, history).questions.length,
      ]),
    ) as Record<PracticeFocus, number>;
  }, [history, selectedSets]);

  function toggleSet(id: string) {
    setSelectedIds((current) =>
      current.includes(id)
        ? current.filter((item) => item !== id)
        : [...current, id],
    );
    setStartError(null);
  }

  async function handleStart(configuration: SessionConfiguration) {
    if (selectedSets.length === 0) {
      setStartError("Select at least one question bank.");
      return;
    }
    const pool = buildSubjectPool(
      selectedSets,
      configuration.practiceFocus,
      history,
    );
    if (pool.questions.length === 0) {
      setStartError(
        "No eligible questions are available in the selected question banks.",
      );
      return;
    }
    setIsStarting(true);
    setStartError(null);
    try {
      const virtualSet = virtualSubjectSet(
        subjectKey,
        subjectName,
        pool.questions,
      );
      await startStudySession(virtualSet, {
        ...configuration,
        selectedSetIds: selectedSets.map((set) => set.id),
      }, pool.questions, {
        kind: "subject",
        subjectKey,
        subjectName,
        sourceSets: selectedSets,
        questionSourceSetIds: pool.sourceByQuestionId,
        scheduledEventId,
      });
      void navigate(`/subjects/${encodeURIComponent(subjectKey)}/study`);
    } catch (cause) {
      setStartError(
        cause instanceof Error
          ? cause.message
          : "Unable to start the subject test.",
      );
    } finally {
      setIsStarting(false);
    }
  }

  return (
    <div className="mx-auto w-full max-w-3xl space-y-8">
      <Button asChild variant="ghost" className="-ml-2 w-fit">
        <Link to="/statistics">
          <ArrowLeft />
          Back to statistics
        </Link>
      </Button>

      {isLoading ? (
        <div className="h-64 animate-pulse rounded-xl border border-border bg-card" />
      ) : error ? (
        <Alert variant="destructive">
          <AlertTitle>Unable to open subject</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      ) : sets.length === 0 ? (
        <section className="rounded-2xl border border-dashed border-border px-6 py-16 text-center">
          <h1 className="font-serif text-2xl font-semibold">
            No question banks available for this subject.
          </h1>
        </section>
      ) : (
        <>
          <header className="space-y-2">
            <p className="text-sm font-medium tracking-wide text-primary uppercase">
              Subject test
            </p>
            <h1 className="font-serif text-3xl font-semibold tracking-tight sm:text-4xl">
              {subjectName} Test
            </h1>
            <p className="text-sm text-muted-foreground">
              Choose which banks to include, then configure the session as usual.
            </p>
          </header>

          <section className="space-y-3">
            <h2 className="font-medium">Question banks</h2>
            <ul className="space-y-2">
              {sets.map((set) => {
                const checked = selectedIds.includes(set.id);
                return (
                  <li key={set.id}>
                    <label className="flex min-h-12 cursor-pointer items-start gap-3 rounded-xl border border-border bg-card px-4 py-3">
                      <input
                        type="checkbox"
                        checked={checked}
                        onChange={() => toggleSet(set.id)}
                        className="mt-1 size-4 accent-primary"
                      />
                      <span>
                        <span className="block font-medium">{set.title}</span>
                        <span className="text-sm text-muted-foreground">
                          {set.questions.length}{" "}
                          {set.questions.length === 1 ? "question" : "questions"}
                        </span>
                      </span>
                    </label>
                  </li>
                );
              })}
            </ul>
            {selectedSets.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                Select at least one question bank.
              </p>
            ) : null}
          </section>

          {startError ? (
            <Alert variant="destructive">
              <AlertTitle>Unable to start</AlertTitle>
              <AlertDescription>{startError}</AlertDescription>
            </Alert>
          ) : null}

          <SessionSetupForm
            availableCount={practiceCounts.all ?? 0}
            practiceCounts={practiceCounts}
            isStarting={isStarting}
            showDistribution={selectedSets.length > 1}
            onStart={handleStart}
          />
        </>
      )}
    </div>
  );
}
