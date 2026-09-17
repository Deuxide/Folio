import { useEffect, useState } from "react";
import { ImageOff, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { QuestionImage } from "@/types/question";

type ImageViewerProps = {
  image: QuestionImage | null;
  onClose: () => void;
};

export function ImageViewer({ image, onClose }: ImageViewerProps) {
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    setFailed(false);
  }, [image?.src]);

  useEffect(() => {
    if (!image) {
      return;
    }

    function handleKey(event: KeyboardEvent) {
      if (event.key === "Escape") {
        onClose();
      }
    }

    window.addEventListener("keydown", handleKey);
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    return () => {
      window.removeEventListener("keydown", handleKey);
      document.body.style.overflow = previousOverflow;
    };
  }, [image, onClose]);

  if (!image) {
    return null;
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4"
      role="dialog"
      aria-modal="true"
      aria-label={image.alt ?? "Question image"}
      onClick={onClose}
    >
      <Button
        type="button"
        variant="secondary"
        size="icon"
        className="absolute top-4 right-4"
        aria-label="Close image"
        onClick={(event) => {
          event.stopPropagation();
          onClose();
        }}
      >
        <X />
      </Button>
      {failed ? (
        <p className="flex items-center gap-2 rounded-xl bg-background px-4 py-3 text-sm text-muted-foreground">
          <ImageOff className="size-4" />
          Image unavailable
        </p>
      ) : (
        <img
          src={image.src}
          alt={image.alt ?? ""}
          className="max-h-[90dvh] max-w-full object-contain"
          onClick={(event) => event.stopPropagation()}
          onError={() => setFailed(true)}
        />
      )}
    </div>
  );
}
