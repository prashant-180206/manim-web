// /*
// |--------------------------------------------------------------------------
// | Property.ts
// |--------------------------------------------------------------------------
// |
// | Base property class.
// |
// |--------------------------------------------------------------------------
// */

// import { Mobject } from "../mobject/mobect";
// import { Value } from "../utils/value";
// import { PropertyKey } from "./propertykey";

// export abstract class Property<T> {
//   readonly id: string;
//   readonly key: PropertyKey;
//   readonly owner: Mobject;
//   protected value: Value<T>;

//   constructor(id: string, key: PropertyKey, owner: Mobject, value: Value<T>) {
//     this.id = id;
//     this.key = key;
//     this.owner = owner;
//     this.value = value;
//   }

//   getValue(): Value<T> {
//     return this.value;
//   }

//   getRawValue(): T {
//     return this.value.value;
//   }

//   setValue(value: Value<T>): void {
//     this.value = value;
//   }

//   setRawValue(value: T): void {
//     this.value.value = value;
//   }
// }
