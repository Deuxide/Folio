import { useState, type FormEvent } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

const SUGGESTED_SUBJECTS = [
  "Mathematics",
  "Advanced Mathematics",
  "Physics",
  "Chemistry",
  "Biology",
  "English",
  "Bahasa Indonesia",
];

type QuestionSetSubjectFormProps = {
  subject?: string;
  extraSubjects?: string[];
  onSave: (subject: string | undefined) => Promise<void> | void;
};

export function QuestionSetSubjectForm({
  subject,
  extraSubjects = [],
  onSave,
}: QuestionSetSubjectFormProps) {
  const [value, setValue] = useState(subject ?? "");
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const options = [
    ...new Set([...SUGGESTED_SUBJECTS, ...extraSubjects.filter(Boolean)]),
  ];

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsSaving(true);
    setError(null);
    try {
      const trimmed = value.trim();
      await onSave(trimmed.length > 0 ? trimmed : undefined);
    } catch (cause) {
      setError(
        cause instanceof Error
          ? cause.message
          : "Unable to save the subject.",
      );
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <form className="max-w-sm space-y-2" onSubmit={(event) => void handleSubmit(event)}>
      <Label htmlFor="question-set-subject">Subject</Label>
      <div className="flex gap-2">
        <Input
          id="question-set-subject"
          list="question-set-subject-options"
          value={value}
          placeholder="Uncategorized"
          onChange={(event) => setValue(event.target.value)}
        />
        <datalist id="question-set-subject-options">
          {options.map((option) => (
            <option key={option} value={option} />
          ))}
        </datalist>
        <Button type="submit" variant="outline" disabled={isSaving}>
          {isSaving ? "Saving…" : "Save"}
        </Button>
      </div>
      <p className="text-xs text-muted-foreground">
        Optional. Leave blank to keep this set uncategorized.
      </p>
      {error ? <p className="text-sm text-destructive">{error}</p> : null}
    </form>
  );
}
