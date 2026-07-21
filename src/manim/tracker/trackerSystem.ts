import { Vector } from "../utils/types";
import { Tracker, Trackers } from "./tracker";
import { DependencyGraph } from "./dependencyGraph";

export interface TrackerInfo {
  id: string;
  name: string;
  type: "number" | "vector";
  tracker: Tracker<number> | Tracker<Vector>;
  editable: boolean;
}

export class TrackerSystem {
  // Trackers
  readonly numberTrackers = new Map<string, Tracker<number>>();
  readonly vectorTrackers = new Map<string, Tracker<Vector>>();

  // Dependency graph
  private readonly graph = new DependencyGraph();

  // Expression parser

  /*==================================================
   * Tracker Creation
   *==================================================*/

  addNumberTracker(name: string, value: number): Tracker<number> {
    const id = "";
    const tracker = Trackers.number(value, id);
    tracker.name = name;
    this.numberTrackers.set(id, tracker);
    this.graph.addNode(id);
    return tracker;
  }

  addVectorTracker(name: string, value: Vector): Tracker<Vector> {
    const id = "";
    const tracker = Trackers.vector(value, id);
    tracker.name = name;
    this.vectorTrackers.set(id, tracker);
    this.graph.addNode(id);
    return tracker;
  }

  removeTracker(id: string): void {
    this.numberTrackers.delete(id);
    this.vectorTrackers.delete(id);
    this.graph.removeNode(id);
  }

  renameTracker(id: string, name: string): void {
    const tracker = this.getTracker(id);
    if (tracker) {
      tracker.name = name;
    }
  }

  private getTracker(id: string): Tracker<number> | Tracker<Vector> {
    const tracker = this.numberTrackers.get(id) ?? this.vectorTrackers.get(id);
    if (!tracker) {
      throw new Error(`Tracker with id ${id} does not exist.`);
    }
    return tracker;
  }

  getTrackerInfo(): TrackerInfo[] {
    const info: TrackerInfo[] = [];
    for (const [id, tracker] of this.numberTrackers) {
      info.push({
        id: id,
        name: tracker.name,
        type: "number",
        tracker: tracker,
        editable: tracker.editable,
      });
    }
    for (const [id, tracker] of this.vectorTrackers) {
      info.push({
        id: id,
        name: tracker.name,
        type: "vector",
        tracker: tracker,
        editable: tracker.editable,
      });
    }
    return info;
  }
}
