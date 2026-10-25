// import { SceneEvents } from "./utils/events";
// import { AnimationSystem } from "./animation/animationSystem";
import { MobjectManager } from "./mobject/helpers/mobjectmanager";
import { MobjectNode } from "./mobject/helpers/MobjectTree";
import { RenderLoop } from "./utils/loop";
import { SelectionManager } from "./utils/selection";
import { AnimationSystem } from "./animation/animationsystem";
import { TrackerSystem } from "./tracker/trackerSystem";

export class Scene {
  /*
    |--------------------------------------------------------------------------
    | Canvas
    |--------------------------------------------------------------------------
    */

  readonly canvas: HTMLCanvasElement;

  ctx: CanvasRenderingContext2D;

  /** Logical (CSS pixel) width of the canvas. */
  width: number;

  /** Logical (CSS pixel) height of the canvas. */
  height: number;

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
    this.width = canvas.width;
    this.height = canvas.height;
    this.selection = new SelectionManager(this);
    this.mobjectManager = new MobjectManager();
    this.animationSystem = new AnimationSystem(this);
    this.trackerSystem = new TrackerSystem(this);

    this.mobjectManager.onRemove.connect((m) => {
      this.animationSystem.removeMobject(m.id);
      this.trackerSystem.deleteConnectionsForMobject(m.id);
      this.trackerSystem.removeTracker(m.id);
    });

    this.loop = new RenderLoop((dt) => {
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
    this.loop.start();
  }

  stop(): void {
    this.loop.stop();
  }

  /**
   * Resize the canvas to the given CSS dimensions while keeping rendering
   * crisp on high-DPI displays.
   */
  resize(width: number, height: number, pixelRatio = 1): void {
    const nextWidth = Math.max(1, Math.floor(width));
    const nextHeight = Math.max(1, Math.floor(height));
    const ratio = Math.max(1, pixelRatio);

    this.width = nextWidth;
    this.height = nextHeight;

    this.canvas.width = Math.round(nextWidth * ratio);
    this.canvas.height = Math.round(nextHeight * ratio);
    this.canvas.style.width = `${nextWidth}px`;
    this.canvas.style.height = `${nextHeight}px`;

    // Changing the backing-store size resets the context, so re-apply DPR.
    this.ctx.setTransform(ratio, 0, 0, ratio, 0, 0);
  }

  dispose(): void {
    this.stop();
    this.mobjectManager.onAdd.clear();
    this.mobjectManager.onRemove.clear();
    this.mobjectManager.onTreeChanged.clear();
    this.selection.onSelectionChanged.clear();
    this.animationSystem.onAnimationAdded.clear();
    this.animationSystem.onAnimationRemoved.clear();
    this.animationSystem.onSequenceUpdated.clear();
    this.trackerSystem.onTrackerAdded.clear();
    this.trackerSystem.onTrackerRemoved.clear();
    this.trackerSystem.onTrackerChanged.clear();
    this.trackerSystem.onConnectionsChanged.clear();
  }

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
    this.ctx.clearRect(0, 0, this.width, this.height);

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
      this.selection.editingSelection.clear();
      this.selection.selectedMobject = null;
    }
  }
}
