import type { QuestionMemory } from "@/types/mastery";
import type { QuestionSet } from "@/types/question";
import type { StudyEvent } from "@/types/scheduler";
import type { StudySession } from "@/types/session";

/** Exact content of a Folio one-file backup. */

export const BACKUP_APP = "folio";
export const BACKUP_SCHEMA_VERSION = 4;

/** Device preferences copied into the backup. */
export const BACKUP_SETTINGS_KEYS = [
  "folio-theme",
  "folio-scheduler-notify-enabled",
  "folio-scheduler-fired-reminders",
] as const;

export type BackupSettings = Record<string, string>;

export type BackupFile = {
  app: typeof BACKUP_APP;
  schema: typeof BACKUP_SCHEMA_VERSION;
  exportedAt: string;
  questionSets: QuestionSet[];
  studySessions: StudySession[];
  studyEvents: StudyEvent[];
  questionMemory: QuestionMemory[];
  settings: BackupSettings;
};

export type BackupCounts = {
  questionSets: number;
  studySessions: number;
  studyEvents: number;
  questionMemory: number;
  settings: number;
};

export type BackupParseResult =
  | { ok: true; file: BackupFile }
  | { ok: false; problems: string[] };

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isNonEmptyString(value: unknown): value is string {
  return typeof value === "string" && value.trim().length > 0;
}

/**
 * Structural validation of a backup file. Saved records were produced by this
 * app's normalizers on export/import, so exports round-trip the internal
 * records; here we only guarantee the restore path cannot key anything on
 * broken values.
 */
export function validateBackupFile(parsed: unknown): BackupParseResult {
  if (!isRecord(parsed)) {
    return {
      ok: false,
      problems: ["The backup file must contain a JSON object."],
    };
  }

  const problems: string[] = [];

  if (parsed.app !== BACKUP_APP) {
    problems.push(
      'This file is not a Folio backup (missing "app": "folio").',
    );
  }
  if (parsed.schema !== BACKUP_SCHEMA_VERSION) {
    problems.push(
      `The backup uses schema ${typeof parsed.schema === "number" ? parsed.schema : "unknown"}, but this version of Folio restores backups with schema ${BACKUP_SCHEMA_VERSION}.`,
    );
  }
  if (!isNonEmptyString(parsed.exportedAt)) {
    problems.push("The backup is missing its export date.");
  }

  for (const [field, label] of [
    ["questionSets", "question sets"],
    ["studySessions", "study sessions"],
    ["studyEvents", "scheduled events"],
    ["questionMemory", "learning progress"],
  ] as const) {
    if (parsed[field] !== undefined && !Array.isArray(parsed[field])) {
      problems.push(`The ${label} section must be an array.`);
    }
  }

  if (parsed.settings !== undefined && !isRecord(parsed.settings)) {
    problems.push("The settings section must be an object.");
  }

  const questionSets = asItemArray(parsed.questionSets);
  questionSets.forEach((item, index) => {
    if (!isNonEmptyString(item.id) || !isNonEmptyString(item.title)) {
      problems.push(`Question set ${index + 1} is missing an ID or title.`);
    } else if (!Array.isArray(item.questions)) {
      problems.push(`Question set "${item.title}" is missing its questions.`);
    }
  });

  const studySessions = asItemArray(parsed.studySessions);
  studySessions.forEach((item, index) => {
    if (!isNonEmptyString(item.id) || !isNonEmptyString(item.questionSetId)) {
      problems.push(`Study session ${index + 1} is missing required fields.`);
    } else if (
      item.status !== "in_progress" &&
      item.status !== "completed"
    ) {
      problems.push(`Study session "${item.id}" has an unknown status.`);
    } else if (!Array.isArray(item.questionIds)) {
      problems.push(`Study session "${item.id}" is missing its questions.`);
    }
  });

  const studyEvents = asItemArray(parsed.studyEvents);
  studyEvents.forEach((item, index) => {
    if (
      !isNonEmptyString(item.id) ||
      !isNonEmptyString(item.title) ||
      !isNonEmptyString(item.startAt)
    ) {
      problems.push(`Scheduled event ${index + 1} is missing required fields.`);
    }
  });

  const questionMemory = asItemArray(parsed.questionMemory);
  questionMemory.forEach((item, index) => {
    if (!isNonEmptyString(item.questionId)) {
      problems.push(
        `Learning-progress record ${index + 1} is missing its question ID.`,
      );
    }
  });

  const settings: BackupSettings = {};
  if (isRecord(parsed.settings)) {
    for (const [key, value] of Object.entries(parsed.settings)) {
      if (typeof value === "string") {
        settings[key] = value;
      }
    }
  }

  if (problems.length > 0) {
    return { ok: false, problems };
  }

  return {
    ok: true,
    file: {
      app: BACKUP_APP,
      schema: BACKUP_SCHEMA_VERSION,
      exportedAt: parsed.exportedAt as string,
      questionSets: questionSets as QuestionSet[],
      studySessions: studySessions as StudySession[],
      studyEvents: studyEvents as StudyEvent[],
      questionMemory: questionMemory as QuestionMemory[],
      settings,
    },
  };
}

function asItemArray(value: unknown): Record<string, unknown>[] {
  if (!Array.isArray(value)) {
    return [];
  }
  return value.filter(isRecord);
}

export function backupCounts(file: BackupFile): BackupCounts {
  return {
    questionSets: file.questionSets.length,
    studySessions: file.studySessions.length,
    studyEvents: file.studyEvents.length,
    questionMemory: file.questionMemory.length,
    settings: Object.keys(file.settings).length,
  };
}
