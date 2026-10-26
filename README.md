# web-manim

A browser-first, Manim-inspired animation editor built on a custom Canvas 2D
scene engine. The app runs as a Vite web app and can also be shipped as a
desktop app with Tauri 2.

The engine lives in [`src/manim`](./src/manim) and is intentionally
framework-agnostic: React owns the editor shell and consumes the UI adapter
classes in `src/manim/UI`.

> **Status:** the Scene Studio is usable end to end for creating, arranging,
> inspecting, animating and saving mobjects. Canvas click-to-select and
> modifier-click multi-selection are wired; dragging and marquee selection
> still happen through the panels.

For agent-oriented context, invariants and change recipes, see
[`AGENTS.md`](./AGENTS.md).

## Editor features

- Collapsible, resizable sidebar and bottom panel
- Canvas click-to-select with `Shift`/`Ctrl`/`Cmd`-click multi-selection;
  fully transparent, hidden and locked mobjects are skipped
- Configurable coordinate **Plane** mobject with gridlines, axes, tick labels
  and x/y axis labels
- **PolarPlane** mobject with concentric circles, radial spokes, radius labels
  and angle labels
- **Scene** panel: create mobjects, rename, delete, group/ungroup, visibility
  and lock toggles
- **Layers** panel: front-to-back mobject tree with grouped layers, draw-order
  badges and drag-and-drop reordering/reparenting
- **Inspector** panel: edit every property of the selected mobject, with unit
  hints and a "center in viewport" action
- **Animations** panel: add, configure and remove `FadeIn`, `FadeOut` and
  `MoveTo`
- **Trackers** panel: create trackers, bind numeric properties and connect
  trackers through expressions
- **Timeline** and **Console** tabs in the bottom dock
- JSON scene save/open/close, with `Ctrl+S` / `Ctrl+O` shortcuts
- World-coordinate canvas: origin at the viewport centre, `+y` up, 50 px per
  unit, high-DPI aware
- Native color pickers for `color` and `strokeColor` properties
- shadcn/ui + semantic design tokens, dark editor theme

## Routes

| Route         | Description                                                                                   |
| ------------- | --------------------------------------------------------------------------------------------- |
| `/`           | Scene Studio editor                                                                           |
| `/scene`      | Alias for the Scene Studio editor                                                             |
| `/playground` | Legacy canvas playground: create mobjects and render them                                     |
| `/values`     | Value-editor lab for every supported `ValueType`, including color                            |

## Getting started

### Prerequisites

- Node.js 20.19+ (required by Vite 7)
- pnpm
- Rust toolchain and the platform dependencies for Tauri 2 (desktop only)

### Scripts

```bash
pnpm install

pnpm dev          # start the web app at http://localhost:1420
pnpm build        # type-check and build the web app (tsc && vite build)
pnpm preview      # preview the production web build

pnpm tauri dev    # run as a desktop app
pnpm tauri build  # package the desktop app
```

## Keyboard shortcuts

| Keys             | Action                              |
| ---------------- | ----------------------------------- |
| `Ctrl/Cmd + S`   | Save the scene as JSON              |
| `Ctrl/Cmd + O`   | Open a scene from JSON              |
| `Space`          | Play or pause the timeline          |
| `Shift`/`Ctrl`/`Cmd` + click | Add or remove a mobject from the selection |
| `Delete` / `Backspace` | Delete the current selection  |
| `Ctrl/Cmd + G`   | Group the multi-selection           |
| `Ctrl/Cmd + Shift + G` | Ungroup the selected group    |
| `Esc`            | Clear the selection                 |
| `←` / `→`        | Seek by 0.1 s (`Shift` = 1 s)       |
| `Ctrl/Cmd + B`   | Toggle the sidebar                  |
| `Ctrl/Cmd + J`   | Toggle the bottom panel             |
| `1` … `5`        | Switch sidebar views                |
| `?`              | Open the shortcut help overlay      |

## Coordinate system

All geometry is authored in **world units**, not pixels.

| Concept      | Value                                        |
| ------------ | -------------------------------------------- |
| Origin       | Centre of the viewport (`{ x: 0, y: 0 }`)    |
| X axis       | Positive to the right                        |
| Y axis       | Positive **up**                              |
| Scale        | `50 CSS px = 1 unit`                         |
| Device ratio | Applied on top by the camera                 |

`src/manim/camera.ts` is the only place that converts between world units and
pixels. `Scene.render()` clears the device-space canvas and then installs the
world-to-device transform. The base `Mobject.beginRender()` transform therefore
works directly in world units.

### Geometry vs. screen styles

**World units** — scaled by the camera:

- `position`
- `radius`, `width`, `height`
- polygon `vertices`
- any new property that describes a location or geometric size

**Screen styles** — deliberately *not* scaled by the coordinate system:

- `strokeWidth` — CSS pixels; also cancels the object's own scale
- `fontSize` — CSS pixels
- `opacity` — unitless (as is `scale`)

The Inspector labels these as `(units)` or `(px)` so the distinction is visible
while editing. When adding a new property, decide explicitly which group it
belongs to. Do not multiply stroke widths or font sizes by
`PIXELS_PER_UNIT`; the renderers compensate for the camera themselves.

### Hit testing

`Mobject.contains(x, y)` receives **world coordinates**. Subclasses call
`worldToLocal(x, y)` before doing local geometry checks, so position and scale
are respected.

### Text and LaTeX

`Text` draws inside a pixel-scaled local space and flips Y so glyphs stay
upright under the y-up camera. `LatexText` does the same when drawing its KaTeX
image. Their `fontSize` properties stay in CSS pixels.

## Z-order and the Layers panel

There is **no separate `zIndex` property**. Draw order is the scene tree itself:

- Rendering is a pre-order traversal of `mobjectManager.tree.roots`.
- Within a parent, later siblings render in front of earlier siblings.
- A group renders at its position in the tree; its children follow in order.
- The `zN` badge in the Layers panel is derived from that pre-order position,
  not stored on the mobject.

`MobjectUI.getMobjectTreeUIData()` computes the pre-order `zIndex`. The Layers
panel reverses sibling order so it can display **front-most first**.

`MobjectManager` owns the ordering APIs and keeps `Group.children`
synchronised with the tree after every move:

| Method                          | Effect                                      |
| ------------------------------- | ------------------------------------------- |
| `moveInFrontOf(id, targetId)`   | Place a sibling directly in front            |
| `moveBehind(id, targetId)`      | Place a sibling directly behind              |
| `moveIntoGroup(groupId, id)`    | Append into a group (front-most child)       |
| `moveToRoot(id, index?)`        | Detach to the root layer (front by default)  |
| `bringToFront` / `sendToBack`   | Move to the end / start of its sibling list  |
| `bringForward` / `sendBackward` | Move one sibling step                        |

### Layers drag-and-drop

Because the panel is front-to-back:

| Drop zone                  | Result                                  |
| -------------------------- | --------------------------------------- |
| Upper area of a row        | Dragged object goes **in front** of it  |
| Lower area of a row        | Dragged object goes **behind** it       |
| Middle area of a **Group** | Dragged object is nested **inside**     |
| Root drop zone             | Dragged object leaves its group, front  |

Dropping a node onto itself or one of its descendants is rejected. The panel
also offers bring-to-front/forward/backward/to-back buttons for the current
selection. Collapse state, selection, visibility and lock state are all
reflected in the rows.

## Scene files

`src/manim/serialization/sceneSerializer.ts` is the single source of truth for
the file format.

- Format identifier: `manim-web-scene`
- Current version: **2**
- File extension: `.json`

A document contains:

- mobject tree (id, kind, name, visibility, lock state, properties, children)
- the **order** of roots and siblings, which is what preserves z-order
- every animation with target id, start, duration, easing and params
- trackers and their values
- tracker → property bindings (with expressions)
- tracker → tracker connections
- timeline current time
- scene name and viewport size at save time

### Public API

```ts
serializeScene(scene, name): SceneDocument
parseSceneDocument(input): SceneDocument
applyScene(scene, document): SceneRestoreSummary
clearScene(scene): void
```

`parseSceneDocument` validates the whole document before anything is applied.
`applyScene` clears the scene first, restores everything by id, and on failure
leaves the scene empty rather than half-restored. `serializeScene` writes ids so
animations, bindings and connections survive a round trip.

### Version 1 migration

Version 1 files stored geometry in pixels. `parseSceneDocument` migrates them
automatically:

- `position` is converted from pixel space to the centred, y-up world space
- `radius`, `width` and `height` are divided by 50
- polygon `vertices` are divided by 50 and Y is flipped
- `color` / `strokeColor` string values become `ValueType.color`
- `strokeWidth` and `fontSize` remain CSS pixels

### Save / open / close behaviour

- **Save** downloads `<sceneName>.json` through a Blob URL.
- **Open** uses a hidden file input and a full validation pass.
- **Close** asks for confirmation when the scene is not empty.
- Nothing is autosaved; reloading the page loses unsaved work.
- Restoring a scene suppresses per-object engine log spam and writes one
  summary line to the Console panel instead.

## Engine overview

```text
Scene
├── RenderLoop ── requestAnimationFrame (~60 fps)
├── Camera ───── world ↔ device conversion, clears the canvas
├── MobjectManager
│   └── MobjectTree ── roots (draw order) + nodes map
├── SelectionManager
├── AnimationSystem ── timeline of Animation instances
└── TrackerSystem
    └── DependencyGraph
```

Each frame `Scene` updates the animation system, clears with the camera,
installs the camera transform and renders the mobject tree in order.

### Mobjects

`Mobject` is the abstract base. Every mobject has:

- a unique id (for example `Circle_0`) and a display name
- a registry `kind` used to rebuild it from a scene file
- a `PropertyController` with typed properties
- an `AnimationProvider` and `TrackerProvider`
- `render`, `contains` and `update`

Base properties are `opacity`, `position` and `scale`. Shapes add `color`,
`strokeColor` and `strokeWidth`.

| Mobject           | Notes                                                   |
| ----------------- | ------------------------------------------------------- |
| `Circle`          | Radius, fill and stroke                                 |
| `RegularPolygon`  | Configurable width, height and number of sides          |
| `Polygon`         | Arbitrary vertex list with point-in-polygon hit testing |
| `Plane`           | Gridlines, axes and tick/axis labels with visibility toggles |
| `PolarPlane`      | Concentric circles, radial spokes and radius/angle labels |
| `Text`            | Canvas text with font size and family                   |
| `ParametricPath`  | `x(t)`, `y(t)` expressions sampled into a path          |
| `ParametricShape` | Closed shape from four boundary expressions             |
| `PolarShape`      | `r(theta)` sampled into a closed shape                  |
| `LatexText`       | KaTeX expression rendered to an image                   |
| `Group`           | Structural container; children keep their own transforms |

New mobjects are created through `MobjectRegistry` using the `MobjectName`
enum. `MobjectManager` adds/restores them, generates collision-free ids, groups
and ungroups, renames, deletes recursively, and emits add/remove/tree-change
signals.

`Group.render()` is intentionally empty: groups are structural, not
transformable parents. The Scene still traverses and renders their children.

### Typed values

`Value<T>` wraps a value together with its `ValueType`: `number`, `string`,
`boolean`, `vector`, `vectorArray`, `range`, `color` and `easing`. `Values`
provides factories, including `Values.color()`.

Colors are `ValueType.color` string values rendered with a native HTML color
input. `ValueEditor` normalises names/rgb()/3-digit hex to six-digit hex for
the picker while the stored value remains whatever the engine last wrote.
Do not use `ValueType.string` for new color properties.

### Animations

`Animation` is a time-based instance with duration, progress, direction and
`play`/`pause`/`stop`/`seek`/`update`. `AnimationSystem` owns the timeline,
start offsets, total duration, global playhead, seeking and reverse playback.

Implemented factories:

- `FadeIn` / `FadeOut` — animate opacity
- `MoveTo` — interpolate position

`Scale`, `Rotate` and `Transform` exist in the `AnimationName` enum but are not
implemented yet. Scene files still serialise the animation name so future
implementations can restore them.

### Trackers

Trackers are named numeric values with a `changed` signal. `TrackerSystem`
supports tracker creation/removal, property bindings through `expr-eval`,
tracker-to-tracker connections, dependency-cycle detection and cleanup when a
mobject is deleted.

`TrackerProvider` exposes `opacity`, `position` and `scale` connectors. The
binding API currently accepts **numeric** targets, so `opacity` works directly;
vector bindings remain a known limitation.

### Signals and UI adapters

A small typed `Signal<T>` / `Connection<T>` implementation replaces a global
event bus. It is used by the mobject manager, scene, animation system, trackers
and selection. Disconnecting is idempotent.

`src/manim/UI` translates engine state into plain data and callbacks:

- `MobjectUI` — creation palette, tree rows and pre-order `zIndex`
- `AnimationUI` — animation creation, timeline and playback data
- `TrackerUI` — tracker list, bindings and connection actions

## React layer

`ManimProvider` creates one `Scene` on an offscreen canvas and exposes it
through `useManim`. `SceneCanvas` mounts that canvas into the editor, observes
its container and calls `scene.resize()` with the device pixel ratio, so the
world origin always lands at the visible centre.

`EditorShell` owns the view layout, shortcuts, file menu and console. Panel
components consume the shared scene through `EditorContext`, call
`refresh()` after mutations and write user-facing messages through `log()`.
Panels are registered in the `views` array and the `renderPanel()` switch in
`EditorShell.tsx`.

Styling uses Tailwind CSS 4, shadcn/ui primitives and semantic tokens
(`bg-background`, `text-muted-foreground`, `border-border`, `bg-sidebar`, …).
Avoid hard-coded palette classes in editor UI. The shadcn configuration is in
`components.json` and the theme variables live in `src/App.css`.

## Project structure

```text
src/
├── manim/                       # Engine (framework-independent)
│   ├── scene.ts                 # Scene: canvas, camera, managers, render loop
│   ├── camera.ts                # World ↔ screen conversion and clearing
│   ├── plan.puml                # PlantUML design/architecture diagram
│   ├── animation/               # Animation, timeline and registry
│   ├── events/                  # Signal / Connection primitives
│   ├── mobject/
│   │   ├── mobect.ts            # Base mobject (note the historical spelling)
│   │   ├── helpers/             # Manager, tree, properties, registry
│   │   └── *.ts                 # Circle, Polygon, Text, LatexText, shapes…
│   ├── serialization/
│   │   └── sceneSerializer.ts   # JSON format, validation, restore, migration
│   ├── tracker/                 # Trackers, bindings and dependency graph
│   ├── UI/                      # Adapters that expose engine data to React
│   └── utils/                   # Value types, units, easing, loop, selection
├── components/
│   ├── ui/                      # shadcn/ui primitives
│   ├── editor/                  # EditorShell, panels, actions, file helpers
│   ├── valueEditors.tsx         # Editor for every ValueType
│   └── SceneCanvas.tsx          # Mounts the shared scene canvas
├── context/manimContext.tsx     # ManimProvider / useManim
├── pages/                       # Scene Studio, playground and value lab
├── App.tsx                      # Routes
└── main.tsx
src-tauri/                       # Tauri 2 desktop shell (Rust)
```

## Verification

No browser or smoke tests are configured. Use code-level checks:

```bash
pnpm exec tsc --noEmit
pnpm build
```

`pnpm build` runs `tsc` and `vite build`. The production build currently emits a
chunk-size warning (the bundle is ~934 kB minified); it is not an error.

## Known limitations

- **Canvas input is selection-only.** Click and modifier-click work, but there
  is no drag, marquee, pan or zoom; use the Scene/Layers panels for arrangement.
- **No autosave or project browser.** Save downloads a JSON file and Open reads
  one back through a file input.
- **`Scale`, `Rotate` and `Transform` animations are not implemented.**
- **Vector tracker bindings are not supported**; only numeric targets such as
  `opacity` can be bound.
- **Groups are structural.** Moving a group does not move its children.
- **Layers drag-and-drop uses HTML5 drag events**, so it is desktop-oriented.
- **No undo/redo.**
- **The Rust/Tauri side is still the default template** (`greet` command only).
- **Z-order is local to a parent.** Moving an object across parents changes
  where it appears relative to that parent's children.

## Roadmap

1. Add canvas dragging, marquee selection and grouping (click selection is wired).
2. Implement `Scale`, `Rotate` and `Transform` animations.
3. Add numeric/vector tracker connectors and a tracker inspector.
4. Add autosave, recent scenes and native file dialogs.
5. Add undo/redo and multi-object property editing.
6. Replace the template Tauri command with real desktop integrations.
