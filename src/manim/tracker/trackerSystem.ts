import { Vector } from "../utils/types";
import { Tracker } from "./tracker";

export class TrackerManager {
  private trackers: Map<string, Tracker<number | boolean | Vector>> = new Map();

  addTracker(id: string, tracker: Tracker<number | boolean | Vector>): void {
    this.trackers.set(id, tracker);
  }

  removeTracker(id: string): void {
    this.trackers.delete(id);
  }

  // connect
}
