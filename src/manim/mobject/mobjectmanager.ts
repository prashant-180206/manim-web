import { Mobject } from "../mobjects/mobect";

export class MobjectManager {
  //   readonly events: MobjectEvents;

  //   readonly root: MobjectCollection;

  add(object: Mobject): void {}

  remove(object: Mobject): void {}

  //   removeById(id: string): boolean {}

  clear(): void {}

  //   has(id: string): boolean {}

  //   find(id: string): Mobject | undefined {}

  //   get(id: string): Mobject {}

  //   exists(object: Mobject): boolean {}

  forEach(callback: (m: Mobject) => void): void {}

  update(dt: number): void {}

  render(ctx: CanvasRenderingContext2D): void {}

  bringToFront(object: Mobject): void {}

  sendToBack(object: Mobject): void {}

  moveBefore(object: Mobject, reference: Mobject): void {}

  moveAfter(object: Mobject, reference: Mobject): void {}

  //   query(): MobjectQueries {}

  dispose(): void {}
}

enum MobjectEvents {
  added,

  removed,

  reordered,

  changed,
}
