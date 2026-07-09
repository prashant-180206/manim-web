import { Tracker } from "./tracker";

export class TrackerSystem {
  readonly events: TrackerEvents;

  add(tracker: Tracker): void;

  remove(tracker: Tracker): void;

  find(id: string): Tracker | undefined;

  clear(): void;

  invalidate(target: TrackerTarget): void;

  evaluate(): void;

  dispose(): void;
}
