import { useMemo, useState, type FormEvent } from "react";
import { Play } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ConfigChoice } from "@/features/study/components/ConfigChoice";
import {
  createDefaultSessionConfiguration,
  validateSessionConfiguration,
} from "@/features/study/createSession";
import type {
  BankDistribution,
  PracticeFocus,
  SessionConfiguration,
  TimeLimitMode,
} from "@/types/session";

type SessionSetupFormProps = {
  availableCount: number;
  practiceCounts?: Partial<Record<PracticeFocus, number>>;
  isStarting?: boolean;
  showDistribution?: boolean;
  onStart: (configuration: SessionConfiguration) => Promise<void> | void;
};

export function SessionSetupForm({
  availableCount,
  practiceCounts,
  isStarting = false,
  showDistribution = false,
  onStart,
}: SessionSetupFormProps) {
  const defaults = useMemo(
    () => createDefaultSessionConfiguration(availableCount),
    [availableCount],
  );
  const [configuration, setConfiguration] = useState<SessionConfiguration>(defaults);
  const [problems, setProblems] = useState<string[]>([]);

  const focus = configuration.practiceFocus ?? "all";
  const poolCount = practiceCounts?.[focus] ?? availableCount;
  const showCount = configuration.selectionMode === "count";
  const showSessionTime =
    configuration.timeLimitMode === "session" ||
    configuration.timeLimitMode === "both";
  const showQuestionTime =
    configuration.timeLimitMode === "question" ||
    configuration.timeLimitMode === "both";

  function update(partial: Partial<SessionConfiguration>) {
    setConfiguration((current) => ({ ...current, ...partial }));
    setProblems([]);
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const nextProblems = validateSessionConfiguration(configuration, poolCount);
    if (poolCount === 0) {
      nextProblems.unshift("No questions match this practice option yet.");
    }
    if (nextProblems.length > 0) {
      setProblems(nextProblems);
      return;
    }
    await onStart(configuration);
  }

  return (
    <form className="space-y-8" onSubmit={(event) => void handleSubmit(event)}>
      <section className="space-y-3">
        <h2 className="font-medium">Practice focus</h2>
        <div className="grid gap-2 sm:grid-cols-2">
          {(
            [
              ["all", "Practice all", "Every question in this set"],
              ["unanswered", "Practice unanswered", "Never answered correctly yet"],
              ["incorrect", "Practice incorrect", "Previously answered incorrectly"],
              ["hard", "Practice hard", "Previously rated Hard"],
              ["weak", "Practice weak questions", "Repeated misses, hard ratings, or slow misses"],
            ] as const
          ).map(([value, label, description]) => (
            <ConfigChoice
              key={value}
              name="practiceFocus"
              value={value}
              checked={focus === value}
              label={`${label}${practiceCounts?.[value] !== undefined ? ` (${practiceCounts[value]})` : ""}`}
              description={description}
              onChange={() =>
                update({
                  practiceFocus: value,
                  questionCount: Math.min(
                    configuration.questionCount,
                    practiceCounts?.[value] ?? availableCount,
                  ),
                })
              }
            />
          ))}
        </div>
        {poolCount === 0 && focus !== "all" ? (
          <p className="rounded-xl border border-dashed border-border px-3 py-2 text-sm text-muted-foreground">
            {focus === "incorrect"
              ? "No incorrect questions available yet. Complete a session first."
              : focus === "hard"
                ? "No questions have been rated Hard yet."
                : focus === "weak"
                  ? "No weak questions have been identified yet."
                  : "No unanswered questions are left in this set."}
          </p>
        ) : null}
      </section>

      <section className="space-y-3">
        <h2 className="font-medium">Questions</h2>
        <div className="grid gap-2 sm:grid-cols-2">
          <ConfigChoice
            name="selectionMode"
            value="all"
            checked={configuration.selectionMode === "all"}
            label="All questions"
            description={`Use all ${poolCount} selected questions`}
            onChange={() =>
              update({
                selectionMode: "all",
                questionCount: availableCount,
              })
            }
          />
          <ConfigChoice
            name="selectionMode"
            value="count"
            checked={configuration.selectionMode === "count"}
            label="Random questions"
            description="Choose how many to practice"
            onChange={() => update({ selectionMode: "count" })}
          />
        </div>
        {showCount ? (
          <div className="max-w-48 space-y-2">
            <Label htmlFor="questionCount">Number of questions</Label>
            <Input
              id="questionCount"
              type="number"
              min={1}
              max={poolCount}
              step={1}
              value={configuration.questionCount}
              onChange={(event) =>
                update({
                  questionCount: Number(event.target.value),
                })
              }
            />
          </div>
        ) : null}
      </section>

      {showDistribution ? (
        <section className="space-y-3">
          <h2 className="font-medium">Selection mode</h2>
          <div className="grid gap-2 sm:grid-cols-2">
            <ConfigChoice
              name="distribution"
              value="combined"
              checked={(configuration.distribution ?? "combined") === "combined"}
              label="Combined pool"
              description="Draw from all selected banks together"
              onChange={() => update({ distribution: "combined" })}
            />
            <ConfigChoice
              name="distribution"
              value="balanced"
              checked={configuration.distribution === "balanced"}
              label="Balanced across banks"
              description="Spread questions across banks without repeating them"
              onChange={() =>
                update({ distribution: "balanced" as BankDistribution })
              }
            />
          </div>
        </section>
      ) : null}

      <section className="space-y-3">
        <h2 className="font-medium">Question order</h2>
        <div className="grid gap-2 sm:grid-cols-2">
          <ConfigChoice
            name="order"
            value="original"
            checked={!configuration.randomizeQuestions}
            label="Original"
            description="Keep the imported order"
            onChange={() => update({ randomizeQuestions: false })}
          />
          <ConfigChoice
            name="order"
            value="random"
            checked={configuration.randomizeQuestions}
            label="Random"
            description="Shuffle once when the session starts"
            onChange={() => update({ randomizeQuestions: true })}
          />
        </div>
      </section>

      <section className="space-y-3">
        <h2 className="font-medium">Time limit</h2>
        <div className="grid gap-2 sm:grid-cols-2">
          {(
            [
              ["none", "No limit", "Practice without a clock"],
              ["session", "Overall session", "One countdown for the whole session"],
              ["question", "Per question", "A separate limit on each question"],
              ["both", "Both", "Session and per-question limits together"],
            ] as const
          ).map(([value, label, description]) => (
            <ConfigChoice
              key={value}
              name="timeLimitMode"
              value={value}
              checked={configuration.timeLimitMode === value}
              label={label}
              description={description}
              onChange={() => update({ timeLimitMode: value as TimeLimitMode })}
            />
          ))}
        </div>
        {showSessionTime ? (
          <div className="max-w-48 space-y-2">
            <Label htmlFor="sessionMinutes">Session minutes</Label>
            <Input
              id="sessionMinutes"
              type="number"
              min={0.1}
              step={0.1}
              value={configuration.sessionTimeLimitMinutes ?? ""}
              onChange={(event) =>
                update({
                  sessionTimeLimitMinutes: Number(event.target.value),
                })
              }
            />
          </div>
        ) : null}
        {showQuestionTime ? (
          <div className="max-w-48 space-y-2">
            <Label htmlFor="questionMinutes">Minutes per question</Label>
            <Input
              id="questionMinutes"
              type="number"
              min={0.1}
              step={0.1}
              value={configuration.perQuestionMinutes ?? ""}
              onChange={(event) =>
                update({
                  perQuestionMinutes: Number(event.target.value),
                })
              }
            />
          </div>
        ) : null}
      </section>

      {problems.length > 0 ? (
        <div className="rounded-xl border border-destructive/40 bg-destructive/8 px-4 py-3 text-sm text-destructive">
          <p className="font-medium">Unable to start this session.</p>
          <ul className="mt-2 list-disc space-y-1 pl-5">
            {problems.map((problem) => (
              <li key={problem}>{problem}</li>
            ))}
          </ul>
        </div>
      ) : null}

      <Button type="submit" size="lg" disabled={isStarting || poolCount === 0}>
        <Play />
        {isStarting ? "Starting…" : "Start Session"}
      </Button>
    </form>
  );
}
