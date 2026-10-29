import { useCallback, useEffect, useState } from "react";
import {
  importQuestionSetFromFile,
  importSetAsCopy,
  updateSetFromImport,
  type ImportConflict,
} from "@/features/question-sets/import/importQuestionSet";
import {
  QuestionSetRepository,
  QuestionSetRepositoryError,
} from "@/repositories/QuestionSetRepository";
import type { QuestionSet } from "@/types/question";

export function useQuestionSets() {
  const [questionSets, setQuestionSets] = useState<QuestionSet[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    const sets = await QuestionSetRepository.getAll();
    setQuestionSets(sets);
  }, []);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      setIsLoading(true);
      setError(null);
      try {
        const sets = await QuestionSetRepository.getAll();
        if (!cancelled) {
          setQuestionSets(sets);
        }
      } catch (cause) {
        if (!cancelled) {
          const message =
            cause instanceof QuestionSetRepositoryError
              ? cause.message
              : "Unable to load question sets from this device.";
          setError(message);
        }
      } finally {
        if (!cancelled) {
          setIsLoading(false);
        }
      }
    }

    void load();

    return () => {
      cancelled = true;
    };
  }, []);

  const importFromFile = useCallback(async (file: File) => {
    const outcome = await importQuestionSetFromFile(file);
    if (outcome.status === "created") {
      const created = outcome.questionSet;
      setQuestionSets((current) => {
        const withoutDuplicate = current.filter((set) => set.id !== created.id);
        return [created, ...withoutDuplicate];
      });
    }
    // Conflicts are returned to the caller (never resolved implicitly).
    return outcome;
  }, []);

  const resolveImportConflict = useCallback(
    async (
      resolution: "update" | "copy",
      conflict: ImportConflict,
    ): Promise<QuestionSet> => {
      const questionSet =
        resolution === "update"
          ? await updateSetFromImport(conflict.existing, conflict.incoming)
          : await importSetAsCopy(conflict.incoming);
      setQuestionSets((current) => {
        if (current.some((set) => set.id === questionSet.id)) {
          return current.map((set) =>
            set.id === questionSet.id ? questionSet : set,
          );
        }
        return [questionSet, ...current];
      });
      return questionSet;
    },
    [],
  );

  const remove = useCallback(async (id: string) => {
    await QuestionSetRepository.delete(id);
    setQuestionSets((current) => current.filter((set) => set.id !== id));
  }, []);

  return {
    questionSets,
    isLoading,
    error,
    refresh,
    importFromFile,
    resolveImportConflict,
    remove,
  };
}
