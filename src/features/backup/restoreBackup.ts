import {
  backupCounts,
  type BackupCounts,
  type BackupFile,
} from "@/features/backup/backupFormat";
import { questionSetsHaveSameContent } from "@/features/question-sets/import/questionSetSignature";
import {
  QUESTION_MEMORY_STORE,
  QUESTION_SETS_STORE,
  STUDY_EVENTS_STORE,
  STUDY_SESSIONS_STORE,
  getDb,
} from "@/lib/db";
import { QuestionMemoryRepository } from "@/repositories/QuestionMemoryRepository";
import { QuestionSetRepository } from "@/repositories/QuestionSetRepository";
import { SessionRepository } from "@/repositories/SessionRepository";
import { StudyEventRepository } from "@/repositories/StudyEventRepository";
import type { QuestionMemory } from "@/types/mastery";
import type { StudyEvent } from "@/types/scheduler";
import type { StudySession } from "@/types/session";

/**
 * Restore pipeline:
 * - parse → preview (`analyzeRestoreConflicts`) → explicit user confirmation
 *   → `applyRestoreBackup`
 * - merge policy: records with the same id are overwritten by the backup;
 *   records that only exist on this device are never deleted.
 * - learning progress is derived data and always follows the backup.
 * - device writes land in a single transaction, so a restore never completes
 *   half-way.
 */

export type DeviceSnapshot = {
  questionSets: QuestionSetRepoResult;
  studySessions: StudySession[];
  studyEvents: StudyEvent[];
  questionMemory: QuestionMemory[];
};

type QuestionSetRepoResult = Awaited<
  ReturnType<typeof QuestionSetRepository.getAll>
>;

export async function readDeviceSnapshot(): Promise<DeviceSnapshot> {
  const [questionSets, studySessions, studyEvents, questionMemory] =
    await Promise.all([
      QuestionSetRepository.getAll(),
      SessionRepository.getAll(),
      StudyEventRepository.getAll(),
      QuestionMemoryRepository.getAll(),
    ]);
  return { questionSets, studySessions, studyEvents, questionMemory };
}

export type RestoreConflicts = {
  counts: BackupCounts;
  /** Titles of question sets that exist on this device with other content. */
  updatedQuestionSets: string[];
  /** Number of sessions/events already present on this device. */
  overwrittenSessions: number;
  overwrittenEvents: number;
  deviceOnly: {
    questionSets: number;
    studySessions: number;
    studyEvents: number;
  };
};

function identicalBySerialization(
  device: Record<string, unknown>,
  incoming: Record<string, unknown>,
): boolean {
  return JSON.stringify(device) === JSON.stringify(incoming);
}

export function analyzeRestoreConflicts(
  file: BackupFile,
  device: DeviceSnapshot,
): RestoreConflicts {
  const deviceSetsById = new Map(device.questionSets.map((set) => [set.id, set]));
  const updatedQuestionSets = file.questionSets
    .filter((incoming) => {
      const existing = deviceSetsById.get(incoming.id);
      return (
        existing !== undefined && !questionSetsHaveSameContent(existing, incoming)
      );
    })
    .sort((left, right) => left.title.localeCompare(right.title))
    .map((set) => set.title);

  const deviceSessionsById = new Map(
    device.studySessions.map((session) => [session.id, session]),
  );
  const deviceEventsById = new Map(
    device.studyEvents.map((event) => [event.id, event]),
  );

  const overwrittenSessions = file.studySessions.filter(
    (incoming) =>
      deviceSessionsById.get(incoming.id) !== undefined &&
      !identicalBySerialization(
        deviceSessionsById.get(incoming.id) as Record<string, unknown>,
        incoming as unknown as Record<string, unknown>,
      ),
  ).length;

  const overwrittenEvents = file.studyEvents.filter(
    (incoming) =>
      deviceEventsById.get(incoming.id) !== undefined &&
      !identicalBySerialization(
        deviceEventsById.get(incoming.id) as Record<string, unknown>,
        incoming as unknown as Record<string, unknown>,
      ),
  ).length;

  const fileSetIds = new Set(file.questionSets.map((set) => set.id));
  const fileSessionIds = new Set(
    file.studySessions.map((session) => session.id),
  );
  const fileEventIds = new Set(file.studyEvents.map((event) => event.id));

  return {
    counts: backupCounts(file),
    updatedQuestionSets,
    overwrittenSessions,
    overwrittenEvents,
    deviceOnly: {
      questionSets: device.questionSets.filter(
        (set) => !fileSetIds.has(set.id),
      ).length,
      studySessions: device.studySessions.filter(
        (session) => !fileSessionIds.has(session.id),
      ).length,
      studyEvents: device.studyEvents.filter(
        (event) => !fileEventIds.has(event.id),
      ).length,
    },
  };
}

export async function applyRestoreBackup(file: BackupFile): Promise<void> {
  const db = await getDb();
  const tx = db.transaction(
    [
      QUESTION_SETS_STORE,
      STUDY_SESSIONS_STORE,
      STUDY_EVENTS_STORE,
      QUESTION_MEMORY_STORE,
    ],
    "readwrite",
  );

  for (const record of file.questionSets) {
    tx.objectStore(QUESTION_SETS_STORE).put(record);
  }
  for (const record of file.studySessions) {
    tx.objectStore(STUDY_SESSIONS_STORE).put(record);
  }
  for (const record of file.studyEvents) {
    tx.objectStore(STUDY_EVENTS_STORE).put(record);
  }
  for (const record of file.questionMemory) {
    tx.objectStore(QUESTION_MEMORY_STORE).put(record);
  }

  await tx.done;

  if (typeof window !== "undefined") {
    for (const [key, value] of Object.entries(file.settings)) {
      window.localStorage.setItem(key, value);
    }
  }
}
