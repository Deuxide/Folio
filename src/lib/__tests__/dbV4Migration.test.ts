import "fake-indexeddb/auto";
import { describe, expect, it } from "vitest";

/**
 * Migration safety: a real v3 database (pre-memory schema, exactly the shape
 * DB v3 created) upgrades in place to v4 without losing any data, and the
 * memory repository works against the new store afterwards.
 *
 * `fake-indexeddb` installs itself as the global `indexedDB` before any app
 * module opens a connection. The app's `getDb()` opens lazily, so the v3
 * database can be prepared first.
 */

const DB_NAME = "folio-study";

type IdbRecord = { id: string; [key: string]: unknown };

function openVersion3(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = globalThis.indexedDB.open(DB_NAME, 3);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains("questionSets")) {
        const sets = db.createObjectStore("questionSets", { keyPath: "id" });
        sets.createIndex("by-updatedAt", "updatedAt");
      }
      if (!db.objectStoreNames.contains("studySessions")) {
        const sessions = db.createObjectStore("studySessions", {
          keyPath: "id",
        });
        sessions.createIndex("by-questionSetId", "questionSetId");
        sessions.createIndex("by-status", "status");
        sessions.createIndex("by-startedAt", "startedAt");
      }
      if (!db.objectStoreNames.contains("studyEvents")) {
        const events = db.createObjectStore("studyEvents", { keyPath: "id" });
        events.createIndex("by-startAt", "startAt");
        events.createIndex("by-status", "status");
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

async function seedV3Data(db: IDBDatabase) {
  const sets: IdbRecord[] = [
    {
      id: "set-old",
      title: "V3 bank",
      questions: [
        { id: "v3-q1", question: "Question?", type: "true_false", answer: true },
      ],
      createdAt: "2025-06-01T00:00:00.000Z",
      updatedAt: "2025-06-02T00:00:00.000Z",
    },
  ];
  const sessions: IdbRecord[] = [
    {
      id: "session-v3",
      questionSetId: "set-old",
      questionSetTitle: "V3 bank",
      questionIds: ["v3-q1"],
      currentIndex: 0,
      attempts: {},
      configuration: {
        selectionMode: "all",
        questionCount: 1,
        randomizeQuestions: false,
        timeLimitMode: "none",
      },
      status: "completed",
      startedAt: "2025-06-02T00:00:00.000Z",
      completedAt: "2025-06-02T01:00:00.000Z",
      gradingResults: { "v3-q1": "correct" },
    },
  ];
  const events: IdbRecord[] = [
    {
      id: "event-v3",
      title: "Review session",
      startAt: "2025-06-03T09:00:00.000Z",
      allDay: false,
      status: "todo",
      priority: "medium",
      createdAt: "2025-06-01T00:00:00.000Z",
      updatedAt: "2025-06-01T00:00:00.000Z",
    },
  ];

  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction(
      ["questionSets", "studySessions", "studyEvents"],
      "readwrite",
    );
    for (const record of sets) {
      tx.objectStore("questionSets").put(record);
    }
    for (const record of sessions) {
      tx.objectStore("studySessions").put(record);
    }
    for (const record of events) {
      tx.objectStore("studyEvents").put(record);
    }
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
    tx.onabort = () => reject(tx.error ?? new Error("Transaction aborted."));
  });
}

describe("DB v4 migration", () => {
  it("upgrades a v3 database in place and keeps history intact", async () => {
    const v3 = await openVersion3();
    await seedV3Data(v3);
    v3.close();

    const { getDb } = await import("@/lib/db");
    const db = await getDb();

    expect(db.version).toBe(4);
    expect(db.objectStoreNames.contains("questionMemory")).toBe(true);

    // Existing collections are untouched and still readable.
    const sets = await db.getAll("questionSets");
    expect(sets.map((item) => item.id)).toEqual(["set-old"]);
    const sessions = await db.getAll("studySessions");
    expect(sessions.map((item) => item.id)).toEqual(["session-v3"]);
    const events = await db.getAll("studyEvents");
    expect(events.map((item) => item.id)).toEqual(["event-v3"]);
    expect(await db.getAll("questionMemory")).toEqual([]);

    const { QuestionMemoryRepository } = await import(
      "@/repositories/QuestionMemoryRepository"
    );
    const { SessionRepository } = await import(
      "@/repositories/SessionRepository"
    );

    // The new store is usable immediately.
    await QuestionMemoryRepository.bulkPut([
      {
        questionId: "v3-q1",
        setIds: ["set-old"],
        ease: 2.5,
        intervalDays: 1,
        dueAt: "2025-06-03T00:00:00.000Z",
        cardState: "learning",
        consecutiveCorrect: 1,
        lapses: 0,
        lastStudiedAt: "2025-06-02T01:00:00.000Z",
        lastOutcome: "correct",
        schemaVersion: 1,
      },
    ]);
    const stored = await QuestionMemoryRepository.getByQuestionId("v3-q1");
    expect(stored?.ease).toBe(2.5);

    // The store stays untouched once populated: idempotent by design.
    const { ensureMemoryRebuilt } = await import("@/features/mastery/memoryUpdate");
    await ensureMemoryRebuilt();
    expect((await QuestionMemoryRepository.getByQuestionId("v3-q1"))?.ease).toBe(
      2.5,
    );

    // Backfill from pre-upgrade history reconstructs the same state.
    await QuestionMemoryRepository.clearAll();
    await ensureMemoryRebuilt();
    const rebuilt = await QuestionMemoryRepository.getByQuestionId("v3-q1");
    expect(rebuilt).toMatchObject({
      questionId: "v3-q1",
      setIds: ["set-old"],
      cardState: "learning",
      consecutiveCorrect: 1,
      lastOutcome: "correct",
    });
    expect(rebuilt?.dueAt).toBe("2025-06-03T01:00:00.000Z");

    // Session saves now carry the content version tag.
    const session = await SessionRepository.getById("session-v3");
    expect(session).toBeDefined();
    const saved = await SessionRepository.save(session!);
    expect(saved.schemaVersion).toBe(1);
    expect((await SessionRepository.getById("session-v3"))?.schemaVersion).toBe(
      1,
    );
  });
});
