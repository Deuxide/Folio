type StudyProgressProps = {
  current: number;
  total: number;
};

export function StudyProgress({ current, total }: StudyProgressProps) {
  const percent = total > 0 ? (current / total) * 100 : 0;

  return (
    <div className="space-y-2">
      <p className="text-sm font-medium text-muted-foreground">
        Question {current} of {total}
      </p>
      <div
        className="h-1.5 overflow-hidden rounded-full bg-muted"
        role="progressbar"
        aria-valuemin={1}
        aria-valuemax={total}
        aria-valuenow={current}
        aria-label={`Question ${current} of ${total}`}
      >
        <div
          className="h-full rounded-full bg-primary transition-[width] duration-200"
          style={{ width: `${percent}%` }}
        />
      </div>
    </div>
  );
}
