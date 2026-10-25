import { PropertyController } from "./helpers/propertycontroller";
import { ShapeProperty } from "./helpers/proprertytypes";
import { Value, Values } from "../utils/value";
import { Mobject } from "./mobect";

interface CircleProperty extends ShapeProperty {
  radius: Value<number>;
}

export class Circle extends Mobject {
  constructor(id: string, name: string) {
    super(id, name);
    this.propertyController = new PropertyController<CircleProperty>({
      ...this.propertyController.properties,
      radius: Values.number(1),
      strokeColor: Values.color("#000000"),
      strokeWidth: Values.number(1),
      color: Values.color("#ff0000"),
    }) as any;
  }

  override render(ctx: CanvasRenderingContext2D): void {
    const p = this.propertyController.properties as CircleProperty;

    this.beginRender(ctx);

    ctx.beginPath();
    ctx.arc(0, 0, p.radius.get(), 0, Math.PI * 2);

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
    const point = this.worldToLocal(x, y);
    const radius = (
      this.propertyController.properties as CircleProperty
    ).radius.get();

    return point.x * point.x + point.y * point.y <= radius * radius;
  }
}
