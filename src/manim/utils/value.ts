/*
|--------------------------------------------------------------------------
| Value.ts
|--------------------------------------------------------------------------
|
| Base value types used by properties, trackers and animations.
|
|--------------------------------------------------------------------------
*/

import { Vector } from "./types";

export enum ValueType {
  number = "number",
  string = "string",
  boolean = "boolean",
  vector = "vector",
  color = "color",
  easing = "easing",
}

export class Value<T> {
  constructor(
    public value: T,
    private _type: ValueType = ValueType.number,
  ) {
    this.value = value;
  }
  get() {
    return this.value;
  }
  set(newValue: T) {
    this.value = newValue;
  }
  type() {
    return this._type;
  }
}

export class Values {
  static number(value: number) {
    return new Value<number>(value, ValueType.number);
  }

  static string(value: string) {
    return new Value<string>(value, ValueType.string);
  }

  static boolean(value: boolean) {
    return new Value<boolean>(value, ValueType.boolean);
  }

  static vector(value: Vector) {
    return new Value<Vector>(value, ValueType.vector);
  }
  static easing(value: (t: number) => number) {
    return new Value<(t: number) => number>(value, ValueType.easing);
  }
}
