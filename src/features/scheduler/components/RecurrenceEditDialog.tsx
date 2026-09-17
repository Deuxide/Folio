import { Button } from "@/components/ui/button";

type RecurrenceEditDialogProps = {
  open: boolean;
  onSeries: () => void;
  onOccurrence: () => void;
  onCancel: () => void;
};

export function RecurrenceEditDialog({
  open,
  onSeries,
  onOccurrence,
  onCancel,
}: RecurrenceEditDialogProps) {
  if (!open) {
    return null;
  }
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="w-full max-w-md rounded-2xl border border-border bg-background p-5">
        <h2 className="font-serif text-xl font-semibold">Edit recurring event</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          Change only this day, or update the whole series.
        </p>
        <div className="mt-5 flex flex-col gap-2">
          <Button type="button" onClick={onOccurrence}>
            Edit this occurrence
          </Button>
          <Button type="button" variant="outline" onClick={onSeries}>
            Edit entire series
          </Button>
          <Button type="button" variant="ghost" onClick={onCancel}>
            Cancel
          </Button>
        </div>
      </div>
    </div>
  );
}
