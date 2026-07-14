import { Signal } from "../events/signal";
import { Vector } from "../utils/types";
import { Value, Values, ValueType } from "../utils/value";
// import { TrackableValue } from "./trackablevalue";

export class Tracker<T extends number | Vector | boolean> {
  readonly value: Value<T>;
  type: ValueType;

  readonly changed = new Signal<[Value<T>]>();

  constructor(value: Value<T>, type: ValueType) {
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
  static number(value: number) {
    return new Tracker(Values.number(value), ValueType.number);
  }

  static boolean(value: boolean) {
    return new Tracker(Values.boolean(value), ValueType.boolean);
  }

  static vector(value: Vector) {
    return new Tracker(Values.vector(value), ValueType.vector);
  }
}
