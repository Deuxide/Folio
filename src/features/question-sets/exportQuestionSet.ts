import type { Question, QuestionSet } from "@/types/question";

function serializeQuestion(question: Question) {
  const exported: Record<string, unknown> = {
    id: question.id,
    question: question.question,
    type: question.type,
  };
  if (question.options !== undefined) {
    exported.options = question.options;
  }
  if (question.answer !== undefined) {
    exported.answer = question.answer;
  }
  if (question.explanation) {
    exported.explanation = question.explanation;
  }
  if (question.subject) {
    exported.subject = question.subject;
  }
  if (question.topic) {
    exported.topic = question.topic;
  }
  if (question.images && question.images.length > 0) {
    exported.images = question.images;
  }
  if (question.difficulty) {
    exported.difficulty = question.difficulty;
  }
  return exported;
}

export function serializeQuestionSet(questionSet: QuestionSet) {
  const exported: Record<string, unknown> = {
    title: questionSet.title,
    questions: questionSet.questions.map(serializeQuestion),
  };
  if (questionSet.subject) {
    exported.subject = questionSet.subject;
  }
  if (questionSet.description) {
    exported.description = questionSet.description;
  }
  return exported;
}

export function downloadQuestionSetJson(questionSet: QuestionSet) {
  const payload = JSON.stringify(serializeQuestionSet(questionSet), null, 2);
  const blob = new Blob([payload], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  const safeTitle = questionSet.title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
  anchor.href = url;
  anchor.download = `${safeTitle || "question-set"}.json`;
  anchor.click();
  URL.revokeObjectURL(url);
}
