/*
|--------------------------------------------------------------------------
| Selection.ts
|--------------------------------------------------------------------------
|
| Responsible for maintaining the editor selection.
|
| The selection is NOT responsible for notifying the UI.
| Scene listens to selection changes and emits events.
|
|--------------------------------------------------------------------------
*/

// import { Animation } from "../animation/animation";
import { Signal } from "../events/signal";
import { Group } from "../mobject/group";
import { Mobject } from "../mobject/mobect";
import { Scene } from "../scene";

export class SelectionManager {
  scene: Scene;
  private _selectedMobject: Mobject | null = null;

  editingSelection = new Set<Mobject>();
  onSelectionChanged = new Signal<[Mobject | null]>();

  constructor(scene: Scene) {
    this.scene = scene;
  }

  public get selectedMobject(): Mobject | null {
    return this._selectedMobject;
  }
  public set selectedMobject(value: Mobject | null) {
    this._selectedMobject = value;
    this.onSelectionChanged.emit(value);
  }

  select(mousePosition: { x: number; y: number }): void {
    this.editingSelection.clear();

    if (this.selectedMobject instanceof Group) {
      for (const child of this.selectedMobject.children) {
        if (child.contains(mousePosition.x, mousePosition.y)) {
          this.selectedMobject = child;
          this.onSelectionChanged.emit(child);
          return;
        }
      }
    }

    const roots = this.scene.mobjectManager.tree.roots;

    // Search from front to back
    for (let i = roots.length - 1; i >= 0; i--) {
      const mobject = roots[i].mobject;

      if (mobject.contains(mousePosition.x, mousePosition.y)) {
        this.selectedMobject = mobject;
        this.onSelectionChanged.emit(mobject);
        return;
      }
    }
    this.selectedMobject = null;
    this.onSelectionChanged.emit(null);
  }

  multiselect(mousePosition: { x: number; y: number }): void {
    const roots = this.scene.mobjectManager.tree.roots;

    for (let i = roots.length - 1; i >= 0; i--) {
      const mobject = roots[i].mobject;

      if (mobject.contains(mousePosition.x, mousePosition.y)) {
        if (this.editingSelection.has(mobject)) {
          this.editingSelection.delete(mobject);
        } else {
          this.editingSelection.add(mobject);
        }
        this.onSelectionChanged.emit(mobject);
        return;
      }
    }
  }

  groupSelected(): void {
    if (this.editingSelection.size < 2) return;

    const group = this.scene.mobjectManager.group(
      ...Array.from(this.editingSelection),
    );

    this.editingSelection.clear();
    this.selectedMobject = group;

    this.onSelectionChanged.emit(group);
  }

  ungroupSelected(): void {
    if (!(this.selectedMobject instanceof Group)) return;

    this.scene.mobjectManager.ungroup(this.selectedMobject);

    this.selectedMobject = null;
    this.editingSelection.clear();
  }
}
