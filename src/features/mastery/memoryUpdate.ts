import {
  extractHistoryEntries,
  type QuestionHistoryEntry,
} from "@/features/history/extractAttempts";
import {
  applyMemoryOutcome,
  createEmptyMemory,
  outcomeFromHistoryEntry,
} from "@/features/mastery/scheduler";
import { QuestionMemoryRepository } from "@/repositories/QuestionMemoryRepository";
import { SessionRepository } from "@/repositories/SessionRepository";
import type { GradingStatus } from "@/types/grading";
import type { QuestionMemory } from "@/types/mastery";
import type { StudySession } from "@/types/session";

/**
 * Learning-memory pipeline (M2 data foundation for the due-review queue):
 *
 * - Every completed session applies its question outcomes to the per-question
 *   memory records when it finalizes.
 * - The rest of the store is backfilled from history: records are always
 *   rebuildable by replaying completed sessions, which keeps the process
 *   idempotent and self-healing.
 * - Ungraded and unanswered attempts do not advance the schedule; they become
 *   schedulable as soon as they carry a real outcome (self-grading included).
 */

/** Best-effort attribution of a question attempt to its source bank. */
function sourceSetIdFor(
  session: StudySession | undefined,
  questionId: string,
): string | undefined {
  if (!session) {
    return undefined;
  }
  const fromSnapshot = session.questionSourceSetIds?.[questionId];
  if (fromSnapshot) {
    return fromSnapshot;
  }
  // Subject sessions run against a virtual bank (`subject:…`) whose id is
  // not a real question bank; session attempts keep their own bank id in
  // `questionSourceSetIds` when available.
  if (session.kind === "subject") {
    return undefined;
  }
  return session.questionSetId;
}

function addSourceSet(
  memory: QuestionMemory,
  setId: string | undefined,
): QuestionMemory {
  if (!setId || memory.setIds.includes(setId)) {
    return memory;
  }
  return { ...memory, setIds: [...memory.setIds, setId] };
}

/** Only definite outcomes move the schedule; ungraded/unanswered never do. */
function isSchedulableStatus(status: GradingStatus): boolean {
  return status === "correct" || status === "incorrect";
}

/**
 * Pure replay of session history into per-question memory records.
 * Sessions are applied oldest-completed-first so interval math is
 * chronological; later (newest) outcomes win for `lastStudiedAt`.
 */
export function buildMemoryMapFromSessions(
  sessions: StudySession[],
): Map<string, QuestionMemory> {
  const sessionsById = new Map(sessions.map((session) => [session.id, session]));
  // extractHistoryEntries is newest-first; scheduling replays oldest-first.
  const entries = extractHistoryEntries(sessions).sort((left, right) =>
    left.completedAt.localeCompare(right.completedAt),
  );

  const memoryById = new Map<string, QuestionMemory>();

  for (const entry of entries) {
    if (!isSchedulableStatus(entry.result)) {
      continue;
    }
    const session = sessionsById.get(entry.sessionId);
    memoryById.set(
      entry.questionId,
      applyMemoryOutcome(
        addSourceSet(
          memoryById.get(entry.questionId) ??
            createEmptyMemory(entry.questionId),
          sourceSetIdFor(session, entry.questionId),
        ),
        outcomeFromHistoryEntry(entry),
      ),
    );
  }

  return memoryById;
}

/**
 * Applies one session's answers to the memory store. Reads the current
 * records for the session's questions, replays the outcomes recorded in that
 * session, and writes everything back in a single transaction.
 */
export async function updateMemoryForSession(
  session: StudySession,
): Promise<void> {
  const entries = extractHistoryEntries([session]);
  const entryByQuestionId = new Map<string, QuestionHistoryEntry>(
    entries.map((entry) => [entry.questionId, entry]),
  );

  const questionIds = [...new Set(session.questionIds)];
  const currentRecords = await QuestionMemoryRepository.getMany(questionIds);

  const updates: QuestionMemory[] = [];
  for (const questionId of questionIds) {
    const entry = entryByQuestionId.get(questionId);
    if (!entry || !isSchedulableStatus(entry.result)) {
      continue;
    }
    const previous = currentRecords.get(questionId) ?? createEmptyMemory(questionId);
    updates.push(
      addSourceSet(
        applyMemoryOutcome(previous, outcomeFromHistoryEntry(entry)),
        sourceSetIdFor(session, questionId),
      ),
    );
  }

  await QuestionMemoryRepository.bulkPut(updates);
}

/** Rebuilds the entire memory store from study history. */
export async function rebuildQuestionMemory(): Promise<void> {
  const sessions = await SessionRepository.getAll();
  const memoryRecords = [...buildMemoryMapFromSessions(sessions).values()];
  await QuestionMemoryRepository.clearAll();
  await QuestionMemoryRepository.bulkPut(memoryRecords);
}

/**
 * First-run backfill for databases that predate the v4 memory store.
 * Empty store + completed history → rebuild from history; the replay is
 * deterministic, so re-running it is always safe.
 */
export async function ensureMemoryRebuilt(): Promise<void> {
  const records = await QuestionMemoryRepository.getAll();
  if (records.length > 0) {
    return;
  }
  const completed = await SessionRepository.getCompleted();
  if (completed.length === 0) {
    return;
  }
  await rebuildQuestionMemory();
}
