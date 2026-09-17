import {
  getNormalizedOptions,
  type NormalizedOption,
} from "@/features/questions/media";
import type { Question } from "@/types/question";

export function getQuestionOptions(question: Question): string[] {
  return getNormalizedOptions(question).map((option) => option.id);
}

export type { NormalizedOption };
