import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { Question } from "@/types/question";

type ShortAnswerQuestionProps = {
  question: Question;
  value: unknown;
  onChange: (value: unknown) => void;
};

export function ShortAnswerQuestion({
  question,
  value,
  onChange,
}: ShortAnswerQuestionProps) {
  const text = typeof value === "string" ? value : "";

  return (
    <div className="space-y-2">
      <Label htmlFor={`answer-${question.id}`}>Your answer</Label>
      <Input
        id={`answer-${question.id}`}
        value={text}
        autoComplete="off"
        placeholder="Type your answer"
        onChange={(event) => onChange(event.target.value)}
      />
    </div>
  );
}
