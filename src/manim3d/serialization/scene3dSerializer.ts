import type { ValueType } from "@/manim/utils/value";
import type { Mobject3DName } from "../mobject/helpers/mobject3dName";
import type { Vector3Data } from "../utils/types3d";

/*
|--------------------------------------------------------------------------
| scene3dSerializer.ts
|--------------------------------------------------------------------------
|
| Contract only. This file defines the 3D scene file format and its document
| types; `serializeScene3D`, `parseScene3DDocument` and `applyScene3D` are
| intentionally not implemented yet.
|
| The 2D `manim-web-scene` v3 document is not extended with 3D fields: a file
| is either a 2D scene or a 3D scene, and each has its own version stream.
|
*/

export const SCENE3D_FILE_FORMAT = "manim-web-scene3d";
export const SCENE3D_FILE_VERSION = 1;

export interface SerializedValue3D {
  type: ValueType;
  value: unknown;
}

export interface SerializedMobject3D {
  id: string;
  kind: Mobject3DName;
  name: string;
  visible: boolean;
  locked: boolean;
  properties: Record<string, SerializedValue3D>;
  /**
   * Nested children. Grouping is not implemented in the scaffold, so this is
   * always empty today; the recursive shape reserves the format for it.
   */
  children: SerializedMobject3D[];
}

export interface SerializedAnimation3D {
  targetId: string;
  name: string;
  start: number;
  duration: number;
  easing: string;
  params: Record<string, SerializedValue3D>;
}

export interface SerializedCamera3D {
  fov: number;
  target: Vector3Data;
}

export interface Scene3DDocument {
  format: typeof SCENE3D_FILE_FORMAT;
  version: typeof SCENE3D_FILE_VERSION;
  name: string;
  savedAt: string;
  width: number;
  height: number;
  camera: SerializedCamera3D;
  mobjects: SerializedMobject3D[];
  animations: SerializedAnimation3D[];
  timeline: {
    currentTime: number;
  };
}
