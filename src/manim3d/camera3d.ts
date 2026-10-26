import * as THREE from "three";
import { PIXELS_PER_UNIT } from "@/manim/utils/units";
import type { Vector3Data } from "./utils/types3d";

/*
|--------------------------------------------------------------------------
| camera3d.ts
|--------------------------------------------------------------------------
|
| The single place that maps 3D world units to screen pixels.
|
| The camera looks straight down -z at a focus plane through `target` (the
| world origin by default) and is framed so that, on that plane, one world
| unit spans `PIXELS_PER_UNIT` (50) CSS pixels. That keeps 2D and 3D scenes
| visually consistent and makes `position` values portable between them.
|
| OrbitControls and an angled/preset camera are intentionally deferred; a
| future camera rig should keep `resize()` and `distance` semantics.
|
*/

export interface Camera3DOptions {
  /** Vertical field of view in degrees. Defaults to 45. */
  fov?: number;
  /** Focus point in world units. Defaults to the origin. */
  target?: Vector3Data;
}

export class Camera3D {
  readonly camera: THREE.PerspectiveCamera;

  /** Point the camera looks at; also the centre of the focus plane. */
  readonly target = new THREE.Vector3();

  /** Logical (CSS pixel) viewport size. */
  width = 1;

  height = 1;

  pixelRatio = 1;

  constructor(options: Camera3DOptions = {}) {
    this.camera = new THREE.PerspectiveCamera(options.fov ?? 45, 1, 0.01, 5000);

    if (options.target) {
      this.target.set(options.target.x, options.target.y, options.target.z);
    }

    this.frame();
  }

  /** CSS-pixel distance between the viewport centre and one world unit. */
  get unitSize(): number {
    return PIXELS_PER_UNIT;
  }

  /**
   * Camera distance from the focus plane that makes one unit equal
   * `PIXELS_PER_UNIT` CSS pixels at the current viewport height.
   */
  get distance(): number {
    const halfFov = THREE.MathUtils.degToRad(this.camera.fov) / 2;

    return this.height / PIXELS_PER_UNIT / (2 * Math.tan(halfFov));
  }

  resize(width: number, height: number, pixelRatio = 1): void {
    this.width = Math.max(1, width);
    this.height = Math.max(1, height);
    this.pixelRatio = Math.max(1, pixelRatio);
    this.camera.aspect = this.width / this.height;
    this.frame();
  }

  setTarget(target: Vector3Data): void {
    this.target.set(target.x, target.y, target.z);
    this.frame();
  }

  /** Recompute camera placement and the projection matrix. */
  frame(): void {
    const distance = this.distance;

    // Keep the depth range proportional to the framing distance so precision
    // does not collapse when the viewport grows.
    this.camera.near = Math.max(0.01, distance / 1000);
    this.camera.far = Math.max(100, distance * 1000);

    this.camera.position.set(
      this.target.x,
      this.target.y,
      this.target.z + distance,
    );
    this.camera.lookAt(this.target);
    this.camera.updateProjectionMatrix();
  }

  /**
   * Project a world point to CSS pixels relative to the canvas top-left.
   * `project()` needs current world matrices, so refresh them first rather
   * than assuming a render has already happened.
   */
  worldToScreen(point: Vector3Data): { x: number; y: number } {
    this.camera.updateMatrixWorld();

    const projected = new THREE.Vector3(point.x, point.y, point.z).project(
      this.camera,
    );

    return {
      x: ((projected.x + 1) / 2) * this.width,
      y: ((1 - projected.y) / 2) * this.height,
    };
  }
}
