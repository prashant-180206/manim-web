export abstract class Tracker {
  readonly id: string;

  readonly enabled: boolean;

  readonly dirty: boolean;

  readonly dependencies: readonly TrackerTarget[];

  readonly outputs: readonly TrackerTarget[];

  invalidate(): void;

  evaluate(): void;

  dispose(): void;
}
export class TrackerTarget {
  readonly objectId: string;

  readonly property: PropertyKey;
}

export class Binding {
  readonly source: TrackerTarget;

  readonly target: TrackerTarget;

  readonly direction: BindingDirection;
}
export enum BindingDirection {
  OneWay,

  TwoWay,
}

export interface TrackerProvider {
  create(): Tracker;
}

export class TrackerEvents {
  readonly added;

  readonly removed;

  readonly evaluated;

  readonly invalidated;
}
