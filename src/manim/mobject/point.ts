import { PropertyController } from "./helpers/propertycontroller";
import { ShapeProperty } from "./helpers/proprertytypes";
import { Value, Values } from "../utils/value";
import { Mobject } from "./mobect";
import { PIXELS_PER_UNIT } from "../utils/units";
import type { Vector } from "../utils/types";

interface PointProperty extends ShapeProperty {
  radius: Value<number>;
  showLabel: Value<boolean>;
  labelAsPosition: Value<boolean>;
  labelOffset: Value<Vector>;
  labelColor: Value<string>;
  fontSize: Value<number>;
}

/** Click tolerance around a point, in CSS pixels. */
const HIT_TOLERANCE_PIXELS = 8;

function formatCoordinate(value: number): string {
  if (!Number.isFinite(value)) return "0";

  const rounded = Math.round(value * 100) / 100;

  return Object.is(rounded, -0) ? "0" : String(rounded);
}

/**
 * A single point in the scene, drawn as a filled dot.
 *
 * The radius is a geometry property in world units. Labels can show either the
 * mobject's name or its position vector; `labelOffset`, `labelColor` and
 * `fontSize` control placement and styling. `fontSize` stays a screen style in
 * CSS pixels.
 */
export class Point extends Mobject {
  constructor(id: string, name: string) {
    super(id, name);
    this.propertyController = new PropertyController<PointProperty>({
      ...this.propertyController.properties,
      radius: Values.number(0.1),
      showLabel: Values.boolean(true),
      labelAsPosition: Values.boolean(false),
      labelOffset: Values.vector({ x: 0.15, y: 0.15 }),
      labelColor: Values.color("#e4e4e7"),
      fontSize: Values.number(14),
      strokeColor: Values.color("#000000"),
      strokeWidth: Values.number(1),
      color: Values.color("#ff0000"),
    }) as any;
  }

  override render(ctx: CanvasRenderingContext2D): void {
    const p = this.propertyController.properties as PointProperty;
    const radius = Math.max(0, p.radius.get());

    this.beginRender(ctx);

    if (radius > 0) {
      ctx.beginPath();
      ctx.arc(0, 0, radius, 0, Math.PI * 2);

      ctx.fillStyle = p.color.get();
      ctx.fill();

      if (p.strokeWidth.get() > 0) {
        ctx.strokeStyle = p.strokeColor.get();
        this.applyStrokeWidth(ctx, p.strokeWidth.get());
        ctx.stroke();
      }
    }

    if (p.showLabel.get()) {
      this.renderLabel(ctx, p);
    }

    this.endRender(ctx);
  }

  contains(x: number, y: number): boolean {
    const p = this.propertyController.properties as PointProperty;
    const point = this.worldToLocal(x, y);
    const radius = Math.max(0, p.radius.get());

    return Math.hypot(point.x, point.y) <= Math.max(radius, this.hitTolerance());
  }

  private renderLabel(
    ctx: CanvasRenderingContext2D,
    p: PointProperty,
  ): void {
    const fontSize = p.fontSize.get();

    if (!Number.isFinite(fontSize) || fontSize <= 0) return;

    const position = p.position.get();
    const text = p.labelAsPosition.get()
      ? `(${formatCoordinate(position.x)}, ${formatCoordinate(position.y)})`
      : this.name;
    const offset = p.labelOffset.get();
    const scale = this.scale;
    const scaleX = Math.abs(scale.x) > 1e-6 ? scale.x : 1;
    const scaleY = Math.abs(scale.y) > 1e-6 ? scale.y : 1;

    ctx.save();
    ctx.translate(offset.x, offset.y);
    ctx.scale(
      1 / (PIXELS_PER_UNIT * scaleX),
      -1 / (PIXELS_PER_UNIT * scaleY),
    );
    ctx.font = `${fontSize}px sans-serif`;
    ctx.fillStyle = p.labelColor.get();
    ctx.textAlign = "left";
    ctx.textBaseline = "middle";
    ctx.fillText(text, 0, 0);
    ctx.restore();
  }

  /** Local-space click tolerance for a dot with a tiny or zero radius. */
  private hitTolerance(): number {
    const scale = this.scale;
    const objectScale = Math.sqrt(Math.abs(scale.x * scale.y)) || 1;

    return HIT_TOLERANCE_PIXELS / PIXELS_PER_UNIT / objectScale;
  }
}
