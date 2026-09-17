import { useCallback, useEffect, useState } from "react";
import { importQuestionSetFromFile } from "@/features/question-sets/import/importQuestionSet";
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
    const created = await importQuestionSetFromFile(file);
    setQuestionSets((current) => {
      const withoutDuplicate = current.filter((set) => set.id !== created.id);
      return [created, ...withoutDuplicate];
    });
    return created;
  }, []);

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
    remove,
  };
}
