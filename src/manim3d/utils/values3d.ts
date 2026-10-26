import { Value, ValueType } from "@/manim/utils/value";
import type { EulerData, Vector3Data } from "./types3d";

/*
|--------------------------------------------------------------------------
| values3d.ts
|--------------------------------------------------------------------------
|
| The 2D `Value`/`Values` helpers are reused as-is so the editor's existing
| property editors, serialisation helpers and inspector conventions keep
| working for 3D objects.
|
| `Values.vector` is typed as `{ x, y }` only. The 3D factories below store
| three-component data under the same `ValueType.vector` tag; the extra `z`
| component is preserved by the data itself. A dedicated `ValueType.vector3`
| can be added later if a property editor needs to tell them apart.
|
*/

export class Values3D {
  static vector3(value: Vector3Data): Value<Vector3Data> {
    return new Value<Vector3Data>(value, ValueType.vector);
  }

  static euler(value: EulerData): Value<EulerData> {
    return new Value<EulerData>(value, ValueType.vector);
  }
}
