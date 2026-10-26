import { Signal } from "../events/signal";
import { Value } from "../utils/value";
import { AnimationProvider } from "../animation/animationProvider";
import type { Vector } from "../utils/types";

export type TrackerComponent = "x" | "y";

export interface TrackerComponents {
  x: Tracker;
  y: Tracker;
}

export class Tracker {
  readonly value: Value<number>;
  editable = true;
  name = "";
  readonly animationTargetType = "tracker" as const;

  /** Per-tracker animation factories; tracker targets use the same timeline. */
  readonly animations = new AnimationProvider<Tracker>(this);

  private _components: TrackerComponents | null = null;
  private _parent: Tracker | null = null;
  private _component: TrackerComponent | null = null;

  private _id: string;
  public get id() {
    return this._id;
  }
  public set id(value) {
    this._id = value;
  }

  readonly changed = new Signal<[Value<number>]>();

  constructor(value: number, id: string) {
    this._id = id;
    this.value = new Value<number>(value);
  }

  /**
   * A vector tracker is a group of two scalar trackers. The children keep
   * their own ids so bindings and saved scenes can address them individually,
   * while the parent is the single tracker shown in the editor.
   */
  static createVector(
    id: string,
    value: Vector,
    componentIds: { x: string; y: string },
  ): Tracker {
    const x = new Tracker(value.x, componentIds.x);
    const y = new Tracker(value.y, componentIds.y);

    const tracker = new Tracker(0, id);

    x._parent = tracker;
    x._component = "x";
    y._parent = tracker;
    y._component = "y";

    tracker._components = { x, y };

    return tracker;
  }

  get components(): TrackerComponents | null {
    return this._components;
  }

  get parent(): Tracker | null {
    return this._parent;
  }

  get component(): TrackerComponent | null {
    return this._component;
  }

  get isVector(): boolean {
    return this._components !== null;
  }

  get isComponent(): boolean {
    return this._parent !== null;
  }

  set(newValue: number) {
    if (this._components) {
      throw new Error(
        `Tracker '${this.name}' is a vector; use setVector() instead.`,
      );
    }

    this.value.set(newValue);
    this.changed.emit(this.value);
  }

  get(): number {
    return this.value.get();
  }

  getVector(): Vector {
    if (!this._components) {
      throw new Error(`Tracker '${this.name}' is not a vector.`);
    }

    return {
      x: this._components.x.get(),
      y: this._components.y.get(),
    };
  }

  /**
   * Updating the vector updates each child tracker, which emits its own
   * `changed` signal so property bindings and the editor refresh normally.
   */
  setVector(newValue: Vector): void {
    if (!this._components) {
      throw new Error(`Tracker '${this.name}' is not a vector.`);
    }

    this._components.x.set(newValue.x);
    this._components.y.set(newValue.y);
  }

  rename(name: string): void {
    this.name = name;

    if (!this._components) return;

    this._components.x.name = `${name}.x`;
    this._components.y.name = `${name}.y`;
  }
}
