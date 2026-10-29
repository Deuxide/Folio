import { useRef, useState } from "react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { downloadBackupFile, createBackupFile } from "@/features/backup/createBackup";
import {
  validateBackupFile,
  type BackupFile,
} from "@/features/backup/backupFormat";
import {
  analyzeRestoreConflicts,
  applyRestoreBackup,
  readDeviceSnapshot,
  type RestoreConflicts,
} from "@/features/backup/restoreBackup";
import { formatHistoryDate } from "@/features/history/formatDate";
import { DatabaseBackup, HardDriveDownload, LoaderCircle } from "lucide-react";

export function DataPage() {
  const [isExporting, setIsExporting] = useState(false);
  const [exportError, setExportError] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isImporting, setIsImporting] = useState(false);
  const [restoreError, setRestoreError] = useState<string | null>(null);
  const [pendingBackup, setPendingBackup] = useState<{
    file: BackupFile;
    fileName: string;
    conflicts: RestoreConflicts;
  } | null>(null);
  const [isRestoring, setIsRestoring] = useState(false);
  const [restoredMessage, setRestoredMessage] = useState<string | null>(null);

  async function handleExport() {
    setIsExporting(true);
    setExportError(null);
    try {
      downloadBackupFile(await createBackupFile());
    } catch (cause) {
      setExportError(
        cause instanceof Error
          ? cause.message
          : "Unable to create the backup file.",
      );
    } finally {
      setIsExporting(false);
    }
  }

  function handleRestoreError(cause: unknown) {
    setRestoreError(
      cause instanceof Error
        ? cause.message
        : "The backup could not be restored on this device.",
    );
  }

  async function handleFile(file: File | undefined) {
    if (!file) {
      return;
    }
    setIsImporting(true);
    setRestoreError(null);
    setRestoredMessage(null);
    setPendingBackup(null);
    try {
      let parsed: unknown;
      try {
        parsed = JSON.parse(await file.text());
      } catch {
        setRestoreError("The selected file is not valid JSON.");
        return;
      }
      const validated = validateBackupFile(parsed);
      if (!validated.ok) {
        setRestoreError(validated.problems.join("\n"));
        return;
      }
      const device = await readDeviceSnapshot();
      setPendingBackup({
        file: validated.file,
        fileName: file.name,
        conflicts: analyzeRestoreConflicts(validated.file, device),
      });
    } catch (cause) {
      handleRestoreError(cause);
    } finally {
      setIsImporting(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    }
  }

  async function confirmRestore() {
    if (!pendingBackup) {
      return;
    }
    setIsRestoring(true);
    try {
      await applyRestoreBackup(pendingBackup.file);
      setRestoredMessage(
        `Restored ${pendingBackup.conflicts.counts.questionSets} question sets, ${pendingBackup.conflicts.counts.studySessions} sessions, and ${pendingBackup.conflicts.counts.studyEvents} scheduled events from ${pendingBackup.fileName}. Reload the app to see everything.`,
      );
      setPendingBackup(null);
    } catch (cause) {
      setRestoreError(
        cause instanceof Error
          ? cause.message
          : "The backup could not be restored on this device.",
      );
      setPendingBackup(null);
    } finally {
      setIsRestoring(false);
    }
  }

  const preview = pendingBackup;
  const previewHasConflicts =
    preview !== null &&
    (preview.conflicts.updatedQuestionSets.length > 0 ||
      preview.conflicts.overwrittenSessions > 0 ||
      preview.conflicts.overwrittenEvents > 0);
  const previewDeviceOnlyCount =
    preview === null
      ? 0
      : preview.conflicts.deviceOnly.questionSets +
        preview.conflicts.deviceOnly.studySessions +
        preview.conflicts.deviceOnly.studyEvents;
  const previewCountLine =
    preview === null
      ? ""
      : [
          countsLabel(preview.conflicts.counts.questionSets, "question set"),
          countsLabel(preview.conflicts.counts.studySessions, "session"),
          countsLabel(
            preview.conflicts.counts.studyEvents,
            "scheduled event",
          ),
          countsLabel(
            preview.conflicts.counts.questionMemory,
            "learning record",
          ),
        ].join(" · ");

  return (
    <div className="mx-auto w-full max-w-2xl space-y-8">
      <header className="space-y-2">
        <p className="text-sm font-medium tracking-wide text-primary uppercase">
          Data &amp; Backup
        </p>
        <h1 className="font-serif text-3xl font-semibold tracking-tight sm:text-4xl">
          Your study data
        </h1>
        <p className="text-sm leading-relaxed text-muted-foreground">
          Everything in Folio lives on this device. Export a single backup file
          to move to another device or keep safe, and restore one to bring it
          all back.
        </p>
      </header>

      {exportError ? (
        <Alert variant="destructive">
          <AlertTitle>Unable to create backup</AlertTitle>
          <AlertDescription>{exportError}</AlertDescription>
        </Alert>
      ) : null}

      <section className="rounded-2xl border border-border bg-card px-5 py-5">
        <div className="flex items-start gap-3">
          <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-accent text-accent-foreground">
            <HardDriveDownload className="size-5" aria-hidden />
          </span>
          <div className="min-w-0 flex-1">
            <h2 className="font-serif text-lg font-semibold">Backup</h2>
            <p className="mt-1 text-sm leading-relaxed text-muted-foreground">
              Downloads one JSON file containing your question sets, study
              history, schedule, learning progress, and preferences.
            </p>
          </div>
          <Button type="button" onClick={() => void handleExport()} disabled={isExporting}>
            {isExporting ? (
              <LoaderCircle className="size-4 animate-spin" aria-hidden />
            ) : (
              <DatabaseBackup aria-hidden />
            )}
            Export backup
          </Button>
        </div>
      </section>

      <section className="rounded-2xl border border-border bg-card px-5 py-5">
        <h2 className="font-serif text-lg font-semibold">Restore a backup</h2>
        <p className="mt-1 text-sm leading-relaxed text-muted-foreground">
          Restoring overwrites matching records with the backup's versions, and
          keeps anything on this device that is not in the backup. You will see
          a summary before anything is written.
        </p>
        <input
          ref={fileInputRef}
          type="file"
          accept=".json,application/json"
          className="sr-only"
          onChange={(event) => void handleFile(event.target.files?.[0])}
          aria-label="Choose backup file"
        />
        <div className="mt-4 flex flex-wrap gap-2">
          <Button
            type="button"
            variant="outline"
            disabled={isImporting}
            onClick={() => fileInputRef.current?.click()}
          >
            {isImporting ? (
              <LoaderCircle className="size-4 animate-spin" aria-hidden />
            ) : null}
            Choose backup file…
          </Button>
        </div>

        {restoreError ? (
          <Alert variant="destructive" className="mt-4">
            <AlertTitle>This is not a valid Folio backup</AlertTitle>
            <AlertDescription>
              <p className="whitespace-pre-line">{restoreError}</p>
            </AlertDescription>
          </Alert>
        ) : null}

        {restoredMessage ? (
          <Alert className="mt-4">
            <AlertTitle>Backup restored</AlertTitle>
            <AlertDescription>
              <p className="whitespace-pre-line">{restoredMessage}</p>
              <div className="mt-3">
                <Button type="button" size="sm" onClick={() => window.location.reload()}>
                  Reload app
                </Button>
              </div>
            </AlertDescription>
          </Alert>
        ) : null}

        {preview ? (
          <div className="mt-4 rounded-xl border border-border bg-background px-4 py-4 text-sm">
            <p className="font-medium">{preview.fileName}</p>
            <p className="mt-1 text-muted-foreground">
              Exported {formatHistoryDate(preview.file.exportedAt)} ·{" "}
              {previewCountLine}
            </p>
            {previewHasConflicts ? (
              <ul className="mt-3 list-disc space-y-1.5 pl-5">
                {preview.conflicts.updatedQuestionSets.length > 0 ? (
                  <li>
                    Question sets that will be updated (content differs):{" "}
                    {preview.conflicts.updatedQuestionSets.join(", ")}
                  </li>
                ) : null}
                {preview.conflicts.overwrittenSessions > 0 ? (
                  <li>
                    {countsLabel(
                      preview.conflicts.overwrittenSessions,
                      "session",
                    )}{" "}
                    will be updated from the backup.
                  </li>
                ) : null}
                {preview.conflicts.overwrittenEvents > 0 ? (
                  <li>
                    {countsLabel(
                      preview.conflicts.overwrittenEvents,
                      "scheduled event",
                    )}{" "}
                    will be updated from the backup.
                  </li>
                ) : null}
              </ul>
            ) : (
              <p className="mt-3 text-muted-foreground">
                Nothing on this device conflicts with this backup.
              </p>
            )}
            {previewDeviceOnlyCount > 0 ? (
              <p className="mt-3 text-muted-foreground">
                {countsLabel(
                  preview.conflicts.deviceOnly.questionSets,
                  "question set",
                )}
                ,{" "}
                {countsLabel(
                  preview.conflicts.deviceOnly.studySessions,
                  "session",
                )}
                , and{" "}
                {countsLabel(
                  preview.conflicts.deviceOnly.studyEvents,
                  "scheduled event",
                )}{" "}
                on this device are not in the backup and will be kept.
              </p>
            ) : null}
            <div className="mt-4 flex flex-wrap gap-2">
              <Button
                type="button"
                variant="destructive"
                disabled={isRestoring}
                onClick={() => void confirmRestore()}
              >
                {isRestoring ? (
                  <LoaderCircle className="size-4 animate-spin" aria-hidden />
                ) : null}
                Restore backup
              </Button>
              <Button
                type="button"
                variant="ghost"
                disabled={isRestoring}
                onClick={() => setPendingBackup(null)}
              >
                Cancel
              </Button>
            </div>
          </div>
        ) : null}
      </section>
    </div>
  );
}

function countsLabel(count: number, singular: string): string {
  return `${count} ${count === 1 ? singular : `${singular}s`}`;
}
