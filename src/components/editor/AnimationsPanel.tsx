import { useState } from "react";
import { Clapperboard, Clock, Trash2 } from "lucide-react";

import { Easing } from "@/manim/utils/easing";
import { Values, ValueType } from "@/manim/utils/value";
import type { AnimationInput } from "@/manim/animation/animationProvider";
import type { Mobject } from "@/manim/mobject/mobect";
import {
  AnimationUI,
  type AnimCreationUiData,
} from "@/manim/UI/animationUI";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty";
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

interface AnimationCreatorProps {
  creator: AnimCreationUiData;
  mobject: Mobject;
}

function AnimationCreator({ creator, mobject }: AnimationCreatorProps) {
  const { log } = useEditor();
  const position = mobject.properties.position.get();
  const [duration, setDuration] = useState(1);
  const [easingKey, setEasingKey] = useState<EasingKey>("easeInOut");
  const [positionX, setPositionX] = useState(position.x);
  const [positionY, setPositionY] = useState(position.y);

  const needsPosition =
    creator.requiredParameters.position === ValueType.vector;

  const addAnimation = () => {
    try {
      const input: AnimationInput = {
        duration: Values.number(Math.max(0.1, duration)),
        easing: Easing[easingKey],
      };

      if (needsPosition) {
        input.position = Values.vector({ x: positionX, y: positionY });
      }

      creator.create(input);
    } catch (error) {
      log("error", formatErrorMessage(error));
    }
  };

  const Icon = creator.icon;

  return (
    <div className="space-y-2 rounded-lg border border-border/60 bg-muted/20 p-2.5">
      <div className="flex items-center gap-2">
        <span className="flex size-6 items-center justify-center rounded-md bg-background/70 text-muted-foreground">
          <Icon className="size-3.5" />
        </span>
        <span className="min-w-0 flex-1 truncate text-xs font-medium">
          {creator.name}
        </span>
        <Badge variant="outline" className="h-4 text-[9px]">
          animation
        </Badge>
      </div>

      <div className="grid grid-cols-2 gap-2">
        <label className="space-y-1">
          <span className="text-[10px] text-muted-foreground">Duration (s)</span>
          <NumberInput
            value={duration}
            min={0.1}
            step={0.1}
            onCommit={setDuration}
            ariaLabel={`${creator.name} duration`}
            className="w-full"
          />
        </label>

        <div className="space-y-1">
          <span className="text-[10px] text-muted-foreground">Easing</span>
          <Select
            value={easingKey}
            onValueChange={(value) => {
              if (typeof value === "string") {
                setEasingKey(value as EasingKey);
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
      </div>

      {needsPosition && (
        <div className="grid grid-cols-2 gap-2">
          <label className="space-y-1">
            <span className="text-[10px] text-muted-foreground">
              Target X
            </span>
            <NumberInput
              value={positionX}
              onCommit={setPositionX}
              ariaLabel="Target X position"
              className="w-full"
            />
          </label>
          <label className="space-y-1">
            <span className="text-[10px] text-muted-foreground">
              Target Y
            </span>
            <NumberInput
              value={positionY}
              onCommit={setPositionY}
              ariaLabel="Target Y position"
              className="w-full"
            />
          </label>
        </div>
      )}

      <Button
        size="xs"
        className="w-full"
        onClick={addAnimation}
        disabled={!needsPosition && Object.keys(creator.requiredParameters).length > 0}
      >
        Add to timeline
      </Button>
    </div>
  );
}

export function AnimationsPanel() {
  const { scene, refresh } = useEditor();
  const mobject = scene.selection.selectedMobject;

  if (!mobject) {
    return (
      <div className="flex h-full min-h-0 flex-col">
        <PanelHeader title="Animations" icon={<Clapperboard />} />
        <div className="flex min-h-0 flex-1 items-center justify-center p-4">
          <Empty>
            <EmptyHeader>
              <EmptyMedia variant="icon">
                <Clapperboard />
              </EmptyMedia>
              <EmptyTitle>Select a mobject</EmptyTitle>
              <EmptyDescription>
                Animations are built from the mobject selection. Pick a mobject
                in the scene tree to see the animations it supports.
              </EmptyDescription>
            </EmptyHeader>
          </Empty>
        </div>
      </div>
    );
  }

  const creators = AnimationUI.getAnimCreationUIData(scene, mobject);
  const animations = [...scene.animationSystem.all()].filter(
    (animation) => animation.target.id === mobject.id,
  );

  return (
    <div className="flex h-full min-h-0 flex-col">
      <PanelHeader title="Animations" icon={<Clapperboard />}>
        <Badge variant="secondary" className="h-5">
          {animations.length} on selection
        </Badge>
      </PanelHeader>

      <ScrollArea className="min-h-0 flex-1">
        <CollapsibleSection
          title={`Add to ${mobject.name}`}
          icon={<Clapperboard className="size-3" />}
          defaultOpen
        >
          {creators.length === 0 ? (
            <p className="text-xs text-muted-foreground">
              This mobject does not support any animations yet.
            </p>
          ) : (
            <div className="space-y-2">
              {creators.map((creator) => (
                <AnimationCreator
                  key={`${mobject.id}-${creator.name}`}
                  creator={creator}
                  mobject={mobject}
                />
              ))}
            </div>
          )}
        </CollapsibleSection>

        <CollapsibleSection
          title={`Timeline items · ${animations.length}`}
          icon={<Clock className="size-3" />}
          defaultOpen
        >
          {animations.length === 0 ? (
            <p className="text-xs text-muted-foreground">
              No animations target this mobject yet.
            </p>
          ) : (
            <div className="space-y-1">
              {animations.map((animation) => {
                const Icon =
                  creators.find((creator) => creator.name === animation.name)
                    ?.icon ?? Clapperboard;
                const start = scene.animationSystem.getStart(animation.id);

                return (
                  <div
                    key={animation.id}
                    className="flex items-center gap-2 rounded-md border border-border/60 px-2 py-1.5"
                  >
                    <Icon className="size-3.5 shrink-0 text-muted-foreground" />
                    <div className="min-w-0 flex-1">
                      <div className="truncate text-xs">{animation.name}</div>
                      <div className="text-[10px] text-muted-foreground">
                        {start.toFixed(2)}s →{" "}
                        {(start + animation.duration).toFixed(2)}s
                      </div>
                    </div>
                    <Button
                      variant="ghost"
                      size="icon-xs"
                      className="text-muted-foreground hover:text-destructive"
                      onClick={() => {
                        scene.animationSystem.remove(animation.id);
                        refresh();
                      }}
                    >
                      <Trash2 />
                    </Button>
                  </div>
                );
              })}
            </div>
          )}

          <p className="text-[10px] leading-relaxed text-muted-foreground/80">
            New animations are appended to the end of the timeline. Drag their
            bars in the Timeline panel to change the start time.
          </p>
        </CollapsibleSection>
      </ScrollArea>
    </div>
  );
}
