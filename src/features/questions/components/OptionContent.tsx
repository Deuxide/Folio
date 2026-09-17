import { useState } from "react";
import { ImageOff } from "lucide-react";
import { ImageViewer } from "@/features/questions/components/ImageViewer";
import type { NormalizedOption } from "@/features/questions/media";

type OptionContentProps = {
  option: NormalizedOption;
};

export function OptionContent({ option }: OptionContentProps) {
  const [failed, setFailed] = useState(false);
  const [open, setOpen] = useState(false);

  return (
    <span className="flex min-w-0 flex-col gap-2">
      {option.text ? <span>{option.text}</span> : null}
      {option.image ? (
        failed ? (
          <span className="inline-flex items-center gap-1.5 text-sm text-muted-foreground">
            <ImageOff className="size-3.5" />
            Image unavailable
          </span>
        ) : (
          <button
            type="button"
            className="max-w-56 overflow-hidden rounded-lg border border-border bg-muted/30"
            onClick={(event) => {
              event.preventDefault();
              event.stopPropagation();
              setOpen(true);
            }}
          >
            <img
              src={option.image.src}
              alt={option.image.alt ?? option.text ?? option.id}
              className="max-h-28 w-full object-contain"
              onError={() => setFailed(true)}
            />
          </button>
        )
      ) : null}
      <ImageViewer image={open && option.image ? option.image : null} onClose={() => setOpen(false)} />
    </span>
  );
}
