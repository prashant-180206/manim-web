import { Mobject } from "../mobect";

export class MobjectTree {
  /** Top-level objects in draw order */
  roots: MobjectNode[] = [];

  /** Single source of truth */
  readonly nodes = new Map<string, MobjectNode>();

  removeRoots(...ids: string[]): void {
    this.roots = this.roots.filter((node) => !ids.includes(node.id));
  }

  private getList(node: MobjectNode): MobjectNode[] {
    return node.parent ? node.parent.children : this.roots;
  }

  private move(list: MobjectNode[], from: number, to: number): void {
    if (from === to) return;

    const [item] = list.splice(from, 1);

    if (from < to) {
      to--;
    }

    list.splice(to, 0, item);
  }

  bringToFront(node: MobjectNode): void {
    const list = this.getList(node);

    const index = list.indexOf(node);
    if (index === -1 || index === list.length - 1) return;

    this.move(list, index, list.length);
  }

  sendToBack(node: MobjectNode): void {
    const list = this.getList(node);

    const index = list.indexOf(node);
    if (index <= 0) return;

    this.move(list, index, 0);
  }

  bringForward(node: MobjectNode): void {
    const list = this.getList(node);

    const index = list.indexOf(node);
    if (index === -1 || index === list.length - 1) return;

    this.move(list, index, index + 2);
  }

  sendBackward(node: MobjectNode): void {
    const list = this.getList(node);

    const index = list.indexOf(node);
    if (index <= 0) return;

    this.move(list, index, index - 1);
  }

  moveBefore(node: MobjectNode, sibling: MobjectNode): void {
    if (node === sibling) return;
    if (node.parent !== sibling.parent) {
      throw new Error("Nodes are not siblings.");
    }

    const list = this.getList(node);

    const from = list.indexOf(node);
    const to = list.indexOf(sibling);

    if (from === -1 || to === -1) return;

    this.move(list, from, to);
  }

  moveAfter(node: MobjectNode, sibling: MobjectNode): void {
    if (node === sibling) return;
    if (node.parent !== sibling.parent) {
      throw new Error("Nodes are not siblings.");
    }

    const list = this.getList(node);

    const from = list.indexOf(node);
    const to = list.indexOf(sibling);

    if (from === -1 || to === -1) return;

    this.move(list, from, to + 1);
  }

  moveTo(node: MobjectNode, index: number): void {
    const list = this.getList(node);

    const from = list.indexOf(node);
    if (from === -1) return;

    index = Math.max(0, Math.min(index, list.length - 1));

    this.move(list, from, index);
  }
}
export class MobjectNode {
  readonly mobject: Mobject;

  parent: MobjectNode | null = null;
  readonly children: MobjectNode[] = [];

  visible = true;
  locked = false;

  constructor(mobject: Mobject) {
    this.mobject = mobject;
  }

  get id() {
    return this.mobject.id;
  }
}
