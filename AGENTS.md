# AGENTS.md — project handoff and engineering rules

This file is the orientation guide for the next agent working on **web-manim**.
The user-facing overview lives in [`README.md`](./README.md); this file records
the invariants, file map and verification steps that are easy to break.

The repo is a React 19 + Vite 7 + Tailwind 4 + shadcn/ui editor around a custom
Canvas 2D engine in `src/manim`. The editor is mounted at `/` and `/scene`; the
legacy playground is `/playground` and the value lab is `/values`.

**Current state:** the editor is usable end to end (create, arrange, inspect,
animate, save/open scenes). Canvas click-to-select and modifier-click
multi-selection are wired. Dragging, marquee selection and z-order changes still
happen through the panels.

## Verification

```bash
pnpm exec tsc --noEmit
pnpm build          # runs tsc && vite build
```

There are no browser/smoke tests in this repo. The user has explicitly preferred
code-level verification; do not start a dev server or browser unless asked.
The production build emits a >500 kB chunk warning — that is expected.

### Local environment (this checkout)

The repo is opened from WSL but Node is installed on Windows. If `pnpm`/`node`
are not on the WSL `PATH`, use the Windows executable directly:

```bash
NODE="/mnt/c/Users/Prashant Suthar/scoop/apps/nodejs/26.12.0/node.exe"

"$NODE" 'C:\Dev\Projects\manim-web\node_modules\typescript\bin\tsc' \
  --noEmit -p 'C:\Dev\Projects\manim-web\tsconfig.json'

"$NODE" 'C:\Dev\Projects\manim-web\node_modules\vite\bin\vite.js' \
  build 'C:\Dev\Projects\manim-web'
```

Do not leave dev servers or background processes running.

## Architecture at a glance

```text
ManimProvider (src/context/manimContext.tsx)
└── one shared Scene on an offscreen canvas
    ├── RenderLoop
    ├── Camera
    ├── MobjectManager → MobjectTree
    ├── SelectionManager
    ├── AnimationSystem
    └── TrackerSystem

EditorShell (src/components/editor/EditorShell.tsx)
├── renders one sidebar panel at a time
├── CanvasPane + SceneCanvas (mounts scene.canvas)
├── bottom tabs: Timeline / Console
├── File menu: Save / Open / Close
└── EditorContext = { scene, refresh(), log() }
```

### Important files

| File | Responsibility |
| --- | --- |
| `src/context/manimContext.tsx` | Creates/disposes the single shared `Scene`; `useManim()` |
| `src/components/SceneCanvas.tsx` | Mounts the shared canvas, handles resize + DPR |
| `src/components/editor/EditorShell.tsx` | Layout, views, shortcuts, file menu, console, footer |
| `src/components/editor/editorContext.tsx` | `EditorContext`, `useEditor`, log/types helpers |
| `src/components/editor/editorActions.ts` | Selection, delete, seek, group helpers used by panels |
| `src/components/editor/sceneFiles.ts` | Download/read scene files, empty-scene check |
| `src/components/editor/SceneTreePanel.tsx` | Creation palette, rename, group/ungroup, visibility/lock |
| `src/components/editor/LayersPanel.tsx` | Front-to-back tree, DnD and arrange actions |
| `src/components/editor/InspectorPanel.tsx` | Property editing, unit hints, center action |
| `src/components/editor/AnimationsPanel.tsx` | Animation creation/removal |
| `src/components/editor/TrackersPanel.tsx` | Tracker creation, bindings, connections |
| `src/components/editor/TimelinePanel.tsx` | Playback and timeline scrubbing |
| `src/components/editor/ConsolePanel.tsx` | Log display |
| `src/manim/scene.ts` | Canvas/camera ownership, render loop, tree rendering |
| `src/manim/camera.ts` | **Only** world↔pixel conversion point |
| `src/manim/utils/units.ts` | `PIXELS_PER_UNIT = 50`, conversion helpers, unit rules |
| `src/manim/mobject/mobect.ts` | Base transform, `worldToLocal`, `applyStrokeWidth` |
| `src/manim/mobject/plane.ts` | Grid/axes/labels plane with feature-aware hit testing |
| `src/manim/mobject/polarPlane.ts` | Rings/spokes/labels polar plane with feature-aware hit testing |
| `src/manim/mobject/helpers/mobjectmanager.ts` | Tree mutation, grouping, restore, z-order APIs |
| `src/manim/mobject/helpers/MobjectTree.ts` | `MobjectNode`, `roots` order, parent/children |
| `src/manim/mobject/helpers/mobjectregistry.ts` | Constructs mobjects by `MobjectName` |
| `src/manim/serialization/sceneSerializer.ts` | Format v2, validation, restore, v1 migration |
| `src/manim/UI/mobjectUI.ts` | Tree UI data and pre-order `zIndex` |
| `src/manim/utils/value.ts` | `Value<T>`, `ValueType`, `Values` factories |
| `src/components/valueEditors.tsx` | Editor per `ValueType`, including color picker |
| `src/App.tsx` | Route table |

## Invariants — do not break these

### 1. One scene instance

`ManimProvider` owns a single `Scene`. Panels must not construct their own
scenes. Use `useEditor()` inside editor panels and `useManim()` outside them.
If the provider's canvas is not mounted, the scene still renders offscreen.

### 2. World coordinates and the camera

- Origin is the **viewport centre**, `+x` right, `+y` **up**.
- `1 unit = 50 CSS pixels` (`PIXELS_PER_UNIT` in `src/manim/utils/units.ts`).
- `Scene.render()` clears in device space, installs the camera transform, then
  draws the tree in world units.
- Mobject geometry (`position`, `radius`, `width`, `height`, `vertices`, and
  any new geometry property) is expressed in **world units**.
- `Mobject.contains(x, y)` receives world coordinates. Call
  `this.worldToLocal(x, y)` before local hit testing.
- Do not manually add `scene.width / 2` / `scene.height / 2` to positions.
  New objects spawn at the world origin (`{ x: 0, y: 0 }`).

### 3. Screen styles are not geometry

These stay in **CSS pixels** and must not be converted by the camera or by
`PIXELS_PER_UNIT`:

- `strokeWidth` — also cancels the object's own scale via
  `Mobject.applyStrokeWidth()`
- `fontSize`
- `opacity` is unitless; `scale` is unitless

`Text` and `LatexText` compensate for the y-up camera inside their own render
methods. If you add a renderer, decide explicitly whether each property is
geometry or a screen style and document it in the Inspector via `unitHint()`.

### 4. Colors use `ValueType.color`

- Create colors with `Values.color("#rrggbb")`, never `Values.string(...)`.
- The Inspector/`ValueEditor` renders a native `<input type="color">`.
- `toHexColor()` in `src/components/valueEditors.tsx` normalises named/rgb/
  3-digit colors for the picker.
- Scene v1 files with string colors are migrated to `color` automatically.

### 5. Z-order is tree order, not a property

There is **no `zIndex` field on mobjects or nodes**.

- Rendering is pre-order over `mobjectManager.tree.roots`.
- Later siblings render **in front** of earlier siblings.
- `MobjectUI.getMobjectTreeUIData()` assigns a derived pre-order `zIndex` used
  only for display and the Layers panel's `zN` badge.
- `MobjectManager` is the only place that mutates ordering; it keeps
  `Group.children` synchronised with the tree after every move.
- Do not add a separate z-index property or sort render order by anything else.

### 6. Layers panel is front-to-back

`LayersPanel` reverses sibling arrays for display. Therefore:

- drop **above** a row → `moveInFrontOf(dragged, target)`
- drop **below** a row → `moveBehind(dragged, target)`
- drop **middle of a Group** → `moveIntoGroup(target, dragged)`
- root drop zone → `moveToRoot(dragged)` (front of the root layer)

Reject drops onto self or descendants (`isDescendantOf`).

### 7. Scene file format v2

`SCENE_FILE_FORMAT = "manim-web-scene"`, `SCENE_FILE_VERSION = 2`.

The document covers the mobject tree (including order, ids, visibility, lock,
all properties), animations, trackers, property bindings, tracker connections
and timeline time. Serialization order preserves z-order and ids preserve
animation/tracker targets.

Public API:

```ts
serializeScene(scene, name)     // → SceneDocument
parseSceneDocument(input)       // validates, migrates v1 → v2
applyScene(scene, document)     // clears then restores; throws on failure
clearScene(scene)               // removes all mobjects, animations, trackers
```

Rules:

- Validate everything before mutating the scene.
- If restore fails, `applyScene` must leave the scene empty, not half-built.
- When adding a mobject property or animation param, update serialization and
  the v1/v2 migration logic if the unit semantics differ.
- Bump `SCENE_FILE_VERSION` for incompatible changes and add a migration path.

### 8. Reactive UI updates after mutations

Panels mutate the engine directly, then call `refresh()` from `useEditor()`.
Engine signals are connected once in `EditorShell` and trigger refresh/logs.
When adding a mutation path, emit the right engine signal or call `refresh()`;
otherwise the panel will show stale data.

Use `log(level, message)` from `useEditor()` for user-visible console output.
During scene restore `suppressEngineLogs` avoids per-object noise; keep that
behaviour.

### 9. Styling conventions

- Use shadcn/ui primitives from `src/components/ui`.
- Use semantic design tokens (`bg-background`, `bg-sidebar`,
  `text-muted-foreground`, `border-border`, `text-primary`, …); avoid raw
  palette classes in editor UI.
- The editor shell is dark and uses the `dark` class + `colorScheme: "dark"`.
- `components.json` is the shadcn config (`base-maia`, `@base-ui/react` under
  the hood). The `.agents/skills/shadcn` skill is available and gitignored.

## Common change recipes

### Add a sidebar panel

1. Create `src/components/editor/XPanel.tsx` using `PanelHeader` and
   `useEditor()`.
2. Add an entry to `views` (id, label, icon, shortcut) in `EditorShell.tsx`.
3. Extend the `EditorView` union and `renderPanel()` switch.
4. If it needs a new shortcut digit, keep `1`–`5` order intuitive.

### Add an editable mobject property

1. Add a typed `Value` to the property interface and constructor defaults.
2. Decide geometry (world units) vs. screen style (px/unitless). Update
   `unitHint()` in `InspectorPanel.tsx`.
3. Render it using the camera space; use `applyStrokeWidth()` for strokes.
4. It will serialise automatically because serialization iterates properties.
5. If it changes units relative to v1, extend `migrateMobjectV1`.

### Add a new mobject kind

1. Implement the class in `src/manim/mobject/` extending `Mobject`.
2. Implement `render` and world-space `contains` (use `worldToLocal`).
3. Add the kind to `MobjectName`, `MobjectRegistry`, and the creation palette
   data in `MobjectUI` (icon, label).
4. Ensure the registry constructor signature is `(id, name)` and that ids are
   generated through `MobjectManager` / `IdGenerator`, never hard-coded.
5. Scene restore uses `kind`, so keep the enum value stable.

### Add an animation

1. Add the name to `AnimationName`.
2. Register a factory in `AnimationRegistry.registerBaseAnimations`.
3. Ensure its params are serialisable (prefer `Value<T>` inputs).
4. Update `AnimationsPanel` if it needs custom controls.
5. Existing scene files name the animation; do not rename enum values without a
   migration.

## Known traps / current limitations

- **Canvas pointer input is selection-only.** `Scene.initializeInput()` wires
  `pointerdown` for click and modifier-click selection. `InputManager` /
  `SceneEvents` are not wired; do not assume drag, marquee, pan or zoom works.
- **No autosave/undo.** Save downloads JSON, Open uses a file input, Close
  confirms only when the scene is non-empty.
- **`Scale`, `Rotate`, `Transform` are enum-only.** No factory is registered.
- **Vector tracker bindings are unsupported.** The binding API accepts numeric
  targets (`opacity`), not `position`/`scale`.
- **Groups are structural.** `Group.render()` is empty and children are not
  transformed by the group. Grouping changes the tree, not the visual transform.
- **Z-order is relative to the parent.** Reparenting changes which siblings an
  object is compared against.
- **`pnpm build` warning** about >500 kB chunks is expected.
- **Filename spellings are intentional/legacy:** `mobect.ts`,
  `proprertytypes.ts`, `MobjectTree.ts`, `animationsystem.ts`,
  `mobjectmanager.ts`. Match existing imports rather than renaming casually.
- The repo may contain unrelated uncommitted user changes. Do not revert or
  overwrite files outside the task. Check `git status` before and after.
- `.agents/*` contains gitignored agent skills. Tracked documentation belongs in
  `README.md` and this file, not in `.agents`.

## Quick sanity checklist before finishing

- [ ] `pnpm exec tsc --noEmit` passes.
- [ ] `pnpm build` passes (chunk-size warning is fine).
- [ ] New geometry is in world units; stroke widths/font sizes are CSS pixels.
- [ ] New colors use `Values.color` and appear as color pickers.
- [ ] Ordering changes go through `MobjectManager` and keep group children synced.
- [ ] New persisted state is added to `SceneDocument` + validation + restore.
- [ ] Panels call `refresh()` after mutating engine state.
- [ ] `git status` shows only intended changes.
