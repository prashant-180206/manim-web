import { Value } from "../utils/value";
import { Vector } from "../utils/types";

export interface BaseProperty {
  opacity: Value<number>;
  position: Value<Vector>;
  zindex: Value<number>;
  scale: Value<Vector>;
  color: Value<string>;
}

export interface ShapeProperty extends BaseProperty {
  strokeColor: Value<string>;
  strokeWidth: Value<number>;
}
