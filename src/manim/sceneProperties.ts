import { Values } from "./utils/value";

/*
|--------------------------------------------------------------------------
| sceneProperties.ts
|--------------------------------------------------------------------------
|
| Authored, scene-wide settings that are independent of the mobject tree.
| They are persisted in the scene document and can change the way the whole
| canvas is composed without moving any object.
|
| Keep these values in the same typed `Value` system as mobject properties so
| the editor can reuse the existing value editors and serialization helpers.
|
*/

export const DEFAULT_SCENE_BACKGROUND_COLOR = "#0b0b0f";
export const DEFAULT_SCENE_BACKGROUND_OPACITY = 1;
export const DEFAULT_SCENE_ASPECT_RATIO = "free";

export interface AspectRatioPreset {
  label: string;
  value: string;
}

export const ASPECT_RATIO_PRESETS: AspectRatioPreset[] = [
  { label: "Free · fill viewport", value: "free" },
  { label: "16:9 · landscape", value: "16:9" },
  { label: "9:16 · portrait", value: "9:16" },
  { label: "4:3 · classic", value: "4:3" },
  { label: "3:2 · photo", value: "3:2" },
  { label: "1:1 · square", value: "1:1" },
  { label: "21:9 · ultrawide", value: "21:9" },
];

/**
 * Parse a stored ratio such as `"16:9"` into `width / height`.
 * `"free"` (and anything invalid) means "use the full viewport".
 */
export function parseAspectRatio(value: string): number | null {
  const trimmed = value.trim().toLowerCase();

  if (!trimmed || trimmed === "free") return null;

  const parts = trimmed.split(":");

  if (parts.length !== 2) return null;

  const width = Number(parts[0]);
  const height = Number(parts[1]);

  if (
    !Number.isFinite(width) ||
    !Number.isFinite(height) ||
    width <= 0 ||
    height <= 0
  ) {
    return null;
  }

  return width / height;
}

/** Read the integer-ish `width:height` parts of a stored ratio. */
export function aspectRatioComponents(
  value: string,
): { width: number; height: number } | null {
  const trimmed = value.trim().toLowerCase();

  if (!trimmed || trimmed === "free") return null;

  const parts = trimmed.split(":");

  if (parts.length !== 2) return null;

  const width = Number(parts[0]);
  const height = Number(parts[1]);

  if (
    !Number.isFinite(width) ||
    !Number.isFinite(height) ||
    width <= 0 ||
    height <= 0
  ) {
    return null;
  }

  return { width, height };
}

function greatestCommonDivisor(a: number, b: number): number {
  let left = Math.abs(Math.round(a));
  let right = Math.abs(Math.round(b));

  while (right > 0) {
    const remainder = left % right;

    left = right;
    right = remainder;
  }

  return Math.max(1, left);
}

/** Build a reduced ratio string from a width and height, e.g. `16:9`. */
export function aspectRatioFromSize(width: number, height: number): string {
  if (
    !Number.isFinite(width) ||
    !Number.isFinite(height) ||
    width <= 0 ||
    height <= 0
  ) {
    return DEFAULT_SCENE_ASPECT_RATIO;
  }

  if (!Number.isInteger(width) || !Number.isInteger(height)) {
    return `${width}:${height}`;
  }

  const divisor = greatestCommonDivisor(width, height);

  return `${width / divisor}:${height / divisor}`;
}

/** Rough fraction for an already-parsed ratio, used when switching to custom. */
export function approximateAspectRatio(
  ratio: number,
  maxDenominator = 64,
): { width: number; height: number } {
  if (!Number.isFinite(ratio) || ratio <= 0) {
    return { width: 16, height: 9 };
  }

  let best = {
    width: Math.max(1, Math.round(ratio)),
    height: 1,
    error: Math.abs(Math.max(1, Math.round(ratio)) - ratio),
  };

  for (let height = 1; height <= maxDenominator; height += 1) {
    const width = Math.max(1, Math.round(ratio * height));
    const error = Math.abs(width / height - ratio);

    if (error < best.error) {
      best = { width, height, error };
    }

    if (error === 0) break;
  }

  return { width: best.width, height: best.height };
}

/** Human-readable label for the current ratio. */
export function formatAspectRatio(value: string): string {
  const trimmed = value.trim().toLowerCase();

  if (!trimmed || trimmed === "free") return "Free";

  return trimmed;
}

export class SceneProperties {
  readonly backgroundColor = Values.color(DEFAULT_SCENE_BACKGROUND_COLOR);

  readonly backgroundOpacity = Values.number(DEFAULT_SCENE_BACKGROUND_OPACITY);

  readonly aspectRatio = Values.string(DEFAULT_SCENE_ASPECT_RATIO);

  /** Aspect ratio used by the camera; `null` fills the canvas. */
  get ratio(): number | null {
    return parseAspectRatio(this.aspectRatio.get());
  }

  reset(): void {
    this.backgroundColor.set(DEFAULT_SCENE_BACKGROUND_COLOR);
    this.backgroundOpacity.set(DEFAULT_SCENE_BACKGROUND_OPACITY);
    this.aspectRatio.set(DEFAULT_SCENE_ASPECT_RATIO);
  }

  isDefault(): boolean {
    return (
      this.backgroundColor.get() === DEFAULT_SCENE_BACKGROUND_COLOR &&
      this.backgroundOpacity.get() === DEFAULT_SCENE_BACKGROUND_OPACITY &&
      this.aspectRatio.get() === DEFAULT_SCENE_ASPECT_RATIO
    );
  }
}
