import { useState } from "react";
import { ImageOff } from "lucide-react";
import { ImageViewer } from "@/features/questions/components/ImageViewer";
import { cn } from "@/lib/utils";
import type { QuestionImage } from "@/types/question";

type QuestionImagesProps = {
  images: QuestionImage[];
  size?: "default" | "compact";
};

export function QuestionImages({
  images,
  size = "default",
}: QuestionImagesProps) {
  const [failed, setFailed] = useState<Record<string, boolean>>({});
  const [active, setActive] = useState<QuestionImage | null>(null);

  if (images.length === 0) {
    return null;
  }

  return (
    <>
      <div
        className={cn(
          "grid gap-3",
          images.length > 1 ? "sm:grid-cols-2" : "grid-cols-1",
        )}
      >
        {images.map((image) => {
          const isFailed = failed[image.src];
          return (
            <button
              key={image.src}
              type="button"
              className={cn(
                "overflow-hidden rounded-xl border border-border bg-muted/40 text-left",
                size === "compact" ? "max-h-40" : "max-h-72",
              )}
              aria-label={
                image.alt
                  ? `View larger image: ${image.alt}`
                  : "View larger image"
              }
              onClick={() => {
                if (!isFailed) {
                  setActive(image);
                }
              }}
              disabled={isFailed}
            >
              {isFailed ? (
                <div className="flex min-h-28 items-center justify-center gap-2 px-3 py-6 text-sm text-muted-foreground">
                  <ImageOff className="size-4" />
                  Image unavailable
                </div>
              ) : (
                <img
                  src={image.src}
                  alt={image.alt ?? "Question image"}
                  loading="lazy"
                  className={cn(
                    "h-full w-full object-contain",
                    size === "compact" ? "max-h-40" : "max-h-72",
                  )}
                  onError={() => {
                    setFailed((current) => ({ ...current, [image.src]: true }));
                  }}
                />
              )}
            </button>
          );
        })}
      </div>
      <ImageViewer image={active} onClose={() => setActive(null)} />
    </>
  );
}
