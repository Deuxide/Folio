import { describe, expect, it } from "vitest";
import {
  backupCounts,
  validateBackupFile,
  type BackupFile,
} from "../backupFormat";
import { analyzeRestoreConflicts } from "../restoreBackup";
import type { QuestionMemory } from "@/types/mastery";
import type { QuestionSet } from "@/types/question";
import type { StudyEvent } from "@/types/scheduler";
import type { StudySession } from "@/types/session";

const NOW = "2026-01-01T00:00:00.000Z";

function sampleSet(title: string, id: string, answers: unknown): QuestionSet {
  return {
    id,
    title,
    questions: [
      {
        id: `${id}-q1`,
        question: "Text?",
        type: "true_false",
        answer: answers,
      },
    ],
    createdAt: NOW,
    updatedAt: NOW,
  };
}

function sampleSession(
  id: string,
  questionSetId: string,
  status: StudySession["status"],
): StudySession {
  return {
    id,
    questionSetId,
    questionSetTitle: "Physics",
    questionIds: ["q1"],
    currentIndex: 0,
    attempts: {},
    configuration: {
      selectionMode: "all",
      questionCount: 1,
      randomizeQuestions: false,
      timeLimitMode: "none",
    },
    status,
    startedAt: NOW,
    gradingResults: { q1: "correct" },
  };
}

function sampleEvent(id: string, title: string): StudyEvent {
  return {
    id,
    title,
    startAt: NOW,
    allDay: false,
    status: "todo",
    priority: "medium",
    createdAt: NOW,
    updatedAt: NOW,
  };
}

function sampleMemory(questionId: string): QuestionMemory {
  return {
    questionId,
    setIds: [],
    ease: 2.5,
    intervalDays: 1,
    dueAt: NOW,
    cardState: "learning",
    consecutiveCorrect: 1,
    lapses: 0,
    lastStudiedAt: NOW,
    lastOutcome: "correct",
    schemaVersion: 1,
  };
}

function backupFile(overrides: Partial<BackupFile> = {}): BackupFile {
  return {
    app: "folio",
    schema: 4,
    exportedAt: NOW,
    questionSets: [sampleSet("Physics", "set-1", true)],
    studySessions: [sampleSession("session-1", "set-1", "completed")],
    studyEvents: [sampleEvent("event-1", "Review")],
    questionMemory: [sampleMemory("set-1-q1")],
    settings: { "folio-theme": "dark" },
    ...overrides,
  };
}

describe("validateBackupFile", () => {
  it("accepts a well-formed backup and reports counts", () => {
    const file = backupFile();
    const parsed = validateBackupFile(JSON.parse(JSON.stringify(file)));
    expect(parsed.ok).toBe(true);
    if (parsed.ok) {
      expect(backupCounts(parsed.file)).toEqual({
        questionSets: 1,
        studySessions: 1,
        studyEvents: 1,
        questionMemory: 1,
        settings: 1,
      });
      expect(parsed.file.studySessions[0]?.questionSetId).toBe("set-1");
    }
  });

  it("round-trips through JSON without losing collections", () => {
    const file = backupFile();
    const parsed = validateBackupFile(JSON.parse(JSON.stringify(file)));
    expect(parsed.ok).toBe(true);
    if (parsed.ok) {
      expect(parsed.file).toEqual(file);
    }
  });

  it("rejects non-Folio files with understandable problems", () => {
    const parsed = validateBackupFile({ hello: "world" });
    expect(parsed.ok).toBe(false);
    if (!parsed.ok) {
      expect(parsed.problems.some((line) => line.includes("not a Folio"))).toBe(
        true,
      );
      expect(
        parsed.problems.some((line) => line.includes("schema unknown")),
      ).toBe(true);
    }
  });

  it("rejects wrong schema versions", () => {
    const parsed = validateBackupFile(backupFile({ schema: 99 as never }));
    expect(parsed.ok).toBe(false);
    if (!parsed.ok) {
      expect(parsed.problems.some((line) => line.includes("schema 99"))).toBe(
        true,
      );
    }
  });

  it("rejects arrays where objects are expected", () => {
    expect(validateBackupFile([]).ok).toBe(false);
  });

  it("rejects incomplete records in every collection", () => {
    const noIdSet = validateBackupFile(
      backupFile({ questionSets: [{ title: "Broken" }] as never }),
    );
    expect(noIdSet.ok).toBe(false);
    if (!noIdSet.ok) {
      expect(
        noIdSet.problems.some((line) => line.includes("missing an ID or title")),
      ).toBe(true);
    }

    const missingQuestions = validateBackupFile(
      backupFile({ questionSets: [sampleSet("Broken", "set-1", true)] }) as never,
    );
    expect(missingQuestions.ok).toBe(true);

    const badSession = validateBackupFile(
      backupFile({
        studySessions: [{ id: "s1" } as unknown as StudySession],
      }),
    );
    expect(badSession.ok).toBe(false);
    if (!badSession.ok) {
      expect(
        badSession.problems.some((line) => line.includes("missing required fields")),
      ).toBe(true);
    }
  });

  it("tolerates a missing settings section", () => {
    const file: Partial<BackupFile> = backupFile();
    delete file.settings;
    const parsed = validateBackupFile(JSON.parse(JSON.stringify(file)));
    expect(parsed.ok).toBe(true);
  });
});

describe("analyzeRestoreConflicts", () => {
  it("reports device-only records as kept, not deleted", () => {
    const device = {
      questionSets: [sampleSet("Physics", "set-1", true), sampleSet("Chem", "set-2", true)],
      studySessions: [
        sampleSession("session-1", "set-1", "completed"),
        sampleSession("session-9", "set-2", "completed"),
      ],
      studyEvents: [],
      questionMemory: [],
    };
    const conflicts = analyzeRestoreConflicts(backupFile(), device);
    expect(conflicts.deviceOnly).toEqual({
      questionSets: 1,
      studySessions: 1,
      studyEvents: 0,
    });
    expect(conflicts.updatedQuestionSets).toEqual([]);
    expect(conflicts.overwrittenSessions).toBe(0);
  });

  it("flags question sets whose content differs", () => {
    const device = {
      questionSets: [sampleSet("Physics", "set-1", false)],
      studySessions: [],
      studyEvents: [],
      questionMemory: [],
    };
    const conflicts = analyzeRestoreConflicts(backupFile(), device);
    expect(conflicts.updatedQuestionSets).toEqual(["Physics"]);
  });

  it("ignores content changes that only touch timestamps or ratings", () => {
    const deviceSet = sampleSet("Physics", "set-1", true);
    deviceSet.updatedAt = "2027-07-01T00:00:00.000Z";
    deviceSet.questions[0]!.difficulty = "easy";
    const conflicts = analyzeRestoreConflicts(backupFile(), {
      questionSets: [deviceSet],
      studySessions: [],
      studyEvents: [],
      questionMemory: [],
    });
    expect(conflicts.updatedQuestionSets).toEqual([]);
  });

  it("counts sessions and events that will be overwritten", () => {
    const device = {
      questionSets: [sampleSet("Physics", "set-1", true)],
      studySessions: [sampleSession("session-1", "set-1", "completed")],
      studyEvents: [
        sampleEvent("event-1", "Before"),
        sampleEvent("event-2", "Local only"),
      ],
      questionMemory: [],
    };
    const incoming = backupFile({
      studyEvents: [sampleEvent("event-1", "Renamed in backup")],
    });
    const conflicts = analyzeRestoreConflicts(incoming, device);
    expect(conflicts.overwrittenSessions).toBe(0);
    expect(conflicts.overwrittenEvents).toBe(1);
    expect(conflicts.deviceOnly.studyEvents).toBe(1);
  });
});
