import { Mobject } from "./mobect";

export class Group extends Mobject {
  public children: Mobject[] = [];

  constructor(id: string, name: string) {
    super(id, name);
  }
  render(_ctx: CanvasRenderingContext2D): void {}
  update(_dt: number): void {
    for (const child of this.children) {
      child.update(_dt);
    }
  }
  contains(x: number, y: number): boolean {
    for (const child of this.children) {
      if (child.contains(x, y)) {
        return true;
      }
    }
    return false;
  }
}
