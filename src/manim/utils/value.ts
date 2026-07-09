/*
|--------------------------------------------------------------------------
| Value.ts
|--------------------------------------------------------------------------
|
| Base value types used by properties, trackers and animations.
|
|--------------------------------------------------------------------------
*/

import { Vector } from "./vector";

/*
|--------------------------------------------------------------------------
| Files Required
|--------------------------------------------------------------------------
|
| ../math/Vector.ts
| ../graphics/Color.ts
|
|--------------------------------------------------------------------------
*/

export class Value<T> {
  constructor(public value: T) {
    this.value = value;
  }
  get() {
    return this.value;
  }
  change(newValue: T) {
    this.value = newValue;
  }
}

export type NumberValue = Value<number>;
export type StringValue = Value<string>;
export type BooleanValue = Value<boolean>;
export type VectorValue = Value<Vector>;
// export type ColorValue = Value<Color>;
