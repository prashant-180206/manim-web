/*
|--------------------------------------------------------------------------
| src/manim3d — public surface
|--------------------------------------------------------------------------
|
| Nothing imports this barrel yet. The module is a scaffold for a future 3D
| editor and is not wired into routes, context or the editor shell.
|
*/

export { Camera3D, type Camera3DOptions } from "./camera3d";
export { Scene3D, type Scene3DOptions } from "./scene3d";

export { Mobject3D } from "./mobject/mobject3d";
export {
  Sphere3D,
  DEFAULT_SPHERE_COLOR,
  type Sphere3DOptions,
  type Sphere3DProperty,
} from "./mobject/sphere3d";
export {
  Box3D,
  DEFAULT_BOX_COLOR,
  type Box3DOptions,
  type Box3DProperty,
} from "./mobject/box3d";

export {
  PropertyController3D,
  createBaseProperties3D,
  type BaseProperty3D,
} from "./mobject/helpers/propertycontroller3d";
export { Mobject3DName } from "./mobject/helpers/mobject3dName";
export { Mobject3DRegistry } from "./mobject/helpers/mobject3dRegistry";
export { Mobject3DManager } from "./mobject/helpers/mobject3dManager";

export { Values3D } from "./utils/values3d";
export {
  clone3,
  one3,
  zero3,
  type EulerData,
  type Vector3Data,
} from "./utils/types3d";

export {
  SCENE3D_FILE_FORMAT,
  SCENE3D_FILE_VERSION,
  type Scene3DDocument,
  type SerializedAnimation3D,
  type SerializedCamera3D,
  type SerializedMobject3D,
  type SerializedValue3D,
} from "./serialization/scene3dSerializer";
