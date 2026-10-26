/**
 * Registry kinds for 3D mobjects. Keep these strings stable: scene files
 * persist `kind` and use it to rebuild objects on open.
 */
export enum Mobject3DName {
  Sphere = "Sphere",
  Box = "Box",
}
