import { parseDifficulty } from "@/features/questions/difficulty";
import {
  getNormalizedOptions,
  hasOptionContent,
  normalizeImages,
  persistNormalizedOptions,
} from "@/features/questions/media";
import { normalizeQuestionType } from "@/features/questions/normalizeQuestionType";
import { createId } from "@/lib/ids";
import type {
  ImportedQuestion,
  ImportedQuestionSet,
  Question,
  QuestionSet,
} from "@/types/question";
import { ImportValidationError } from "./ImportValidationError";

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function asOptionalTrimmedString(value: unknown): string | undefined {
  if (typeof value !== "string") {
    return undefined;
  }
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : undefined;
}

/** Accepts `tags: ["a", "b"]` or `tags: "a, b"`; drops blanks and duplicates. */
function asOptionalTagList(value: unknown): string[] | undefined {
  const items = Array.isArray(value)
    ? value
    : typeof value === "string"
      ? value.split(",")
      : undefined;
  if (!items) {
    return undefined;
  }
  const tags: string[] = [];
  for (const item of items) {
    const tag = asOptionalTrimmedString(item);
    if (tag && !tags.includes(tag)) {
      tags.push(tag);
    }
  }
  return tags.length > 0 ? tags : undefined;
}

function formatQuestionLabel(index: number): string {
  return `Question ${index + 1}`;
}

export function validateAndNormalizeQuestionSet(raw: unknown): QuestionSet {
  const problems: string[] = [];

  if (!isRecord(raw)) {
    throw new ImportValidationError([
      "The file must contain a question set object with a title and a questions array.",
    ]);
  }

  const imported = raw as ImportedQuestionSet;
  const title = asOptionalTrimmedString(imported.title);

  if (!title) {
    problems.push("The question set is missing a title.");
  }

  if (imported.questions === undefined) {
    problems.push("The questions field is missing.");
  } else if (!Array.isArray(imported.questions)) {
    problems.push("The questions field must be an array.");
  }

  const questions: Question[] = [];

  if (Array.isArray(imported.questions)) {
    imported.questions.forEach((item, index) => {
      const label = formatQuestionLabel(index);

      if (!isRecord(item)) {
        problems.push(`${label} is not a valid question object.`);
        return;
      }

      const rawQuestion = item as ImportedQuestion;
      const questionText = asOptionalTrimmedString(rawQuestion.question) ?? "";
      const type = asOptionalTrimmedString(rawQuestion.type);
      const images = normalizeImages(rawQuestion);

      if (!questionText && images.length === 0) {
        problems.push(
          `${label} needs question text or at least one image.`,
        );
      }

      if (!type) {
        problems.push(`${label} is missing a question type.`);
      }

      if ((!questionText && images.length === 0) || !type) {
        return;
      }

      const question: Question = {
        id: asOptionalTrimmedString(rawQuestion.id) ?? createId("question"),
        question: questionText,
        type,
      };

      if ("options" in rawQuestion) {
        question.options = rawQuestion.options;
      }
      if ("answer" in rawQuestion) {
        question.answer = rawQuestion.answer;
      }

      if (images.length > 0) {
        question.images = images;
      }

      const kind = normalizeQuestionType(type);
      if (kind === "single_choice" || kind === "multiple_choice") {
        const options = getNormalizedOptions(question);
        if (options.length === 0) {
          problems.push(`${label} needs at least one answer option.`);
        }
        options.forEach((option, optionIndex) => {
          if (!hasOptionContent(option)) {
            problems.push(
              `${label} option ${optionIndex + 1} needs text or an image.`,
            );
          }
        });
      }

      const explanation = asOptionalTrimmedString(rawQuestion.explanation);
      const subject = asOptionalTrimmedString(rawQuestion.subject);
      const topic = asOptionalTrimmedString(rawQuestion.topic);
      const tags = asOptionalTagList(rawQuestion.tags);
      const difficulty = parseDifficulty(rawQuestion.difficulty);

      if (explanation) {
        question.explanation = explanation;
      }
      if (subject) {
        question.subject = subject;
      }
      if (topic) {
        question.topic = topic;
      }
      if (tags) {
        question.tags = tags;
      }
      if (difficulty) {
        question.difficulty = difficulty;
      }

      questions.push(
        kind === "single_choice" || kind === "multiple_choice"
          ? persistNormalizedOptions(question)
          : question,
      );
    });
  }

  if (problems.length > 0) {
    throw new ImportValidationError(problems);
  }

  if (!title) {
    throw new ImportValidationError(["The question set is missing a title."]);
  }

  const now = new Date().toISOString();
  const description = asOptionalTrimmedString(imported.description);
  const subject = asOptionalTrimmedString(imported.subject);
  const questionSet: QuestionSet = {
    id: asOptionalTrimmedString(imported.id) ?? createId("set"),
    title,
    questions,
    createdAt: now,
    updatedAt: now,
  };

  if (description) {
    questionSet.description = description;
  }
  if (subject) {
    questionSet.subject = subject;
  }

  return questionSet;
}
