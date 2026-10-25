import { PropertyController } from "./helpers/propertycontroller";
import { ShapeProperty } from "./helpers/proprertytypes";
import { Value, Values } from "../utils/value";
import { Mobject } from "./mobect";
import { PIXELS_PER_UNIT } from "../utils/units";

interface TextMobjectProperty extends ShapeProperty {
  text: Value<string>;
  fontSize: Value<number>;
  fontFamily: Value<string>;
}

export class TextMobject extends Mobject {
  constructor(id: string, name: string, text = "Hello, World!") {
    super(id, name);
    this.propertyController = new PropertyController<TextMobjectProperty>({
      ...this.propertyController.properties,
      text: Values.string(text),
      fontSize: Values.number(24),
      fontFamily: Values.string("sans-serif"),
      strokeColor: Values.color("#000000"),
      strokeWidth: Values.number(0),
      color: Values.color("#000000"),
    }) as any;
  }

  override render(ctx: CanvasRenderingContext2D): void {
    const p = this.propertyController.properties as TextMobjectProperty;
    const text = p.text.get();
    const fontSize = p.fontSize.get();

    this.beginRender(ctx);

    // Work in a pixel-sized local space so the text is upright and stays
    // centred. fontSize and strokeWidth are screen styles, not design units.
    ctx.save();
    ctx.scale(1 / PIXELS_PER_UNIT, -1 / PIXELS_PER_UNIT);
    ctx.font = `${fontSize}px ${p.fontFamily.get()}`;
    ctx.textBaseline = "alphabetic";
    const metrics = ctx.measureText(text);

    ctx.fillStyle = p.color.get();
    ctx.fillText(text, -metrics.width / 2, fontSize * 0.35);
    ctx.restore();

    this.endRender(ctx);
  }

  contains(x: number, y: number): boolean {
    const p = this.propertyController.properties as TextMobjectProperty;
    const point = this.worldToLocal(x, y);
    const fontSize = p.fontSize.get();

    const canvas = document.createElement("canvas");
    const ctx = canvas.getContext("2d");
    if (!ctx) {
      return false;
    }

    ctx.font = `${fontSize}px ${p.fontFamily.get()}`;
    const width = ctx.measureText(p.text.get()).width / PIXELS_PER_UNIT;
    const height = fontSize / PIXELS_PER_UNIT;

    return Math.abs(point.x) <= width / 2 && Math.abs(point.y) <= height / 2;
  }
}
