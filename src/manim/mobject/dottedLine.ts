import { PropertyController } from "./helpers/propertycontroller";
import { Value, Values } from "../utils/value";
import { Line, type LineProperty } from "./line";

interface DottedLineProperty extends LineProperty {
  dashLength: Value<number>;
  gapLength: Value<number>;
}

/**
 * A dashed line. `dashLength` and `gapLength` are geometry properties in world
 * units, so the dash pattern scales with the line's endpoints and transform.
 */
export class DottedLine extends Line {
  constructor(id: string, name: string) {
    super(id, name);
    this.propertyController = new PropertyController<DottedLineProperty>({
      ...this.propertyController.properties,
      dashLength: Values.number(0.15),
      gapLength: Values.number(0.12),
    } as any) as any;
  }

  override render(ctx: CanvasRenderingContext2D): void {
    const p = this.propertyController.properties as DottedLineProperty;

    if (p.strokeWidth.get() <= 0) return;

    const dashValue = Math.abs(p.dashLength.get());
    const gapValue = Math.abs(p.gapLength.get());
    const dash = Number.isFinite(dashValue) && dashValue > 0 ? dashValue : 0.0001;
    const gap = Number.isFinite(gapValue) ? gapValue : 0;

    this.beginRender(ctx);
    ctx.setLineDash([dash, gap]);
    this.drawSegment(ctx, p.start.get(), p.end.get(), p);
    this.endRender(ctx);
  }
}
