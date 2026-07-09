import { PropertyController } from "../property/propertycontroller";
import { ShapeProperty } from "../property/proprertytypes";
import { Value } from "../utils/value";
import { Mobject } from "./mobect";

interface CircleProperty extends ShapeProperty {
  radius: Value<number>;
}

export class Circle extends Mobject {
  constructor(id: string, name: string) {
    super(id, name);
    this.propertyController = new PropertyController<CircleProperty>({
      ...this.propertyController.properties,
      radius: new Value(50),
      strokeColor: new Value("black"),
      strokeWidth: new Value(1),
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
      ctx.lineWidth = p.strokeWidth.get();
      ctx.stroke();
    }

    this.endRender(ctx);
  }

  contains(x: number, y: number): boolean {
    const dx = x - 100;
    const dy = y - 100;
    return dx * dx + dy * dy <= 50 * 50;
  }
  protected beginRender(ctx: CanvasRenderingContext2D) {
    const p = this.propertyController.properties as CircleProperty;

    ctx.save();

    ctx.globalAlpha = p.opacity.get();

    const pos = p.position.get();
    const scale = p.scale.get();

    ctx.translate(pos.x, pos.y);
    ctx.scale(scale.x, scale.y);
  }

  protected endRender(ctx: CanvasRenderingContext2D) {
    ctx.restore();
  }
}
