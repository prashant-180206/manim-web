import { Parser } from "expr-eval";
import { PropertyController } from "./helpers/propertycontroller";
import { ShapeProperty } from "./helpers/proprertytypes";
import { Value, Values } from "../utils/value";
import { Range, Vector } from "../utils/types";
import { Mobject } from "./mobect";

interface PolarShapeProperty extends ShapeProperty {
  rExpression: Value<string>;
  thetaRange: Value<Range>;
  samples: Value<number>;
}

export class PolarShape extends Mobject {
  private parser = new Parser();

  constructor(id: string, name: string) {
    super(id, name);

    this.propertyController = new PropertyController<PolarShapeProperty>({
      ...this.propertyController.properties,

      rExpression: Values.string("1"),

      thetaRange: Values.range({
        min: 0,
        max: Math.PI * 2,
      }),

      samples: Values.number(360),

      strokeColor: Values.string("black"),
      strokeWidth: Values.number(1),
      color: Values.string("lightblue"),
    }) as any;
  }

  override render(ctx: CanvasRenderingContext2D): void {
    const p = this.propertyController.properties as PolarShapeProperty;

    const points = this.evaluatePoints(p);

    this.beginRender(ctx);

    if (points.length === 0) {
      this.endRender(ctx);
      return;
    }

    ctx.beginPath();
    ctx.moveTo(points[0].x, points[0].y);

    for (let i = 1; i < points.length; i++) {
      ctx.lineTo(points[i].x, points[i].y);
    }

    ctx.closePath();

    ctx.fillStyle = p.color.get();
    ctx.fill();

    if (p.strokeWidth.get() > 0) {
      ctx.strokeStyle = p.strokeColor.get();
      ctx.lineWidth = p.strokeWidth.get();
      ctx.stroke();
    }

    this.endRender(ctx);
  }

  contains(_x: number, _y: number): boolean {
    return false;
  }

  private evaluatePoints(p: PolarShapeProperty): Vector[] {
    const expr = this.parser.parse(p.rExpression.get());

    const points: Vector[] = [];

    const samples = Math.max(2, Math.round(p.samples.get()));

    const thetaMin = p.thetaRange.get().min;
    const thetaMax = p.thetaRange.get().max;

    const thetaStep = (thetaMax - thetaMin) / samples;

    for (let i = 0; i <= samples; i++) {
      const theta = thetaMin + i * thetaStep;

      const r = expr.evaluate({ theta });

      points.push({
        x: r * Math.cos(theta),
        y: r * Math.sin(theta),
      });
    }

    return points;
  }
}
