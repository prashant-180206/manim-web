import * as THREE from "three";
import { Signal } from "@/manim/events/signal";
import type { Mobject3D } from "../mobject3d";
import { Mobject3DName } from "./mobject3dName";
import { Mobject3DRegistry } from "./mobject3dRegistry";

/*
|--------------------------------------------------------------------------
| mobject3dManager.ts
|--------------------------------------------------------------------------
|
| Mirrors `src/manim/mobject/helpers/mobjectmanager.ts` for the flat 3D
| scene. Grouping, z-order and reparenting are deliberately not implemented
| yet: every mobject is a root, and render order is `order` insertion order.
|
| A future tree implementation can grow here without changing the scene or
| primitive APIs.
|
*/

class IdGenerator3D {
  private counter = 0;

  next(kind: Mobject3DName): string {
    this.counter += 1;
    return `${kind.toLowerCase()}-${this.counter}`;
  }

  /**
   * Make sure later generated ids cannot collide with an id restored from a
   * file. Ids are `<kind>-<number>`; anything else is simply not reserved.
   */
  reserve(id: string): void {
    const match = /-(\d+)$/.exec(id);

    if (!match) return;

    this.counter = Math.max(this.counter, Number(match[1]));
  }
}

export class Mobject3DManager {
  /** Parent node for every root mobject in the scene. */
  readonly root = new THREE.Group();

  readonly onAdd = new Signal<[Mobject3D]>();

  readonly onRemove = new Signal<[Mobject3D]>();

  readonly onTreeChanged = new Signal();

  private readonly nodes = new Map<string, Mobject3D>();

  private readonly order: Mobject3D[] = [];

  private readonly idGenerator = new IdGenerator3D();

  constructor() {
    this.root.name = "mobjects-3d";
  }

  add(kind: Mobject3DName): Mobject3D {
    const id = this.idGenerator.next(kind);
    const mobject = Mobject3DRegistry.make(kind, id);

    this.attach(mobject);

    return mobject;
  }

  /**
   * Recreate a mobject from a saved scene while keeping its id and display
   * name. The id is reserved so future `add()` calls cannot collide.
   */
  restore(kind: Mobject3DName, id: string, displayName?: string): Mobject3D {
    if (this.nodes.has(id)) {
      throw new Error(`Mobject3D id '${id}' already exists.`);
    }

    const mobject = Mobject3DRegistry.make(kind, id);

    if (displayName) {
      mobject.name = displayName;
      mobject.object.name = displayName;
    }

    this.idGenerator.reserve(id);
    this.attach(mobject);

    return mobject;
  }

  private attach(mobject: Mobject3D): void {
    if (this.nodes.has(mobject.id)) {
      throw new Error(`Mobject3D id '${mobject.id}' already exists.`);
    }

    this.nodes.set(mobject.id, mobject);
    this.order.push(mobject);
    this.root.add(mobject.object);

    this.onAdd.emit(mobject);
    this.onTreeChanged.emit();
  }

  get(id: string): Mobject3D | undefined {
    return this.nodes.get(id);
  }

  has(id: string): boolean {
    return this.nodes.has(id);
  }

  /** All mobjects in render order (front-to-back is not defined yet). */
  all(): Mobject3D[] {
    return [...this.order];
  }

  /**
   * Root mobjects in render order. Every object is currently a root, so this
   * is the same list as `all()`; it exists to mirror the 2D manager API.
   */
  get roots(): Mobject3D[] {
    return [...this.order];
  }

  rename(mobject: Mobject3D, newName: string): void {
    const node = this.nodes.get(mobject.id);

    if (!node) {
      throw new Error(`Mobject3D '${mobject.id}' is not in this manager.`);
    }

    node.name = newName;
    node.object.name = newName;

    this.onTreeChanged.emit();
  }

  /**
   * Remove a mobject and, by default, release its GPU resources. Pass
   * `dispose: false` only when the object will be reused elsewhere.
   */
  delete(mobject: Mobject3D, dispose = true): boolean {
    const node = this.nodes.get(mobject.id);

    if (!node) return false;

    this.nodes.delete(node.id);

    const index = this.order.indexOf(node);

    if (index !== -1) {
      this.order.splice(index, 1);
    }

    node.object.removeFromParent();

    if (dispose) {
      node.dispose();
    }

    this.onRemove.emit(node);
    this.onTreeChanged.emit();

    return true;
  }

  /** Remove every mobject. Used when closing a scene or disposing. */
  clear(dispose = true): void {
    if (this.order.length === 0) return;

    for (const mobject of [...this.order]) {
      this.nodes.delete(mobject.id);
      mobject.object.removeFromParent();

      if (dispose) {
        mobject.dispose();
      }

      this.onRemove.emit(mobject);
    }

    this.order.length = 0;
    this.onTreeChanged.emit();
  }

  dispose(): void {
    this.onAdd.clear();
    this.onRemove.clear();
    this.onTreeChanged.clear();
    this.clear(true);
  }
}
