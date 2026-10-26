/*
|--------------------------------------------------------------------------
| types3d.ts
|--------------------------------------------------------------------------
|
| Small, plain data types used by the 3D module. They intentionally mirror
| the `{ x, y }` shape used by the 2D engine, with an added `z` axis.
|
| These are data objects, not three.js instances: values are cheap to clone,
| serialise and compare, and can be handed to `THREE.Vector3` / `THREE.Euler`
| at the moment a transform is applied.
|
*/

/** A point or vector in world units, with +x right, +y up and +z forward. */
export type Vector3Data = {
  x: number;
  y: number;
  z: number;
};

/** Euler rotation in radians, matching `THREE.Euler` order XYZ. */
export type EulerData = {
  x: number;
  y: number;
  z: number;
};

export function zero3(): Vector3Data {
  return { x: 0, y: 0, z: 0 };
}

export function one3(): Vector3Data {
  return { x: 1, y: 1, z: 1 };
}

export function clone3(value: Vector3Data): Vector3Data {
  return { x: value.x, y: value.y, z: value.z };
}
