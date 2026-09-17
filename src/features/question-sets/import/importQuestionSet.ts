import { QuestionSetRepository } from "@/repositories/QuestionSetRepository";
import type { QuestionSet } from "@/types/question";
import { ImportValidationError } from "./ImportValidationError";
import { validateAndNormalizeQuestionSet } from "./validateAndNormalize";

export async function parseQuestionSetFile(file: File): Promise<QuestionSet> {
  const looksLikeJson =
    file.name.toLowerCase().endsWith(".json") ||
    file.type === "application/json" ||
    file.type === "";

  if (!looksLikeJson) {
    throw new ImportValidationError([
      "Please choose a .json file containing a question set.",
    ]);
  }

  let text: string;
  try {
    text = await file.text();
  } catch {
    throw new ImportValidationError([
      "The selected file could not be read from this device.",
    ]);
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(text);
  } catch {
    throw new ImportValidationError([
      "The file is not valid JSON and could not be parsed.",
    ]);
  }

  return validateAndNormalizeQuestionSet(parsed);
}

export async function importQuestionSetFromFile(
  file: File,
): Promise<QuestionSet> {
  const questionSet = await parseQuestionSetFile(file);
  return QuestionSetRepository.create(questionSet);
}
