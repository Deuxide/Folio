import {
  isSupportedQuestionType,
  normalizeQuestionType,
} from "@/features/questions/normalizeQuestionType";
import { questionTypeRegistry } from "@/features/questions/registry";
import type { Question } from "@/types/question";
import { UnsupportedQuestion } from "./UnsupportedQuestion";

type QuestionRendererProps = {
  question: Question;
  value: unknown;
  onChange: (value: unknown) => void;
};

export function QuestionRenderer({
  question,
  value,
  onChange,
}: QuestionRendererProps) {
  const type = normalizeQuestionType(question.type);

  if (!isSupportedQuestionType(type)) {
    return <UnsupportedQuestion />;
  }

  const Renderer = questionTypeRegistry[type];
  return <Renderer question={question} value={value} onChange={onChange} />;
}
