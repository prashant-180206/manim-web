import { useState, type ReactNode } from "react";
import { ChevronRight } from "lucide-react";

import { cn } from "@/lib/utils";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";

interface CollapsibleSectionProps {
  title: string;
  icon?: ReactNode;
  action?: ReactNode;
  defaultOpen?: boolean;
  className?: string;
  contentClassName?: string;
  children: ReactNode;
}

export function CollapsibleSection({
  title,
  icon,
  action,
  defaultOpen = true,
  className,
  contentClassName,
  children,
}: CollapsibleSectionProps) {
  const [open, setOpen] = useState(defaultOpen);

  return (
    <Collapsible
      open={open}
      onOpenChange={setOpen}
      className={cn("border-b border-border/60 last:border-b-0", className)}
    >
      <div className="flex items-center">
        <CollapsibleTrigger
          className={cn(
            "flex min-w-0 flex-1 items-center gap-1.5 px-3 py-2 text-[11px] font-semibold tracking-wider text-muted-foreground uppercase transition-colors hover:text-foreground",
          )}
        >
          <ChevronRight
            className={cn(
              "size-3 shrink-0 transition-transform",
              open && "rotate-90",
            )}
          />
          {icon}
          <span className="truncate">{title}</span>
        </CollapsibleTrigger>

        {action && (
          <div className="flex items-center pr-2" onClick={(e) => e.stopPropagation()}>
            {action}
          </div>
        )}
      </div>

      <CollapsibleContent>
        <div className={cn("space-y-3 px-3 pb-3", contentClassName)}>
          {children}
        </div>
      </CollapsibleContent>
    </Collapsible>
  );
}
