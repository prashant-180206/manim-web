import { Box3D } from "../box3d";
import { Sphere3D } from "../sphere3d";
import { Mobject3D } from "../mobject3d";
import { Mobject3DName } from "./mobject3dName";

/*
|--------------------------------------------------------------------------
| mobject3dRegistry.ts
|--------------------------------------------------------------------------
|
| Mirrors `MobjectRegistry`: constructors are `(id, name)` so saved scenes can
| be rebuilt without the caller knowing any primitive-specific options.
|
*/

export class Mobject3DRegistry {
  static make(kind: Mobject3DName, id: string): Mobject3D {
    switch (kind) {
      case Mobject3DName.Sphere:
        return new Sphere3D(id, Mobject3DName.Sphere.toString());
      case Mobject3DName.Box:
        return new Box3D(id, Mobject3DName.Box.toString());
      default:
        throw new Error(`Unknown Mobject3DName: ${String(kind)}`);
    }
  }
}
