# web-manim

A browser-first, Manim-inspired animation editor built around a custom
Canvas 2D scene engine. The app runs as a Vite web app and can also be shipped
as a desktop app with Tauri 2.
The core engine lives in [`src/manim`](./src/manim) and is intentionally
framework-agnostic: React only renders the editor shell and consumes the UI
adapter classes in `src/manim/UI`.

> **Status:** early development. The engine foundations (scene graph,
> properties, selection, animations, trackers) are in place, while most of the
> editor UI and several animation/tracker features are still being wired up.

## Current state

Working:

- Canvas render loop with per-frame scene traversal
- Mobjects rendered from typed properties
- Mobject scene tree with grouping, ungrouping and z-ordering helpers
- Selection and hit-testing primitives
- Property system backed by typed `Value<T>` wrappers
- Base animations (`FadeIn`, `FadeOut`, `MoveTo`) with a timeline system
  (play, pause, stop, seek and reverse)
- Tracker system with expression bindings and dependency-cycle detection
- UI data adapters for mobjects, animations and trackers
- Scene Studio editor shell with collapsible scene tree, property inspector,
  animation builder, tracker bindings, timeline and console panels
- Interactive value-editor lab for every supported value type
- Tauri desktop shell and Vite web build

Still in progress / not wired end-to-end:

- `Scale`, `Rotate` and `Transform` animations (declared, not implemented)
- Tracker-to-property bindings for vector properties such as `position` and
  `scale` (the binding API currently requires numeric properties)
- Canvas input handling (`InputManager` and `SceneEvents` are commented out)
- Persistence, import/export and project files
- The Rust/Tauri side is still the default template (`greet` command only)

## Tech stack

| Layer     | Technology                                                |
| --------- | --------------------------------------------------------- |
| UI        | React 19, React Router 7, Tailwind CSS 4, shadcn/ui       |
| Build     | Vite 7, TypeScript 5.8 (strict)                           |
| Rendering | HTML Canvas 2D                                            |
| Math      | `expr-eval` for parametric shapes and tracker expressions |
| Math text | KaTeX, rendered through an SVG image                      |
| Desktop   | Tauri 2 (Rust)                                            |
| Icons     | `lucide-react`, `react-icons`                             |

## Getting started

### Prerequisites

- Node.js 20.19+ (required by Vite 7)
- pnpm
- Rust toolchain and the platform dependencies for Tauri 2 (only needed for the
  desktop build)

### Scripts

```bash
pnpm install

pnpm dev          # start the web app at http://localhost:1420
pnpm build        # type-check and build the web app
pnpm preview      # preview the production web build

pnpm tauri dev    # run as a desktop app
pnpm tauri build  # package the desktop app
```

## Routes

| Route       | Description                                                                                 |
| ----------- | ------------------------------------------------------------------------------------------- |
| `/`         | Scene Studio editor: scene tree, inspector, animations, trackers, timeline and console      |
| `/scene`    | Alias for the Scene Studio editor                                                           |
| `/playground` | Legacy canvas playground: create mobjects and render them                                 |
| `/values`   | Value-editor lab for number, string, boolean, range, vector, vector-array and easing values |

## Project structure

```text
src/
├── manim/                  # Engine (framework-independent)
│   ├── scene.ts            # Scene: owns canvas, managers and render loop
│   ├── plan.puml           # PlantUML design/architecture diagram
│   ├── animation/          # Animation, playback timeline and registry
│   ├── events/             # Signal / Connection event primitives
│   ├── mobject/            # Mobjects, registries and the scene tree
│   │   ├── helpers/        # MobjectManager, MobjectTree, property system
│   │   └── *.ts            # Circle, Polygon, Text, LatexText, parametric shapes…
│   ├── tracker/            # Trackers, expression bindings, dependency graph
│   ├── UI/                 # Adapters that expose engine data to React
│   └── utils/              # Value types, easing, selection, render loop
├── components/
│   ├── ui/                 # shadcn/ui primitives
│   ├── editor/             # Scene Studio shell, panels and editor helpers
│   ├── valueEditors.tsx    # Editor for every ValueType
│   └── SceneCanvas.tsx     # Mounts the shared Scene canvas
├── context/manimContext.tsx
├── pages/                  # Home, scene and values routes
├── App.tsx
└── main.tsx
src-tauri/                  # Tauri 2 desktop shell (Rust)
```

## Engine overview

```text
Scene
├── RenderLoop ── requestAnimationFrame (~60 fps)
├── MobjectManager
│   └── MobjectTree ── roots (draw order) + nodes map
├── SelectionManager
├── AnimationSystem ── timeline of Animation instances
└── TrackerSystem
    └── DependencyGraph
```

### Scene and rendering

`Scene` owns the canvas 2D context and constructs the managers. Each frame it
updates the animation system and re-renders the tree from back to front.
Rendering a node:

1. Skips invisible nodes.
2. Applies the mobject's `opacity`, `position` and `scale` (in `beginRender`).
3. Lets the mobject draw itself.
4. Recursively renders children, then restores the canvas state.

When a mobject is removed, the scene also removes its animations and trackers.
The render loop is capped at 60 fps by default and guards against timing drift.

### Mobjects and the scene tree

`Mobject` is the abstract base class. Every mobject has:

- a unique id (`Circle_0`, `Circle_1`, …) and a display name
- a `PropertyController` holding typed properties
- an `AnimationProvider` for animations it supports
- a `TrackerProvider` exposing bindable properties
- `render`, `contains` and `update` methods

Base properties are `opacity`, `position` and `scale`. Shape mobjects add
`color`, `strokeColor` and `strokeWidth`.

Available mobjects:

| Mobject           | Notes                                                      |
| ----------------- | ---------------------------------------------------------- |
| `Circle`          | Radius, fill and stroke                                    |
| `RegularPolygon`  | Configurable width, height and number of sides             |
| `Polygon`         | Arbitrary vertex list with point-in-polygon hit testing    |
| `Text`            | Canvas text with font size and family                      |
| `ParametricPath`  | `x(t)`, `y(t)` expressions sampled into a path             |
| `ParametricShape` | Closed shape from four boundary expressions                |
| `PolarShape`      | `r(theta)` sampled into a closed shape                     |
| `LatexText`       | KaTeX expression rendered to an image                      |
| `Group`           | Container rendered through its children                    |

Mobjects are created through `MobjectRegistry`, using the `MobjectName` enum.
`MobjectManager` adds them to the tree, generates ids, groups/ungroups objects,
renames and deletes them (recursively for children), and emits signals on
add/remove/tree change.

`MobjectTree` keeps a `Map` of every node plus the ordered `roots` array. Nodes
hold `parent`, `children`, `visible` and `locked` state. Z-order helpers
include bring-to-front/back, forward/backward and move-before/after.

### Typed values and properties

`Value<T>` wraps a value together with its `ValueType`:
`number`, `string`, `boolean`, `vector`, `vectorArray`, `range`, `color` and
`easing`. `Values` provides factory helpers. The value-editor lab exercises
every editor, which writes directly back into the underlying `Value` object.

### Animations

`Animation` is a time-based instance with a duration, progress, direction and
`play`/`pause`/`stop`/`seek`/`update` methods.

`AnimationSystem` manages a timeline:

- animations are added to the currently selected mobject
- each animation gets a start offset; `totalDuration` is derived from the
  furthest end time
- playback advances a global current time and seeks every animation relative
  to its start
- seeking, reverse playback and rescheduling via `moveStart` are supported

Per-mobject animation factories are registered in `AnimationProvider` via
`AnimationRegistry`. Implemented base animations:

- `FadeIn` / `FadeOut` — animate opacity
- `MoveTo` — interpolate position between the current and target vector

`Scale`, `Rotate` and `Transform` are listed in `AnimationName` but have no
factory yet. Easing curves live in `src/manim/utils/easing.ts`
(`linear`, `easeIn`, `easeOut`, `easeInOut`, `backOut`, `bounceOut`).

### Trackers

Trackers are numeric, named values with a `changed` signal. `TrackerSystem`
supports:

- creating and removing trackers
- binding a tracker to a mobject property through an `expr-eval` expression
  (`t` is the tracker value)
- connecting tracker to tracker through an expression
- automatic cleanup when a mobject is deleted
- cycle detection through `DependencyGraph`, which also offers traversal and
  topological sorting

`TrackerProvider` registers the available property connectors (`opacity`,
`position` and `scale`). Numeric properties such as `opacity` can be bound to a
tracker directly; vector properties are exposed but the binding API currently
accepts numeric targets only.

### Signals

A small typed `Signal<T>` / `Connection<T>` implementation replaces a global
event bus. Signals are used by the mobject manager, scene, animation system,
trackers and selection. Disconnecting a connection is idempotent.

### UI adapters

The classes in `src/manim/UI` translate engine state into plain data and
callbacks that React can consume without importing engine internals:

- `MobjectUI` — creation palette and scene-tree data
- `AnimationUI` — animation creation, timeline and playback data
- `TrackerUI` — tracker list, bindings and connection actions

These adapters exist, but only the home playground and value lab are currently
mounted in the React UI.

## React layer

`ManimProvider` creates a `Scene` on an offscreen canvas and exposes it through
`useManim`; `SceneCanvas` is scaffolding for mounting that shared canvas.
The home page currently creates its own `Scene` directly on a visible canvas,
so the two approaches will need to be unified as the editor is built out.

The UI uses Tailwind CSS 4 with shadcn/ui primitives (`Button`, `Card`,
`Input`, `Label`, `Popover`) configured in `components.json`.

## Design notes

- `src/manim/plan.puml` documents the intended architecture with PlantUML and
  is a useful reference when changing the engine.
- The engine is rendered with Canvas 2D rather than SVG or WebGL, keeping
  mobjects simple to implement and debug.
- `LatexText` regenerates a KaTeX image only when its expression, font size,
  color or display mode changes.
- A few filenames intentionally (or accidentally) keep their current spelling:
  `mobect.ts` and `proprertytypes.ts`.

## Roadmap

1. Build the full scene editor on `/scene`: scene tree, property inspector,
   animation timeline and tracker panel.
2. Wire `MobjectUI`, `AnimationUI` and `TrackerUI` into those panels.
3. Implement the remaining animations and numeric tracker connectors.
4. Restore canvas input handling for selection, dragging and grouping.
5. Add project persistence/import/export.
6. Replace the template Tauri command with real desktop integrations.
