import { OptionContent } from "@/features/questions/components/OptionContent";
import { findOption, getNormalizedOptions } from "@/features/questions/media";
import type { Question } from "@/types/question";
import { ChoiceOption } from "./ChoiceOption";

type SingleChoiceQuestionProps = {
  question: Question;
  value: unknown;
  onChange: (value: unknown) => void;
};

export function SingleChoiceQuestion({
  question,
  value,
  onChange,
}: SingleChoiceQuestionProps) {
  const options = getNormalizedOptions(question);
  const selectedId = findOption(options, value)?.id;

  if (options.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">
        This question does not include any options.
      </p>
    );
  }

  return (
    <fieldset className="space-y-2.5">
      <legend className="sr-only">Choose one answer</legend>
      {options.map((option) => (
        <ChoiceOption
          key={option.id}
          type="radio"
          name={`question-${question.id}`}
          value={option.id}
          checked={selectedId === option.id}
          onChange={() => onChange(option.id)}
        >
          <OptionContent option={option} />
        </ChoiceOption>
      ))}
    </fieldset>
  );
}
