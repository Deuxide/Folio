import {
  findOption,
  formatOptionLabel,
  getNormalizedOptions,
} from "@/features/questions/media";
import {
  isSupportedQuestionType,
  normalizeQuestionType,
} from "@/features/questions/normalizeQuestionType";
import type { Question } from "@/types/question";

export function formatAnswerValue(
  question: Question,
  value: unknown,
): string | undefined {
  if (value === undefined || value === null) {
    return undefined;
  }

  const type = normalizeQuestionType(question.type);

  if (type === "true_false") {
    if (value === true || value === "true") {
      return "True";
    }
    if (value === false || value === "false") {
      return "False";
    }
  }

  const options = getNormalizedOptions(question);

  if (Array.isArray(value)) {
    const labels = value.map((item) => {
      const option = findOption(options, item);
      if (option) {
        return formatOptionLabel(option);
      }
      return typeof item === "string" ? item : String(item);
    });
    return labels.join(", ");
  }

  const option = findOption(options, value);
  if (option) {
    return formatOptionLabel(option);
  }

  if (typeof value === "string") {
    return value;
  }
  if (typeof value === "number" || typeof value === "boolean") {
    return String(value);
  }
  return undefined;
}

export function formatCorrectAnswer(question: Question): string | undefined {
  if (question.answer === undefined || question.answer === null) {
    return undefined;
  }
  return formatAnswerValue(question, question.answer);
}

export function isQuestionGradable(question: Question): boolean {
  return (
    question.answer !== undefined &&
    question.answer !== null &&
    isSupportedQuestionType(normalizeQuestionType(question.type))
  );
}
