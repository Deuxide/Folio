import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { Question } from "@/types/question";

type NumericQuestionProps = {
  question: Question;
  value: unknown;
  onChange: (value: unknown) => void;
};

export function NumericQuestion({
  question,
  value,
  onChange,
}: NumericQuestionProps) {
  const text =
    typeof value === "string"
      ? value
      : typeof value === "number" && Number.isFinite(value)
        ? String(value)
        : "";

  return (
    <div className="space-y-2">
      <Label htmlFor={`answer-${question.id}`}>Numeric answer</Label>
      <Input
        id={`answer-${question.id}`}
        inputMode="decimal"
        autoComplete="off"
        placeholder="Enter a number"
        value={text}
        onChange={(event) => onChange(event.target.value)}
      />
    </div>
  );
}
