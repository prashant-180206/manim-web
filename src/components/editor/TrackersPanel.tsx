import { useEffect, useState } from "react";
import {
  ArrowRightLeft,
  Plus,
  Trash2,
  Variable,
  Workflow,
  X,
} from "lucide-react";

import type { Vector } from "@/manim/utils/types";
import {
  TrackerUI,
  type TrackerExpressionVariableUIData,
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

type ExpressionChannel = "vector" | "x" | "y";

interface TrackerCardProps {
  tracker: TrackerUIData;
  allTrackers: TrackerUIData[];
  variables: TrackerExpressionVariableUIData[];
}

function TrackerCard({ tracker, allTrackers, variables }: TrackerCardProps) {
  const { scene, refresh, log } = useEditor();

  const [draftName, setDraftName] = useState(tracker.name);
  const [trackerExpression, setTrackerExpression] = useState("");
  const [expressionChannel, setExpressionChannel] =
    useState<ExpressionChannel>("vector");

  useEffect(() => {
    setDraftName(tracker.name);
  }, [tracker.name]);

  const trackerName = (id: string) =>
    allTrackers.find((item) => item.id === id)?.name ?? id;

  const referenceVariables = variables.filter(
    (variable) => variable.trackerId !== tracker.id,
  );

  const channel: ExpressionChannel = !tracker.isVector
    ? "vector"
    : expressionChannel === "vector" ||
        expressionChannel === "x" ||
        expressionChannel === "y"
      ? expressionChannel
      : "vector";

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

  const addExpression = () => {
    const expression = trackerExpression.trim();

    if (!expression) return;

    try {
      TrackerUI.setTrackerExpression(
        scene,
        tracker.id,
        expression,
        channel === "vector" ? null : channel,
      );
      log(
        "success",
        `Set ${tracker.name}${channel === "vector" ? "" : `.${channel}`} = ${expression}`,
      );
      setTrackerExpression("");
    } catch (error) {
      log("error", formatErrorMessage(error));
    }

    refresh();
  };

  const insertVariable = (variable: TrackerExpressionVariableUIData) => {
    setTrackerExpression((current) =>
      current ? `${current} ${variable.name}` : variable.name,
    );
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
            <ArrowRightLeft className="size-3" /> Expressions
          </div>

          {tracker.expressions.length === 0 ? (
            <p className="text-[11px] text-muted-foreground">
              No incoming expressions.
            </p>
          ) : (
            tracker.expressions.map((rule) => (
              <div
                key={rule.id}
                className="flex items-center gap-1.5 rounded-md bg-muted/40 px-2 py-1 text-[11px]"
              >
                <span className="min-w-0 flex-1 truncate">
                  {trackerName(rule.target)}
                  {rule.targetComponent ? `.${rule.targetComponent}` : ""} ={" "}
                  <code className="text-[10px] text-muted-foreground">
                    {rule.expression}
                  </code>
                </span>
                <Button
                  variant="ghost"
                  size="icon-xs"
                  className="size-5 text-muted-foreground hover:text-destructive"
                  onClick={() => {
                    rule.remove();
                    refresh();
                  }}
                >
                  <X />
                </Button>
              </div>
            ))
          )}

          <div className="space-y-1.5 rounded-md border border-border/50 p-2">
            <div className="flex items-center gap-1.5">
              {tracker.isVector && (
                <Select
                  value={channel}
                  onValueChange={(value) => {
                    if (
                      value === "vector" ||
                      value === "x" ||
                      value === "y"
                    ) {
                      setExpressionChannel(value);
                    }
                  }}
                >
                  <SelectTrigger size="sm" className="h-7 w-24 rounded-md">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="vector">x, y</SelectItem>
                    <SelectItem value="x">x</SelectItem>
                    <SelectItem value="y">y</SelectItem>
                  </SelectContent>
                </Select>
              )}

              <Input
                value={trackerExpression}
                onChange={(event) =>
                  setTrackerExpression(event.target.value)
                }
                onKeyDown={(event) => {
                  if (event.key === "Enter") {
                    addExpression();
                  }
                }}
                placeholder="tr2 + tr3"
                aria-label={`${tracker.name} expression`}
                className="h-7 min-w-0 flex-1 rounded-md px-2 font-mono text-xs"
              />
            </div>

            <div className="flex flex-wrap gap-1">
              {referenceVariables.length === 0 ? (
                <span className="text-[10px] text-muted-foreground/80">
                  Create another tracker to reference it here.
                </span>
              ) : (
                referenceVariables.map((variable) => (
                  <button
                    key={variable.trackerId}
                    type="button"
                    onClick={() => insertVariable(variable)}
                    title={
                      variable.isVector
                        ? `${variable.name} is a vector; use ${variable.name}.x or ${variable.name}.y`
                        : variable.name
                    }
                    className="rounded bg-muted px-1.5 py-0.5 font-mono text-[10px] text-muted-foreground transition-colors hover:bg-muted/70 hover:text-foreground"
                  >
                    {variable.name}
                    {variable.isVector ? " (x, y)" : ""}
                  </button>
                ))
              )}
            </div>

            <Button
              variant="outline"
              size="xs"
              className="w-full"
              onClick={addExpression}
              disabled={!trackerExpression.trim()}
            >
              <ArrowRightLeft /> Set{" "}
              {tracker.name}
              {channel === "vector" ? "" : `.${channel}`} expression
            </Button>

            <p className="text-[10px] leading-relaxed text-muted-foreground/80">
              {tracker.isVector && channel === "vector"
                ? "Bare vector references are evaluated component-wise; use .x or .y to read one axis."
                : "Reference trackers by name, e.g. tr2 + tr3 or tr2.x * 2."}
            </p>
          </div>
        </div>

        <p className="text-[10px] leading-relaxed text-muted-foreground/80">
          Bind this tracker to a mobject property or animate it in the{" "}
          <span className="text-foreground">Tracker Links</span> panel.
        </p>
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
  const variables = TrackerUI.getExpressionVariables(scene);

  const createTracker = () => {
    const nextName = name.trim() || `tracker_${trackers.length + 1}`;

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
                  variables={variables}
                />
              ))}
            </div>
          )}
        </CollapsibleSection>
      </ScrollArea>
    </div>
  );
}
