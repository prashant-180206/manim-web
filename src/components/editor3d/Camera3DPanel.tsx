import { Camera as CameraIcon, Crosshair, Ruler } from "lucide-react";

import { PIXELS_PER_UNIT } from "@/manim/utils/units";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { CollapsibleSection } from "../editor/CollapsibleSection";
import { PanelHeader } from "../editor/editorPrimitives";
import { SliderField } from "./SliderField";
import { useEditor3D } from "./editor3dContext";

const DEFAULT_FOV = 45;

export function Camera3DPanel() {
  const { scene, refresh } = useEditor3D();
  const camera = scene.camera;

  const commitFov = (fov: number) => {
    camera.camera.fov = Math.min(170, Math.max(1, fov));
    camera.frame();
    refresh();
  };

  const commitTarget = (axis: "x" | "y" | "z", value: number) => {
    camera.setTarget({
      x: axis === "x" ? value : camera.target.x,
      y: axis === "y" ? value : camera.target.y,
      z: axis === "z" ? value : camera.target.z,
    });
    refresh();
  };

  return (
    <div className="flex h-full min-h-0 flex-col">
      <PanelHeader title="Camera" icon={<CameraIcon />}>
        <Badge variant="outline" className="h-5 font-mono">
          {camera.camera.fov.toFixed(0)}°
        </Badge>
      </PanelHeader>

      <ScrollArea className="min-h-0 flex-1">
        <CollapsibleSection
          title="Projection"
          icon={<CameraIcon className="size-3" />}
          defaultOpen
        >
          <div className="space-y-3">
            <p className="text-[10px] leading-relaxed text-muted-foreground">
              Perspective camera on +z looking at the focus plane. One world
              unit spans {PIXELS_PER_UNIT} CSS pixels at the target plane.
            </p>

            <SliderField
              label="Vertical Field of View"
              hint="deg"
              value={camera.camera.fov}
              min={10}
              max={150}
              step={1}
              onChange={commitFov}
            />

            <div className="flex flex-wrap items-center gap-1.5 text-[10px] text-muted-foreground pt-1">
              <Badge variant="outline" className="font-mono">
                <Ruler /> {camera.distance.toFixed(2)} units away
              </Badge>
              <Badge variant="outline" className="font-mono">
                {camera.width} × {camera.height} px
              </Badge>
            </div>
          </div>
        </CollapsibleSection>

        <CollapsibleSection
          title="Focus target"
          icon={<Crosshair className="size-3" />}
          defaultOpen
        >
          <div className="space-y-3">
            <p className="text-[10px] leading-relaxed text-muted-foreground">
              World-space point at the centre of the viewport, in world units.
            </p>

            {(["x", "y", "z"] as const).map((axis) => (
              <SliderField
                key={axis}
                label={`Target ${axis.toUpperCase()}`}
                hint="units"
                value={camera.target[axis]}
                min={-15}
                max={15}
                step={0.25}
                onChange={(val) => commitTarget(axis, val)}
              />
            ))}

            <Button
              variant="outline"
              size="xs"
              className="w-full mt-2"
              onClick={() => {
                camera.camera.fov = DEFAULT_FOV;
                camera.setTarget({ x: 0, y: 0, z: 0 });
                refresh();
              }}
            >
              <Crosshair /> Reset camera
            </Button>
          </div>
        </CollapsibleSection>
      </ScrollArea>
    </div>
  );
}
