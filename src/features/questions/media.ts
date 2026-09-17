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
}): QuestionImage[] {
  const collected: QuestionImage[] = [];

  if (Array.isArray(raw.images)) {
    for (const item of raw.images) {
      const image = normalizeImage(item);
      if (image) {
        collected.push(image);
      }
    }
  }

  const single = normalizeImage(raw.image);
  if (single && !collected.some((image) => image.src === single.src)) {
    collected.unshift(single);
  }

  return collected;
}

export function getQuestionImages(question: Question): QuestionImage[] {
  if (question.images && question.images.length > 0) {
    return question.images;
  }
  return normalizeImages(question);
}

export function normalizeOption(
  value: unknown,
  index: number,
): NormalizedOption | undefined {
  if (typeof value === "string") {
    const text = value.trim();
    if (!text) {
      return undefined;
    }
    return { id: text, text };
  }

  if (typeof value === "number" || typeof value === "boolean") {
    const text = String(value);
    return { id: text, text };
  }

  if (!isRecord(value)) {
    return undefined;
  }

  const image = normalizeImage(value.image ?? value.src);
  const text =
    asTrimmedString(value.text) ??
    asTrimmedString(value.label) ??
    asTrimmedString(value.value);
  const id =
    asTrimmedString(value.id) ??
    text ??
    (image ? `option-${index + 1}` : undefined);

  if (!id) {
    return undefined;
  }

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

  return question.options.flatMap((option, index) => {
    const normalized = normalizeOption(option, index);
    return normalized ? [normalized] : [];
  });
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
