# `src/manim3d` — 3D module

This module is the 3D counterpart of `src/manim`. It is wired into the app at
**`/scene3d`** through its own provider, canvas and editor shell. The 2D editor
(`/`, `/scene`) and the 3D editor never share a scene, canvas or renderer.

The renderer is three.js (`WebGLRenderer`). The module contains the runtime
pieces needed to create, select, transform, serialise and draw 3D mobjects; the
React editor layer lives in `src/components/editor3d`.

## Route and editor wiring

```text
src/App.tsx                      /scene3d → Scene3DProvider → pages/scene3d
src/context/scene3dContext.tsx   owns exactly one Scene3D; useScene3D()
src/components/Scene3DCanvas.tsx mounts scene.canvas + ResizeObserver/DPR
src/components/editor3d/         Editor3DShell + panels + history + files
```

- `Editor3DShell` renders one sidebar panel at a time: **Scene**, **Inspector**,
  **Camera**. The bottom panel is the shared `ConsolePanel`; there is no 3D
  timeline because the engine has no animation system yet.
- File menu: Save / Open / Close, plus Undo / Redo and the keyboard shortcuts
  (`Ctrl+S`, `Ctrl+O`, `Ctrl+Z`, `Ctrl+Shift+Z`). Undo/redo is snapshot-based
  and session-only (`src/components/editor3d/scene3dHistory.ts`).
- The 2D editor links to `/scene3d` from its header; the 3D editor links back to
  `/scene`, `/playground` and `/values`.

## 2D → 3D map

| 2D (`src/manim`) | 3D (`src/manim3d`) | Status |
| --- | --- | --- |
| `scene.ts` | `scene3d.ts` | Renderer, scene, lights, loop, resize, input, selection, dispose |
| `camera.ts` | `camera3d.ts` | Perspective framing; 1 unit = 50 CSS px at the target plane |
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
| `utils/selection.ts` | `utils/selection3d.ts` | Raycast picking, click + modifier multi-select |
| `serialization/sceneSerializer.ts` | `serialization/scene3dSerializer.ts` | Independent 3D format v1, serialize/parse/apply/clear |
| `UI/mobjectUI.ts` | `UI/mobject3dUI.ts` | Creation palette + flat tree/action data |
| `utils/loop.ts` | three.js `Timer` + `renderer.setAnimationLoop` | No manual rAF |
| `animation/*` | — | Deferred |
| `tracker/*` | — | Deferred |

## Conventions

- **World units are shared with 2D.** `1 unit = 50 CSS pixels`
  (`PIXELS_PER_UNIT`). `position`, `scale`, `radius`, `width`, `height` and
  `depth` are world units; `opacity` is unitless and `rotation` is radians.
- **+x right, +y up, +z toward the viewer.** The default camera sits on `+z`
  and looks down `-z` at the `z = 0` focus plane.
- **Properties use the existing `Value` helpers.** `Values3D.vector3()` and
  `Values3D.euler()` store `{ x, y, z }` data under `ValueType.vector`; the 2D
  `Values.vector()` is still typed `{ x, y }`. The inspector's
  `VectorValueEditor` shows a Z control only when the stored vector has a
  numeric `z`, so 2D x/y editing is unchanged.
- **`sync()` is explicit.** Mutating a `Value` does not push anything to
  three.js. Call `mobject.sync()` (or the primitive's `setRadius` / `setSize` /
  `setColor`) after a batch of edits. This mirrors the editor's explicit
  `refresh()` convention.
- **Resource ownership.** `Mobject3D` disposes materials; primitives dispose
  their geometry. `Mobject3DManager.delete()` and `clear()` dispose by default.
- **DPR is capped at 2** by `Scene3D` to keep the WebGL drawing buffer bounded.
- **Selection skips hidden, locked and zero-opacity objects**, matching 2D
  click/multi-selection. Click replaces the selection; Shift/Ctrl/Cmd-click
  toggles an object in the multi-selection.
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
host component owns layout and calls `resize()` from a `ResizeObserver`, the
same way `SceneCanvas` does for the 2D scene. Call `scene.dispose()` on unmount.

## Serialization

Public API in `serialization/scene3dSerializer.ts`:

```ts
serializeScene3D(scene, name)      // → Scene3DDocument
parseScene3DDocument(input)        // validates object/JSON, returns normalised doc
applyScene3D(scene, input)         // validates, clears, restores; clears on failure
clearScene3D(scene)                // removes every mobject + clears selection
hasScene3DContent(scene)           // true when at least one mobject exists
```

Rules:

- The document stores the camera (`fov`, `target`), every root mobject with its
  id/kind/name/visibility/lock and all serialised `Value` properties, plus
  `timeline.currentTime`.
- Validation runs before any mutation. If restore throws, `applyScene3D` leaves
  the scene empty rather than half-built.
- `children` always serialises as `[]` and `animations` must be empty; the
  shape reserves room for grouping and animation without a version bump.
- Do not extend the 2D `manim-web-scene` v3 document with 3D fields.

## Deliberately deferred

- Grouping / `Mobject3DNode` tree, reparenting and z-order changes.
- Animation and tracker systems, and therefore a 3D timeline.
- OrbitControls, pan/zoom/drag and camera presets (the camera is framed on +z).
- Marquee selection, transform gizmos and object duplication.

## Suggested next steps

1. Add `mobject/helpers/Mobject3DNode.ts` + `Mobject3DTree.ts`, then grow
   `Mobject3DManager` to match the 2D tree API (group, reorder, restore).
2. Add an animation system and timeline before wiring trackers and property
   bindings; 3-axis bindings and rotation need a separate design.
3. Add `OrbitControls` behind the camera panel and keep `Camera3D.frame()` as
   the single world↔screen framing authority.
