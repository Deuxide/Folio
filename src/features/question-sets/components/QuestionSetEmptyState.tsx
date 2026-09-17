import { LibraryBig } from "lucide-react";
import { ImportQuestionSetButton } from "./ImportQuestionSetButton";

type QuestionSetEmptyStateProps = {
  onImport: (file: File) => Promise<unknown>;
  onError: (error: unknown) => void;
};

export function QuestionSetEmptyState({
  onImport,
  onError,
}: QuestionSetEmptyStateProps) {
  return (
    <section className="mx-auto flex max-w-xl flex-col items-center rounded-2xl border border-dashed border-border bg-card/60 px-6 py-16 text-center">
      <div className="mb-5 flex size-14 items-center justify-center rounded-2xl bg-accent text-accent-foreground">
        <LibraryBig className="size-7" aria-hidden="true" />
      </div>
      <h2 className="font-serif text-2xl font-semibold tracking-tight">
        No question sets yet
      </h2>
      <p className="mt-2 max-w-sm text-sm leading-relaxed text-muted-foreground">
        Import a JSON question bank to start studying. Sets stay on this device
        and are ready whenever you come back.
      </p>
      <div className="mt-6">
        <ImportQuestionSetButton
          onImport={onImport}
          onError={onError}
          size="lg"
        />
      </div>
    </section>
  );
}
