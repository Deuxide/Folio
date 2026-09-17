import { useState } from "react";
import { Link } from "react-router-dom";
import { MoreHorizontal, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { formatBankSubject } from "@/features/question-sets/subject";
import { formatQuestionCount } from "@/features/question-sets/utils/formatQuestionType";
import {
  formatDifficultyAverage,
  summarizeQuestionDifficulty,
} from "@/features/statistics/difficultySummary";
import type { QuestionSet } from "@/types/question";
import { DeleteQuestionSetDialog } from "./DeleteQuestionSetDialog";

type QuestionSetCardProps = {
  questionSet: QuestionSet;
  onDelete: (id: string) => Promise<void>;
  lastStudiedLabel?: string;
  recentAccuracy?: number | null;
  sessionCount?: number;
};

export function QuestionSetCard({
  questionSet,
  onDelete,
  lastStudiedLabel,
  recentAccuracy,
  sessionCount = 0,
}: QuestionSetCardProps) {
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const subjectLabel = formatBankSubject(questionSet.subject);
  const difficulty = summarizeQuestionDifficulty(questionSet.questions);

  async function confirmDelete() {
    setIsDeleting(true);
    setDeleteError(null);
    try {
      await onDelete(questionSet.id);
      setIsDeleteOpen(false);
    } catch (error) {
      setDeleteError(
        error instanceof Error
          ? error.message
          : "Unable to delete this question set.",
      );
    } finally {
      setIsDeleting(false);
    }
  }

  return (
    <>
      <Card className="flex h-full flex-col transition-colors hover:border-primary/30">
        <CardHeader className="pb-3">
          <p className="text-xs font-medium tracking-wide text-primary uppercase">
            {subjectLabel}
          </p>
          <CardTitle>{questionSet.title}</CardTitle>
          <p className="text-sm text-muted-foreground">
            {formatQuestionCount(questionSet.questions.length)}
          </p>
        </CardHeader>
        <CardContent className="flex-1 space-y-1">
          {questionSet.description ? (
            <p className="line-clamp-2 text-sm leading-relaxed text-muted-foreground">
              {questionSet.description}
            </p>
          ) : null}
          <p className="text-sm text-muted-foreground">
            {sessionCount === 0
              ? "Not studied yet"
              : `${recentAccuracy === null || recentAccuracy === undefined ? "—" : `${recentAccuracy}% recent accuracy`} · Last studied ${lastStudiedLabel}`}
          </p>
          <div className="pt-2">
            <p className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
              Average difficulty
            </p>
            <p className="text-sm text-foreground">
              {formatDifficultyAverage(difficulty.average)}
              {difficulty.average !== null ? ` · ${difficulty.label}` : ""}
            </p>
            <p className="mt-1 text-xs text-muted-foreground">
              Easy {difficulty.easy} · Medium {difficulty.medium} · Hard{" "}
              {difficulty.hard}
              {difficulty.unrated > 0 ? ` · Unrated ${difficulty.unrated}` : ""}
            </p>
          </div>
        </CardContent>
        <CardFooter className="justify-between gap-3">
          <div className="flex flex-wrap gap-2">
            {questionSet.questions.length > 0 ? (
              <Button asChild>
                <Link to={`/sets/${questionSet.id}/setup`}>Start Studying</Link>
              </Button>
            ) : null}
            <Button asChild variant={questionSet.questions.length > 0 ? "outline" : "default"}>
              <Link to={`/sets/${questionSet.id}`}>Open</Link>
            </Button>
          </div>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                aria-label={`More actions for ${questionSet.title}`}
              >
                <MoreHorizontal />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem
                variant="destructive"
                onSelect={() => {
                  setDeleteError(null);
                  setIsDeleteOpen(true);
                }}
              >
                <Trash2 className="size-4" />
                Delete
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </CardFooter>
      </Card>
      <DeleteQuestionSetDialog
        open={isDeleteOpen}
        title={questionSet.title}
        isDeleting={isDeleting}
        error={deleteError}
        onOpenChange={setIsDeleteOpen}
        onConfirm={() => {
          void confirmDelete();
        }}
      />
    </>
  );
}
