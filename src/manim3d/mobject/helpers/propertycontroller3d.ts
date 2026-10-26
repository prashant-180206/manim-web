import type { Value } from "@/manim/utils/value";
import type { EulerData, Vector3Data } from "../../utils/types3d";
import { Values } from "@/manim/utils/value";
import { Values3D } from "../../utils/values3d";
import { one3, zero3 } from "../../utils/types3d";

/*
|--------------------------------------------------------------------------
| propertycontroller3d.ts
|--------------------------------------------------------------------------
|
| Mirrors `src/manim/mobject/helpers/propertycontroller.ts`, but the base
| property bag is expanded to three dimensions and gains `rotation`.
|
*/

export interface BaseProperty3D {
  opacity: Value<number>;
  position: Value<Vector3Data>;
  scale: Value<Vector3Data>;
  rotation: Value<EulerData>;
}

/** Fresh base property bag, so two mobjects never share `Value` instances. */
export function createBaseProperties3D(): BaseProperty3D {
  return {
    opacity: Values.number(1),
    position: Values3D.vector3(zero3()),
    scale: Values3D.vector3(one3()),
    rotation: Values3D.euler(zero3()),
  };
}

export class PropertyController3D<
  T extends BaseProperty3D = BaseProperty3D,
> {
  public properties: T;

  constructor(properties: T) {
    this.properties = properties;
  }

  /**
   * Untyped entries for serialization/inspection. `unknown` keeps the
   * controller assignable across concrete mobjects with different property
   * bags while still allowing callers to narrow each `Value`.
   */
  getEntries(): [string, unknown][] {
    return Object.entries(this.properties);
  }
}
