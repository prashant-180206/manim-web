export class DependencyGraph {
  /**
   * parent -> children
   */
  private readonly outgoing = new Map<string, Set<string>>();

  /**
   * child -> parents
   */
  private readonly incoming = new Map<string, Set<string>>();

  /*==================================================
   * Nodes
   *==================================================*/

  addNode(id: string): void {
    this.outgoing.set(id, this.outgoing.get(id) ?? new Set());
    this.incoming.set(id, this.incoming.get(id) ?? new Set());
  }

  renameNode(oldId: string, newId: string): void {
    if (oldId === newId) return;

    if (!this.hasNode(oldId)) {
      throw new Error(`Node '${oldId}' does not exist.`);
    }

    if (this.hasNode(newId)) {
      throw new Error(`Node '${newId}' already exists.`);
    }

    // Copy adjacency lists
    const outgoing = new Set(this.outgoing.get(oldId)!);
    const incoming = new Set(this.incoming.get(oldId)!);

    // Create new node
    this.outgoing.set(newId, outgoing);
    this.incoming.set(newId, incoming);

    // Update parents
    for (const parent of incoming) {
      const children = this.outgoing.get(parent)!;
      children.delete(oldId);
      children.add(newId);
    }

    // Update children
    for (const child of outgoing) {
      const parents = this.incoming.get(child)!;
      parents.delete(oldId);
      parents.add(newId);
    }

    // Remove old node
    this.outgoing.delete(oldId);
    this.incoming.delete(oldId);
  }

  removeNode(id: string): void {
    // Remove outgoing edges
    const children = this.outgoing.get(id);
    if (children) {
      for (const child of children) {
        this.incoming.get(child)?.delete(id);
      }
    }

    // Remove incoming edges
    const parents = this.incoming.get(id);
    if (parents) {
      for (const parent of parents) {
        this.outgoing.get(parent)?.delete(id);
      }
    }

    this.outgoing.delete(id);
    this.incoming.delete(id);
  }

  hasNode(id: string): boolean {
    return this.outgoing.has(id);
  }

  clear(): void {
    this.outgoing.clear();
    this.incoming.clear();
  }

  /*==================================================
   * Edges
   *==================================================*/

  addEdge(from: string, to: string): void {
    this.addNode(from);
    this.addNode(to);

    if (this.createsCycle(from, to)) {
      throw new Error(`Adding edge '${from}' -> '${to}' creates a cycle.`);
    }

    this.outgoing.get(from)!.add(to);
    this.incoming.get(to)!.add(from);
  }

  removeEdge(from: string, to: string): void {
    this.outgoing.get(from)?.delete(to);
    this.incoming.get(to)?.delete(from);
  }

  hasEdge(from: string, to: string): boolean {
    return this.outgoing.get(from)?.has(to) ?? false;
  }

  /*==================================================
   * Queries
   *==================================================*/

  getChildren(id: string): readonly string[] {
    return [...(this.outgoing.get(id) ?? [])];
  }

  getParents(id: string): readonly string[] {
    return [...(this.incoming.get(id) ?? [])];
  }

  hasIncoming(id: string): boolean {
    return (this.incoming.get(id)?.size ?? 0) > 0;
  }

  hasOutgoing(id: string): boolean {
    return (this.outgoing.get(id)?.size ?? 0) > 0;
  }

  /*==================================================
   * Traversal
   *==================================================*/

  getDependents(root: string): string[] {
    const result: string[] = [];
    const visited = new Set<string>();

    const dfs = (id: string) => {
      if (visited.has(id)) return;

      visited.add(id);

      for (const child of this.outgoing.get(id) ?? []) {
        result.push(child);
        dfs(child);
      }
    };

    dfs(root);

    return result;
  }

  topologicalSort(): string[] {
    const indegree = new Map<string, number>();

    for (const node of this.outgoing.keys()) {
      indegree.set(node, this.incoming.get(node)?.size ?? 0);
    }

    const queue: string[] = [];

    for (const [id, degree] of indegree) {
      if (degree === 0) {
        queue.push(id);
      }
    }

    const result: string[] = [];

    while (queue.length) {
      const node = queue.shift()!;

      result.push(node);

      for (const child of this.outgoing.get(node) ?? []) {
        const degree = indegree.get(child)! - 1;

        indegree.set(child, degree);

        if (degree === 0) {
          queue.push(child);
        }
      }
    }

    return result;
  }

  /*==================================================
   * Cycle Detection
   *==================================================*/

  createsCycle(from: string, to: string): boolean {
    if (from === to) return true;

    const visited = new Set<string>();

    const dfs = (id: string): boolean => {
      if (id === from) {
        return true;
      }

      if (visited.has(id)) {
        return false;
      }

      visited.add(id);

      for (const child of this.outgoing.get(id) ?? []) {
        if (dfs(child)) {
          return true;
        }
      }

      return false;
    };

    return dfs(to);
  }
}
