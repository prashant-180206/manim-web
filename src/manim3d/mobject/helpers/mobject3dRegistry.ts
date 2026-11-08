import { Arrow3D } from "../arrow3d";
import { Box3D } from "../box3d";
import { Cone3D } from "../cone3d";
import { Cube3D } from "../cube3d";
import { Cylinder3D } from "../cylinder3d";
import { Dot3D } from "../dot3d";
import { Line3D } from "../line3d";
import { Sphere3D } from "../sphere3d";
import { Surface3D } from "../surface3d";
import { Torus3D } from "../torus3d";
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
      case Mobject3DName.Cube:
        return new Cube3D(id, Mobject3DName.Cube.toString());
      case Mobject3DName.Sphere:
        return new Sphere3D(id, Mobject3DName.Sphere.toString());
      case Mobject3DName.Cylinder:
        return new Cylinder3D(id, Mobject3DName.Cylinder.toString());
      case Mobject3DName.Cone:
        return new Cone3D(id, Mobject3DName.Cone.toString());
      case Mobject3DName.Box:
        // The persisted kind stays `Box`; the editor presents it as Prism.
        return new Box3D(id, "Prism");
      case Mobject3DName.Torus:
        return new Torus3D(id, Mobject3DName.Torus.toString());
      case Mobject3DName.Arrow:
        return new Arrow3D(id, Mobject3DName.Arrow.toString());
      case Mobject3DName.Line:
        return new Line3D(id, Mobject3DName.Line.toString());
      case Mobject3DName.Dot:
        return new Dot3D(id, Mobject3DName.Dot.toString());
      case Mobject3DName.Surface:
        return new Surface3D(id, Mobject3DName.Surface.toString());
      default:
        throw new Error(`Unknown Mobject3DName: ${String(kind)}`);
    }
  }
}
