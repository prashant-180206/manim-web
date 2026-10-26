import { useEffect, useState } from "react";
import type { ReactNode } from "react";
import { Easing } from "../manim/utils/easing";
import { Range, Vector } from "../manim/utils/types";
import { Value, ValueType } from "../manim/utils/value";
import { Popover, PopoverContent, PopoverTrigger } from "./ui/popover";
import { Button } from "./ui/button";
import { Label } from "./ui/label";
import { FaMinus, FaPlus } from "react-icons/fa6";
import { Input } from "./ui/input";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "./ui/card";

type ValueEditorProps<T> = {
  value: Value<T>;
  onChange?: () => void;
};

type NumberStepperFieldProps = {
  label?: string;
  value: number;
  onChange: (value: number) => void;
  step?: number;
};

type PopoverFieldProps = {
  triggerLabel: string;
  triggerValue: string;
  children: ReactNode;
};

const easingEntries = Object.entries(Easing) as [
  keyof typeof Easing,
  (typeof Easing)[keyof typeof Easing],
][];

function NumberStepperField({
  label,
  value,
  onChange,
  step = 1,
}: NumberStepperFieldProps) {
  const [draft, setDraft] = useState(String(value));

  useEffect(() => {
    setDraft(String(value));
  }, [value]);

  const commitDraft = (nextDraft: string) => {
    setDraft(nextDraft);

    const nextValue = Number(nextDraft);
    if (!Number.isNaN(nextValue)) {
      onChange(nextValue);
    }
  };

  const confirmDraft = () => {
    const nextValue = Number(draft);

    if (Number.isNaN(nextValue)) {
      setDraft(String(value));
      return;
    }

    if (nextValue !== value) {
      onChange(nextValue);
    }
  };

  return (
    <div className="grid gap-2">
      {label && <Label>{label}</Label>}

      <div className="flex items-center gap-2">
        <Button
          type="button"
          variant="outline"
          size="icon"
          onClick={() => onChange(value - step)}
        >
          <FaMinus />
        </Button>

        <Input
          type="text"
          inputMode="decimal"
          value={draft}
          onChange={(e) => commitDraft(e.target.value)}
          onBlur={confirmDraft}
          onKeyDown={(e) => {
            if (e.key === "Enter") confirmDraft();
          }}
        />

        <Button
          type="button"
          variant="outline"
          size="icon"
          onClick={() => onChange(value + step)}
        >
          <FaPlus />
        </Button>
      </div>
    </div>
  );
}

function PopoverField({
  triggerLabel,
  triggerValue,
  children,
}: PopoverFieldProps) {
  return (
    <Popover>
      <PopoverTrigger>
        <Button variant="outline" className="w-full justify-between">
          <span>{triggerLabel}</span>
          <span className="text-muted-foreground">{triggerValue}</span>
        </Button>
      </PopoverTrigger>

      <PopoverContent className="w-80">{children}</PopoverContent>
    </Popover>
  );
}

function NumberValueEditor({ value, onChange }: ValueEditorProps<number>) {
  return (
    <NumberStepperField
      value={value.get()}
      onChange={(next) => {
        value.set(next);
        onChange?.();
      }}
    />
  );
}

function StringValueEditor({ value, onChange }: ValueEditorProps<string>) {
  const [draft, setDraft] = useState(value.get());

  useEffect(() => {
    setDraft(value.get());
  }, [value]);

  const commit = () => {
    if (draft !== value.get()) {
      value.set(draft);
      onChange?.();
    }
  };

  return (
    <Input
      type="text"
      value={draft}
      onChange={(event) => setDraft(event.target.value)}
      onBlur={commit}
      onKeyDown={(event) => {
        if (event.key === "Enter") {
          commit();
          event.currentTarget.blur();
        }
      }}
    />
  );
}

/** Convert any CSS color into the six-digit hex format color inputs expect. */
function toHexColor(color: string): string {
  const trimmed = color.trim();

  if (/^#[0-9a-f]{6}$/i.test(trimmed)) {
    return trimmed.toLowerCase();
  }

  if (/^#[0-9a-f]{3}$/i.test(trimmed)) {
    return `#${trimmed
      .slice(1)
      .split("")
      .map((digit) => `${digit}${digit}`)
      .join("")
      .toLowerCase()}`;
  }

  const ctx = document.createElement("canvas").getContext("2d");

  if (!ctx) return "#000000";

  ctx.fillStyle = "#000000";
  ctx.fillStyle = trimmed;

  const normalized = String(ctx.fillStyle);

  if (/^#[0-9a-f]{6}$/i.test(normalized)) {
    return normalized.toLowerCase();
  }

  const channels = normalized.match(/rgba?\(([^)]+)\)/i)?.[1].split(",");

  if (!channels || channels.length < 3) return "#000000";

  const [red, green, blue, alpha] = channels.map((channel) =>
    Number(channel.trim()),
  );

  if (alpha === 0) return "#000000";

  return `#${[red, green, blue]
    .map((channel) =>
      Math.max(0, Math.min(255, channel)).toString(16).padStart(2, "0"),
    )
    .join("")}`;
}

function ColorValueEditor({ value, onChange }: ValueEditorProps<string>) {
  const current = value.get();

  return (
    <div className="flex items-center gap-2">
      <Input
        type="color"
        value={toHexColor(current)}
        onChange={(event) => {
          value.set(event.target.value);
          onChange?.();
        }}
        className="h-8 w-12 shrink-0 cursor-pointer p-1"
      />
      <span className="truncate font-mono text-[11px] text-muted-foreground">
        {current}
      </span>
    </div>
  );
}

function BooleanValueEditor({ value, onChange }: ValueEditorProps<boolean>) {
  return (
    <Label className="flex items-center gap-3 text-stone-100">
      <Input
        type="checkbox"
        checked={value.get()}
        onChange={(event) => {
          value.set(event.target.checked);
          onChange?.();
        }}
      />
      <span className="text-sm text-stone-300/75">
        {value.get() ? "Checked" : "Unchecked"}
      </span>
    </Label>
  );
}

function RangeValueEditor({ value, onChange }: ValueEditorProps<Range>) {
  const current = value.get();

  const updateRange = (patch: Partial<Range>) => {
    value.set({ ...value.get(), ...patch });
    onChange?.();
  };

  return (
    <PopoverField
      triggerLabel="Range"
      triggerValue={`${current.min} → ${current.max}`}
    >
      <div className="grid gap-3">
        <NumberStepperField
          label="Min"
          value={current.min}
          onChange={(next) => updateRange({ min: next })}
        />
        <NumberStepperField
          label="Max"
          value={current.max}
          onChange={(next) => updateRange({ max: next })}
        />
      </div>
    </PopoverField>
  );
}

function VectorValueEditor({ value, onChange }: ValueEditorProps<Vector>) {
  const current = value.get();
  const hasZ = typeof (current as { z?: number }).z === "number";
  const z = (current as { z?: number }).z ?? 0;

  const updateVector = (patch: Partial<Vector> & { z?: number }) => {
    value.set({ ...value.get(), ...patch });
    onChange?.();
  };

  return (
    <PopoverField
      triggerLabel="Vector"
      triggerValue={hasZ ? `${current.x}, ${current.y}, ${z}` : `${current.x}, ${current.y}`}
    >
      <div className="grid gap-3">
        <NumberStepperField
          label="X"
          value={current.x}
          onChange={(next) => updateVector({ x: next })}
        />
        <NumberStepperField
          label="Y"
          value={current.y}
          onChange={(next) => updateVector({ y: next })}
        />
        {hasZ && (
          <NumberStepperField
            label="Z"
            value={z}
            onChange={(next) => updateVector({ z: next })}
          />
        )}
      </div>
    </PopoverField>
  );
}

function VectorArrayValueEditor({
  value,
  onChange,
}: ValueEditorProps<Vector[]>) {
  const current = value.get();

  const updatePoint = (index: number, patch: Partial<Vector>) => {
    const next = current.map((point, pointIndex) =>
      pointIndex === index ? { ...point, ...patch } : point,
    );
    value.set(next);
    onChange?.();
  };

  const addPoint = () => {
    value.set([...value.get(), { x: 0, y: 0 }]);
    onChange?.();
  };

  const removePoint = (index: number) => {
    value.set(value.get().filter((_, pointIndex) => pointIndex !== index));
    onChange?.();
  };

  return (
    <div className="grid gap-4">
      <div className="grid gap-4">
        {current.map((point, index) => (
          <div
            className="grid gap-3 rounded-2xl bg-white/5 p-4"
            key={`${index}-${point.x}-${point.y}`}
          >
            <NumberStepperField
              label={`P${index + 1} X`}
              value={point.x}
              onChange={(next) => updatePoint(index, { x: next })}
            />
            <NumberStepperField
              label={`P${index + 1} Y`}
              value={point.y}
              onChange={(next) => updatePoint(index, { y: next })}
            />
            <Button type="button" onClick={() => removePoint(index)}>
              Remove point
            </Button>
          </div>
        ))}
      </div>
      <Button type="button" onClick={addPoint}>
        Add point
      </Button>
    </div>
  );
}

function EasingValueEditor({
  value,
  onChange,
}: ValueEditorProps<(t: number) => number>) {
  const currentKey =
    easingEntries.find(([, easing]) => easing.get() === value.get())?.[0] ??
    easingEntries[0]?.[0] ??
    "linear";

  const sample = value.get()(0.5);

  return (
    <div className="grid gap-3">
      <select
        value={currentKey}
        onChange={(event) => {
          const nextKey = event.target.value as keyof typeof Easing;
          value.set(Easing[nextKey].get());
          onChange?.();
        }}
      >
        {easingEntries.map(([key]) => (
          <option key={key} value={key}>
            {key}
          </option>
        ))}
      </select>
      <div className="text-sm text-stone-300/75">
        t = 0.5 → {sample.toFixed(3)}
      </div>
    </div>
  );
}

export function ValueEditor<T>({ value, onChange }: ValueEditorProps<T>) {
  switch (value.type()) {
    case ValueType.number:
      return (
        <NumberValueEditor value={value as Value<number>} onChange={onChange} />
      );
    case ValueType.string:
      return (
        <StringValueEditor value={value as Value<string>} onChange={onChange} />
      );
    case ValueType.color:
      return (
        <ColorValueEditor value={value as Value<string>} onChange={onChange} />
      );
    case ValueType.boolean:
      return (
        <BooleanValueEditor
          value={value as Value<boolean>}
          onChange={onChange}
        />
      );
    case ValueType.range:
      return (
        <RangeValueEditor value={value as Value<Range>} onChange={onChange} />
      );
    case ValueType.vector:
      return (
        <VectorValueEditor value={value as Value<Vector>} onChange={onChange} />
      );
    case ValueType.vectorArray:
      return (
        <VectorArrayValueEditor
          value={value as Value<Vector[]>}
          onChange={onChange}
        />
      );
    case ValueType.easing:
      return (
        <EasingValueEditor
          value={value as Value<(t: number) => number>}
          onChange={onChange}
        />
      );
    default:
      return null;
  }
}

function formatEasingKey(value: (t: number) => number) {
  const match = Object.entries(Easing).find(
    ([, easing]) => easing.get() === value,
  );
  return match?.[0] ?? "custom";
}

export function ValuesEditorLab() {
  const values = useState(() => ({
    number: new Value(12),
    string: new Value("Edit me on blur", ValueType.string),
    boolean: new Value(true, ValueType.boolean),
    range: new Value({ min: -2, max: 8 }, ValueType.range),
    vector: new Value({ x: 3, y: 5 }, ValueType.vector),
    vectorArray: new Value(
      [
        { x: 0, y: 0 },
        { x: 2, y: 1 },
        { x: 4, y: 3 },
      ],
      ValueType.vectorArray,
    ),
    easing: Easing.easeInOut,
  }))[0];

  const [, forceRender] = useState(0);
  const refresh = () => forceRender((current) => current + 1);

  const currentValues = {
    number: values.number.get(),
    string: values.string.get(),
    boolean: values.boolean.get(),
    range: values.range.get(),
    vector: values.vector.get(),
    vectorArray: values.vectorArray.get(),
    easing: formatEasingKey(values.easing.get()),
    easingSample: values.easing.get()(0.5),
  };

  return (
    <main className="dark">
      <Card>
        <CardHeader>
          <CardTitle>Interactive controls for every value type</CardTitle>
          <CardDescription>
            Each control writes back into the shared Value object, so the panel
            below shows the live stored value.
          </CardDescription>
        </CardHeader>

        <CardContent>
          <pre>{JSON.stringify(currentValues, null, 2)}</pre>
        </CardContent>
      </Card>

      <section>
        <Card>
          <CardHeader>
            <CardTitle>Number</CardTitle>
            <CardDescription>
              Text field with decrement and increment buttons.
            </CardDescription>
          </CardHeader>

          <CardContent>
            <ValueEditor value={values.number} onChange={refresh} />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>String</CardTitle>
            <CardDescription>
              Commits only when editing finishes.
            </CardDescription>
          </CardHeader>

          <CardContent>
            <ValueEditor value={values.string} onChange={refresh} />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Boolean</CardTitle>
            <CardDescription>A simple checkbox.</CardDescription>
          </CardHeader>

          <CardContent>
            <ValueEditor value={values.boolean} onChange={refresh} />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Range</CardTitle>
            <CardDescription>
              Popover trigger shows the current pair.
            </CardDescription>
          </CardHeader>

          <CardContent>
            <ValueEditor value={values.range} onChange={refresh} />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Vector</CardTitle>
            <CardDescription>Popover with x and y controls.</CardDescription>
          </CardHeader>

          <CardContent>
            <ValueEditor value={values.vector} onChange={refresh} />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Vector array</CardTitle>
            <CardDescription>
              Add or remove points and edit each x/y pair inline.
            </CardDescription>
          </CardHeader>

          <CardContent>
            <ValueEditor value={values.vectorArray} onChange={refresh} />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Easing</CardTitle>
            <CardDescription>
              Chooses from the keys exported in easing.ts.
            </CardDescription>
          </CardHeader>

          <CardContent>
            <ValueEditor value={values.easing} onChange={refresh} />
          </CardContent>
        </Card>
      </section>
    </main>
  );
}
