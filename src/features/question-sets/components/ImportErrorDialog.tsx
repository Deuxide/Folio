import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

type ImportErrorDialogProps = {
  open: boolean;
  title: string;
  problems: string[];
  onOpenChange: (open: boolean) => void;
};

export function ImportErrorDialog({
  open,
  title,
  problems,
  onOpenChange,
}: ImportErrorDialogProps) {
  const problemCount = problems.length;

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{title}</AlertDialogTitle>
          <AlertDialogDescription asChild>
            <div>
              {problemCount > 0 ? (
                <p className="mb-3">
                  {problemCount === 1
                    ? "1 problem was found:"
                    : `${problemCount} problems were found:`}
                </p>
              ) : null}
              <ul className="list-disc space-y-1.5 pl-5 text-foreground">
                {problems.map((problem) => (
                  <li key={problem}>{problem}</li>
                ))}
              </ul>
            </div>
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogAction>Close</AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
