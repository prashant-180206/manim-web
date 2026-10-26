/*
|--------------------------------------------------------------------------
| src/manim3d — public surface
|--------------------------------------------------------------------------
|
| Runtime pieces for the 3D editor mounted at `/scene3d`. The editor layer
| itself lives in `src/components/editor3d`, with its provider in
| `src/context/scene3dContext.tsx` and canvas in
| `src/components/Scene3DCanvas.tsx`.
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
export { Selection3D } from "./utils/selection3d";
export {
  clone3,
  one3,
  zero3,
  type EulerData,
  type Vector3Data,
} from "./utils/types3d";

export {
  Mobject3DUI,
  MOBJECT3D_DESCRIPTIONS,
  MOBJECT3D_ICONS,
  MOBJECT3D_LABELS,
  type Mobject3DCreationUIData,
  type Mobject3DTreeControlData,
} from "./UI/mobject3dUI";

export {
  SCENE3D_FILE_FORMAT,
  SCENE3D_FILE_VERSION,
  applyScene3D,
  clearScene3D,
  hasScene3DContent,
  parseScene3DDocument,
  serializeScene3D,
  type Scene3DApplySummary,
  type Scene3DDocument,
  type SerializedAnimation3D,
  type SerializedCamera3D,
  type SerializedMobject3D,
  type SerializedValue3D,
} from "./serialization/scene3dSerializer";
