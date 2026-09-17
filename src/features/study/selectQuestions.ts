import type { Question } from "@/types/question";
import type { SessionConfiguration } from "@/types/session";

export function shuffleIds(ids: string[]): string[] {
  const next = [...ids];

  for (let index = next.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(Math.random() * (index + 1));
    const current = next[index];
    const other = next[swapIndex];
    if (current === undefined || other === undefined) {
      continue;
    }
    next[index] = other;
    next[swapIndex] = current;
  }

  return next;
}

export function selectQuestionIds(
  questions: Question[],
  configuration: SessionConfiguration,
  sourceByQuestionId?: Record<string, string>,
): string[] {
  const originalIds = questions.map((question) => question.id);
  if (originalIds.length === 0) {
    return [];
  }

  const originalIndex = new Map(originalIds.map((id, index) => [id, index]));
  let selected: string[];

  if (configuration.selectionMode === "all") {
    selected = [...originalIds];
  } else if (
    configuration.distribution === "balanced" &&
    sourceByQuestionId
  ) {
    selected = selectBalancedIds(
      originalIds,
      Math.min(Math.max(configuration.questionCount, 0), originalIds.length),
      sourceByQuestionId,
    );
  } else {
    const count = Math.min(
      Math.max(configuration.questionCount, 0),
      originalIds.length,
    );
    selected = shuffleIds(originalIds).slice(0, count);
    selected.sort(
      (left, right) =>
        (originalIndex.get(left) ?? 0) - (originalIndex.get(right) ?? 0),
    );
  }

  if (configuration.randomizeQuestions) {
    return shuffleIds(selected);
  }

  return selected;
}

function selectBalancedIds(
  ids: string[],
  count: number,
  sourceByQuestionId: Record<string, string>,
): string[] {
  const buckets = new Map<string, string[]>();
  for (const id of ids) {
    const source = sourceByQuestionId[id] ?? "unknown";
    const list = buckets.get(source) ?? [];
    list.push(id);
    buckets.set(source, list);
  }

  const queues = [...buckets.values()].map((list) => shuffleIds(list));
  const selected: string[] = [];

  while (selected.length < count) {
    let added = false;
    for (const queue of queues) {
      const next = queue.shift();
      if (!next) {
        continue;
      }
      selected.push(next);
      added = true;
      if (selected.length >= count) {
        break;
      }
    }
    if (!added) {
      break;
    }
  }

  return selected;
}
