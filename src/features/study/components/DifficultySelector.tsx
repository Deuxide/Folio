import { cn } from "@/lib/utils";
import type { DifficultyRating } from "@/types/session";

const OPTIONS: { value: DifficultyRating; label: string }[] = [
  { value: "easy", label: "Easy" },
  { value: "medium", label: "Medium" },
  { value: "hard", label: "Hard" },
];

type DifficultySelectorProps = {
  value?: DifficultyRating;
  onChange: (value: DifficultyRating | undefined) => void;
};

export function DifficultySelector({
  value,
  onChange,
}: DifficultySelectorProps) {
  return (
    <fieldset>
      <legend className="mb-2 text-sm font-medium text-foreground">
        How did this question feel?
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
                "rounded-full border px-3.5 py-1.5 text-sm font-medium transition-colors",
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
