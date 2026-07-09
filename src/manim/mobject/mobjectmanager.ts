import { Mobject } from "./mobect";
import { MobjectName } from "./mobjectName";
import { MobjectRegistry } from "./mobjectregistry";

export class MobjectManager {
  //   readonly events: MobjectEvents;

  //   readonly root: MobjectCollection;
  mobjects: Map<string, Mobject> = new Map();

  _idgenerator = new IdGenerator();

  add(name: MobjectName): Mobject {
    const id = this._idgenerator.generateId(name);
    const mobject = MobjectRegistry.makeMobject(name, id);
    this.mobjects.set(id, mobject);
    return mobject;
  }

  // remove(object: Mobject): void {}

  //   removeById(id: string): boolean {}

  clear(): void {}

  has(id: string): boolean {
    return this.mobjects.has(id);
  }

  get(id: string): Mobject {
    const mobject = this.mobjects.get(id);
    if (!mobject) {
      throw new Error(`Mobject with id ${id} not found`);
    }
    return mobject;
  }

  exists(object: Mobject): boolean {
    return this.mobjects.has(object.id);
  }

  // forEach(callback: (m: Mobject) => void): void {}

  // update(dt: number): void {}

  // render(ctx: CanvasRenderingContext2D): void {}

  // bringToFront(object: Mobject): void {}

  // sendToBack(object: Mobject): void {}

  // moveBefore(object: Mobject, reference: Mobject): void {}

  // moveAfter(object: Mobject, reference: Mobject): void {}

  //   query(): MobjectQueries {}

  dispose(): void {}
}

// enum MobjectEvents {
//   added,

//   removed,

//   reordered,

//   changed,
// }
class IdGenerator {
  private counts: Map<MobjectName, number> = new Map();

  generateId(name: MobjectName): string {
    const count = this.counts.get(name) || 0;
    this.counts.set(name, count + 1);
    return `${name}_${count}`;
  }
}
