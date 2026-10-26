import { Signal } from "../../events/signal";
import { Group } from "../group";
import { Mobject } from "../mobect";
import type { Vector } from "../../utils/types";
import { MobjectName } from "./mobjectName";
import { MobjectRegistry } from "./mobjectregistry";
import { MobjectNode, MobjectTree } from "./MobjectTree";

export class MobjectManager {
  readonly tree = new MobjectTree();
  private readonly idGenerator = new IdGenerator();
  readonly onAdd = new Signal<[Mobject]>();
  readonly onRemove = new Signal<[Mobject]>();
  readonly onTreeChanged = new Signal();

  add(name: MobjectName): Mobject {
    const id = this.nextId(name);

    const mobject = MobjectRegistry.makeMobject(name, id);

    const node = new MobjectNode(mobject);

    this.tree.nodes.set(node.id, node);
    this.tree.roots.push(node);

    this.onAdd.emit(mobject);

    return mobject;
  }

  /**
   * Recreate a mobject from a saved scene while keeping its id and display
   * name. The object is added as a root; call `addToGroup` to rebuild nested
   * hierarchies.
   */
  restore(name: MobjectName, id: string, displayName?: string): Mobject {
    const mobject = MobjectRegistry.makeMobject(name, id);

    if (displayName) {
      mobject.name = displayName;
    }

    const node = new MobjectNode(mobject);

    this.tree.nodes.set(node.id, node);
    this.tree.roots.push(node);

    this.onAdd.emit(mobject);

    return mobject;
  }

  rename(object: Mobject, newName: string): void {
    const node = this.getNode(object.id);
    // !TODO: Update the registry if needed

    node.mobject.name = newName;
  }

  group(...objects: Mobject[]): Group {
    const group = new Group(this.nextId(MobjectName.Group), "Group");

    const groupNode = new MobjectNode(group);

    this.tree.nodes.set(group.id, groupNode);

    for (const object of objects) {
      const node = this.getNode(object.id);

      this.detach(node);

      // Attach to group
      node.parent = groupNode;
      groupNode.children.push(node);
      group.children.push(object);
      this.toLocalPosition(node, groupNode);
    }

    this.tree.roots.push(groupNode);

    this.onAdd.emit(group);
    this.onTreeChanged.emit();

    return group;
  }

  addToGroup(groupId: string, ...objects: Mobject[]): Group {
    const groupNode = this.getNode(groupId);
    if (!(groupNode.mobject instanceof Group)) {
      throw new Error(`Mobject '${groupId}' is not a Group.`);
    }

    for (const object of objects) {
      const node = this.getNode(object.id);

      if (node === groupNode || node.parent === groupNode) {
        continue;
      }

      this.detach(node);

      // Attach to group
      node.parent = groupNode;
      groupNode.children.push(node);
      (groupNode.mobject as Group).children.push(object);
      this.toLocalPosition(node, groupNode);
    }

    // The group may already be attached somewhere; only root groups need to
    // be re-added to the root list.
    if (!groupNode.parent && !this.tree.roots.includes(groupNode)) {
      this.tree.roots.push(groupNode);
    }

    this.onTreeChanged.emit();

    return groupNode.mobject as Group;
  }

  /**
   * Sum of the local positions of a parent chain, excluding the node itself.
   * This is the world position of the space a child is authored in.
   */
  private parentWorldPosition(parent: MobjectNode | null): Vector {
    let x = 0;
    let y = 0;
    let current = parent;

    while (current) {
      const position = current.mobject.properties.position.get();
      x += position.x;
      y += position.y;
      current = current.parent;
    }

    return { x, y };
  }

  /** Rewrite a node's position from parent-relative to world space. */
  private toWorldPosition(node: MobjectNode): void {
    if (!node.parent) return;

    const offset = this.parentWorldPosition(node.parent);
    const position = node.mobject.properties.position;
    const current = position.get();

    position.set({ x: current.x + offset.x, y: current.y + offset.y });
  }

  /** Rewrite a node's position from world space to `parent`-relative space. */
  private toLocalPosition(
    node: MobjectNode,
    parent: MobjectNode | null,
  ): void {
    if (!parent) return;

    const offset = this.parentWorldPosition(parent);
    const position = node.mobject.properties.position;
    const current = position.get();

    position.set({ x: current.x - offset.x, y: current.y - offset.y });
  }

  /** World position of the parent space in which `mobject` is authored. */
  parentWorldPositionOf(mobject: Mobject): Vector {
    return this.parentWorldPosition(this.getNode(mobject.id).parent);
  }

  /** Remove a node from its current parent (or the root list). */
  private detach(node: MobjectNode): void {
    // Children store positions relative to their parent. Convert to world
    // coordinates before the parent link disappears so reattaching elsewhere
    // does not move the object.
    this.toWorldPosition(node);

    if (node.parent) {
      const siblings = node.parent.children;
      const index = siblings.indexOf(node);

      if (index !== -1) {
        siblings.splice(index, 1);
      }

      if (node.parent.mobject instanceof Group) {
        const groupChildren = node.parent.mobject.children;
        const groupIndex = groupChildren.findIndex(
          (child) => child.id === node.id,
        );

        if (groupIndex !== -1) {
          groupChildren.splice(groupIndex, 1);
        }
      }

      return;
    }

    const index = this.tree.roots.indexOf(node);

    if (index !== -1) {
      this.tree.roots.splice(index, 1);
    }
  }

  removeFromGroup(groupId: string, object: Mobject): void {
    const groupNode = this.getNode(groupId);
    const node = this.getNode(object.id);

    if (node.parent !== groupNode) {
      throw new Error(
        `Mobject '${object.id}' is not a child of group '${groupId}'.`,
      );
    }

    // Convert the local position to world space before leaving the group.
    this.toWorldPosition(node);

    // Remove from the group
    const index = groupNode.children.indexOf(node);
    groupNode.children.splice(index, 1);

    const group = groupNode.mobject as Group;
    const groupIndex = group.children.findIndex(
      (child) => child.id === object.id,
    );

    if (groupIndex !== -1) {
      group.children.splice(groupIndex, 1);
    }

    // Make it a root object
    node.parent = null;
    this.tree.roots.push(node);

    this.onTreeChanged.emit();
  }

  renameMobject(id: string, newName: string): void {
    const node = this.getNode(id);
    node.mobject.name = newName;
  }

  getNode(id: string): MobjectNode {
    const node = this.tree.nodes.get(id);
    if (!node) {
      throw new Error(`Mobject '${id}' not found.`);
    }
    return node;
  }

  /*
  |--------------------------------------------------------------------------
  | Z-order / hierarchy
  |--------------------------------------------------------------------------
  |
  | Draw order is the tree order: later siblings render in front of earlier
  | ones, and a group's children render directly after the group. These
  | helpers keep Group.children in sync with the tree after any move.
  |
  */

  private listFor(parent: MobjectNode | null): MobjectNode[] {
    return parent ? parent.children : this.tree.roots;
  }

  private syncGroupChildren(parent: MobjectNode | null): void {
    if (!parent || !(parent.mobject instanceof Group)) return;

    parent.mobject.children.splice(
      0,
      parent.mobject.children.length,
      ...parent.children.map((child) => child.mobject),
    );
  }

  /** True when `ancestor` is `node` or one of its ancestors. */
  private containsNode(ancestor: MobjectNode, node: MobjectNode): boolean {
    let current: MobjectNode | null = node;

    while (current) {
      if (current === ancestor) return true;
      current = current.parent;
    }

    return false;
  }

  /** Move a node directly behind/front of a target sibling. */
  private moveRelative(
    mobjectId: string,
    targetId: string,
    inFront: boolean,
  ): void {
    const node = this.getNode(mobjectId);
    const target = this.getNode(targetId);

    if (node === target) return;

    // A node cannot be placed inside its own subtree.
    if (this.containsNode(node, target)) {
      throw new Error(`Cannot move '${node.id}' relative to its own child.`);
    }

    const oldParent = node.parent;
    const parent = target.parent;

    this.detach(node);

    const list = this.listFor(parent);
    const index = list.indexOf(target);

    if (index === -1) {
      list.push(node);
    } else {
      list.splice(inFront ? index + 1 : index, 0, node);
    }

    node.parent = parent;
    this.toLocalPosition(node, parent);

    this.syncGroupChildren(oldParent);
    this.syncGroupChildren(parent);
    this.onTreeChanged.emit();
  }

  /** Place a mobject in front of another sibling (higher z-index). */
  moveInFrontOf(mobjectId: string, targetId: string): void {
    this.moveRelative(mobjectId, targetId, true);
  }

  /** Place a mobject behind another sibling (lower z-index). */
  moveBehind(mobjectId: string, targetId: string): void {
    this.moveRelative(mobjectId, targetId, false);
  }

  /**
   * Move a mobject into a group. Without an index the object is appended,
   * which makes it the front-most child of that group.
   */
  moveIntoGroup(groupId: string, mobjectId: string, index?: number): void {
    const groupNode = this.getNode(groupId);
    const node = this.getNode(mobjectId);

    if (!(groupNode.mobject instanceof Group)) {
      throw new Error(`Mobject '${groupId}' is not a Group.`);
    }

    if (this.containsNode(node, groupNode)) {
      throw new Error("A group cannot be moved into itself.");
    }

    const oldParent = node.parent;

    this.detach(node);

    const target = Math.max(
      0,
      Math.min(index ?? groupNode.children.length, groupNode.children.length),
    );

    groupNode.children.splice(target, 0, node);
    node.parent = groupNode;
    this.toLocalPosition(node, groupNode);

    this.syncGroupChildren(oldParent);
    this.syncGroupChildren(groupNode);
    this.onTreeChanged.emit();
  }

  /** Move a mobject back to the root layer. Appends (front-most) by default. */
  moveToRoot(mobjectId: string, index?: number): void {
    const node = this.getNode(mobjectId);
    const oldParent = node.parent;

    this.detach(node);

    const target = Math.max(
      0,
      Math.min(index ?? this.tree.roots.length, this.tree.roots.length),
    );

    this.tree.roots.splice(target, 0, node);
    node.parent = null;

    this.syncGroupChildren(oldParent);
    this.onTreeChanged.emit();
  }

  bringToFront(object: Mobject): void {
    const node = this.getNode(object.id);
    const parent = node.parent;
    const list = this.listFor(parent);
    const index = list.indexOf(node);

    if (index === -1 || index === list.length - 1) return;

    list.splice(index, 1);
    list.push(node);

    this.syncGroupChildren(parent);
    this.onTreeChanged.emit();
  }

  sendToBack(object: Mobject): void {
    const node = this.getNode(object.id);
    const parent = node.parent;
    const list = this.listFor(parent);
    const index = list.indexOf(node);

    if (index <= 0) return;

    list.splice(index, 1);
    list.unshift(node);

    this.syncGroupChildren(parent);
    this.onTreeChanged.emit();
  }

  bringForward(object: Mobject): void {
    const node = this.getNode(object.id);
    const parent = node.parent;
    const list = this.listFor(parent);
    const index = list.indexOf(node);

    if (index === -1 || index === list.length - 1) return;

    list.splice(index, 1);
    list.splice(index + 1, 0, node);

    this.syncGroupChildren(parent);
    this.onTreeChanged.emit();
  }

  sendBackward(object: Mobject): void {
    const node = this.getNode(object.id);
    const parent = node.parent;
    const list = this.listFor(parent);
    const index = list.indexOf(node);

    if (index <= 0) return;

    list.splice(index, 1);
    list.splice(index - 1, 0, node);

    this.syncGroupChildren(parent);
    this.onTreeChanged.emit();
  }

  /** Generate a fresh id that cannot collide with a restored scene. */
  private nextId(name: MobjectName): string {
    let id = this.idGenerator.generateId(name);

    while (this.tree.nodes.has(id)) {
      id = this.idGenerator.generateId(name);
    }

    return id;
  }

  delete(object: Mobject): void {
    const node = this.getNode(object.id);
    this.deleteNode(node);
    this.onTreeChanged.emit();
  }

  private deleteNode(node: MobjectNode): void {
    // Delete children first
    for (const child of [...node.children]) {
      this.deleteNode(child);
    }

    // Remove from parent/root
    if (node.parent) {
      const siblings = node.parent.children;
      siblings.splice(siblings.indexOf(node), 1);

      if (node.parent.mobject instanceof Group) {
        const groupChildren = node.parent.mobject.children;
        const groupIndex = groupChildren.findIndex(
          (child) => child.id === node.id,
        );

        if (groupIndex !== -1) {
          groupChildren.splice(groupIndex, 1);
        }
      }
    } else {
      this.tree.roots = this.tree.roots.filter((r) => r !== node);
    }

    this.tree.nodes.delete(node.id);

    // Emit for every node so dependent systems (animations, trackers,
    // selection) can clean up descendants as well as the root object.
    this.onRemove.emit(node.mobject);
  }

  ungroup(group: Group): void {
    const node = this.getNode(group.id);

    if (!(node.mobject instanceof Group)) {
      throw new Error("Object is not a Group.");
    }

    // Children keep their visual position when promoted: their coordinates
    // become relative to the group's parent (or the world for a root group).
    const groupPosition = node.mobject.properties.position.get();

    for (const child of node.children) {
      const position = child.mobject.properties.position;
      const current = position.get();

      position.set({
        x: current.x + groupPosition.x,
        y: current.y + groupPosition.y,
      });
    }

    if (node.parent) {
      const siblings = node.parent.children;
      const index = siblings.indexOf(node);

      // Remove group
      siblings.splice(index, 1);

      // Insert children in same position
      siblings.splice(index, 0, ...node.children);

      // Update parents
      for (const child of node.children) {
        child.parent = node.parent;
      }

      if (node.parent.mobject instanceof Group) {
        const parentChildren = node.parent.mobject.children;
        const groupIndex = parentChildren.findIndex(
          (child) => child.id === node.id,
        );

        if (groupIndex !== -1) {
          parentChildren.splice(
            groupIndex,
            1,
            ...node.children.map((child) => child.mobject),
          );
        }
      }
    } else {
      const roots = this.tree.roots;
      const index = roots.indexOf(node);

      roots.splice(index, 1);
      roots.splice(index, 0, ...node.children);

      for (const child of node.children) {
        child.parent = null;
      }
    }

    node.children.length = 0;
    (node.mobject as Group).children.length = 0;
    this.tree.nodes.delete(node.id);
    this.onRemove.emit(node.mobject);
    this.onTreeChanged.emit();
  }
}

class IdGenerator {
  private readonly counts = new Map<MobjectName, number>();

  generateId(name: MobjectName): string {
    const count = this.counts.get(name) ?? 0;

    this.counts.set(name, count + 1);

    return `${name}_${count}`;
  }
}
