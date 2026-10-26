import { useEffect, useState } from "react";
import {
  ArrowRightLeft,
  Link2,
  Plus,
  Trash2,
  Variable,
  Workflow,
  X,
} from "lucide-react";

import { ValueType } from "@/manim/utils/value";
import type { Vector } from "@/manim/utils/types";
import { TrackerConnectionName } from "@/manim/tracker/trackerconnectorNames";
import {
  TrackerUI,
  type TrackerUIData,
} from "@/manim/UI/trackerUI";
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

interface TrackerCardProps {
  tracker: TrackerUIData;
  allTrackers: TrackerUIData[];
}

/** `gridStep` → `Grid Step`, `tMin` → `T Min`. */
function formatConnectorName(name: string): string {
  return name
    .replace(/([a-z0-9])([A-Z])/g, "$1 $2")
    .replace(/^./, (character) => character.toUpperCase());
}

function TrackerCard({ tracker, allTrackers }: TrackerCardProps) {
  const { scene, refresh, log } = useEditor();
  const mobject = scene.selection.selectedMobject;

  const [draftName, setDraftName] = useState(tracker.name);
  const [propertyOverride, setPropertyOverride] =
    useState<TrackerConnectionName | null>(null);
  const [propertyExpression, setPropertyExpression] = useState("t");
  const [propertyExpressionY, setPropertyExpressionY] = useState("t");
  const [targetOverride, setTargetOverride] = useState("");
  const [trackerExpression, setTrackerExpression] = useState("t");

  useEffect(() => {
    setDraftName(tracker.name);
  }, [tracker.name]);

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

  const otherTrackers = allTrackers.filter((item) => item.id !== tracker.id);
  const linkableTrackers = otherTrackers.filter((item) => !item.isVector);
  const targetId = linkableTrackers.some((item) => item.id === targetOverride)
    ? targetOverride
    : (linkableTrackers[0]?.id ?? "");

  const trackerName = (id: string) =>
    allTrackers.find((item) => item.id === id)?.name ?? id;

  const commitName = () => {
    const nextName = draftName.trim();

    if (!nextName || nextName === tracker.name) {
      setDraftName(tracker.name);
      return;
    }

    try {
      tracker.rename(nextName);
      log("info", `Renamed tracker to ${nextName}`);
    } catch (error) {
      log("error", formatErrorMessage(error));
    }

    refresh();
  };

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

  const connectTracker = () => {
    if (!targetId) return;

    try {
      TrackerUI.connectTrackers(
        scene,
        tracker.id,
        targetId,
        trackerExpression,
      );
      log(
        "success",
        `Linked ${tracker.name} → ${trackerName(targetId)}`,
      );
    } catch (error) {
      log("error", formatErrorMessage(error));
    }

    refresh();
  };

  return (
    <div className="rounded-lg border border-border/60 bg-card/40">
      <div className="flex items-center gap-2 border-b border-border/60 p-2">
        <Workflow className="size-3.5 shrink-0 text-muted-foreground" />
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
              setDraftName(tracker.name);
              event.currentTarget.blur();
            }
          }}
          className="h-7 flex-1 rounded-md px-2 text-xs font-medium"
        />
        <Badge variant="secondary" className="h-5 font-mono">
          {tracker.isVector && tracker.vector
            ? `(${tracker.vector.x.toFixed(2)}, ${tracker.vector.y.toFixed(2)})`
            : tracker.value.toFixed(2)}
        </Badge>
        <Button
          variant="ghost"
          size="icon-xs"
          className="text-muted-foreground hover:text-destructive"
          onClick={() => {
            tracker.remove();
            refresh();
          }}
        >
          <Trash2 />
        </Button>
      </div>

      <div className="space-y-3 p-2.5">
        {tracker.isVector ? (
          <div className="space-y-1">
            {tracker.components.map((component) => (
              <div
                key={component.id}
                className="flex items-center gap-2"
              >
                <span className="min-w-0 flex-1 truncate font-mono text-[11px] text-muted-foreground">
                  {component.name}
                </span>
                <NumberInput
                  value={component.value}
                  step={0.1}
                  onCommit={(value) => {
                    component.setValue(value);
                    refresh();
                  }}
                  ariaLabel={`${component.name} value`}
                  className="w-28"
                />
              </div>
            ))}
          </div>
        ) : (
          <div className="flex items-center gap-2">
            <span className="flex-1 text-[11px] text-muted-foreground">
              Value
            </span>
            <NumberInput
              value={tracker.value}
              step={0.1}
              onCommit={(value) => {
                tracker.setValue(value);
                refresh();
              }}
              ariaLabel={`${tracker.name} value`}
              className="w-28"
            />
          </div>
        )}

        <div className="space-y-1.5">
          <div className="flex items-center gap-1.5 text-[10px] font-semibold tracking-wider text-muted-foreground uppercase">
            <Link2 className="size-3" /> Property bindings
          </div>

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
              Select a mobject to bind a property.
            </p>
          ) : propertyOptions.length === 0 ? (
            <p className="text-[10px] text-muted-foreground/80">
              {tracker.isVector
                ? `${mobject.name} has no vector properties to bind.`
                : `${mobject.name} has no bindable properties.`}
            </p>
          ) : (
            <div className="space-y-1.5 rounded-md border border-border/50 p-2">
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
                  onChange={(event) =>
                    setPropertyExpression(event.target.value)
                  }
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
                      The <code>x</code> and <code>y</code> expressions receive
                      the matching component value as <code>t</code>.
                    </>
                  ) : (
                    <>
                      Both expressions receive the tracker value as{" "}
                      <code>t</code>.
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
        </div>

        <div className="space-y-1.5">
          <div className="flex items-center gap-1.5 text-[10px] font-semibold tracking-wider text-muted-foreground uppercase">
            <ArrowRightLeft className="size-3" /> Tracker links
          </div>

          {tracker.trackerConnections.length === 0 ? (
            <p className="text-[11px] text-muted-foreground">
              No outgoing links.
            </p>
          ) : (
            tracker.trackerConnections.map((connection) => (
              <div
                key={connection.id}
                className="flex items-center gap-1.5 rounded-md bg-muted/40 px-2 py-1 text-[11px]"
              >
                <span className="min-w-0 flex-1 truncate">
                  → {trackerName(connection.target)}
                </span>
                <code className="shrink-0 text-[10px] text-muted-foreground">
                  {connection.expression}
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
            ))
          )}

          {tracker.isVector ? (
            <p className="text-[10px] leading-relaxed text-muted-foreground/80">
              Vector trackers drive vector properties through their x and y
              components. Link numeric trackers to build them.
            </p>
          ) : linkableTrackers.length === 0 ? (
            <p className="text-[10px] text-muted-foreground/80">
              Create another numeric tracker to link them together.
            </p>
          ) : (
            <div className="space-y-1.5 rounded-md border border-border/50 p-2">
              <div className="grid grid-cols-2 gap-1.5">
                <Select
                  value={targetId}
                  onValueChange={(value) => {
                    if (typeof value === "string") {
                      setTargetOverride(value);
                    }
                  }}
                >
                  <SelectTrigger size="sm" className="h-7 w-full rounded-md">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {linkableTrackers.map((item) => (
                      <SelectItem key={item.id} value={item.id}>
                        {item.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                <Input
                  value={trackerExpression}
                  onChange={(event) =>
                    setTrackerExpression(event.target.value)
                  }
                  placeholder="t * 2"
                  aria-label="Tracker expression"
                  className="h-7 rounded-md px-2 font-mono text-xs"
                />
              </div>
              <Button
                variant="outline"
                size="xs"
                className="w-full"
                onClick={connectTracker}
                disabled={!targetId}
              >
                <ArrowRightLeft /> Link to {trackerName(targetId)}
              </Button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export function TrackersPanel() {
  const { scene, log } = useEditor();
  const [name, setName] = useState("");
  const [kind, setKind] = useState<"number" | "vector">("number");
  const [value, setValue] = useState(0);
  const [vectorValue, setVectorValue] = useState<Vector>({ x: 0, y: 0 });

  const trackers = TrackerUI.getTrackers(scene);

  const createTracker = () => {
    const nextName =
      name.trim() || `tracker_${trackers.length + 1}`;

    try {
      if (kind === "vector") {
        TrackerUI.createVectorTracker(scene, nextName, vectorValue);
      } else {
        TrackerUI.createTracker(scene, nextName, value);
      }

      setName("");
      setValue(0);
      setVectorValue({ x: 0, y: 0 });
    } catch (error) {
      log("error", formatErrorMessage(error));
    }
  };

  return (
    <div className="flex h-full min-h-0 flex-col">
      <PanelHeader title="Trackers" icon={<Variable />}>
        <Badge variant="secondary" className="h-5">
          {trackers.length}
        </Badge>
      </PanelHeader>

      <ScrollArea className="min-h-0 flex-1">
        <CollapsibleSection
          title="Create tracker"
          icon={<Plus className="size-3" />}
          defaultOpen
        >
          <div className="space-y-2">
            <Input
              value={name}
              onChange={(event) => setName(event.target.value)}
              placeholder="tracker name"
              className="h-7 rounded-md text-xs"
            />

            <Select
              value={kind}
              onValueChange={(next) => {
                if (next === "number" || next === "vector") {
                  setKind(next);
                }
              }}
            >
              <SelectTrigger size="sm" className="h-7 w-full rounded-md">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="number">Number</SelectItem>
                <SelectItem value="vector">Vector (x, y)</SelectItem>
              </SelectContent>
            </Select>

            {kind === "vector" ? (
              <div className="grid grid-cols-[auto_1fr] items-center gap-x-2 gap-y-1">
                <span className="text-[11px] text-muted-foreground">x</span>
                <NumberInput
                  value={vectorValue.x}
                  step={0.1}
                  onCommit={(x) =>
                    setVectorValue((current) => ({ ...current, x }))
                  }
                  ariaLabel="Initial vector x"
                  className="w-full"
                />
                <span className="text-[11px] text-muted-foreground">y</span>
                <NumberInput
                  value={vectorValue.y}
                  step={0.1}
                  onCommit={(y) =>
                    setVectorValue((current) => ({ ...current, y }))
                  }
                  ariaLabel="Initial vector y"
                  className="w-full"
                />
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <span className="flex-1 text-[11px] text-muted-foreground">
                  Initial value
                </span>
                <NumberInput
                  value={value}
                  step={0.1}
                  onCommit={setValue}
                  ariaLabel="Initial tracker value"
                  className="w-28"
                />
              </div>
            )}

            <Button size="xs" className="w-full" onClick={createTracker}>
              <Plus /> Create{" "}
              {kind === "vector" ? "vector tracker" : "tracker"}
            </Button>
          </div>
        </CollapsibleSection>

        <CollapsibleSection
          title={`Trackers · ${trackers.length}`}
          icon={<Workflow className="size-3" />}
          defaultOpen
        >
          {trackers.length === 0 ? (
            <Empty className="p-4">
              <EmptyHeader>
                <EmptyMedia variant="icon">
                  <Variable />
                </EmptyMedia>
                <EmptyTitle>No trackers</EmptyTitle>
                <EmptyDescription>
                  Trackers are numeric values that can drive mobject properties
                  or feed other trackers through expressions.
                </EmptyDescription>
              </EmptyHeader>
            </Empty>
          ) : (
            <div className="space-y-2">
              {trackers.map((tracker) => (
                <TrackerCard
                  key={tracker.id}
                  tracker={tracker}
                  allTrackers={trackers}
                />
              ))}
            </div>
          )}
        </CollapsibleSection>
      </ScrollArea>
    </div>
  );
}
