import { Signal } from "../../events/signal";
import { Group } from "../group";
import { Mobject } from "../mobect";
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
    }

    // The group may already be attached somewhere; only root groups need to
    // be re-added to the root list.
    if (!groupNode.parent && !this.tree.roots.includes(groupNode)) {
      this.tree.roots.push(groupNode);
    }

    this.onTreeChanged.emit();

    return groupNode.mobject as Group;
  }

  /** Remove a node from its current parent (or the root list). */
  private detach(node: MobjectNode): void {
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
