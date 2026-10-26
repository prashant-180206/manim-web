# `src/manim3d` — 3D module scaffold

This module is the 3D counterpart of `src/manim`. It is **not wired into the
app yet**: no route, provider, editor panel or canvas imports it. It exists so
the next 3D task has a stable structure, shared conventions and a renderer that
already matches the 2D world scale.

The renderer is three.js (`WebGLRenderer`). The module is intentionally small
and only contains the runtime pieces needed to create, transform and draw 3D
mobjects.

## 2D → 3D map

| 2D (`src/manim`) | 3D (`src/manim3d`) | Status |
| --- | --- | --- |
| `scene.ts` | `scene3d.ts` | Renderer, scene, light rig, loop, resize, dispose |
| `camera.ts` | `camera3d.ts` | Perspective framing; 1 unit = 50 CSS px at `z = 0` |
| `mobject/mobect.ts` | `mobject/mobject3d.ts` | Base transform + `Value` properties + `sync()` |
| `mobject/circle.ts`, `regularPolygon.ts` | `mobject/sphere3d.ts`, `mobject/box3d.ts` | Two starter primitives |
| `mobject/helpers/propertycontroller.ts` | `mobject/helpers/propertycontroller3d.ts` | 3D property bag |
| `mobject/helpers/proprertytypes.ts` | folded into `propertycontroller3d.ts` | `BaseProperty3D` + factory |
| `mobject/helpers/mobjectName.ts` | `mobject/helpers/mobject3dName.ts` | `Sphere`, `Box` |
| `mobject/helpers/mobjectregistry.ts` | `mobject/helpers/mobject3dRegistry.ts` | `(id, name)` constructors |
| `mobject/helpers/mobjectmanager.ts` | `mobject/helpers/mobject3dManager.ts` | Flat roots, ids, add/delete/restore |
| `mobject/helpers/MobjectTree.ts` | — | Grouping/tree is deferred |
| `events/signal.ts` | imported from `src/manim/events/signal.ts` | Shared |
| `utils/value.ts` | imported + `utils/values3d.ts` | Shared `Value`/`ValueType` |
| `utils/units.ts` | imported from `src/manim/utils/units.ts` | Shared `PIXELS_PER_UNIT` |
| `serialization/sceneSerializer.ts` | `serialization/scene3dSerializer.ts` | **Types/constants only** |
| `utils/loop.ts` | three.js `Timer` + `renderer.setAnimationLoop` | No manual rAF |
| `utils/selection.ts` | — | Raycasting selection deferred |
| `animation/*` | — | Deferred |
| `tracker/*` | — | Deferred |
| `UI/*` | — | Deferred |

## Conventions

- **World units are shared with 2D.** `1 unit = 50 CSS pixels`
  (`PIXELS_PER_UNIT`). `position`, `scale`, `radius`, `width`, `height` and
  `depth` are world units; `opacity` is unitless and `rotation` is radians.
- **+x right, +y up, +z toward the viewer.** The default camera sits on `+z`
  and looks down `-z` at the `z = 0` focus plane.
- **Properties use the existing `Value` helpers.** `Values3D.vector3()` and
  `Values3D.euler()` store `{ x, y, z }` data under `ValueType.vector`; the 2D
  `Values.vector()` is still typed `{ x, y }`. Add a dedicated
  `ValueType.vector3` only when an editor/inspector needs to distinguish them.
- **`sync()` is explicit.** Mutating a `Value` does not push anything to
  three.js. Call `mobject.sync()` (or the primitive's `setRadius` / `setSize` /
  `setColor`) after a batch of edits. This mirrors the editor's explicit
  `refresh()` convention.
- **Resource ownership.** `Mobject3D` disposes materials; primitives dispose
  their geometry. `Mobject3DManager.delete()` disposes by default.
- **DPR is capped at 2** by `Scene3D` to keep the WebGL drawing buffer bounded.
- **Separate file format.** `SCENE3D_FILE_FORMAT = "manim-web-scene3d"` and
  `SCENE3D_FILE_VERSION = 1`; the 2D v3 format is not extended with 3D fields.

## Public entry point

Import from `@/manim3d` (the barrel re-exports every type and class below):

```ts
import { Scene3D, Mobject3DName } from "@/manim3d";

const scene = new Scene3D(canvas, { background: "#111318" });
const sphere = scene.mobjectManager.add(Mobject3DName.Sphere);
sphere.properties.position.set({ x: 0, y: 0, z: 0 });
sphere.sync();

scene.resize(canvas.clientWidth, canvas.clientHeight, window.devicePixelRatio);
scene.start();
```

`Scene3D` takes an existing canvas and does **not** attach it to the DOM. The
future host component owns layout and calls `resize()` from a `ResizeObserver`,
the same way `SceneCanvas` does for the 2D scene. Call `scene.dispose()` on
unmount.

## Deliberately deferred

- Canvas input and raycast selection.
- Grouping / `Mobject3DNode` tree and z-order changes.
- Animation and tracker systems.
- OrbitControls, pan/zoom and camera presets.
- Editor creation palette, inspector, layers, undo/redo integration.
- Serialize/parse/apply functions for the 3D document.

## Suggested next steps

1. Add `mobject/helpers/Mobject3DNode.ts` + `Mobject3DTree.ts`, then grow
   `Mobject3DManager` to match the 2D tree API (group, reorder, restore).
2. Implement `serializeScene3D` / `parseScene3DDocument` / `applyScene3D`
   against `scene3dSerializer.ts`, including validation before mutation.
3. Add a `Scene3DCanvas` component and a provider-backed 3D scene; do not reuse
   `ManimProvider`'s 2D scene.
4. Add raycasting selection (`THREE.Raycaster`) before wiring the editor
   panels; keep zero-opacity objects out of the hit list, like 2D selection.
5. Mirror animations/trackers only after the 2D and 3D property models are
   reconciled (3-axis bindings and rotation need a separate design).
