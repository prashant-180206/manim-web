import { useEffect, useState } from "react";
import { Slider } from "@/components/ui/slider";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

export interface SliderFieldProps {
  label?: string;
  hint?: string | null;
  value: number;
  min: number;
  max: number;
  step?: number;
  onChange: (value: number) => void;
  formatValue?: (val: number) => string;
  className?: string;
}

export function SliderField({
  label,
  hint,
  value,
  min,
  max,
  step = 0.1,
  onChange,
  formatValue,
  className,
}: SliderFieldProps) {
  const [draft, setDraft] = useState(
    formatValue ? formatValue(value) : String(value),
  );

  useEffect(() => {
    setDraft(formatValue ? formatValue(value) : String(value));
  }, [value, formatValue]);

  const commitDraft = (str: string) => {
    setDraft(str);
    const num = parseFloat(str);
    if (!Number.isNaN(num)) {
      onChange(Math.min(max, Math.max(min, num)));
    }
  };

  const handleBlur = () => {
    const num = parseFloat(draft);
    if (Number.isNaN(num)) {
      setDraft(formatValue ? formatValue(value) : String(value));
    } else {
      const clamped = Math.min(max, Math.max(min, num));
      onChange(clamped);
      setDraft(formatValue ? formatValue(clamped) : String(clamped));
    }
  };

  return (
    <div className={cn("space-y-1.5", className)}>
      <div className="flex items-center justify-between gap-1 text-[11px]">
        {label && (
          <span className="font-medium text-foreground/80 truncate">
            {label}
            {hint && (
              <span className="ml-1 font-normal text-muted-foreground">
                ({hint})
              </span>
            )}
          </span>
        )}
        <Input
          type="text"
          inputMode="decimal"
          value={draft}
          onChange={(e) => commitDraft(e.target.value)}
          onBlur={handleBlur}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              handleBlur();
              e.currentTarget.blur();
            }
          }}
          className="h-5 w-16 px-1 py-0 text-right font-mono text-[10px] rounded"
        />
      </div>

      <div className="flex items-center gap-2">
        <Slider
          value={value}
          min={min}
          max={max}
          step={step}
          onValueChange={(nextVal) => {
            const nextNum = Array.isArray(nextVal) ? nextVal[0] : (nextVal as number);
            onChange(nextNum);
          }}
          className="flex-1 cursor-pointer py-1"
        />
      </div>
    </div>
  );
}
