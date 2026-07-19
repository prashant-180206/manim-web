import { Signal } from "../events/signal";
import { Vector } from "../utils/types";
import { Value, Values, ValueType } from "../utils/value";
// import { TrackableValue } from "./trackablevalue";

export class Tracker<T extends number | Vector | boolean> {
  readonly value: Value<T>;
  type: ValueType;
  editable = true;
  name = "";
  private _id: string;
  public get id() {
    return this._id;
  }
  public set id(value) {
    this._id = value;
  }

  readonly changed = new Signal<[Value<T>]>();

  constructor(value: Value<T>, type: ValueType, id: string) {
    this._id = id;
    this.value = value;
    this.type = type;
  }

  set(newValue: T) {
    this.value.set(newValue);
    this.changed.emit(this.value);
  }

  get(): T {
    return this.value.get();
  }
}

export class Trackers {
  static number(value: number, id: string) {
    return new Tracker(Values.number(value), ValueType.number, id);
  }

  static boolean(value: boolean, id: string) {
    return new Tracker(Values.boolean(value), ValueType.boolean, id);
  }

  static vector(value: Vector, id: string) {
    return new Tracker(Values.vector(value), ValueType.vector, id);
  }
}
