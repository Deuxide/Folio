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

type ExitSessionDialogProps = {
  open: boolean;
  hasAnswers: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: () => void;
};

export function ExitSessionDialog({
  open,
  hasAnswers,
  onOpenChange,
  onConfirm,
}: ExitSessionDialogProps) {
  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Exit session?</AlertDialogTitle>
          <AlertDialogDescription>
            {hasAnswers
              ? "Your answers from this session will be discarded and cannot be resumed."
              : "This session will be discarded. You can start again at any time."}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <AlertDialogAction onClick={onConfirm}>Exit Session</AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
