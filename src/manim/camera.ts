import { PIXELS_PER_UNIT } from "./utils/units";
import type { Vector } from "./utils/types";

/**
 * Maps the scene's design coordinates to the canvas.
 *
 * Design space is centred on the viewport, has 50 CSS pixels per unit and
 * points its positive y-axis up. All mobjects are authored in design units;
 * this camera is the single place that knows about pixels and device pixel
 * ratio.
 */
export class Camera {
  /** Logical (CSS pixel) size of the canvas. */
  width = 1;

  height = 1;

  pixelRatio = 1;

  /** Zoom of the camera. Changing this future-proofs pan/zoom. */
  pixelsPerUnit = PIXELS_PER_UNIT;

  /**
   * Aspect ratio (width / height) of the authored frame. `null` means the
   * frame fills the entire canvas.
   */
  aspectRatio: number | null = null;

  resize(width: number, height: number, pixelRatio = 1): void {
    this.width = Math.max(1, width);
    this.height = Math.max(1, height);
    this.pixelRatio = Math.max(1, pixelRatio);
  }

  setAspectRatio(ratio: number | null): void {
    this.aspectRatio =
      ratio !== null && Number.isFinite(ratio) && ratio > 0 ? ratio : null;
  }

  /**
   * The authored frame in CSS pixels, centred inside the canvas. When an
   * aspect ratio is set the frame is letterboxed; otherwise it is the full
   * viewport.
   */
  get frame(): { x: number; y: number; width: number; height: number } {
    if (this.aspectRatio === null) {
      return { x: 0, y: 0, width: this.width, height: this.height };
    }

    const viewportRatio = this.width / this.height;

    if (viewportRatio > this.aspectRatio) {
      const width = this.height * this.aspectRatio;

      return {
        x: (this.width - width) / 2,
        y: 0,
        width,
        height: this.height,
      };
    }

    const height = this.width / this.aspectRatio;

    return {
      x: 0,
      y: (this.height - height) / 2,
      width: this.width,
      height,
    };
  }

  /** CSS-pixel distance between the viewport centre and one world unit. */
  get unitSize(): number {
    return this.pixelsPerUnit;
  }

  /** Total scale including device pixel ratio (device pixels per unit). */
  get deviceScale(): number {
    return this.pixelsPerUnit * this.pixelRatio;
  }

  /** Centre of the viewport in world coordinates. */
  get worldCenter(): Vector {
    return { x: 0, y: 0 };
  }

  /** Visible world-space rectangle of the authored frame. */
  get bounds(): { left: number; right: number; bottom: number; top: number } {
    const frame = this.frame;
    const halfWidth = frame.width / (2 * this.pixelsPerUnit);
    const halfHeight = frame.height / (2 * this.pixelsPerUnit);

    return {
      left: -halfWidth,
      right: halfWidth,
      bottom: -halfHeight,
      top: halfHeight,
    };
  }

  /** World units → CSS pixels relative to the canvas top-left. */
  worldToScreen(point: Vector): Vector {
    const frame = this.frame;

    return {
      x: frame.x + frame.width / 2 + point.x * this.pixelsPerUnit,
      y: frame.y + frame.height / 2 - point.y * this.pixelsPerUnit,
    };
  }

  /** Canvas-relative CSS pixels → world units. */
  screenToWorld(point: Vector): Vector {
    const frame = this.frame;

    return {
      x:
        (point.x - (frame.x + frame.width / 2)) / this.pixelsPerUnit,
      y:
        (frame.y + frame.height / 2 - point.y) / this.pixelsPerUnit,
    };
  }

  /** Replace the current context transform with the world → device map. */
  applyTransform(ctx: CanvasRenderingContext2D): void {
    const scale = this.deviceScale;
    const frame = this.frame;

    ctx.setTransform(
      scale,
      0,
      0,
      -scale,
      (frame.x + frame.width / 2) * this.pixelRatio,
      (frame.y + frame.height / 2) * this.pixelRatio,
    );
  }

  /** Clear the full backing store, ignoring the current world transform. */
  clear(ctx: CanvasRenderingContext2D): void {
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.clearRect(
      0,
      0,
      Math.round(this.width * this.pixelRatio),
      Math.round(this.height * this.pixelRatio),
    );
  }
}
