import { createId } from "@/lib/ids";
import { QuestionSetRepository } from "@/repositories/QuestionSetRepository";
import type { QuestionSet } from "@/types/question";
import { ImportValidationError } from "./ImportValidationError";
import { validateAndNormalizeQuestionSet } from "./validateAndNormalize";
import { questionSetsHaveSameContent } from "./questionSetSignature";

export type ImportConflict = {
  status: "conflict";
  /** The set already saved on this device (same id). */
  existing: QuestionSet;
  /** The freshly parsed set from the file. */
  incoming: QuestionSet;
  /** True when the file's content is identical to the saved set. */
  identical: boolean;
};

export type ImportOutcome =
  | { status: "created"; questionSet: QuestionSet }
  | ImportConflict;

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

/**
 * Imports a question set file. Sets with a new id are created directly; an
 * id collision is reported as an unresolved conflict so the caller can ask
 * how to proceed (update in place / import as copy). Nothing is overwritten
 * implicitly.
 */
export async function importQuestionSetFromFile(
  file: File,
): Promise<ImportOutcome> {
  const incoming = await parseQuestionSetFile(file);
  const existing = await QuestionSetRepository.getById(incoming.id);

  if (!existing) {
    const created = await QuestionSetRepository.create(incoming);
    return { status: "created", questionSet: created };
  }

  return {
    status: "conflict",
    existing,
    incoming,
    identical: questionSetsHaveSameContent(existing, incoming),
  };
}

/**
 * Conflict resolution: replace the saved set's content with the imported
 * file. `id`/`createdAt` and the user's history stay intact because question
 * ids are preserved.
 */
export async function updateSetFromImport(
  existing: QuestionSet,
  incoming: QuestionSet,
): Promise<QuestionSet> {
  return QuestionSetRepository.updateFromImport(existing, incoming);
}

/**
 * Conflict resolution: save the import as a separate set. The copy gets a
 * fresh set id *and* fresh question ids so its attempts never mix with the
 * original set's history.
 */
export async function importSetAsCopy(
  incoming: QuestionSet,
): Promise<QuestionSet> {
  const now = new Date().toISOString();
  const copy: QuestionSet = {
    ...incoming,
    id: createId("set"),
    questions: incoming.questions.map((question) => ({
      ...question,
      id: createId("question"),
    })),
    createdAt: now,
    updatedAt: now,
  };
  return QuestionSetRepository.create(copy);
}
