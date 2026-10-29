import type { ReactNode } from "react";
import { Link } from "react-router-dom";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";

type ResumeSessionBannerProps = {
  prompt: string;
  description: ReactNode;
  resumeTo: string;
  onDiscard: () => void;
};

/**
 * Persistent notice about an unfinished session in the current scope, with
 * explicit Resume / Discard actions. Nothing is ever deleted implicitly.
 */
export function ResumeSessionBanner({
  prompt,
  description,
  resumeTo,
  onDiscard,
}: ResumeSessionBannerProps) {
  return (
    <Alert>
      <AlertTitle>{prompt}</AlertTitle>
      <AlertDescription>
        {description}
        <div className="mt-3 flex flex-wrap gap-2">
          <Button asChild size="sm">
            <Link to={resumeTo}>Resume</Link>
          </Button>
          <Button
            type="button"
            size="sm"
            variant="outline"
            onClick={onDiscard}
          >
            Discard
          </Button>
        </div>
      </AlertDescription>
    </Alert>
  );
}
