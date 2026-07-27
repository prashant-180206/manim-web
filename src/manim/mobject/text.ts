import { PropertyController } from "../property/propertycontroller";
import { ShapeProperty } from "../property/proprertytypes";
import { Value, Values } from "../utils/value";
import { Mobject } from "./mobect";

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
      strokeColor: Values.string("black"),
      strokeWidth: Values.number(0),
      color: Values.string("black"),
    }) as any;
  }

  override render(ctx: CanvasRenderingContext2D): void {
    const p = this.propertyController.properties as TextMobjectProperty;
    const text = p.text.get();
    const fontSize = p.fontSize.get();

    this.beginRender(ctx);

    ctx.font = `${fontSize}px ${p.fontFamily.get()}`;
    ctx.textBaseline = "alphabetic";
    const metrics = ctx.measureText(text);

    ctx.fillStyle = p.color.get();
    ctx.fillText(text, -metrics.width / 2, fontSize * 0.8);

    this.endRender(ctx);
  }

  contains(x: number, y: number): boolean {
    const p = this.propertyController.properties as TextMobjectProperty;
    const text = p.text.get();
    const fontSize = p.fontSize.get();

    const canvas = document.createElement("canvas");
    const ctx = canvas.getContext("2d");
    if (!ctx) {
      return false;
    }

    ctx.font = `${fontSize}px ${p.fontFamily.get()}`;
    const metrics = ctx.measureText(text);

    return (
      x >= -metrics.width / 2 &&
      x <= metrics.width / 2 &&
      y >= 0 &&
      y <= fontSize
    );
  }
}
