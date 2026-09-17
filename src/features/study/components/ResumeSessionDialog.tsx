import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { formatCountdown, getRemainingMs } from "@/features/study/timer";
import type { StudySession } from "@/types/session";

type ResumeSessionDialogProps = {
  open: boolean;
  session: StudySession;
  onResume: () => void;
  onDiscard: () => void;
};

export function ResumeSessionDialog({
  open,
  session,
  onResume,
  onDiscard,
}: ResumeSessionDialogProps) {
  const remainingMs = getRemainingMs(session.sessionDeadline);
  const current = session.currentIndex + 1;
  const total = session.questionIds.length;

  return (
    <AlertDialog open={open}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Resume your session?</AlertDialogTitle>
          <AlertDialogDescription asChild>
            <div className="space-y-2">
              <p className="font-medium text-foreground">
                {session.questionSetTitle}
              </p>
              <p>
                Question {current} of {total}
              </p>
              {remainingMs !== null ? (
                <p>Time remaining: {formatCountdown(remainingMs)}</p>
              ) : null}
            </div>
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel onClick={onDiscard}>Discard</AlertDialogCancel>
          <AlertDialogAction onClick={onResume}>Resume</AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
