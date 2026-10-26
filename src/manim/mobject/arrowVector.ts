import { PropertyController } from "./helpers/propertycontroller";
import { Value, Values } from "../utils/value";
import { Line, type LineProperty } from "./line";
import type { Vector } from "../utils/types";

interface ArrowVectorProperty extends LineProperty {
  headLength: Value<number>;
  headWidth: Value<number>;
}

interface ArrowGeometry {
  start: Vector;
  end: Vector;
  base: Vector;
  left: Vector;
  right: Vector;
  headLength: number;
  headWidth: number;
  length: number;
}

/**
 * A directed line with a filled triangular head.
 *
 * `start`, `end`, `headLength` and `headWidth` are geometry properties in world
 * units. The head length is clamped to the arrow length so short arrows still
 * render a valid triangle.
 */
export class ArrowVector extends Line {
  constructor(id: string, name: string) {
    super(id, name);
    this.propertyController = new PropertyController<ArrowVectorProperty>({
      ...this.propertyController.properties,
      start: Values.vector({ x: 0, y: 0 }),
      end: Values.vector({ x: 2, y: 1 }),
      headLength: Values.number(0.3),
      headWidth: Values.number(0.24),
      strokeWidth: Values.number(2),
    } as any) as any;
  }

  override render(ctx: CanvasRenderingContext2D): void {
    const p = this.propertyController.properties as ArrowVectorProperty;
    const geometry = this.arrowGeometry(p);

    if (!geometry) return;

    this.beginRender(ctx);

    if (p.strokeWidth.get() > 0 && geometry.headLength < geometry.length) {
      this.drawSegment(ctx, geometry.start, geometry.base, p);
    }

    if (geometry.headLength > 0 && geometry.headWidth > 0) {
      ctx.beginPath();
      ctx.moveTo(geometry.end.x, geometry.end.y);
      ctx.lineTo(geometry.left.x, geometry.left.y);
      ctx.lineTo(geometry.right.x, geometry.right.y);
      ctx.closePath();
      ctx.fillStyle = p.color.get();
      ctx.fill();
    }

    this.endRender(ctx);
  }

  contains(x: number, y: number): boolean {
    const p = this.propertyController.properties as ArrowVectorProperty;
    const point = this.worldToLocal(x, y);
    const geometry = this.arrowGeometry(p);
    const tolerance = this.hitTolerance();

    if (!geometry) {
      const start = p.start.get();
      return Math.hypot(point.x - start.x, point.y - start.y) <= tolerance;
    }

    const shaftEnd =
      geometry.headLength > 0 ? geometry.base : geometry.end;

    if (
      p.strokeWidth.get() > 0 &&
      this.distanceToSegment(point, geometry.start, shaftEnd) <= tolerance
    ) {
      return true;
    }

    if (geometry.headLength > 0 && geometry.headWidth > 0) {
      return (
        this.pointInTriangle(
          point,
          geometry.end,
          geometry.left,
          geometry.right,
        ) ||
        this.distanceToSegment(point, geometry.end, geometry.left) <=
          tolerance ||
        this.distanceToSegment(point, geometry.end, geometry.right) <=
          tolerance ||
        this.distanceToSegment(point, geometry.left, geometry.right) <=
          tolerance
      );
    }

    return false;
  }

  private arrowGeometry(
    p: ArrowVectorProperty,
  ): ArrowGeometry | null {
    const start = p.start.get();
    const end = p.end.get();
    const dx = end.x - start.x;
    const dy = end.y - start.y;
    const length = Math.hypot(dx, dy);

    if (!Number.isFinite(length) || length <= 1e-9) return null;

    const dirX = dx / length;
    const dirY = dy / length;
    const requestedHeadLength = Math.abs(p.headLength.get());
    const requestedHeadWidth = Math.abs(p.headWidth.get());
    const headLength = Number.isFinite(requestedHeadLength)
      ? Math.min(requestedHeadLength, length)
      : 0;
    const headWidth = Number.isFinite(requestedHeadWidth)
      ? requestedHeadWidth
      : 0;
    const halfWidth = headWidth / 2;
    const base = {
      x: end.x - dirX * headLength,
      y: end.y - dirY * headLength,
    };
    const perpendicular = { x: -dirY, y: dirX };

    return {
      start,
      end,
      base,
      left: {
        x: base.x + perpendicular.x * halfWidth,
        y: base.y + perpendicular.y * halfWidth,
      },
      right: {
        x: base.x - perpendicular.x * halfWidth,
        y: base.y - perpendicular.y * halfWidth,
      },
      headLength,
      headWidth,
      length,
    };
  }

  private pointInTriangle(
    point: Vector,
    a: Vector,
    b: Vector,
    c: Vector,
  ): boolean {
    const d1 = this.crossSign(point, a, b);
    const d2 = this.crossSign(point, b, c);
    const d3 = this.crossSign(point, c, a);
    const hasNegative = d1 < 0 || d2 < 0 || d3 < 0;
    const hasPositive = d1 > 0 || d2 > 0 || d3 > 0;

    return !(hasNegative && hasPositive);
  }

  private crossSign(point: Vector, a: Vector, b: Vector): number {
    return (
      (point.x - b.x) * (a.y - b.y) -
      (a.x - b.x) * (point.y - b.y)
    );
  }
}
