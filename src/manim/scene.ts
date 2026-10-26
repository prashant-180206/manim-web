// import { SceneEvents } from "./utils/events";
// import { AnimationSystem } from "./animation/animationSystem";
import { MobjectManager } from "./mobject/helpers/mobjectmanager";
import { MobjectNode } from "./mobject/helpers/MobjectTree";
import { RenderLoop } from "./utils/loop";
import { SelectionManager } from "./utils/selection";
import { AnimationSystem } from "./animation/animationsystem";
import { TrackerSystem } from "./tracker/trackerSystem";
import { Camera } from "./camera";
import type { Vector } from "./utils/types";

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

  /** World-unit ↔ pixel conversion for this scene. */
  readonly camera = new Camera();

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
    this.camera.resize(this.width, this.height);
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

  private initializeInput(): void {
    this.canvas.addEventListener("pointerdown", this.onPointerDown);
  }

  private initializeRenderer(): void {}

  /**
   * Convert a browser pointer event into world coordinates. The canvas may be
   * laid out at a different CSS size than its logical camera size, so the
   * position is normalised against the element's bounding box first.
   */
  private pointerToWorld(event: PointerEvent): Vector | null {
    const rect = this.canvas.getBoundingClientRect();

    if (rect.width <= 0 || rect.height <= 0) return null;

    const screen = {
      x: ((event.clientX - rect.left) / rect.width) * this.camera.width,
      y: ((event.clientY - rect.top) / rect.height) * this.camera.height,
    };

    return this.camera.screenToWorld(screen);
  }

  private onPointerDown = (event: PointerEvent): void => {
    if (event.button !== 0) return;

    const point = this.pointerToWorld(event);

    if (!point) return;

    // Shift/Ctrl/Cmd-click extends the current selection instead of
    // replacing it, matching the Scene and Layers panels.
    if (event.shiftKey || event.ctrlKey || event.metaKey) {
      this.selection.multiselect(point);
    } else {
      this.selection.select(point);
    }
  };

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
   * crisp on high-DPI displays. The camera keeps the world origin at the
   * centre of the new viewport.
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

    this.camera.resize(nextWidth, nextHeight, ratio);
  }

  dispose(): void {
    this.stop();
    this.canvas.removeEventListener("pointerdown", this.onPointerDown);
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
    // Clear in device space, then draw the whole scene in world units.
    this.camera.clear(this.ctx);
    this.camera.applyTransform(this.ctx);
    this.ctx.globalAlpha = 1;

    for (const root of this.mobjectManager.tree.roots) {
      this.renderNode(root);
    }
  }

  private renderNode(node: MobjectNode) {
    const object = node.mobject;

    if (!node.visible) return;

    this.ctx.save();

    object.render(this.ctx);

    if (node.children.length > 0) {
      const properties = object.properties;
      const position = properties.position.get();

      // Children are positioned relative to their parent. Group opacity is
      // inherited by the subtree, while each child keeps its own opacity.
      this.ctx.save();
      this.ctx.translate(position.x, position.y);
      this.ctx.globalAlpha *= Math.max(
        0,
        Math.min(1, properties.opacity.get()),
      );

      for (const child of node.children) {
        this.renderNode(child);
      }

      this.ctx.restore();
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
