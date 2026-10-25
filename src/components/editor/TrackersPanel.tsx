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

function TrackerCard({ tracker, allTrackers }: TrackerCardProps) {
  const { scene, refresh, log } = useEditor();
  const mobject = scene.selection.selectedMobject;

  const [draftName, setDraftName] = useState(tracker.name);
  const [propertyOverride, setPropertyOverride] =
    useState<TrackerConnectionName | null>(null);
  const [propertyExpression, setPropertyExpression] = useState("t");
  const [targetOverride, setTargetOverride] = useState("");
  const [trackerExpression, setTrackerExpression] = useState("t");

  useEffect(() => {
    setDraftName(tracker.name);
  }, [tracker.name]);

  const propertyOptions = TrackerUI.getPropertyOptions(mobject).filter(
    (option) => option.valueType === ValueType.number,
  );
  const vectorOptions = TrackerUI.getPropertyOptions(mobject).filter(
    (option) => option.valueType !== ValueType.number,
  );

  const property =
    propertyOverride &&
    propertyOptions.some((option) => option.name === propertyOverride)
      ? propertyOverride
      : (propertyOptions[0]?.name ?? null);

  const otherTrackers = allTrackers.filter((item) => item.id !== tracker.id);
  const targetId = otherTrackers.some((item) => item.id === targetOverride)
    ? targetOverride
    : (otherTrackers[0]?.id ?? "");

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
          {tracker.value.toFixed(2)}
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
              );
            })
          )}

          {!mobject ? (
            <p className="text-[10px] text-muted-foreground/80">
              Select a mobject to bind a numeric property.
            </p>
          ) : propertyOptions.length === 0 ? (
            <p className="text-[10px] text-muted-foreground/80">
              {mobject.name} has no numeric properties to bind.
            </p>
          ) : (
            <div className="space-y-1.5 rounded-md border border-border/50 p-2">
              <div className="grid grid-cols-2 gap-1.5">
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
                        {option.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                <Input
                  value={propertyExpression}
                  onChange={(event) =>
                    setPropertyExpression(event.target.value)
                  }
                  placeholder="t"
                  aria-label="Property expression"
                  className="h-7 rounded-md px-2 font-mono text-xs"
                />
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
                Expression receives the tracker value as <code>t</code>.
              </p>
            </div>
          )}

          {vectorOptions.length > 0 && (
            <p className="text-[10px] leading-relaxed text-muted-foreground/80">
              Vector properties ({vectorOptions.map((o) => o.name).join(", ")}){" "}
              cannot be bound because the engine only supports numeric targets.
            </p>
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

          {otherTrackers.length === 0 ? (
            <p className="text-[10px] text-muted-foreground/80">
              Create another tracker to link them together.
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
                    {otherTrackers.map((item) => (
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
  const [value, setValue] = useState(0);

  const trackers = TrackerUI.getTrackers(scene);

  const createTracker = () => {
    const nextName =
      name.trim() || `tracker_${trackers.length + 1}`;

    try {
      TrackerUI.createTracker(scene, nextName, value);
      setName("");
      setValue(0);
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
            <Button size="xs" className="w-full" onClick={createTracker}>
              <Plus /> Create tracker
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
