import { PropertyController } from "./helpers/propertycontroller";
import { BaseProperty } from "./helpers/proprertytypes";
import { Value, Values } from "../utils/value";
import { Mobject } from "./mobect";
import { PIXELS_PER_UNIT } from "../utils/units";
import type { Vector } from "../utils/types";

export interface LineProperty extends BaseProperty {
  start: Value<Vector>;
  end: Value<Vector>;
  color: Value<string>;
  strokeWidth: Value<number>;
}

/** Click tolerance around a line, in CSS pixels. */
const HIT_TOLERANCE_PIXELS = 8;

/**
 * A straight line between two local-space points.
 *
 * `start` and `end` are geometry properties in world units: moving the
 * endpoints changes the line itself, while `position` moves it as a whole.
 * `strokeWidth` is a screen style, so it is converted with
 * `applyStrokeWidth`.
 */
export class Line extends Mobject {
  constructor(id: string, name: string) {
    super(id, name);
    this.propertyController = new PropertyController<LineProperty>({
      ...this.propertyController.properties,
      start: Values.vector({ x: -2, y: -1 }),
      end: Values.vector({ x: 2, y: 1 }),
      color: Values.color("#e4e4e7"),
      strokeWidth: Values.number(2),
    }) as any;
  }

  override render(ctx: CanvasRenderingContext2D): void {
    const p = this.propertyController.properties as LineProperty;

    if (p.strokeWidth.get() <= 0) return;

    this.beginRender(ctx);
    this.drawSegment(ctx, p.start.get(), p.end.get(), p);
    this.endRender(ctx);
  }

  contains(x: number, y: number): boolean {
    const p = this.propertyController.properties as LineProperty;

    if (p.strokeWidth.get() <= 0) return false;

    const point = this.worldToLocal(x, y);

    return (
      this.distanceToSegment(point, p.start.get(), p.end.get()) <=
      this.hitTolerance()
    );
  }

  protected drawSegment(
    ctx: CanvasRenderingContext2D,
    start: Vector,
    end: Vector,
    p: LineProperty,
  ): void {
    ctx.beginPath();
    ctx.moveTo(start.x, start.y);
    ctx.lineTo(end.x, end.y);
    ctx.strokeStyle = p.color.get();
    this.applyStrokeWidth(ctx, p.strokeWidth.get());
    ctx.stroke();
  }

  /** Local-space click tolerance for the current object scale. */
  protected hitTolerance(): number {
    const scale = this.scale;
    const objectScale = Math.sqrt(Math.abs(scale.x * scale.y)) || 1;

    return HIT_TOLERANCE_PIXELS / PIXELS_PER_UNIT / objectScale;
  }

  protected distanceToSegment(
    point: Vector,
    start: Vector,
    end: Vector,
  ): number {
    const dx = end.x - start.x;
    const dy = end.y - start.y;
    const lengthSquared = dx * dx + dy * dy;

    if (lengthSquared <= 1e-12) {
      return Math.hypot(point.x - start.x, point.y - start.y);
    }

    const t = Math.max(
      0,
      Math.min(
        1,
        ((point.x - start.x) * dx + (point.y - start.y) * dy) /
          lengthSquared,
      ),
    );
    const nearestX = start.x + t * dx;
    const nearestY = start.y + t * dy;

    return Math.hypot(point.x - nearestX, point.y - nearestY);
  }
}
