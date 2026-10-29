import type { Question, QuestionSet } from "@/types/question";

/**
 * Content signature of a question set: a canonical, order-insensitive
 * serialization of everything an import defines (ids, question text, options,
 * answer keys, grading options, explanations, subjects/topics/tags, images).
 *
 * User-owned fields (`difficulty` ratings) and record-keeping fields
 * (`createdAt`, `updatedAt`) are deliberately excluded, so re-importing an
 * unchanged file stays a no-op even after the user rated questions.
 *
 * The signature is compared by equality between two already-loaded objects —
 * there is no need to persist a hash or skip collision checks.
 */

function canonicalQuestion(question: Question): string {
  return JSON.stringify([
    question.id,
    question.question,
    question.type,
    question.options ?? null,
    question.answer ?? null,
    question.acceptedAnswers ?? null,
    question.tolerance ?? null,
    question.relativeTolerance ?? null,
    question.unit ?? null,
    question.partialCredit ?? null,
    question.explanation ?? null,
    question.subject ?? null,
    question.topic ?? null,
    question.tags ?? null,
    question.images ?? null,
  ]);
}

export function questionSetSignature(questionSet: QuestionSet): string {
  const questions = [...questionSet.questions]
    .sort((left, right) => {
      const before = left.id.localeCompare(right.id);
      return before !== 0 ? before : left.question.localeCompare(right.question);
    })
    .map(canonicalQuestion);

  return JSON.stringify({
    title: questionSet.title,
    description: questionSet.description ?? null,
    subject: questionSet.subject ?? null,
    questions,
  });
}

export function questionSetsHaveSameContent(
  left: QuestionSet,
  right: QuestionSet,
): boolean {
  return questionSetSignature(left) === questionSetSignature(right);
}
