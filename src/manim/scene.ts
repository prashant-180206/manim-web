// import { SceneEvents } from "./utils/events";
// import { AnimationSystem } from "./animation/animationSystem";
import { MobjectManager } from "./mobject/helpers/mobjectmanager";
import { MobjectNode } from "./mobject/helpers/MobjectTree";
import { RenderLoop } from "./utils/loop";
import { SelectionManager } from "./utils/selection";
import { AnimationSystem } from "./animation/animationSystem";
import { TrackerSystem } from "./tracker/trackerSystem";

export class Scene {
  /*
    |--------------------------------------------------------------------------
    | Canvas
    |--------------------------------------------------------------------------
    */

  readonly canvas: HTMLCanvasElement;

  readonly ctx: CanvasRenderingContext2D;

  readonly selection: SelectionManager;

  readonly mobjectManager: MobjectManager;

  readonly animationSystem: AnimationSystem;

  readonly trackerSystem: TrackerSystem;

  // readonly trackers: TrackerSystem;

  // readonly events: SceneEvents;

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
    this.selection = new SelectionManager(this);
    this.mobjectManager = new MobjectManager();
    this.animationSystem = new AnimationSystem(this);
    this.trackerSystem = new TrackerSystem(this);

    this.mobjectManager.onRemove.connect((m) => {
      this.animationSystem.removeMobject(m.id);
      this.trackerSystem.removeTracker(m.id);
    });
    // this.trackers = new TrackerSystem();
    // this.events = new SceneEvents();
    this.loop = new RenderLoop((dt) => {
      // console.log("dt", dt);
      this.animationSystem.update(dt);
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
    this.animationSystem.update(dt);
    this.render();
  }

  render() {
    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

    for (const root of this.mobjectManager.tree.roots) {
      this.renderNode(root);
    }
  }

  private renderNode(node: MobjectNode) {
    const object = node.mobject;

    if (!node.visible) return;

    this.ctx.save();

    object.render(this.ctx);

    for (const child of node.children) {
      this.renderNode(child);
    }

    this.ctx.restore();
  }

  deleteSelectedMobject() {
    const selected = this.selection.selectedMobject;
    if (selected) {
      this.animationSystem.removeMobject(selected.id);
      this.mobjectManager.delete(selected);
      this.selection.selectedMobject = null;
    }
  }
}
