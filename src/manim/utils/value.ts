/*
|--------------------------------------------------------------------------
| Value.ts
|--------------------------------------------------------------------------
|
| Base value types used by properties, trackers and animations.
|
|--------------------------------------------------------------------------
*/

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
class Vector {
  constructor(
    public x: number,
    public y: number,
  ) {
    this.x = x;
    this.y = y;
  }
}

export class Value<T> {
  constructor(public value: T) {
    this.value = value;
  }
}

export type NumberValue = Value<number>;
export type StringValue = Value<string>;
export type BooleanValue = Value<boolean>;
export type VectorValue = Value<Vector>;
// export type ColorValue = Value<Color>;
