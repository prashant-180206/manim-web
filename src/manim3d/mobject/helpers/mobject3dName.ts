/**
 * Registry kinds for 3D mobjects. Keep these strings stable: scene files
 * persist `kind` and use it to rebuild objects on open.
 */
export enum Mobject3DName {
  Cube = "Cube",
  Sphere = "Sphere",
  Cylinder = "Cylinder",
  Cone = "Cone",
  Box = "Box",
  Torus = "Torus",
  Arrow = "Arrow",
  Line = "Line",
  Dot = "Dot",
  Surface = "Surface",
}
