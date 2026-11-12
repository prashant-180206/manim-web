import {
  Compass,
  Grid as GridIcon,
  Palette,
  RotateCcw,
  Sparkles,
  Sun,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Switch } from "@/components/ui/switch";
import { CollapsibleSection } from "../editor/CollapsibleSection";
import { PanelHeader } from "../editor/editorPrimitives";
import { SliderField } from "./SliderField";
import { useEditor3D } from "./editor3dContext";

export function Environment3DPanel() {
  const { scene, refresh } = useEditor3D();
  const props = scene.properties.get();

  const updateProp = <K extends keyof typeof props>(
    key: K,
    value: (typeof props)[K],
  ) => {
    scene.properties.set(key, value);
    scene.applySceneProperties();
    refresh();
  };

  const updateKeyLightPos = (axis: "x" | "y" | "z", value: number) => {
    scene.properties.set("keyLightPosition", {
      ...props.keyLightPosition,
      [axis]: value,
    });
    scene.applySceneProperties();
    refresh();
  };

  const updateFillLightPos = (axis: "x" | "y" | "z", value: number) => {
    scene.properties.set("fillLightPosition", {
      ...props.fillLightPosition,
      [axis]: value,
    });
    scene.applySceneProperties();
    refresh();
  };

  const resetAll = () => {
    scene.properties.reset();
    scene.applySceneProperties();
    refresh();
  };

  return (
    <div className="flex h-full min-h-0 flex-col">
      <PanelHeader title="Environment & Scene" icon={<Sun />}>
        <Badge variant="outline" className="h-5 text-[10px]">
          3D Rig
        </Badge>
      </PanelHeader>

      <ScrollArea className="min-h-0 flex-1">
        <CollapsibleSection
          title="Background"
          icon={<Palette className="size-3" />}
          defaultOpen
        >
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-medium text-foreground/80">
                Transparent Canvas
              </span>
              <Switch
                checked={props.backgroundTransparent}
                onCheckedChange={(checked) =>
                  updateProp("backgroundTransparent", checked)
                }
              />
            </div>

            {!props.backgroundTransparent && (
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-medium text-foreground/80">
                  Background Color
                </span>
                <input
                  type="color"
                  value={props.backgroundColor}
                  onChange={(e) => updateProp("backgroundColor", e.target.value)}
                  className="h-6 w-10 cursor-pointer rounded border border-border bg-transparent p-0"
                />
              </div>
            )}
          </div>
        </CollapsibleSection>

        <CollapsibleSection
          title="Ground Grid & Helpers"
          icon={<GridIcon className="size-3" />}
          defaultOpen
        >
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-medium text-foreground/80">
                Show Ground Grid
              </span>
              <Switch
                checked={props.gridVisible}
                onCheckedChange={(checked) => updateProp("gridVisible", checked)}
              />
            </div>

            {props.gridVisible && (
              <>
                <SliderField
                  label="Grid Extent"
                  hint="units"
                  value={props.gridSize}
                  min={5}
                  max={60}
                  step={1}
                  onChange={(val) => updateProp("gridSize", val)}
                />
                <SliderField
                  label="Grid Divisions"
                  hint="segments"
                  value={props.gridDivisions}
                  min={4}
                  max={60}
                  step={2}
                  onChange={(val) => updateProp("gridDivisions", val)}
                />
              </>
            )}

            <div className="flex items-center justify-between pt-1">
              <span className="text-[11px] font-medium text-foreground/80">
                Show Coordinate Axes
              </span>
              <Switch
                checked={props.axesVisible}
                onCheckedChange={(checked) => updateProp("axesVisible", checked)}
              />
            </div>

            {props.axesVisible && (
              <SliderField
                label="Axes Length"
                hint="units"
                value={props.axesSize}
                min={1}
                max={20}
                step={0.5}
                onChange={(val) => updateProp("axesSize", val)}
              />
            )}
          </div>
        </CollapsibleSection>

        <CollapsibleSection
          title="Ambient Light"
          icon={<Sparkles className="size-3" />}
          defaultOpen
        >
          <div className="space-y-3">
            <SliderField
              label="Intensity"
              hint="lux"
              value={props.ambientIntensity}
              min={0}
              max={4}
              step={0.05}
              onChange={(val) => updateProp("ambientIntensity", val)}
            />

            <div className="flex items-center justify-between">
              <span className="text-[11px] font-medium text-foreground/80">
                Sky Tint
              </span>
              <input
                type="color"
                value={props.ambientSkyColor}
                onChange={(e) => updateProp("ambientSkyColor", e.target.value)}
                className="h-6 w-10 cursor-pointer rounded border border-border bg-transparent p-0"
              />
            </div>

            <div className="flex items-center justify-between">
              <span className="text-[11px] font-medium text-foreground/80">
                Ground Bounce Tint
              </span>
              <input
                type="color"
                value={props.ambientGroundColor}
                onChange={(e) => updateProp("ambientGroundColor", e.target.value)}
                className="h-6 w-10 cursor-pointer rounded border border-border bg-transparent p-0"
              />
            </div>
          </div>
        </CollapsibleSection>

        <CollapsibleSection
          title="Key Directional Light"
          icon={<Sun className="size-3" />}
          defaultOpen
        >
          <div className="space-y-3">
            <SliderField
              label="Key Intensity"
              hint="lux"
              value={props.keyLightIntensity}
              min={0}
              max={6}
              step={0.1}
              onChange={(val) => updateProp("keyLightIntensity", val)}
            />

            <div className="flex items-center justify-between">
              <span className="text-[11px] font-medium text-foreground/80">
                Light Color
              </span>
              <input
                type="color"
                value={props.keyLightColor}
                onChange={(e) => updateProp("keyLightColor", e.target.value)}
                className="h-6 w-10 cursor-pointer rounded border border-border bg-transparent p-0"
              />
            </div>

            <p className="text-[10px] text-muted-foreground pt-1">
              Key Light Position (X, Y, Z)
            </p>
            <SliderField
              label="X Position"
              hint="units"
              value={props.keyLightPosition.x}
              min={-20}
              max={20}
              step={0.5}
              onChange={(val) => updateKeyLightPos("x", val)}
            />
            <SliderField
              label="Y Height"
              hint="units"
              value={props.keyLightPosition.y}
              min={0}
              max={25}
              step={0.5}
              onChange={(val) => updateKeyLightPos("y", val)}
            />
            <SliderField
              label="Z Depth"
              hint="units"
              value={props.keyLightPosition.z}
              min={-20}
              max={20}
              step={0.5}
              onChange={(val) => updateKeyLightPos("z", val)}
            />
          </div>
        </CollapsibleSection>

        <CollapsibleSection
          title="Fill Directional Light"
          icon={<Compass className="size-3" />}
        >
          <div className="space-y-3">
            <SliderField
              label="Fill Intensity"
              hint="lux"
              value={props.fillLightIntensity}
              min={0}
              max={4}
              step={0.1}
              onChange={(val) => updateProp("fillLightIntensity", val)}
            />

            <div className="flex items-center justify-between">
              <span className="text-[11px] font-medium text-foreground/80">
                Light Color
              </span>
              <input
                type="color"
                value={props.fillLightColor}
                onChange={(e) => updateProp("fillLightColor", e.target.value)}
                className="h-6 w-10 cursor-pointer rounded border border-border bg-transparent p-0"
              />
            </div>

            <SliderField
              label="X Position"
              hint="units"
              value={props.fillLightPosition.x}
              min={-20}
              max={20}
              step={0.5}
              onChange={(val) => updateFillLightPos("x", val)}
            />
            <SliderField
              label="Y Height"
              hint="units"
              value={props.fillLightPosition.y}
              min={0}
              max={25}
              step={0.5}
              onChange={(val) => updateFillLightPos("y", val)}
            />
            <SliderField
              label="Z Depth"
              hint="units"
              value={props.fillLightPosition.z}
              min={-20}
              max={20}
              step={0.5}
              onChange={(val) => updateFillLightPos("z", val)}
            />
          </div>
        </CollapsibleSection>

        <div className="p-3">
          <Button
            variant="outline"
            size="xs"
            className="w-full text-muted-foreground hover:text-foreground"
            onClick={resetAll}
          >
            <RotateCcw className="size-3" /> Reset Environment & Lights
          </Button>
        </div>
      </ScrollArea>
    </div>
  );
}
