import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { LoaderCircle } from "lucide-react";
import type { ImportConflict } from "@/features/question-sets/import/importQuestionSet";

type ReimportConflictDialogProps = {
  conflict: ImportConflict | null;
  isResolving: boolean;
  onUpdate: (conflict: ImportConflict) => void;
  onCopy: (conflict: ImportConflict) => void;
  onClose: () => void;
};

function formatUpdatedAt(iso: string): string {
  try {
    return new Intl.DateTimeFormat(undefined, {
      dateStyle: "medium",
      timeStyle: "short",
    }).format(new Date(iso));
  } catch {
    return iso;
  }
}

/**
 * Shown when an import's set id already exists on the device. The user
 * decides between "update in place" and "import as copy"; closing keeps the
 * saved set untouched. Identical content needs no update at all.
 */
export function ReimportConflictDialog({
  conflict,
  isResolving,
  onUpdate,
  onCopy,
  onClose,
}: ReimportConflictDialogProps) {
  const open = conflict !== null;

  return (
    <AlertDialog
      open={open}
      onOpenChange={(nextOpen) => {
        if (!nextOpen && !isResolving) {
          onClose();
        }
      }}
    >
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Question set already exists</AlertDialogTitle>
          <AlertDialogDescription asChild>
            <div>
              {conflict ? (
                <div className="space-y-3">
                  <p>
                    A set with the same ID is already saved on this device
                    {" — "}
                    <span className="font-medium text-foreground">
                      “{conflict.existing.title}”
                    </span>
                    .
                  </p>
                  {conflict.identical ? (
                    <p>
                      The file’s content matches the saved set, so there is
                      nothing new to import. You can still save it as a copy.
                    </p>
                  ) : (
                    <p>
                      The saved set was last updated{" "}
                      {formatUpdatedAt(conflict.existing.updatedAt)}. Choose
                      how the file should be treated:
                    </p>
                  )}
                </div>
              ) : null}
            </div>
          </AlertDialogDescription>
        </AlertDialogHeader>
        {conflict ? (
          <div className="flex flex-col gap-2">
            {!conflict.identical ? (
              <Button
                className="w-full justify-start"
                disabled={isResolving}
                onClick={() => onUpdate(conflict)}
              >
                {isResolving ? (
                  <LoaderCircle className="size-4 animate-spin" aria-hidden />
                ) : null}
                Update in place
                <span className="ml-auto text-xs font-normal text-primary-foreground/80">
                  Keeps ID, history &amp; ratings
                </span>
              </Button>
            ) : null}
            <Button
              className="w-full justify-start"
              variant={conflict.identical ? "default" : "outline"}
              disabled={isResolving}
              onClick={() => onCopy(conflict)}
            >
              Import as copy
              <span
                className={
                  conflict.identical
                    ? "ml-auto text-xs font-normal text-primary-foreground/80"
                    : "ml-auto text-xs font-normal text-muted-foreground"
                }
              >
                New ID, fresh questions
              </span>
            </Button>
          </div>
        ) : null}
        <AlertDialogFooter>
          <AlertDialogCancel disabled={isResolving}>
            Cancel
          </AlertDialogCancel>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
