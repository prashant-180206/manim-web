import { SelectionManager } from "../utils/selection";
import { Vector } from "../utils/types";
import { Value } from "../utils/value";
import { TrackerSystem } from "./trackerSystem";

interface TrackerInput {
  relation: Value<string>;
  target: Value<number> | Value<Vector>;
  [key: string]: Value<string> | Value<number> | Value<Vector>;
}

export class TrackerConnectionManager {
  constructor(
    private trackerSystem: TrackerSystem,
    private selection: SelectionManager,
  ) {}

  addConnection(trackerId: string, input: TrackerInput): void {
    const mob = this.selection.selectedMobject;
    if (!mob) {
      throw new Error("No mobject selected to add tracker connection.");
    }
    const tracker = this.trackerSystem.numberTrackers.get(trackerId);
    if (!tracker) {
      throw new Error(`Tracker with id ${trackerId} does not exist.`);
    }
    const relation = input.relation.get();
    tracker.changed.connect((v) => {});
  }
}
