/*
|--------------------------------------------------------------------------
| units.ts
|--------------------------------------------------------------------------
|
| The scene uses a single design coordinate system:
|
|   • origin  → centre of the viewport
|   • x-axis  → right
|   • y-axis  → up
|   • scale   → 50 CSS pixels per world unit
|
| Every property that describes a position or a geometric size (position,
| radius, width, height, vertices, …) is expressed in these units. Screen
| styles are deliberately excluded and stay in CSS pixels:
|
|   • strokeWidth
|   • fontSize
|   • opacity
|
| Rendering converts geometry to pixels once, through the scene camera.
|
*/

export const PIXELS_PER_UNIT = 50;

export function pixelsToUnits(pixels: number): number {
  return pixels / PIXELS_PER_UNIT;
}

export function unitsToPixels(units: number): number {
  return units * PIXELS_PER_UNIT;
}
