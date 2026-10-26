/*
|--------------------------------------------------------------------------
| Selection.ts
|--------------------------------------------------------------------------
|
| Responsible for maintaining the editor selection.
|
| The selection is NOT responsible for notifying the UI directly.
| Scene listens to selection changes and emits events.
|
|--------------------------------------------------------------------------
*/

import { Signal } from "../events/signal";
import { Group } from "../mobject/group";
import { Mobject } from "../mobject/mobect";
import { MobjectNode } from "../mobject/helpers/MobjectTree";
import type { Scene } from "../scene";
import type { Vector } from "./types";

export class SelectionManager {
  scene: Scene;
  private _selectedMobject: Mobject | null = null;

  /** Additional objects selected on top of the primary selection. */
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
    this.notify();
  }

  /**
   * Whether a node can be picked. Hidden and locked nodes, and their subtrees,
   * are skipped. Groups themselves are structural, so only their children are
   * tested for geometry and opacity.
   */
  private isNodeHit(node: MobjectNode, point: Vector): boolean {
    if (!node.visible || node.locked) return false;

    if (node.mobject instanceof Group) {
      for (let i = node.children.length - 1; i >= 0; i -= 1) {
        if (this.isNodeHit(node.children[i], point)) {
          return true;
        }
      }

      return false;
    }

    // Fully transparent objects are invisible to the user, so they must not
    // steal clicks from objects behind them.
    if (node.mobject.properties.opacity.get() <= 0) return false;

    return node.mobject.contains(point.x, point.y);
  }

  /** Topmost node under the point, using front-to-back tree order. */
  private hitTest(nodes: MobjectNode[], point: Vector): MobjectNode | null {
    for (let i = nodes.length - 1; i >= 0; i -= 1) {
      if (this.isNodeHit(nodes[i], point)) {
        return nodes[i];
      }
    }

    return null;
  }

  /**
   * When a group is already selected, clicking one of its children drills
   * into the group and selects that child instead.
   */
  private getDrilledChild(point: Vector): MobjectNode | null {
    if (!(this._selectedMobject instanceof Group)) return null;

    const groupNode = this.scene.mobjectManager.tree.nodes.get(
      this._selectedMobject.id,
    );

    if (!groupNode || !groupNode.visible || groupNode.locked) return null;

    return this.hitTest(groupNode.children, point);
  }

  private getMobjectAt(point: Vector): Mobject | null {
    const child = this.getDrilledChild(point);

    if (child) {
      return child.mobject;
    }

    const roots = this.scene.mobjectManager.tree.roots;
    return this.hitTest(roots, point)?.mobject ?? null;
  }

  private notify(): void {
    this.onSelectionChanged.emit(this._selectedMobject);
  }

  select(mousePosition: { x: number; y: number }): void {
    this.editingSelection.clear();
    this.selectedMobject = this.getMobjectAt(mousePosition);
  }

  selectMobject(mobject: Mobject | null): void {
    this.editingSelection.clear();
    this.selectedMobject = mobject;
  }

  /**
   * Toggle a mobject in the selection. The primary selection is promoted from
   * the remaining multi-selection when it is toggled off, so the inspector
   * always has a sensible object to show.
   */
  private toggle(mobject: Mobject): void {
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

  multiselectMobject(mobject: Mobject): void {
    this.toggle(mobject);
  }

  multiselect(mousePosition: { x: number; y: number }): void {
    const mobject = this.getMobjectAt(mousePosition);

    if (mobject) {
      this.toggle(mobject);
    }
  }

  groupSelected(): void {
    // The primary selection is tracked separately from the multi-selection,
    // so the group has to include both to match what the UI shows.
    const selection = new Set(this.editingSelection);

    if (this._selectedMobject) {
      selection.add(this._selectedMobject);
    }

    if (selection.size < 2) return;

    const group = this.scene.mobjectManager.group(...Array.from(selection));

    this.editingSelection.clear();
    this.selectedMobject = group;
  }

  ungroupSelected(): void {
    if (!(this._selectedMobject instanceof Group)) return;

    this.scene.mobjectManager.ungroup(this._selectedMobject);

    this.editingSelection.clear();
    this.selectedMobject = null;
  }
}
