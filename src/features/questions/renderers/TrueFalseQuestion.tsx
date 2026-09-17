import type { Question } from "@/types/question";
import { ChoiceOption } from "./ChoiceOption";

type TrueFalseQuestionProps = {
  question: Question;
  value: unknown;
  onChange: (value: unknown) => void;
};

export function TrueFalseQuestion({
  question,
  value,
  onChange,
}: TrueFalseQuestionProps) {
  const selected = typeof value === "boolean" ? value : undefined;

  return (
    <fieldset className="space-y-2.5">
      <legend className="sr-only">True or false</legend>
      <ChoiceOption
        type="radio"
        name={`question-${question.id}`}
        value="true"
        checked={selected === true}
        onChange={() => onChange(true)}
      >
        True
      </ChoiceOption>
      <ChoiceOption
        type="radio"
        name={`question-${question.id}`}
        value="false"
        checked={selected === false}
        onChange={() => onChange(false)}
      >
        False
      </ChoiceOption>
    </fieldset>
  );
}
