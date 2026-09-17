import { cn } from "@/lib/utils";
import type { DifficultyRating } from "@/types/session";
import type { GradingStatus } from "@/features/grading/gradeQuestion";

export type ResultFilter = GradingStatus | "timedOut";

type ReviewFiltersProps = {
  resultFilters: ResultFilter[];
  difficultyFilters: DifficultyRating[];
  onToggleResult: (filter: ResultFilter) => void;
  onToggleDifficulty: (filter: DifficultyRating) => void;
};

const RESULT_OPTIONS: { value: ResultFilter; label: string }[] = [
  { value: "correct", label: "Correct" },
  { value: "incorrect", label: "Incorrect" },
  { value: "unanswered", label: "Unanswered" },
  { value: "timedOut", label: "Timed out" },
  { value: "ungraded", label: "Not automatically graded" },
];

const DIFFICULTY_OPTIONS: { value: DifficultyRating; label: string }[] = [
  { value: "easy", label: "Easy" },
  { value: "medium", label: "Medium" },
  { value: "hard", label: "Hard" },
];

export function ReviewFilters({
  resultFilters,
  difficultyFilters,
  onToggleResult,
  onToggleDifficulty,
}: ReviewFiltersProps) {
  return (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-2">
        <FilterChip
          label="All"
          active={resultFilters.length === 0 && difficultyFilters.length === 0}
          onClick={() => {
            resultFilters.forEach((filter) => onToggleResult(filter));
            difficultyFilters.forEach((filter) => onToggleDifficulty(filter));
          }}
        />
        {RESULT_OPTIONS.map((option) => (
          <FilterChip
            key={option.value}
            label={option.label}
            active={resultFilters.includes(option.value)}
            onClick={() => onToggleResult(option.value)}
          />
        ))}
      </div>
      <div className="flex flex-wrap gap-2">
        {DIFFICULTY_OPTIONS.map((option) => (
          <FilterChip
            key={option.value}
            label={option.label}
            active={difficultyFilters.includes(option.value)}
            onClick={() => onToggleDifficulty(option.value)}
          />
        ))}
      </div>
    </div>
  );
}

function FilterChip({
  label,
  active,
  onClick,
}: {
  label: string;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      aria-pressed={active}
      className={cn(
        "rounded-full border px-3 py-1 text-xs font-medium transition-colors",
        active
          ? "border-primary bg-primary text-primary-foreground"
          : "border-border bg-background text-foreground hover:bg-accent",
      )}
      onClick={onClick}
    >
      {label}
    </button>
  );
}
