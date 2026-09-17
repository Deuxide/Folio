import type { ComponentType } from "react";
import type { SupportedQuestionType } from "@/features/questions/normalizeQuestionType";
import type { Question } from "@/types/question";
import { MultipleChoiceQuestion } from "./renderers/MultipleChoiceQuestion";
import { NumericQuestion } from "./renderers/NumericQuestion";
import { ShortAnswerQuestion } from "./renderers/ShortAnswerQuestion";
import { SingleChoiceQuestion } from "./renderers/SingleChoiceQuestion";
import { TrueFalseQuestion } from "./renderers/TrueFalseQuestion";

export type RegisteredQuestionRenderer = ComponentType<{
  question: Question;
  value: unknown;
  onChange: (value: unknown) => void;
}>;

export const questionTypeRegistry: Record<
  SupportedQuestionType,
  RegisteredQuestionRenderer
> = {
  single_choice: SingleChoiceQuestion,
  multiple_choice: MultipleChoiceQuestion,
  true_false: TrueFalseQuestion,
  short_answer: ShortAnswerQuestion,
  numeric: NumericQuestion,
};
