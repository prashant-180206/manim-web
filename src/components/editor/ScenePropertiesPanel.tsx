import {
  Frame,
  Monitor,
  Palette,
  RotateCcw,
  SlidersHorizontal,
} from "lucide-react";

import {
  ASPECT_RATIO_PRESETS,
  DEFAULT_SCENE_ASPECT_RATIO,
  DEFAULT_SCENE_BACKGROUND_COLOR,
  DEFAULT_SCENE_BACKGROUND_OPACITY,
  aspectRatioComponents,
  aspectRatioFromSize,
  formatAspectRatio,
} from "@/manim/sceneProperties";
import { PIXELS_PER_UNIT } from "@/manim/utils/units";
import { ValueEditor } from "@/components/valueEditors";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
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
import { useEditor } from "./editorContext";

/** Row label + value type badge shared by the scene property fields. */
function FieldLabel({ label, type }: { label: string; type?: string }) {
  return (
    <div className="flex items-center justify-between gap-2">
      <span className="text-[11px] font-medium text-foreground/80">
        {label}
      </span>
      {type && (
        <Badge variant="outline" className="h-4 px-1.5 text-[9px]">
          {type}
        </Badge>
      )}
    </div>
  );
}

export function ScenePropertiesPanel() {
  const { scene, refresh, log } = useEditor();
  const properties = scene.properties;

  const ratioValue = properties.aspectRatio.get();
  const ratioParts = aspectRatioComponents(ratioValue);
  const frame = scene.frameRect;
  const worldWidth = frame.width / PIXELS_PER_UNIT;
  const worldHeight = frame.height / PIXELS_PER_UNIT;

  const setAspectRatio = (value: string) => {
    properties.aspectRatio.set(value);
    refresh();
  };

  const setRatioSize = (width: number, height: number) => {
    setAspectRatio(aspectRatioFromSize(width, height));
  };

  const resetBackground = () => {
    properties.backgroundColor.set(DEFAULT_SCENE_BACKGROUND_COLOR);
    properties.backgroundOpacity.set(DEFAULT_SCENE_BACKGROUND_OPACITY);
    refresh();
    log("info", "Reset the scene background");
  };

  const resetFrame = () => {
    properties.aspectRatio.set(DEFAULT_SCENE_ASPECT_RATIO);
    refresh();
    log("info", "Reset the scene aspect ratio");
  };

  const setOpacity = (value: number) => {
    properties.backgroundOpacity.set(Math.max(0, Math.min(1, value)));
    refresh();
  };

  return (
    <div className="flex h-full min-h-0 flex-col">
      <PanelHeader title="Scene properties" icon={<Frame />}>
        <Badge variant="secondary" className="h-5">
          scene
        </Badge>
      </PanelHeader>

      <ScrollArea className="min-h-0 flex-1">
        <CollapsibleSection
          title="Background"
          icon={<Palette className="size-3" />}
          defaultOpen
        >
          <div className="space-y-3">
            <div className="space-y-1.5">
              <FieldLabel label="Color" type={properties.backgroundColor.type()} />
              <ValueEditor
                value={properties.backgroundColor}
                onChange={refresh}
              />
            </div>

            <div className="space-y-1.5">
              <FieldLabel
                label="Opacity"
                type={properties.backgroundOpacity.type()}
              />
              <div className="flex items-center gap-2">
                <NumberInput
                  value={properties.backgroundOpacity.get()}
                  min={0}
                  max={1}
                  step={0.05}
                  onCommit={setOpacity}
                  ariaLabel="Scene background opacity"
                  className="w-20"
                />
                <span className="text-[10px] text-muted-foreground">
                  0 = transparent
                </span>
              </div>
            </div>

            <Button
              variant="outline"
              size="xs"
              className="w-full"
              onClick={resetBackground}
            >
              <RotateCcw /> Reset background
            </Button>

            <p className="text-[10px] leading-relaxed text-muted-foreground">
              The backdrop is drawn behind every mobject. Lower the opacity to
              let the editor canvas grid show through.
            </p>
          </div>
        </CollapsibleSection>

        <CollapsibleSection
          title="Frame"
          icon={<Monitor className="size-3" />}
          defaultOpen
        >
          <div className="space-y-3">
            <div className="space-y-1.5">
              <FieldLabel label="Aspect ratio" type="preset" />
              <Select
                value={ratioValue}
                onValueChange={(value) => {
                  if (typeof value === "string") setAspectRatio(value);
                }}
              >
                <SelectTrigger size="sm" className="h-7 w-full rounded-md">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {ASPECT_RATIO_PRESETS.map((preset) => (
                    <SelectItem key={preset.value} value={preset.value}>
                      {preset.label}
                    </SelectItem>
                  ))}
                  {!ASPECT_RATIO_PRESETS.some(
                    (preset) => preset.value === ratioValue,
                  ) && (
                    <SelectItem value={ratioValue}>
                      {formatAspectRatio(ratioValue)} · custom
                    </SelectItem>
                  )}
                </SelectContent>
              </Select>
            </div>

            {ratioParts ? (
              <div className="space-y-1.5">
                <FieldLabel label="Custom ratio" />
                <div className="flex items-center gap-2">
                  <NumberInput
                    value={ratioParts.width}
                    min={1}
                    step={1}
                    onCommit={(width) =>
                      setRatioSize(width, ratioParts.height)
                    }
                    ariaLabel="Aspect ratio width"
                    className="w-full"
                  />
                  <span className="text-xs text-muted-foreground">:</span>
                  <NumberInput
                    value={ratioParts.height}
                    min={1}
                    step={1}
                    onCommit={(height) =>
                      setRatioSize(ratioParts.width, height)
                    }
                    ariaLabel="Aspect ratio height"
                    className="w-full"
                  />
                </div>
                <p className="text-[10px] text-muted-foreground">
                  Edit either side to turn the preset into a custom ratio.
                </p>
              </div>
            ) : (
              <p className="rounded-md border border-border/50 px-2 py-1.5 text-[10px] leading-relaxed text-muted-foreground">
                Free mode fills the whole canvas. Pick a preset to letterbox
                the scene to a fixed aspect ratio.
              </p>
            )}

            <Button
              variant="outline"
              size="xs"
              className="w-full"
              onClick={resetFrame}
            >
              <RotateCcw /> Fill viewport
            </Button>
          </div>
        </CollapsibleSection>

        <CollapsibleSection
          title="Measurements"
          icon={<SlidersHorizontal className="size-3" />}
          defaultOpen
        >
          <div className="space-y-1.5 text-[11px]">
            <div className="flex items-center justify-between gap-2">
              <span className="text-muted-foreground">Canvas</span>
              <span className="font-mono tabular-nums">
                {scene.width} × {scene.height} px
              </span>
            </div>
            <div className="flex items-center justify-between gap-2">
              <span className="text-muted-foreground">Frame</span>
              <span className="font-mono tabular-nums">
                {Math.round(frame.width)} × {Math.round(frame.height)} px
              </span>
            </div>
            <div className="flex items-center justify-between gap-2">
              <span className="text-muted-foreground">Visible world</span>
              <span className="font-mono tabular-nums">
                {worldWidth.toFixed(2)} × {worldHeight.toFixed(2)} u
              </span>
            </div>
            <div className="flex items-center justify-between gap-2">
              <span className="text-muted-foreground">Ratio</span>
              <span className="font-mono tabular-nums">
                {formatAspectRatio(ratioValue)}
              </span>
            </div>
            <div className="flex items-center justify-between gap-2">
              <span className="text-muted-foreground">Scale</span>
              <span className="font-mono tabular-nums">
                {PIXELS_PER_UNIT} px / unit
              </span>
            </div>
          </div>
        </CollapsibleSection>
      </ScrollArea>
    </div>
  );
}
