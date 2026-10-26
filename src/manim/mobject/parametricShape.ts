import { Parser } from "expr-eval";
import { PropertyController } from "./helpers/propertycontroller";
import { ShapeProperty } from "./helpers/proprertytypes";
import { Value, Values } from "../utils/value";
import { Range, Vector } from "../utils/types";
import { Mobject } from "./mobect";

interface ParametricShapeProperty extends ShapeProperty {
  xMinExpression: Value<string>;
  xMaxExpression: Value<string>;
  yMinExpression: Value<string>;
  yMaxExpression: Value<string>;
  xRange: Value<Range>;
  yRange: Value<Range>;
  samples: Value<number>;
}

export class ParametricShape extends Mobject {
  private parser = new Parser();
  constructor(id: string, name: string) {
    super(id, name);
    this.propertyController = new PropertyController<ParametricShapeProperty>({
      ...this.propertyController.properties,
      // Each boundary is a function of the axis it is parameterised by:
      // left/right use `y`, top/bottom use `x`. The four defaults describe a
      // unit circle that stays continuous at every corner.
      xMinExpression: Values.string("-sqrt(1-y^2)"),
      xMaxExpression: Values.string("sqrt(1-y^2)"),
      yMinExpression: Values.string("-sqrt(1-x^2)"),
      yMaxExpression: Values.string("sqrt(1-x^2)"),
      xRange: Values.range({ min: -1, max: 1 }),
      yRange: Values.range({ min: -1, max: 1 }),
      samples: Values.number(200),
      strokeColor: Values.color("#000000"),
      strokeWidth: Values.number(1),
      color: Values.color("#add8e6"),
    }) as any;
  }

  override render(ctx: CanvasRenderingContext2D): void {
    const p = this.propertyController.properties as ParametricShapeProperty;
    const points = this.evaluatePoints(p);

    this.beginRender(ctx);

    if (points.length === 0) {
      this.endRender(ctx);
      return;
    }

    ctx.beginPath();
    ctx.moveTo(points[0].x, points[0].y);

    for (let i = 1; i < points.length; i += 1) {
      ctx.lineTo(points[i].x, points[i].y);
    }

    ctx.closePath();

    ctx.fillStyle = p.color.get();
    ctx.fill();

    if (p.strokeWidth.get() > 0) {
      ctx.strokeStyle = p.strokeColor.get();
      this.applyStrokeWidth(ctx, p.strokeWidth.get());
      ctx.stroke();
    }

    this.endRender(ctx);
  }

  contains(x: number, y: number): boolean {
    const p = this.propertyController.properties as ParametricShapeProperty;
    const points = this.evaluatePoints(p);

    if (points.length < 3) return false;

    const point = this.worldToLocal(x, y);
    let inside = false;

    for (let i = 0, j = points.length - 1; i < points.length; j = i++) {
      const xi = points[i].x;
      const yi = points[i].y;
      const xj = points[j].x;
      const yj = points[j].y;

      const intersects =
        yi > point.y !== yj > point.y &&
        point.x < ((xj - xi) * (point.y - yi)) / (yj - yi) + xi;

      if (intersects) {
        inside = !inside;
      }
    }

    return inside;
  }

  /**
   * Evaluate one boundary expression. Invalid expressions and non-finite
   * results are treated as missing samples instead of throwing, so a typo in
   * the Inspector cannot stop the render loop.
   */
  private evaluate(
    expression: ReturnType<Parser["parse"]>,
    scope: Record<string, number>,
  ): number | null {
    try {
      const value = expression.evaluate(scope);

      return Number.isFinite(value) ? value : null;
    } catch {
      return null;
    }
  }

  private evaluatePoints(p: ParametricShapeProperty): Vector[] {
    let expressions;

    try {
      expressions = {
        xMin: this.parser.parse(p.xMinExpression.get()),
        xMax: this.parser.parse(p.xMaxExpression.get()),
        yMin: this.parser.parse(p.yMinExpression.get()),
        yMax: this.parser.parse(p.yMaxExpression.get()),
      };
    } catch {
      return [];
    }

    const samples = Math.max(2, Math.round(p.samples.get()));

    const xRange = p.xRange.get();
    const yRange = p.yRange.get();

    const xMin = Math.min(xRange.min, xRange.max);
    const xMax = Math.max(xRange.min, xRange.max);

    const yMin = Math.min(yRange.min, yRange.max);
    const yMax = Math.max(yRange.min, yRange.max);

    // The four boundaries meet at four corner points. Sampling each boundary
    // across the full range would insert artificial diagonals whenever the
    // range end and the neighbouring expression disagree (for example the top
    // of a circle is at x = 0, not at x = xRange.min).
    const bottomLeftX = this.evaluate(expressions.xMin, { y: yMin });
    const topLeftX = this.evaluate(expressions.xMin, { y: yMax });
    const topRightX = this.evaluate(expressions.xMax, { y: yMax });
    const bottomRightX = this.evaluate(expressions.xMax, { y: yMin });

    if (
      bottomLeftX === null ||
      topLeftX === null ||
      topRightX === null ||
      bottomRightX === null
    ) {
      return [];
    }

    // Clamp the horizontal span of the top/bottom curves to their declared
    // range. Usually the corners already sit inside it; the clamp prevents the
    // shape from extending past xRange when an expression overshoots.
    const topStartX = Math.max(Math.min(topLeftX, topRightX), xMin);
    const topEndX = Math.min(Math.max(topLeftX, topRightX), xMax);
    const bottomStartX = Math.max(Math.min(bottomLeftX, bottomRightX), xMin);
    const bottomEndX = Math.min(Math.max(bottomLeftX, bottomRightX), xMax);

    const points: Vector[] = [];

    // -------------------------------------------------
    // Left boundary : xMin(y)
    // bottom -> top
    // -------------------------------------------------
    for (let i = 0; i <= samples; i++) {
      const y = yMin + ((yMax - yMin) * i) / samples;
      const x = this.evaluate(expressions.xMin, { y });

      if (x !== null) {
        points.push({ x, y });
      }
    }

    // -------------------------------------------------
    // Top boundary : yMax(x)
    // top-left -> top-right
    // -------------------------------------------------
    // A zero-width span means the left and right boundaries already meet at
    // the same top point (the top of a circle, for example), so there is
    // nothing extra to add.
    if (topStartX < topEndX) {
      for (let i = 0; i <= samples; i++) {
        const x = topStartX + ((topEndX - topStartX) * i) / samples;
        const y = this.evaluate(expressions.yMax, { x });

        if (y !== null) {
          points.push({ x, y });
        }
      }
    }

    // -------------------------------------------------
    // Right boundary : xMax(y)
    // top -> bottom
    // -------------------------------------------------
    for (let i = 0; i <= samples; i++) {
      const y = yMax - ((yMax - yMin) * i) / samples;
      const x = this.evaluate(expressions.xMax, { y });

      if (x !== null) {
        points.push({ x, y });
      }
    }

    // -------------------------------------------------
    // Bottom boundary : yMin(x)
    // bottom-right -> bottom-left
    // -------------------------------------------------
    if (bottomStartX < bottomEndX) {
      for (let i = 0; i <= samples; i++) {
        const x = bottomEndX + ((bottomStartX - bottomEndX) * i) / samples;
        const y = this.evaluate(expressions.yMin, { x });

        if (y !== null) {
          points.push({ x, y });
        }
      }
    }

    return points;
  }
}
