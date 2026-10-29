import { ensureMemoryRebuilt } from "@/features/mastery/memoryUpdate";
import {
  BACKUP_APP,
  BACKUP_SCHEMA_VERSION,
  BACKUP_SETTINGS_KEYS,
  type BackupFile,
  type BackupSettings,
} from "@/features/backup/backupFormat";
import { QuestionMemoryRepository } from "@/repositories/QuestionMemoryRepository";
import { QuestionSetRepository } from "@/repositories/QuestionSetRepository";
import { SessionRepository } from "@/repositories/SessionRepository";
import { StudyEventRepository } from "@/repositories/StudyEventRepository";

/**
 * One-file backup: reads every collection (gracefully backfilling learning
 * memory first), copies the small device preferences, and downloads a
 * timestamped JSON file.
 */
export function collectBackupSettings(): BackupSettings {
  const settings: BackupSettings = {};
  if (typeof window === "undefined") {
    return settings;
  }
  for (const key of BACKUP_SETTINGS_KEYS) {
    const value = window.localStorage.getItem(key);
    if (value !== null) {
      settings[key] = value;
    }
  }
  return settings;
}

export async function createBackupFile(): Promise<BackupFile> {
  // Rebuild-or-create the derived memory collection so the backup reflects
  // the full history even on devices that never ran the due-review flow.
  await ensureMemoryRebuilt().catch(() => {
    // On failure the backup simply carries whatever is stored right now.
  });

  const [questionSets, studySessions, studyEvents, questionMemory] =
    await Promise.all([
      QuestionSetRepository.getAll(),
      SessionRepository.getAll(),
      StudyEventRepository.getAll(),
      QuestionMemoryRepository.getAll(),
    ]);

  return {
    app: BACKUP_APP,
    schema: BACKUP_SCHEMA_VERSION,
    exportedAt: new Date().toISOString(),
    questionSets,
    studySessions,
    studyEvents,
    questionMemory,
    settings: collectBackupSettings(),
  };
}

function backupFileName(exportedAt: string): string {
  const stamp = exportedAt.slice(0, 19).replace(/[:T]/g, "-");
  return stamp ? `folio-backup-${stamp}.json` : "folio-backup.json";
}

export function downloadBackupFile(file: BackupFile) {
  const payload = JSON.stringify(file, null, 2);
  const blob = new Blob([payload], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = backupFileName(file.exportedAt);
  anchor.click();
  URL.revokeObjectURL(url);
}
