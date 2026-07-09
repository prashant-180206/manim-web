/*
|--------------------------------------------------------------------------
| Scene.ts
|--------------------------------------------------------------------------
|
| Core engine of the editor.
|
| Owns:
|   - HTML Canvas
|   - Rendering Context
|   - Render Loop
|   - Camera
|   - Selection
|   - Managers
|   - Events
|   - Input
|
| Responsibilities:
|
| • Render all objects.
| • Handle user interaction.
| • Coordinate all systems.
| • Provide object lookup.
| • Manage active selection.
| • Start/stop animation loop.
|
|--------------------------------------------------------------------------
*/

/*
|--------------------------------------------------------------------------
| Files Required
|--------------------------------------------------------------------------
|
| ./SceneEvents.ts
| ./Selection.ts
| ./Camera.ts
| ./Renderer.ts
| ./RenderLoop.ts
| ./InputManager.ts
|
| ../mobjects/Mobject.ts
| ../mobjects/MobjectManager.ts
|
| ../animation/AnimationSystem.ts
|
| ../trackers/TrackerSystem.ts
|
|--------------------------------------------------------------------------
*/

// import { Selection } from "./Selection";
// import { SceneEvents } from "./SceneEvents";

// import { Mobject } from "./mobect.ts";
// import { MobjectManager } from "../mobjects/MobjectManager";

// import { AnimationSystem } from "../animation/AnimationSystem";
// import { TrackerSystem } from "../trackers/TrackerSystem";
// import { Mobject } from "./mobject/mobect";
import { SceneEvents } from "./events";
import { AnimationSystem } from "./animation/animationsystem";
import { MobjectManager } from "./mobject/mobjectmanager";
import { RenderLoop } from "./loop";
import { Selection } from "./selection";
// import { AnimationSystem } from "./animation/animationsystem";
// import { RenderLoop } from "./loop";

export class Scene {
  /*
    |--------------------------------------------------------------------------
    | Canvas
    |--------------------------------------------------------------------------
    */

  readonly canvas: HTMLCanvasElement;

  readonly ctx: CanvasRenderingContext2D;

  // readonly loop: RenderLoop;

  //     this.loop = new RenderLoop((dt) => {

  //     // this.animations.update(dt);

  //     // this.trackers.update();

  //     // this.render();

  // })

  /*
    |--------------------------------------------------------------------------
    | Core Systems
    |--------------------------------------------------------------------------
    */

  readonly selection: Selection;

  readonly mobjects: MobjectManager;

  readonly animations: AnimationSystem;

  // readonly trackers: TrackerSystem;

  readonly events: SceneEvents;

  /*
    |--------------------------------------------------------------------------
    | Internal State
    |--------------------------------------------------------------------------
    */

  //   private running = false;

  //   private lastFrame = 0;

  /*
    |--------------------------------------------------------------------------
    | Constructor
    |--------------------------------------------------------------------------
    */

  private loop: RenderLoop;

  constructor(canvas: HTMLCanvasElement) {
    const ctx = canvas.getContext("2d");

    if (!ctx) {
      throw new Error("Could not acquire 2D rendering context.");
    }

    this.canvas = canvas;
    this.ctx = ctx;

    this.selection = new Selection();

    this.mobjects = new MobjectManager();

    this.animations = new AnimationSystem();

    // this.trackers = new TrackerSystem();

    this.events = new SceneEvents();

    this.loop = new RenderLoop((dt) => {
      // console.log("dt", dt);
      this.render();
    });
    this.initialize();
  }

  /*
    |--------------------------------------------------------------------------
    | Initialization
    |--------------------------------------------------------------------------
    */

  private initialize(): void {
    this.loop.start();
    this.initializeInput();

    this.initializeRenderer();
  }

  private initializeInput(): void {}

  private initializeRenderer(): void {}

  /*
    |--------------------------------------------------------------------------
    | Scene Controls
    |--------------------------------------------------------------------------
    */

  start(): void {
    console.log("Scene started");
  }

  stop(): void {}

  dispose(): void {}

  /*
    |--------------------------------------------------------------------------
    | Rendering
    |--------------------------------------------------------------------------
    */

  update(dt: number) {
    this.animations.update(dt);

    // this.trackers.update();

    // for (const object of this.mobjects.all()) {
    //   object.update(dt);
    // }

    this.render();
  }

  render() {
    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

    for (const object of this.mobjects.mobjects.values()) {
      if (!object.visible) {
        continue;
      }

      object.render(this.ctx);
    }
  }

  //   private frame = (time: number): void => {};

  /*
    |--------------------------------------------------------------------------
    | Selection
    |--------------------------------------------------------------------------
    */

  //   selectMobject(id: string): void {}

  clearSelection(): void {}

  /*
    |--------------------------------------------------------------------------
    | Queries
    |--------------------------------------------------------------------------
    */

  // findMobject(id: string): Mobject | undefined {
  //   return this.mobjects.find(id);
  // }
}
