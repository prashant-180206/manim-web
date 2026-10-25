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
    const id = this.idGenerator.generateId(name);

    const mobject = MobjectRegistry.makeMobject(name, id);

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
    const group = new Group(
      this.idGenerator.generateId(MobjectName.Group),
      "Group",
    );

    const groupNode = new MobjectNode(group);

    this.tree.nodes.set(group.id, groupNode);

    for (const object of objects) {
      const node = this.getNode(object.id);

      // Remove from old parent/root
      if (node.parent) {
        const siblings = node.parent.children;
        siblings.splice(siblings.indexOf(node), 1);
      } else {
        this.tree.roots.splice(this.tree.roots.indexOf(node), 1);
      }

      // Attach to group
      node.parent = groupNode;
      groupNode.children.push(node);
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

      // Remove from old parent/root
      if (node.parent) {
        const siblings = node.parent.children;
        siblings.splice(siblings.indexOf(node), 1);
      } else {
        this.tree.roots.splice(this.tree.roots.indexOf(node), 1);
      }

      // Attach to group
      node.parent = groupNode;
      groupNode.children.push(node);
    }

    // The group may already be attached somewhere; only root groups need to
    // be re-added to the root list.
    if (!groupNode.parent && !this.tree.roots.includes(groupNode)) {
      this.tree.roots.push(groupNode);
    }

    this.onTreeChanged.emit();

    return groupNode.mobject as Group;
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
