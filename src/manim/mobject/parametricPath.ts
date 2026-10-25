import { Parser } from "expr-eval";
import { PropertyController } from "./helpers/propertycontroller";
import { ShapeProperty } from "./helpers/proprertytypes";
import { Value, Values } from "../utils/value";
import { Vector } from "../utils/types";
import { Mobject } from "./mobect";

interface ParametricPathProperty extends ShapeProperty {
  xExpression: Value<string>;
  yExpression: Value<string>;
  tMin: Value<number>;
  tMax: Value<number>;
  samples: Value<number>;
}

export class ParametricPath extends Mobject {
  private parser = new Parser();
  constructor(id: string, name: string) {
    super(id, name);
    this.propertyController = new PropertyController<ParametricPathProperty>({
      ...this.propertyController.properties,
      xExpression: Values.string("2*cos(t)"),
      yExpression: Values.string("2*sin(t)"),
      tMin: Values.number(0),
      tMax: Values.number(2 * Math.PI),
      samples: Values.number(200),
      strokeColor: Values.color("#000000"),
      strokeWidth: Values.number(2),
      color: Values.color("#000000"),
    }) as any;
  }

  override render(ctx: CanvasRenderingContext2D): void {
    const p = this.propertyController.properties as ParametricPathProperty;
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

  private evaluatePoints(p: ParametricPathProperty): Vector[] {
    const xExpr = this.parser.parse(p.xExpression.get());
    const yExpr = this.parser.parse(p.yExpression.get());

    const points: Vector[] = [];
    const samples = Math.max(2, Math.round(p.samples.get()));
    const tMin = p.tMin.get();
    const tMax = p.tMax.get();

    for (let i = 0; i <= samples; i += 1) {
      const t = tMin + ((tMax - tMin) * i) / samples;
      const scope = { t };
      const x = xExpr.evaluate(scope);
      const y = yExpr.evaluate(scope);
      points.push({ x, y });
    }

    return points;
  }
}
