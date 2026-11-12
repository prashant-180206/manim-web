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
  Cube3D,
  DEFAULT_CUBE_COLOR,
  type Cube3DOptions,
  type Cube3DProperty,
} from "./mobject/cube3d";
export {
  Sphere3D,
  DEFAULT_SPHERE_COLOR,
  type Sphere3DOptions,
  type Sphere3DProperty,
} from "./mobject/sphere3d";
export {
  Cylinder3D,
  DEFAULT_CYLINDER_COLOR,
  type Cylinder3DOptions,
  type Cylinder3DProperty,
} from "./mobject/cylinder3d";
export {
  Cone3D,
  DEFAULT_CONE_COLOR,
  type Cone3DOptions,
  type Cone3DProperty,
} from "./mobject/cone3d";
export {
  Box3D,
  DEFAULT_BOX_COLOR,
  type Box3DOptions,
  type Box3DProperty,
} from "./mobject/box3d";
export {
  Torus3D,
  DEFAULT_TORUS_COLOR,
  type Torus3DOptions,
  type Torus3DProperty,
} from "./mobject/torus3d";
export {
  Arrow3D,
  DEFAULT_ARROW_COLOR,
  type Arrow3DOptions,
  type Arrow3DProperty,
} from "./mobject/arrow3d";
export {
  Line3D,
  DEFAULT_LINE_COLOR,
  type Line3DOptions,
  type Line3DProperty,
} from "./mobject/line3d";
export {
  Dot3D,
  DEFAULT_DOT_COLOR,
  type Dot3DOptions,
  type Dot3DProperty,
} from "./mobject/dot3d";
export {
  Surface3D,
  DEFAULT_SURFACE_COLOR,
  type Surface3DOptions,
  type Surface3DProperty,
} from "./mobject/surface3d";

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
  Scene3DProperties,
  DEFAULT_SCENE3D_PROPERTIES,
  type Scene3DPropertiesData,
} from "./scene3dProperties";

export { Animation3DName } from "./animation/animation3dName";
export {
  Animation3D,
  type Animation3DOptions,
  type Animation3DTarget,
  type Animation3DTargetType,
} from "./animation/animation3d";
export {
  Animation3DProvider,
  type Animation3DInput,
  type Animation3DFactory,
} from "./animation/animation3dProvider";
export { Animation3DRegistry } from "./animation/animation3dRegistry";
export { Animation3DSystem } from "./animation/animation3dSystem";

export {
  Animation3DUI,
  ANIMATION3D_ICONS,
  type Anim3DCreationUiData,
  type Animation3DItemUIData,
  type Animation3DPlaybackUIData,
  type Animation3DTimelineUIData,
} from "./UI/animation3dUI";

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
