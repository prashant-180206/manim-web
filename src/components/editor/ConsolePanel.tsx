import { useEffect, useRef } from "react";
import {
  CircleCheck,
  CircleX,
  Info,
  Terminal,
  Trash2,
  TriangleAlert,
  type LucideIcon,
} from "lucide-react";

import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty";
import type { ConsoleEntry, ConsoleLevel } from "./editorContext";

const levelStyles: Record<
  ConsoleLevel,
  { icon: LucideIcon; className: string }
> = {
  info: { icon: Info, className: "text-muted-foreground" },
  success: { icon: CircleCheck, className: "text-chart-2" },
  warn: { icon: TriangleAlert, className: "text-chart-4" },
  error: { icon: CircleX, className: "text-destructive" },
};

interface ConsolePanelProps {
  entries: ConsoleEntry[];
  onClear: () => void;
}

export function ConsolePanel({ entries, onClear }: ConsolePanelProps) {
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const element = scrollRef.current;

    if (element) {
      element.scrollTop = element.scrollHeight;
    }
  }, [entries.length]);

  return (
    <div className="flex h-full min-h-0 flex-col">
      <div className="flex h-8 shrink-0 items-center justify-between border-b border-border/60 px-2">
        <span className="text-[10px] text-muted-foreground">
          {entries.length} message{entries.length === 1 ? "" : "s"}
        </span>
        <Button
          variant="ghost"
          size="xs"
          className="text-muted-foreground"
          onClick={onClear}
          disabled={entries.length === 0}
        >
          <Trash2 /> Clear
        </Button>
      </div>

      <div ref={scrollRef} className="min-h-0 flex-1 overflow-auto">
        {entries.length === 0 ? (
          <div className="flex h-full items-center justify-center p-4">
            <Empty>
              <EmptyHeader>
                <EmptyMedia variant="icon">
                  <Terminal />
                </EmptyMedia>
                <EmptyTitle>Console is empty</EmptyTitle>
                <EmptyDescription>
                  Scene changes, animation events and tracker bindings are
                  logged here.
                </EmptyDescription>
              </EmptyHeader>
            </Empty>
          </div>
        ) : (
          <div className="divide-y divide-border/40 font-mono">
            {entries.map((entry) => {
              const style = levelStyles[entry.level];
              const Icon = style.icon;

              return (
                <div
                  key={entry.id}
                  className="flex items-start gap-2 px-2 py-1 text-[11px] hover:bg-accent/20"
                >
                  <span className="shrink-0 pt-0.5 text-[10px] text-muted-foreground/70 tabular-nums">
                    {entry.time.toLocaleTimeString([], {
                      hour: "2-digit",
                      minute: "2-digit",
                      second: "2-digit",
                    })}
                  </span>
                  <Icon
                    className={cn("mt-0.5 size-3 shrink-0", style.className)}
                  />
                  <span className="min-w-0 flex-1 break-words text-foreground/85">
                    {entry.message}
                  </span>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
