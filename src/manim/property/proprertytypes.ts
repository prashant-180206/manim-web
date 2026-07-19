import { Value } from "../utils/value";
import { Vector } from "../utils/types";
// import { PropertyKey } from "./propertykey";

export interface BaseProperty {
  opacity: Value<number>;
  position: Value<Vector>;
  scale: Value<Vector>;
}

export interface ShapeProperty extends BaseProperty {
  strokeColor: Value<string>;
  strokeWidth: Value<number>;
  color: Value<string>;
}
