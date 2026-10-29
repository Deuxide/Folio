import { cn } from "@/lib/utils";
import type { ConfidenceRating, QuestionAttempt } from "@/types/session";

const OPTIONS: { value: ConfidenceRating; label: string }[] = [
  { value: "sure", label: "Confident" },
  { value: "unsure", label: "Unsure" },
  { value: "guessed", label: "Guessed" },
];

type ConfidenceSelectorProps = {
  value?: QuestionAttempt["confidence"];
  onChange: (value: ConfidenceRating | undefined) => void;
};

/**
 * Pre-reveal self-assessment for Learn mode. Answers that were checked with
 * high confidence but graded incorrect are the strongest "confidently
 * wrong" signal the results review can surface.
 */
export function ConfidenceSelector({
  value,
  onChange,
}: ConfidenceSelectorProps) {
  return (
    <fieldset>
      <legend className="mb-2 text-xs font-medium text-muted-foreground">
        How confident were you in this answer?
      </legend>
      <div className="flex flex-wrap gap-2">
        {OPTIONS.map((option) => {
          const selected = value === option.value;
          return (
            <button
              key={option.value}
              type="button"
              aria-pressed={selected}
              className={cn(
                "rounded-full border px-3 py-1 text-xs font-medium transition-colors",
                selected
                  ? "border-primary bg-primary text-primary-foreground"
                  : "border-border bg-background text-foreground hover:bg-accent",
              )}
              onClick={() => onChange(selected ? undefined : option.value)}
            >
              {option.label}
            </button>
          );
        })}
      </div>
    </fieldset>
  );
}
