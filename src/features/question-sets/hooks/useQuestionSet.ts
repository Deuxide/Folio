import { useEffect, useState } from "react";
import {
  QuestionSetRepository,
  QuestionSetRepositoryError,
} from "@/repositories/QuestionSetRepository";
import type { QuestionSet } from "@/types/question";

export function useQuestionSet(id: string | undefined) {
  const [questionSet, setQuestionSet] = useState<QuestionSet | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      if (!id) {
        setQuestionSet(null);
        setError("This question set could not be found.");
        setIsLoading(false);
        return;
      }

      setIsLoading(true);
      setError(null);

      try {
        const result = await QuestionSetRepository.getById(id);
        if (cancelled) {
          return;
        }
        if (!result) {
          setQuestionSet(null);
          setError("This question set could not be found on this device.");
        } else {
          setQuestionSet(result);
        }
      } catch (cause) {
        if (!cancelled) {
          const message =
            cause instanceof QuestionSetRepositoryError
              ? cause.message
              : "Unable to open this question set.";
          setError(message);
          setQuestionSet(null);
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
  }, [id]);

  async function update(partial: Partial<QuestionSet>) {
    if (!questionSet) {
      return;
    }
    const merged: QuestionSet = {
      ...questionSet,
      ...partial,
    };
    if ("subject" in partial && !partial.subject) {
      delete merged.subject;
    }
    const next = await QuestionSetRepository.update(merged);
    setQuestionSet(next);
    return next;
  }

  return { questionSet, isLoading, error, update };
}
