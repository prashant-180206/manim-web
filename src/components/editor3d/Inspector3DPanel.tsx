import { useEffect, useState } from "react";
import {
  Boxes,
  Crosshair,
  MousePointer2,
  RotateCcw,
  SlidersHorizontal,
} from "lucide-react";

import { cn } from "@/lib/utils";
import type { Value } from "@/manim/utils/value";
import { PIXELS_PER_UNIT } from "@/manim/utils/units";
import { ValueEditor } from "@/components/valueEditors";
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

function formatLabel(key: string): string {
  return key
    .replace(/([A-Z])/g, " $1")
    .replace(/^./, (character) => character.toUpperCase());
}

/** 3D geometry uses world units; rotation is radians; opacity is unitless. */
function unitHint3D(key: string): string | null {
  if (key === "rotation") return "rad";
  if (
    key === "position" ||
    key === "scale" ||
    key === "radius" ||
    key === "width" ||
    key === "height" ||
    key === "depth"
  ) {
    return "units";
  }
  if (key === "opacity") return "0–1";
  return null;
}

interface PropertyField3DProps {
  label: string;
  hint?: string | null;
  value: Value<unknown>;
  onChange: () => void;
}

function PropertyField3D({
  label,
  hint,
  value,
  onChange,
}: PropertyField3DProps) {
  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between gap-2">
        <span className="text-[11px] font-medium text-foreground/80">
          {label}
          {hint && (
            <span className="ml-1 font-normal text-muted-foreground">
              ({hint})
            </span>
          )}
        </span>
        <Badge variant="outline" className="h-4 px-1.5 text-[9px]">
          {value.type()}
        </Badge>
      </div>
      <ValueEditor value={value} onChange={onChange} />
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
                <Boxes /> {mobject.kind}
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
