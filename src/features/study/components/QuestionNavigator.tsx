import { cn } from "@/lib/utils";

type QuestionNavigatorProps = {
  total: number;
  currentIndex: number;
  answeredIndexes: Set<number>;
  timedOutIndexes?: Set<number>;
  onSelect: (index: number) => void;
};

export function QuestionNavigator({
  total,
  currentIndex,
  answeredIndexes,
  timedOutIndexes,
  onSelect,
}: QuestionNavigatorProps) {
  return (
    <nav aria-label="Question navigator" className="-mx-1 overflow-x-auto px-1">
      <ul className="flex w-max min-w-full gap-1.5 pb-1">
        {Array.from({ length: total }, (_, index) => {
          const isCurrent = index === currentIndex;
          const isAnswered = answeredIndexes.has(index);
          const isTimedOut = timedOutIndexes?.has(index) ?? false;
          const stateLabel = isTimedOut
            ? "timed out"
            : isAnswered
              ? "answered"
              : "unanswered";

          return (
            <li key={index}>
              <button
                type="button"
                onClick={() => onSelect(index)}
                aria-current={isCurrent ? "step" : undefined}
                aria-label={`Question ${index + 1}, ${stateLabel}`}
                className={cn(
                  "flex h-10 min-w-10 flex-col items-center justify-center rounded-md border px-2 text-xs font-medium tabular-nums transition-colors",
                  isCurrent
                    ? "border-primary bg-primary text-primary-foreground"
                    : "border-border bg-background text-foreground hover:bg-accent",
                )}
              >
                <span>{index + 1}</span>
                <span
                  className={cn(
                    "mt-0.5 size-1.5 rounded-full",
                    isCurrent
                      ? "bg-primary-foreground"
                      : isTimedOut
                        ? "bg-destructive"
                        : isAnswered
                          ? "bg-primary"
                          : "bg-muted-foreground/35",
                  )}
                  aria-hidden="true"
                />
              </button>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
