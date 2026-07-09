import { Mobject } from "./mobect";

export class Rectangle extends Mobject {
  constructor(id: string, name: string) {
    super(id, name);
    this.visible = true;
  }
  render(ctx: CanvasRenderingContext2D): void {
    ctx.fillStyle = "blue";
    ctx.fillRect(0, 0, 100, 100);
  }

  contains(x: number, y: number): boolean {
    return x >= 0 && x <= 100 && y >= 0 && y <= 100;
  }
}
