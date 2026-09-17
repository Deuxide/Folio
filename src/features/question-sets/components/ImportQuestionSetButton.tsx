import { useRef, useState } from "react";
import { FileUp, LoaderCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type ImportQuestionSetButtonProps = {
  onImport: (file: File) => Promise<unknown>;
  onError: (error: unknown) => void;
  variant?: "default" | "outline";
  size?: "default" | "lg";
  className?: string;
  label?: string;
};

export function ImportQuestionSetButton({
  onImport,
  onError,
  variant = "default",
  size = "default",
  className,
  label = "Import Question Set",
}: ImportQuestionSetButtonProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [isImporting, setIsImporting] = useState(false);

  async function handleFile(file: File | undefined) {
    if (!file) {
      return;
    }

    setIsImporting(true);
    try {
      await onImport(file);
    } catch (error) {
      onError(error);
    } finally {
      setIsImporting(false);
      if (inputRef.current) {
        inputRef.current.value = "";
      }
    }
  }

  return (
    <>
      <input
        ref={inputRef}
        type="file"
        accept=".json,application/json"
        className="sr-only"
        onChange={(event) => {
          void handleFile(event.target.files?.[0]);
        }}
      />
      <Button
        type="button"
        variant={variant}
        size={size}
        className={cn(className)}
        disabled={isImporting}
        onClick={() => inputRef.current?.click()}
      >
        {isImporting ? <LoaderCircle className="animate-spin" /> : <FileUp />}
        {isImporting ? "Importing…" : label}
      </Button>
    </>
  );
}
