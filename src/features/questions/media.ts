import type { Question, QuestionImage } from "@/types/question";

export type NormalizedOption = {
  id: string;
  text?: string;
  image?: QuestionImage;
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function asTrimmedString(value: unknown): string | undefined {
  if (typeof value !== "string") {
    return undefined;
  }
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : undefined;
}

export function normalizeImage(value: unknown): QuestionImage | undefined {
  if (typeof value === "string") {
    const src = value.trim();
    return src ? { src } : undefined;
  }

  if (!isRecord(value)) {
    return undefined;
  }

  const src =
    asTrimmedString(value.src) ??
    asTrimmedString(value.url) ??
    asTrimmedString(value.href);
  if (!src) {
    return undefined;
  }

  const image: QuestionImage = { src };
  const alt = asTrimmedString(value.alt);
  if (alt) {
    image.alt = alt;
  }
  return image;
}

export function normalizeImages(raw: {
  image?: unknown;
  images?: unknown;
  questionImage?: unknown;
  questionImages?: unknown;
}): QuestionImage[] {
  const collected: QuestionImage[] = [];
  const lists = [raw.images, raw.questionImages];

  for (const list of lists) {
    if (!Array.isArray(list)) {
      continue;
    }
    for (const item of list) {
      const image = normalizeImage(item);
      if (image && !collected.some((existing) => existing.src === image.src)) {
        collected.push(image);
      }
    }
  }

  const singles = [raw.questionImage, raw.image];
  for (const item of singles) {
    const image = normalizeImage(item);
    if (image && !collected.some((existing) => existing.src === image.src)) {
      collected.unshift(image);
    }
  }

  return collected;
}

export function hasQuestionContent(question: {
  question?: string;
  images?: QuestionImage[];
}): boolean {
  return Boolean(question.question?.trim()) || (question.images?.length ?? 0) > 0;
}

export function hasOptionContent(option: NormalizedOption): boolean {
  return Boolean(option.text?.trim()) || Boolean(option.image);
}

export function getQuestionImages(question: Question): QuestionImage[] {
  if (question.images && question.images.length > 0) {
    return question.images;
  }
  return normalizeImages(question);
}

export function optionIdFromIndex(index: number): string {
  if (index >= 0 && index < 26) {
    return `option-${String.fromCharCode(97 + index)}`;
  }
  return `option-${index + 1}`;
}

function uniqueOptionId(preferred: string, used: Set<string>): string {
  if (!used.has(preferred)) {
    return preferred;
  }
  let suffix = 2;
  let next = `${preferred}-${suffix}`;
  while (used.has(next)) {
    suffix += 1;
    next = `${preferred}-${suffix}`;
  }
  return next;
}

export function normalizeOption(
  value: unknown,
  index: number,
  usedIds = new Set<string>(),
): NormalizedOption | undefined {
  if (typeof value === "string") {
    const text = value.trim();
    if (!text) {
      return undefined;
    }
    const id = uniqueOptionId(optionIdFromIndex(index), usedIds);
    usedIds.add(id);
    return { id, text };
  }

  if (typeof value === "number" || typeof value === "boolean") {
    const text = String(value);
    const id = uniqueOptionId(optionIdFromIndex(index), usedIds);
    usedIds.add(id);
    return { id, text };
  }

  if (!isRecord(value)) {
    return undefined;
  }

  const image = normalizeImage(value.image ?? value.src);
  const text =
    asTrimmedString(value.text) ??
    asTrimmedString(value.label) ??
    asTrimmedString(value.value);
  if (!text && !image) {
    return undefined;
  }

  const providedId = asTrimmedString(value.id);
  const id = uniqueOptionId(providedId ?? optionIdFromIndex(index), usedIds);
  usedIds.add(id);

  const option: NormalizedOption = { id };
  if (text) {
    option.text = text;
  }
  if (image) {
    option.image = image;
  }
  return option;
}

export function getNormalizedOptions(question: Question): NormalizedOption[] {
  if (!Array.isArray(question.options)) {
    return [];
  }

  const usedIds = new Set<string>();
  return question.options.flatMap((option, index) => {
    const normalized = normalizeOption(option, index, usedIds);
    return normalized ? [normalized] : [];
  });
}

export function serializeNormalizedOption(option: NormalizedOption): Record<string, unknown> {
  const raw: Record<string, unknown> = { id: option.id };
  if (option.text) {
    raw.text = option.text;
  }
  if (option.image) {
    raw.image = option.image.src;
    if (option.image.alt) {
      raw.alt = option.image.alt;
    }
  }
  return raw;
}

export function resolveChoiceAnswer(
  answer: unknown,
  options: NormalizedOption[],
): unknown {
  if (Array.isArray(answer)) {
    return answer.map((item) => findOption(options, item)?.id ?? item);
  }
  const match = findOption(options, answer);
  return match ? match.id : answer;
}

export function persistNormalizedOptions(question: Question): Question {
  const options = getNormalizedOptions(question);
  if (options.length === 0) {
    return question;
  }
  return {
    ...question,
    options: options.map(serializeNormalizedOption),
    answer: resolveChoiceAnswer(question.answer, options),
  };
}

export function optionMatchesValue(
  option: NormalizedOption,
  value: unknown,
): boolean {
  if (typeof value === "number" || typeof value === "boolean") {
    return optionMatchesValue(option, String(value));
  }
  if (typeof value !== "string") {
    return false;
  }
  return value === option.id || value === option.text;
}

export function findOption(
  options: NormalizedOption[],
  value: unknown,
): NormalizedOption | undefined {
  if (isRecord(value)) {
    const nestedId = asTrimmedString(value.id);
    if (nestedId) {
      return options.find((option) => optionMatchesValue(option, nestedId));
    }
  }
  return options.find((option) => optionMatchesValue(option, value));
}

export function formatOptionLabel(option: NormalizedOption): string {
  return option.text ?? option.id;
}
