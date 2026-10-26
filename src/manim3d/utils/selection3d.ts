import * as THREE from "three";
import { Signal } from "@/manim/events/signal";
import type { Mobject3D } from "../mobject/mobject3d";
import type { Scene3D } from "../scene3d";

/*
|--------------------------------------------------------------------------
| selection3d.ts
|--------------------------------------------------------------------------
|
| Counterpart of `src/manim/utils/selection.ts` for the flat 3D scene.
| Picking uses a `THREE.Raycaster` against the renderable scene graph, then
| maps the hit back to its owning `Mobject3D`.
|
| Like the 2D manager, fully transparent, hidden and locked objects are not
| pickable. Grouping does not exist yet, so every hit resolves directly to a
| root mobject.
|
*/

export class Selection3D {
  private _selectedMobject: Mobject3D | null = null;

  /** Additional objects selected on top of the primary selection. */
  readonly editingSelection = new Set<Mobject3D>();

  readonly onSelectionChanged = new Signal<[Mobject3D | null]>();

  private readonly raycaster = new THREE.Raycaster();

  private readonly pointer = new THREE.Vector2();

  constructor(private readonly scene: Scene3D) {}

  get selectedMobject(): Mobject3D | null {
    return this._selectedMobject;
  }

  set selectedMobject(value: Mobject3D | null) {
    this._selectedMobject = value;
    this.notify();
  }

  private notify(): void {
    this.onSelectionChanged.emit(this._selectedMobject);
  }

  private isPickable(mobject: Mobject3D): boolean {
    if (!mobject.visible || mobject.locked) return false;

    const opacity = mobject.properties.opacity.get();

    return Number.isFinite(opacity) && opacity > 0;
  }

  /**
   * Resolve the mobject that owns an intersected three.js object. The base
   * class stamps `userData.mobjectId` on the object it creates; walking up
   * also covers geometry nested inside a future composite mobject.
   */
  private mobjectFromObject(object: THREE.Object3D): Mobject3D | null {
    let current: THREE.Object3D | null = object;

    while (current) {
      const id = current.userData.mobjectId;

      if (typeof id === "string") {
        return this.scene.mobjectManager.get(id) ?? null;
      }

      current = current.parent;
    }

    return null;
  }

  /** Nearest pickable mobject under client coordinates, if any. */
  private pick(clientX: number, clientY: number): Mobject3D | null {
    const rect = this.scene.canvas.getBoundingClientRect();

    if (rect.width <= 0 || rect.height <= 0) return null;

    this.pointer.set(
      ((clientX - rect.left) / rect.width) * 2 - 1,
      -((clientY - rect.top) / rect.height) * 2 + 1,
    );

    // A render updates matrices, but selection can happen before the next
    // frame (for example immediately after creating an object).
    this.scene.scene.updateMatrixWorld(true);
    this.raycaster.setFromCamera(this.pointer, this.scene.camera.camera);

    const roots = this.scene.mobjectManager.roots.map(
      (mobject) => mobject.object,
    );
    const hits = this.raycaster.intersectObjects(roots, true);

    for (const hit of hits) {
      const mobject = this.mobjectFromObject(hit.object);

      if (mobject && this.isPickable(mobject)) {
        return mobject;
      }
    }

    return null;
  }

  selectAt(clientX: number, clientY: number): void {
    this.editingSelection.clear();
    this.selectedMobject = this.pick(clientX, clientY);
  }

  selectMobject(mobject: Mobject3D | null): void {
    this.editingSelection.clear();
    this.selectedMobject = mobject;
  }

  /**
   * Toggle an object in the selection. The primary selection is promoted from
   * the remaining multi-selection when it is toggled off, so the inspector
   * always has a sensible object to show.
   */
  private toggle(mobject: Mobject3D): void {
    if (this._selectedMobject?.id === mobject.id) {
      const [next, ...rest] = this.editingSelection;

      this.editingSelection.clear();

      for (const other of rest) {
        this.editingSelection.add(other);
      }

      this.selectedMobject = next ?? null;
      return;
    }

    if (this.editingSelection.has(mobject)) {
      this.editingSelection.delete(mobject);
      this.notify();
      return;
    }

    if (this._selectedMobject) {
      this.editingSelection.add(mobject);
    } else {
      this._selectedMobject = mobject;
    }

    this.notify();
  }

  multiselectMobject(mobject: Mobject3D): void {
    this.toggle(mobject);
  }

  multiselectAt(clientX: number, clientY: number): void {
    const mobject = this.pick(clientX, clientY);

    if (mobject) {
      this.toggle(mobject);
    }
  }

  /** Drop a removed object from both the primary and multi-selection. */
  forget(mobject: Mobject3D): void {
    const wasPrimary = this._selectedMobject?.id === mobject.id;
    const wasExtra = this.editingSelection.delete(mobject);

    if (!wasPrimary && !wasExtra) return;

    if (wasPrimary) {
      const [next, ...rest] = this.editingSelection;

      this.editingSelection.clear();

      for (const other of rest) {
        this.editingSelection.add(other);
      }

      this._selectedMobject = next ?? null;
    }

    this.notify();
  }

  clear(): void {
    this.editingSelection.clear();
    this.selectedMobject = null;
  }

  dispose(): void {
    this.editingSelection.clear();
    this._selectedMobject = null;
    this.onSelectionChanged.clear();
  }
}
