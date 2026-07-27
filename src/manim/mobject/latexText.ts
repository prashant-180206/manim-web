import katex from "katex";
import "katex/dist/katex.min.css";
import katexCss from "katex/dist/katex.min.css?inline";

import { PropertyController } from "../property/propertycontroller";
import { BaseProperty } from "../property/proprertytypes";
import { Value, Values } from "../utils/value";
import { Mobject } from "./mobect";

interface LatexTextProperty extends BaseProperty {
  latex: Value<string>;
  fontSize: Value<number>;
  color: Value<string>;
  displayMode: Value<boolean>;
}

export class LatexText extends Mobject {
  private image?: HTMLImageElement;

  private loaded = false;

  private lastLatex = "";

  private lastFontSize = -1;

  private lastColor = "";

  private lastDisplayMode = false;

  constructor(id: string, name: string) {
    super(id, name);

    this.propertyController = new PropertyController<LatexTextProperty>({
      ...this.propertyController.properties,

      latex: Values.string(
        "\\int_{0}^{\\infty} e^{-x^2}\\,dx=\\frac{\\sqrt{\\pi}}{2}",
      ),

      fontSize: Values.number(32),

      color: Values.string("#000000"),

      displayMode: Values.boolean(true),
    }) as any;
  }

  private regenerateImage() {
    const p = this.propertyController.properties as LatexTextProperty;

    const html = katex.renderToString(p.latex.get(), {
      throwOnError: false,
      displayMode: p.displayMode.get(),
      output: "html",
    });

    const svg = `
      <svg xmlns="http://www.w3.org/2000/svg" width="1200" height="400">
        <style>
          ${katexCss}

          .katex{
            color:${p.color.get()};
          }
        </style>

        <foreignObject width="100%" height="100%">
          <div
            xmlns="http://www.w3.org/1999/xhtml"
            style="
              display:inline-block;
              font-size:${p.fontSize.get()}px;
              padding:8px;
            "
          >
            ${html}
          </div>
        </foreignObject>
      </svg>
    `;

    const img = new Image();

    img.onload = () => {
      this.image = img;
      this.loaded = true;
    };

    this.loaded = false;

    img.src = "data:image/svg+xml;charset=utf-8," + encodeURIComponent(svg);

    this.lastLatex = p.latex.get();
    this.lastFontSize = p.fontSize.get();
    this.lastColor = p.color.get();
    this.lastDisplayMode = p.displayMode.get();
  }

  override render(ctx: CanvasRenderingContext2D): void {
    const p = this.propertyController.properties as LatexTextProperty;

    if (
      p.latex.get() !== this.lastLatex ||
      p.fontSize.get() !== this.lastFontSize ||
      p.color.get() !== this.lastColor ||
      p.displayMode.get() !== this.lastDisplayMode
    ) {
      this.regenerateImage();
    }

    if (!this.loaded || !this.image) return;

    this.beginRender(ctx);

    ctx.drawImage(this.image, 0, 0);

    this.endRender(ctx);
  }

  override contains(x: number, y: number): boolean {
    if (!this.image) return false;

    return x >= 0 && y >= 0 && x <= this.image.width && y <= this.image.height;
  }
}
