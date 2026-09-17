import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

type ChoiceOptionProps = {
  name: string;
  type: "radio" | "checkbox";
  value: string;
  checked: boolean;
  onChange: () => void;
  children: ReactNode;
};

export function ChoiceOption({
  name,
  type,
  value,
  checked,
  onChange,
  children,
}: ChoiceOptionProps) {
  return (
    <label
      className={cn(
        "flex min-h-12 cursor-pointer items-start gap-3 rounded-xl border border-border bg-background px-4 py-3.5 transition-colors",
        "hover:border-primary/40 hover:bg-accent/40",
        checked && "border-primary bg-accent/70",
      )}
    >
      <input
        type={type}
        name={name}
        value={value}
        checked={checked}
        onChange={onChange}
        className="mt-1 size-4 shrink-0 accent-primary"
      />
      <span className="text-sm leading-relaxed text-foreground sm:text-base">
        {children}
      </span>
    </label>
  );
}
