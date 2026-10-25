import { useEffect, useState, type ReactNode } from "react";

import { cn } from "@/lib/utils";
import { Input } from "@/components/ui/input";

interface PanelHeaderProps {
  title: string;
  icon?: ReactNode;
  children?: ReactNode;
}

export function PanelHeader({ title, icon, children }: PanelHeaderProps) {
  return (
    <div className="flex h-9 shrink-0 items-center gap-2 border-b border-border/60 px-3">
      {icon && <span className="text-muted-foreground [&_svg]:size-3.5">{icon}</span>}
      <span className="min-w-0 flex-1 truncate text-[11px] font-semibold tracking-widest text-muted-foreground uppercase">
        {title}
      </span>
      {children}
    </div>
  );
}

export function KeyHint({ children }: { children: ReactNode }) {
  return (
    <kbd className="inline-flex h-5 min-w-5 items-center justify-center rounded border border-border/80 bg-muted/60 px-1 font-sans text-[10px] font-medium text-muted-foreground">
      {children}
    </kbd>
  );
}

interface NumberInputProps {
  value: number;
  onCommit: (value: number) => void;
  min?: number;
  max?: number;
  step?: number;
  className?: string;
  ariaLabel?: string;
}

/** Compact, commit-on-blur number field used by the editor panels. */
export function NumberInput({
  value,
  onCommit,
  min,
  max,
  step = 1,
  className,
  ariaLabel,
}: NumberInputProps) {
  const [draft, setDraft] = useState(String(value));

  useEffect(() => {
    setDraft(String(value));
  }, [value]);

  const commit = () => {
    const parsed = Number(draft);

    if (Number.isNaN(parsed)) {
      setDraft(String(value));
      return;
    }

    const clamped = Math.min(
      max ?? Number.POSITIVE_INFINITY,
      Math.max(min ?? Number.NEGATIVE_INFINITY, parsed),
    );

    setDraft(String(clamped));

    if (clamped !== value) {
      onCommit(clamped);
    }
  };

  return (
    <Input
      type="number"
      aria-label={ariaLabel}
      value={draft}
      step={step}
      min={min}
      max={max}
      onChange={(event) => setDraft(event.target.value)}
      onBlur={commit}
      onKeyDown={(event) => {
        if (event.key === "Enter") {
          commit();
          event.currentTarget.blur();
        }

        if (event.key === "Escape") {
          setDraft(String(value));
          event.currentTarget.blur();
        }
      }}
      className={cn("h-7 rounded-md px-2 text-xs", className)}
    />
  );
}
