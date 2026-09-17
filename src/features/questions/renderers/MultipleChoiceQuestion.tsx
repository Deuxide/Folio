import { OptionContent } from "@/features/questions/components/OptionContent";
import { getNormalizedOptions } from "@/features/questions/media";
import type { Question } from "@/types/question";
import { ChoiceOption } from "./ChoiceOption";

type MultipleChoiceQuestionProps = {
  question: Question;
  value: unknown;
  onChange: (value: unknown) => void;
};

export function MultipleChoiceQuestion({
  question,
  value,
  onChange,
}: MultipleChoiceQuestionProps) {
  const options = getNormalizedOptions(question);
  const selected = Array.isArray(value)
    ? value.filter((item): item is string => typeof item === "string")
    : [];

  if (options.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">
        This question does not include any options.
      </p>
    );
  }

  function toggle(optionId: string) {
    if (selected.includes(optionId)) {
      onChange(selected.filter((item) => item !== optionId));
      return;
    }
    onChange([...selected, optionId]);
  }

  return (
    <fieldset className="space-y-2.5">
      <legend className="sr-only">Choose all answers that apply</legend>
      {options.map((option) => (
        <ChoiceOption
          key={option.id}
          type="checkbox"
          name={`question-${question.id}`}
          value={option.id}
          checked={selected.some(
            (item) => item === option.id || item === option.text,
          )}
          onChange={() => toggle(option.id)}
        >
          <OptionContent option={option} />
        </ChoiceOption>
      ))}
    </fieldset>
  );
}
