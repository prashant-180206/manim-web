import { useEffect, useState } from "react";
import {
  Boxes,
  Crosshair,
  MousePointer2,
  RotateCcw,
  SlidersHorizontal,
} from "lucide-react";

import { cn } from "@/lib/utils";
import { ValueType, type Value } from "@/manim/utils/value";
import { PIXELS_PER_UNIT } from "@/manim/utils/units";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { CollapsibleSection } from "../editor/CollapsibleSection";
import { PanelHeader } from "../editor/editorPrimitives";
import { formatErrorMessage, useEditor3D } from "./editor3dContext";
import { MOBJECT3D_LABELS } from "@/manim3d/UI/mobject3dUI";
import { SliderField } from "./SliderField";

function formatLabel(key: string): string {
  return key
    .replace(/([A-Z])/g, " $1")
    .replace(/^./, (character) => character.toUpperCase());
}

/** 3D geometry uses world units; rotation is radians; opacity is unitless. */
function unitHint3D(key: string): string | null {
  if (key === "rotation") return "rad";
  if (key === "opacity") return "0–1";
  if (key === "samples") return "grid";
  if (key.endsWith("Expression")) return "f(u, v)";
  if (
    key === "position" ||
    key === "scale" ||
    key === "radius" ||
    key === "width" ||
    key === "height" ||
    key === "depth" ||
    key === "side" ||
    key === "tube" ||
    key === "length" ||
    key === "shaftRadius" ||
    key === "headRadius" ||
    key === "headLength" ||
    key === "uMin" ||
    key === "uMax" ||
    key === "vMin" ||
    key === "vMax"
  ) {
    return "units";
  }
  return null;
}

function getNumberRange(key: string): { min: number; max: number; step: number } {
  if (key === "opacity") return { min: 0, max: 1, step: 0.01 };
  if (key === "samples") return { min: 2, max: 160, step: 1 };
  if (key === "radius" || key === "tube") return { min: 0.05, max: 5, step: 0.05 };
  if (key === "shaftRadius") return { min: 0.01, max: 0.5, step: 0.01 };
  if (key === "headRadius") return { min: 0.02, max: 1, step: 0.02 };
  if (key === "headLength") return { min: 0.05, max: 2, step: 0.05 };
  if (key === "uMin" || key === "vMin") return { min: -10, max: 0, step: 0.1 };
  if (key === "uMax" || key === "vMax") return { min: 0, max: 10, step: 0.1 };
  return { min: 0.1, max: 10, step: 0.1 };
}

interface PropertyField3DProps {
  propKey: string;
  label: string;
  hint?: string | null;
  value: Value<unknown>;
  onChange: () => void;
}

function PropertyField3D({
  propKey,
  label,
  hint,
  value,
  onChange,
}: PropertyField3DProps) {
  const type = value.type();

  if (type === ValueType.vector) {
    const raw = value.get() as { x: number; y: number; z?: number };
    const hasZ = typeof raw.z === "number";
    const isRotation = propKey === "rotation" || hint === "rad";
    const isScale = propKey === "scale";

    const updateAxis = (axis: "x" | "y" | "z", nextVal: number) => {
      value.set({ ...raw, [axis]: nextVal });
      onChange();
    };

    const min = isRotation ? -Math.PI : isScale ? 0.05 : -15;
    const max = isRotation ? Math.PI : isScale ? 5 : 15;
    const step = isRotation ? 0.05 : isScale ? 0.05 : 0.1;

    return (
      <div className="space-y-2 rounded-md border border-border/40 bg-muted/10 p-2">
        <div className="flex items-center justify-between">
          <span className="text-[11px] font-medium text-foreground/80">
            {label}
            {hint && (
              <span className="ml-1 font-normal text-muted-foreground">
                ({hint})
              </span>
            )}
          </span>
          <Badge variant="outline" className="h-4 px-1.5 text-[9px]">
            {isRotation ? "euler" : hasZ ? "vector3" : "vector2"}
          </Badge>
        </div>

        <SliderField
          label="X"
          hint={isRotation ? `${((raw.x * 180) / Math.PI).toFixed(0)}°` : undefined}
          value={raw.x}
          min={min}
          max={max}
          step={step}
          onChange={(v) => updateAxis("x", v)}
        />
        <SliderField
          label="Y"
          hint={isRotation ? `${((raw.y * 180) / Math.PI).toFixed(0)}°` : undefined}
          value={raw.y}
          min={min}
          max={max}
          step={step}
          onChange={(v) => updateAxis("y", v)}
        />
        {hasZ && (
          <SliderField
            label="Z"
            hint={
              isRotation
                ? `${(((raw.z ?? 0) * 180) / Math.PI).toFixed(0)}°`
                : undefined
            }
            value={raw.z ?? 0}
            min={min}
            max={max}
            step={step}
            onChange={(v) => updateAxis("z", v)}
          />
        )}
      </div>
    );
  }

  if (type === ValueType.number) {
    const range = getNumberRange(propKey);
    const num = value.get() as number;

    return (
      <div className="space-y-1.5">
        <SliderField
          label={label}
          hint={hint}
          value={num}
          min={range.min}
          max={range.max}
          step={range.step}
          onChange={(v) => {
            value.set(v);
            onChange();
          }}
        />
      </div>
    );
  }

  if (type === ValueType.color) {
    const color = String(value.get() ?? "#ffffff");

    return (
      <div className="flex items-center justify-between gap-2">
        <span className="text-[11px] font-medium text-foreground/80">
          {label}
        </span>
        <div className="flex items-center gap-2">
          <span className="font-mono text-[10px] text-muted-foreground">
            {color}
          </span>
          <input
            type="color"
            value={color}
            onChange={(e) => {
              value.set(e.target.value);
              onChange();
            }}
            className="h-6 w-10 cursor-pointer rounded border border-border bg-transparent p-0"
          />
        </div>
      </div>
    );
  }

  if (type === ValueType.string) {
    const str = String(value.get() ?? "");

    return (
      <div className="space-y-1">
        <div className="flex items-center justify-between">
          <span className="text-[11px] font-medium text-foreground/80">
            {label}
            {hint && (
              <span className="ml-1 font-normal text-muted-foreground">
                ({hint})
              </span>
            )}
          </span>
          <Badge variant="outline" className="h-4 px-1.5 text-[9px]">
            f(u, v)
          </Badge>
        </div>
        <Input
          value={str}
          onChange={(e) => {
            value.set(e.target.value);
            onChange();
          }}
          className="h-7 font-mono text-xs"
        />
      </div>
    );
  }

  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between gap-2">
        <span className="text-[11px] font-medium text-foreground/80">
          {label}
        </span>
        <Badge variant="outline" className="h-4 px-1.5 text-[9px]">
          {type}
        </Badge>
      </div>
      <Input
        value={String(value.get() ?? "")}
        onChange={(e) => {
          value.set(e.target.value);
          onChange();
        }}
        className="h-7 text-xs"
      />
    </div>
  );
}

export function Inspector3DPanel() {
  const { scene, refresh, log } = useEditor3D();
  const mobject = scene.selection.selectedMobject;
  const [draftName, setDraftName] = useState(mobject?.name ?? "");

  useEffect(() => {
    setDraftName(mobject?.name ?? "");
  }, [mobject?.id, mobject?.name]);

  const multiSelection = [...scene.selection.editingSelection];

  const commitName = () => {
    if (!mobject) return;

    const nextName = draftName.trim();

    if (!nextName || nextName === mobject.name) {
      setDraftName(mobject.name);
      return;
    }

    try {
      scene.mobjectManager.rename(mobject, nextName);
      log("info", `Renamed ${mobject.name} to ${nextName}`);
    } catch (error) {
      log("error", formatErrorMessage(error));
    }

    refresh();
  };

  if (!mobject) {
    return (
      <div className="flex h-full min-h-0 flex-col">
        <PanelHeader title="Inspector" icon={<SlidersHorizontal />} />
        <div className="flex min-h-0 flex-1 items-center justify-center p-4">
          <Empty>
            <EmptyHeader>
              <EmptyMedia variant="icon">
                <MousePointer2 />
              </EmptyMedia>
              <EmptyTitle>No selection</EmptyTitle>
              <EmptyDescription>
                Select a 3D object on the canvas or in the scene list to inspect
                and edit its transform, material and shape.
              </EmptyDescription>
            </EmptyHeader>
          </Empty>
        </div>
      </div>
    );
  }

  const entries = Object.entries(mobject.properties) as [
    string,
    Value<unknown>,
  ][];

  const transformKeys = new Set(["position", "rotation", "scale", "opacity"]);
  const appearanceKeys = new Set(["color"]);
  const transform = entries.filter(([key]) => transformKeys.has(key));
  const appearance = entries.filter(([key]) => appearanceKeys.has(key));
  const other = entries.filter(
    ([key]) => !transformKeys.has(key) && !appearanceKeys.has(key),
  );

  const syncAndRefresh = () => {
    mobject.sync();
    refresh();
  };

  return (
    <div className="flex h-full min-h-0 flex-col">
      <PanelHeader title="Inspector" icon={<SlidersHorizontal />}>
        <Badge variant="secondary" className="h-5">
          {entries.length} props
        </Badge>
      </PanelHeader>

      <ScrollArea className="min-h-0 flex-1">
        <CollapsibleSection
          title="Identity"
          icon={<MousePointer2 className="size-3" />}
          defaultOpen
        >
          <div className="space-y-2">
            <div className="space-y-1">
              <span className="text-[11px] text-muted-foreground">Name</span>
              <Input
                value={draftName}
                onChange={(event) => setDraftName(event.target.value)}
                onBlur={commitName}
                onKeyDown={(event) => {
                  if (event.key === "Enter") {
                    commitName();
                    event.currentTarget.blur();
                  }

                  if (event.key === "Escape") {
                    setDraftName(mobject.name);
                    event.currentTarget.blur();
                  }
                }}
                className="h-7 rounded-md text-xs"
              />
            </div>

            <div className="flex flex-wrap items-center gap-1.5">
              <Badge variant="outline" className="font-mono">
                {mobject.id}
              </Badge>
              <Badge variant="secondary">
                <Boxes /> {MOBJECT3D_LABELS[mobject.kind] ?? mobject.kind}
              </Badge>
              {!mobject.visible && <Badge variant="secondary">Hidden</Badge>}
              {mobject.locked && <Badge variant="secondary">Locked</Badge>}
              {multiSelection.length > 0 && (
                <Badge variant="secondary">
                  +{multiSelection.length} multi-selected
                </Badge>
              )}
            </div>

            <Button
              variant="outline"
              size="xs"
              className="w-full"
              onClick={() => {
                mobject.properties.position.set({ x: 0, y: 0, z: 0 });
                syncAndRefresh();
              }}
            >
              <Crosshair /> Center in viewport
            </Button>
          </div>
        </CollapsibleSection>

        <CollapsibleSection
          title="Transform"
          icon={<SlidersHorizontal className="size-3" />}
          defaultOpen
          action={
            <Button
              variant="ghost"
              size="xs"
              className="h-6 text-muted-foreground"
              onClick={() => {
                mobject.properties.rotation.set({ x: 0, y: 0, z: 0 });
                syncAndRefresh();
              }}
            >
              <RotateCcw /> Reset rotation
            </Button>
          }
        >
          <div className="space-y-4">
            <p className="text-[10px] leading-relaxed text-muted-foreground">
              World units · +y up · +z toward the viewer · 1 unit ={" "}
              {PIXELS_PER_UNIT} px. Rotation is XYZ Euler in radians.
            </p>
            {transform.map(([key, value]) => (
              <PropertyField3D
                key={key}
                propKey={key}
                label={formatLabel(key)}
                hint={unitHint3D(key)}
                value={value}
                onChange={syncAndRefresh}
              />
            ))}
          </div>
        </CollapsibleSection>

        {appearance.length > 0 && (
          <CollapsibleSection title="Appearance" defaultOpen>
            <div className="space-y-4">
              {appearance.map(([key, value]) => (
                <PropertyField3D
                  key={key}
                  propKey={key}
                  label={formatLabel(key)}
                  hint={unitHint3D(key)}
                  value={value}
                  onChange={syncAndRefresh}
                />
              ))}
            </div>
          </CollapsibleSection>
        )}

        {other.length > 0 && (
          <CollapsibleSection
            title="Shape properties"
            defaultOpen
            contentClassName={cn("space-y-4")}
          >
            {other.map(([key, value]) => (
              <PropertyField3D
                key={key}
                propKey={key}
                label={formatLabel(key)}
                hint={unitHint3D(key)}
                value={value}
                onChange={syncAndRefresh}
              />
            ))}
          </CollapsibleSection>
        )}
      </ScrollArea>
    </div>
  );
}
