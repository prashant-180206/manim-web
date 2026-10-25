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
      xMinExpression: Values.string("cos(t)"),
      xMaxExpression: Values.string("sin(t)"),
      yMinExpression: Values.string("sin(t)"),
      yMaxExpression: Values.string("cos(t)"),
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

  contains(_x: number, _y: number): boolean {
    return false;
  }

  private evaluatePoints(p: ParametricShapeProperty): Vector[] {
    const xMinExpr = this.parser.parse(p.xMinExpression.get());
    const xMaxExpr = this.parser.parse(p.xMaxExpression.get());
    const yMinExpr = this.parser.parse(p.yMinExpression.get());
    const yMaxExpr = this.parser.parse(p.yMaxExpression.get());

    const points: Vector[] = [];

    const samples = Math.max(2, Math.round(p.samples.get()));

    const xMin = p.xRange.get().min;
    const xMax = p.xRange.get().max;

    const yMin = p.yRange.get().min;
    const yMax = p.yRange.get().max;

    const xStep = (xMax - xMin) / samples;
    const yStep = (yMax - yMin) / samples;

    // -------------------------------------------------
    // Left boundary : xMin(y)
    // bottom -> top
    // -------------------------------------------------
    for (let i = 0; i <= samples; i++) {
      const y = yMin + i * yStep;

      points.push({
        x: xMinExpr.evaluate({ y }),
        y,
      });
    }

    // -------------------------------------------------
    // Top boundary : yMax(x)
    // left -> right
    // -------------------------------------------------
    for (let i = 0; i <= samples; i++) {
      const x = xMin + i * xStep;

      points.push({
        x,
        y: yMaxExpr.evaluate({ x }),
      });
    }

    // -------------------------------------------------
    // Right boundary : xMax(y)
    // top -> bottom
    // -------------------------------------------------
    for (let i = samples; i >= 0; i--) {
      const y = yMin + i * yStep;

      points.push({
        x: xMaxExpr.evaluate({ y }),
        y,
      });
    }

    // -------------------------------------------------
    // Bottom boundary : yMin(x)
    // right -> left
    // -------------------------------------------------
    for (let i = samples; i >= 0; i--) {
      const x = xMin + i * xStep;

      points.push({
        x,
        y: yMinExpr.evaluate({ x }),
      });
    }

    return points;
  }
}
