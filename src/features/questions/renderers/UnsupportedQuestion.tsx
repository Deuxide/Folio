export function UnsupportedQuestion() {
  return (
    <div className="rounded-xl border border-dashed border-border bg-muted/40 px-5 py-8 text-center">
      <p className="font-medium text-foreground">Unsupported question type</p>
      <p className="mt-1 text-sm text-muted-foreground">
        This question type isn't supported yet.
      </p>
    </div>
  );
}
