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
    // Children are positioned relative to this group, so convert the
    // parent-space point into group space before testing them.
    const point = this.worldToLocal(x, y);

    for (const child of this.children) {
      if (child.contains(point.x, point.y)) {
        return true;
      }
    }
    return false;
  }
}
