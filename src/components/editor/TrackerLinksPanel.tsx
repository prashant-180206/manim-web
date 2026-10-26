import { useState } from "react";
import { Clapperboard, Link2, Workflow, X } from "lucide-react";

import { Easing } from "@/manim/utils/easing";
import { ValueType } from "@/manim/utils/value";
import type { Vector } from "@/manim/utils/types";
import { TrackerConnectionName } from "@/manim/tracker/trackerconnectorNames";
import { TrackerUI, type TrackerUIData } from "@/manim/UI/trackerUI";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { CollapsibleSection } from "./CollapsibleSection";
import { NumberInput, PanelHeader } from "./editorPrimitives";
import { formatErrorMessage, useEditor } from "./editorContext";

type EasingKey = keyof typeof Easing;

const easingKeys = Object.keys(Easing) as EasingKey[];

/** `gridStep` → `Grid Step`, `tMin` → `T Min`. */
function formatConnectorName(name: string): string {
  return name
    .replace(/([a-z0-9])([A-Z])/g, "$1 $2")
    .replace(/^./, (character) => character.toUpperCase());
}

function formatTrackerValue(tracker: TrackerUIData): string {
  if (tracker.isVector && tracker.vector) {
    return `(${tracker.vector.x.toFixed(2)}, ${tracker.vector.y.toFixed(2)})`;
  }

  return tracker.value.toFixed(2);
}

interface TrackerLinkEditorProps {
  tracker: TrackerUIData;
}

/**
 * Binding and animation controls for one tracker. The parent keys this by
 * tracker id so the draft fields reset when the selection changes.
 */
function TrackerLinkEditor({ tracker }: TrackerLinkEditorProps) {
  const { scene, refresh, log } = useEditor();
  const mobject = scene.selection.selectedMobject;

  const [propertyOverride, setPropertyOverride] =
    useState<TrackerConnectionName | null>(null);
  const [propertyExpression, setPropertyExpression] = useState("t");
  const [propertyExpressionY, setPropertyExpressionY] = useState("t");
  const [animationValue, setAnimationValue] = useState(tracker.value);
  const [animationVector, setAnimationVector] = useState<Vector>(
    tracker.vector ?? { x: 0, y: 0 },
  );
  const [animationDuration, setAnimationDuration] = useState(1);
  const [animationEasing, setAnimationEasing] =
    useState<EasingKey>("easeInOut");

  // Vector trackers can only drive vector properties; numeric trackers can
  // drive either kind, producing the x and y components from expressions.
  const propertyOptions = TrackerUI.getPropertyOptions(mobject).filter(
    (option) => !tracker.isVector || option.valueType === ValueType.vector,
  );

  const property =
    propertyOverride &&
    propertyOptions.some((option) => option.name === propertyOverride)
      ? propertyOverride
      : (propertyOptions[0]?.name ?? null);

  const propertyIsVector =
    propertyOptions.find((option) => option.name === property)?.valueType ===
    ValueType.vector;

  const animations = [...scene.animationSystem.all()].filter(
    (animation) =>
      animation.target.animationTargetType === "tracker" &&
      animation.target.id === tracker.id,
  );

  const connectProperty = () => {
    if (!mobject || !property) return;

    try {
      scene.selection.selectMobject(mobject);
      TrackerUI.connectToProperty(
        scene,
        tracker.id,
        property,
        propertyExpression,
        propertyIsVector ? propertyExpressionY : undefined,
      );
      log(
        "success",
        `Bound ${tracker.name} to ${mobject.name}.${property}`,
      );
    } catch (error) {
      log("error", formatErrorMessage(error));
    }

    refresh();
  };

  const addAnimation = () => {
    try {
      tracker.animateTo(
        tracker.isVector ? animationVector : animationValue,
        animationDuration,
        Easing[animationEasing],
      );
      log(
        "success",
        `Animating ${tracker.name} to ${
          tracker.isVector
            ? `(${animationVector.x}, ${animationVector.y})`
            : animationValue
        }`,
      );
    } catch (error) {
      log("error", formatErrorMessage(error));
    }

    refresh();
  };

  return (
    <>
      <CollapsibleSection
        title="Property bindings"
        icon={<Link2 className="size-3" />}
        defaultOpen
      >
        {tracker.propertyConnections.length === 0 ? (
          <p className="text-[11px] text-muted-foreground">
            No properties bound.
          </p>
        ) : (
          tracker.propertyConnections.map((connection) => {
            const mobjectName =
              scene.mobjectManager.tree.nodes.get(connection.mobjectId)
                ?.mobject.name ?? connection.mobjectId;

            return (
              <div
                key={connection.id}
                className="flex items-center gap-1.5 rounded-md bg-muted/40 px-2 py-1 text-[11px]"
              >
                <span className="min-w-0 flex-1 truncate">
                  {mobjectName}.{connection.property}
                </span>
                <code className="shrink-0 text-[10px] text-muted-foreground">
                  {connection.yExpression
                    ? `x: ${connection.expression} · y: ${connection.yExpression}`
                    : connection.expression}
                </code>
                <Button
                  variant="ghost"
                  size="icon-xs"
                  className="size-5 text-muted-foreground hover:text-destructive"
                  onClick={() => {
                    connection.remove();
                    refresh();
                  }}
                >
                  <X />
                </Button>
              </div>
            );
          })
        )}

        {!mobject ? (
          <p className="text-[10px] text-muted-foreground/80">
            Select a mobject to bind one of its properties.
          </p>
        ) : propertyOptions.length === 0 ? (
          <p className="text-[10px] text-muted-foreground/80">
            {tracker.isVector
              ? `${mobject.name} has no vector properties to bind.`
              : `${mobject.name} has no bindable properties.`}
          </p>
        ) : (
          <div className="space-y-1.5 rounded-md border border-border/50 p-2">
            <p className="text-[10px] text-muted-foreground">
              Selected mobject:{" "}
              <span className="text-foreground">{mobject.name}</span>
            </p>

            <Select
              value={property ?? ""}
              onValueChange={(value) => {
                if (typeof value === "string") {
                  setPropertyOverride(value as TrackerConnectionName);
                }
              }}
            >
              <SelectTrigger size="sm" className="h-7 w-full rounded-md">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {propertyOptions.map((option) => (
                  <SelectItem key={option.name} value={option.name}>
                    {formatConnectorName(option.name)}
                    {option.valueType === ValueType.vector ? " (x, y)" : ""}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <div className="grid grid-cols-2 gap-1.5">
              <Input
                value={propertyExpression}
                onChange={(event) => setPropertyExpression(event.target.value)}
                placeholder="t"
                aria-label={
                  propertyIsVector
                    ? "X component expression"
                    : "Property expression"
                }
                className="h-7 rounded-md px-2 font-mono text-xs"
              />

              {propertyIsVector && (
                <Input
                  value={propertyExpressionY}
                  onChange={(event) =>
                    setPropertyExpressionY(event.target.value)
                  }
                  placeholder="t"
                  aria-label="Y component expression"
                  className="h-7 rounded-md px-2 font-mono text-xs"
                />
              )}
            </div>

            <Button
              variant="outline"
              size="xs"
              className="w-full"
              onClick={connectProperty}
              disabled={!property}
            >
              <Link2 /> Bind {mobject.name}
              {property ? `.${property}` : ""}
            </Button>
            <p className="text-[10px] leading-relaxed text-muted-foreground/80">
              {propertyIsVector ? (
                tracker.isVector ? (
                  <>
                    The <code>x</code> and <code>y</code> expressions receive the
                    matching component value as <code>t</code>.
                  </>
                ) : (
                  <>
                    Both expressions receive the tracker value as <code>t</code>.
                  </>
                )
              ) : (
                <>
                  Expression receives the tracker value as <code>t</code>.
                </>
              )}
            </p>
          </div>
        )}
      </CollapsibleSection>

      <CollapsibleSection
        title="Animations"
        icon={<Clapperboard className="size-3" />}
        defaultOpen
      >
        {animations.length === 0 ? (
          <p className="text-[11px] text-muted-foreground">
            No animations target this tracker.
          </p>
        ) : (
          animations.map((animation) => {
            const start = scene.animationSystem.getStart(animation.id);

            return (
              <div
                key={animation.id}
                className="flex items-center gap-1.5 rounded-md bg-muted/40 px-2 py-1 text-[11px]"
              >
                <span className="min-w-0 flex-1 truncate">
                  {animation.name}
                </span>
                <span className="shrink-0 text-[10px] text-muted-foreground tabular-nums">
                  {start.toFixed(2)}s →{" "}
                  {(start + animation.duration).toFixed(2)}s
                </span>
                <Button
                  variant="ghost"
                  size="icon-xs"
                  className="size-5 text-muted-foreground hover:text-destructive"
                  onClick={() => {
                    scene.animationSystem.remove(animation.id);
                    refresh();
                  }}
                >
                  <X />
                </Button>
              </div>
            );
          })
        )}

        <div className="space-y-1.5 rounded-md border border-border/50 p-2">
          {tracker.isVector ? (
            <div className="grid grid-cols-2 gap-1.5">
              <NumberInput
                value={animationVector.x}
                step={0.1}
                onCommit={(x) =>
                  setAnimationVector((current) => ({ ...current, x }))
                }
                ariaLabel={`${tracker.name} target x`}
                className="w-full"
              />
              <NumberInput
                value={animationVector.y}
                step={0.1}
                onCommit={(y) =>
                  setAnimationVector((current) => ({ ...current, y }))
                }
                ariaLabel={`${tracker.name} target y`}
                className="w-full"
              />
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <span className="flex-1 text-[11px] text-muted-foreground">
                Target value
              </span>
              <NumberInput
                value={animationValue}
                step={0.1}
                onCommit={setAnimationValue}
                ariaLabel={`${tracker.name} target value`}
                className="w-28"
              />
            </div>
          )}

          <div className="grid grid-cols-2 gap-1.5">
            <NumberInput
              value={animationDuration}
              min={0.1}
              step={0.1}
              onCommit={setAnimationDuration}
              ariaLabel={`${tracker.name} animation duration`}
              className="w-full"
            />

            <Select
              value={animationEasing}
              onValueChange={(value) => {
                if (typeof value === "string") {
                  setAnimationEasing(value as EasingKey);
                }
              }}
            >
              <SelectTrigger size="sm" className="h-7 w-full rounded-md">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {easingKeys.map((key) => (
                  <SelectItem key={key} value={key}>
                    {key}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <Button
            variant="outline"
            size="xs"
            className="w-full"
            onClick={addAnimation}
          >
            <Clapperboard /> Animate to{" "}
            {tracker.isVector
              ? `(${animationVector.x}, ${animationVector.y})`
              : animationValue}
          </Button>
        </div>
      </CollapsibleSection>
    </>
  );
}

export function TrackerLinksPanel() {
  const { scene } = useEditor();
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const trackers = TrackerUI.getTrackers(scene);
  const tracker =
    trackers.find((item) => item.id === selectedId) ?? trackers[0] ?? null;

  return (
    <div className="flex h-full min-h-0 flex-col">
      <PanelHeader title="Tracker Links" icon={<Link2 />}>
        <Badge variant="secondary" className="h-5">
          {trackers.length}
        </Badge>
      </PanelHeader>

      <ScrollArea className="min-h-0 flex-1">
        {!tracker ? (
          <Empty className="p-4">
            <EmptyHeader>
              <EmptyMedia variant="icon">
                <Link2 />
              </EmptyMedia>
              <EmptyTitle>No trackers</EmptyTitle>
              <EmptyDescription>
                Create a tracker in the Trackers panel, then bind it to a
                mobject property or animate it here.
              </EmptyDescription>
            </EmptyHeader>
          </Empty>
        ) : (
          <>
            <CollapsibleSection
              title="Tracker"
              icon={<Workflow className="size-3" />}
              defaultOpen
            >
              <Select
                value={tracker.id}
                onValueChange={(value) => {
                  if (typeof value === "string") {
                    setSelectedId(value);
                  }
                }}
              >
                <SelectTrigger size="sm" className="h-7 w-full rounded-md">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {trackers.map((item) => (
                    <SelectItem key={item.id} value={item.id}>
                      {item.name}
                      {item.isVector ? " (x, y)" : ""}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <div className="flex items-center gap-2 text-[11px] text-muted-foreground">
                <span className="flex-1">Current value</span>
                <Badge variant="secondary" className="h-5 font-mono">
                  {formatTrackerValue(tracker)}
                </Badge>
              </div>

              <p className="text-[10px] leading-relaxed text-muted-foreground/80">
                Tracker values and expressions live in the Trackers panel. Bind
                this tracker to a mobject property or animate it below.
              </p>
            </CollapsibleSection>

            <TrackerLinkEditor key={tracker.id} tracker={tracker} />
          </>
        )}
      </ScrollArea>
    </div>
  );
}
