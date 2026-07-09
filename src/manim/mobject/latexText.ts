import katex from "katex";
import "katex/dist/katex.min.css";
import katexCss from "katex/dist/katex.min.css?inline";

import { Mobject } from "./mobect";

export class LatexText extends Mobject {
  private readonly latex =
    "\\int_{0}^{\infty} e^{-x^2}\\,dx=\\frac{\\sqrt{\\pi}}{2}";

  private image?: HTMLImageElement;
  private loaded = false;

  constructor(id: string, name: string) {
    super(id, name);
    this.generateImage();
  }

  private generateImage() {
    const html = katex.renderToString(this.latex, {
      throwOnError: false,
      displayMode: true,
      output: "html",
    });

    const svg = `
      <svg xmlns="http://www.w3.org/2000/svg" width="800" height="200">
        <style>
        ${katexCss}
        </style>
        <foreignObject width="150%" height="150%">
          <div xmlns="http://www.w3.org/1999/xhtml"
               style="
                 font-size:32px;
            
                 padding:12px;
                 display:inline-block;
               ">
            ${html}
          </div>
        </foreignObject>
      </svg>
    `;

    const img = new Image();

    img.onload = () => {
      this.loaded = true;
    };

    img.src = "data:image/svg+xml;charset=utf-8," + encodeURIComponent(svg);

    this.image = img;
  }

  render(ctx: CanvasRenderingContext2D): void {
    if (!this.loaded || !this.image) return;

    ctx.drawImage(this.image, 0, 0);
  }

  contains(x: number, y: number): boolean {
    return (
      x >= 0 && x <= this.image?.width! && y >= 0 && y <= this.image?.height!
    );
  }
}
