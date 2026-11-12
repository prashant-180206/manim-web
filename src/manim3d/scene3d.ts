import * as THREE from "three";
import { Signal } from "@/manim/events/signal";
import { Camera3D } from "./camera3d";
import { Mobject3DManager } from "./mobject/helpers/mobject3dManager";
import { Selection3D } from "./utils/selection3d";
import { Animation3DSystem } from "./animation/animation3dSystem";
import { Scene3DProperties } from "./scene3dProperties";

/*
|--------------------------------------------------------------------------
| scene3d.ts
|--------------------------------------------------------------------------
|
| 3D counterpart of `src/manim/scene.ts`. It owns the renderer, the three.js
| scene graph and the render loop, and takes an existing canvas exactly like
| the 2D scene so the editor can reuse the `SceneCanvas` mounting pattern.
|
| Deliberately not implemented yet: animation system, tracker system,
| grouping, OrbitControls.
|
*/

export interface Scene3DOptions {
  /** CSS colour for `scene.background`. Omit to keep the canvas transparent. */
  background?: string | null;
  /** Vertical field of view in degrees. Defaults to 45. */
  fov?: number;
  /** Initial device pixel ratio; clamped by `maxPixelRatio`. */
  pixelRatio?: number;
  /** Upper DPR bound. Defaults to 2. */
  maxPixelRatio?: number;
}

const DEFAULT_MAX_PIXEL_RATIO = 2;

export class Scene3D {
  readonly canvas: HTMLCanvasElement;

  readonly renderer: THREE.WebGLRenderer;

  readonly scene: THREE.Scene;

  readonly camera: Camera3D;

  readonly mobjectManager: Mobject3DManager;

  readonly selection: Selection3D;

  readonly animationSystem: Animation3DSystem;

  readonly properties: Scene3DProperties;

  private gridHelper: THREE.GridHelper | null = null;

  private axesHelper: THREE.AxesHelper | null = null;

  /** Emitted after each `update(dt)`, before the frame is rendered. */
  readonly onUpdate = new Signal<[number]>();

  /** Key/fill/ambient lights, kept together for easy replacement. */
  readonly lightRig = new THREE.Group();

  /** Logical (CSS pixel) viewport size. */
  width: number;

  height: number;

  pixelRatio: number;

  private readonly maxPixelRatio: number;

  private readonly timer = new THREE.Timer();

  private running = false;

  private disposed = false;

  constructor(canvas: HTMLCanvasElement, options: Scene3DOptions = {}) {
    this.canvas = canvas;

    this.renderer = new THREE.WebGLRenderer({
      canvas,
      antialias: true,
      alpha: true,
      powerPreference: "high-performance",
    });
    this.renderer.setClearColor(0x000000, 0);

    this.scene = new THREE.Scene();
    this.scene.background = options.background
      ? new THREE.Color(options.background)
      : null;

    this.camera = new Camera3D({ fov: options.fov });

    this.animationSystem = new Animation3DSystem(this);
    this.properties = new Scene3DProperties(
      options.background ? { backgroundColor: options.background } : {},
    );

    this.mobjectManager = new Mobject3DManager();
    this.scene.add(this.mobjectManager.root);

    this.selection = new Selection3D(this);
    this.mobjectManager.onRemove.connect((mobject) => {
      this.selection.forget(mobject);
      this.animationSystem.removeTarget(mobject.id);
    });

    this.lightRig.name = "light-rig-3d";
    this.scene.add(this.lightRig);
    this.setupLights();
    this.applySceneProperties();

    this.maxPixelRatio = Math.max(
      1,
      options.maxPixelRatio ?? DEFAULT_MAX_PIXEL_RATIO,
    );
    this.width = 1;
    this.height = 1;
    this.pixelRatio = 1;

    if (typeof document !== "undefined") {
      // Makes `getDelta()` ignore the gap while the tab was hidden.
      this.timer.connect(document);
    }

    this.resize(
      canvas.width || 1,
      canvas.height || 1,
      options.pixelRatio ?? 1,
    );

    this.initializeInput();
  }

  get isRunning(): boolean {
    return this.running;
  }

  get isDisposed(): boolean {
    return this.disposed;
  }

  private initializeInput(): void {
    this.canvas.addEventListener("pointerdown", this.onPointerDown);
  }

  private onPointerDown = (event: PointerEvent): void => {
    if (event.button !== 0) return;

    // Shift/Ctrl/Cmd-click extends the current selection instead of replacing
    // it, matching the 2D canvas and the scene/layers panels.
    if (event.shiftKey || event.ctrlKey || event.metaKey) {
      this.selection.multiselectAt(event.clientX, event.clientY);
    } else {
      this.selection.selectAt(event.clientX, event.clientY);
    }
  };

  private setupLights(): void {
    const ambient = new THREE.HemisphereLight(0xc7d7ff, 0x2b2f3a, 1.1);
    ambient.name = "ambient-3d";
    this.lightRig.add(ambient);

    const key = new THREE.DirectionalLight(0xffffff, 2.4);
    key.name = "key-3d";
    key.position.set(5, 8, 6);
    this.lightRig.add(key, key.target);

    const fill = new THREE.DirectionalLight(0x9db7ff, 0.7);
    fill.name = "fill-3d";
    fill.position.set(-6, 3, 4);
    this.lightRig.add(fill, fill.target);
  }

  start(): void {
    if (this.disposed || this.running) return;

    this.running = true;
    this.timer.reset();
    this.renderer.setAnimationLoop(this.animate);
  }

  stop(): void {
    if (!this.running) return;

    this.running = false;
    this.renderer.setAnimationLoop(null);
    this.timer.reset();
  }

  private readonly animate = (): void => {
    if (!this.running) return;

    this.timer.update();
    this.update(this.timer.getDelta());
  };

  /** Advance animations and mobjects, emit `onUpdate`, then draw one frame. */
  update(dt: number): void {
    if (this.disposed) return;

    this.animationSystem.update(dt);

    for (const mobject of this.mobjectManager.all()) {
      mobject.update(dt);
    }

    this.onUpdate.emit(dt);
    this.render();
  }

  /** Sync authored scene properties (background, lighting, helpers) to Three.js. */
  applySceneProperties(): void {
    if (this.disposed) return;

    const props = this.properties.get();

    // Background
    if (props.backgroundTransparent) {
      this.scene.background = null;
    } else {
      this.scene.background = new THREE.Color(props.backgroundColor);
    }

    // Ambient light
    const ambient = this.lightRig.getObjectByName(
      "ambient-3d",
    ) as THREE.HemisphereLight | undefined;
    if (ambient) {
      ambient.color.set(props.ambientSkyColor);
      ambient.groundColor.set(props.ambientGroundColor);
      ambient.intensity = props.ambientIntensity;
    }

    // Key light
    const key = this.lightRig.getObjectByName(
      "key-3d",
    ) as THREE.DirectionalLight | undefined;
    if (key) {
      key.color.set(props.keyLightColor);
      key.intensity = props.keyLightIntensity;
      key.position.set(
        props.keyLightPosition.x,
        props.keyLightPosition.y,
        props.keyLightPosition.z,
      );
    }

    // Fill light
    const fill = this.lightRig.getObjectByName(
      "fill-3d",
    ) as THREE.DirectionalLight | undefined;
    if (fill) {
      fill.color.set(props.fillLightColor);
      fill.intensity = props.fillLightIntensity;
      fill.position.set(
        props.fillLightPosition.x,
        props.fillLightPosition.y,
        props.fillLightPosition.z,
      );
    }

    // Grid helper
    if (props.gridVisible) {
      if (!this.gridHelper) {
        this.gridHelper = new THREE.GridHelper(
          props.gridSize,
          props.gridDivisions,
          props.gridColor,
          props.gridColor,
        );
        this.gridHelper.name = "grid-helper-3d";
        this.scene.add(this.gridHelper);
      } else {
        this.scene.remove(this.gridHelper);
        this.gridHelper.geometry.dispose();
        this.gridHelper = new THREE.GridHelper(
          props.gridSize,
          props.gridDivisions,
          props.gridColor,
          props.gridColor,
        );
        this.gridHelper.name = "grid-helper-3d";
        this.scene.add(this.gridHelper);
      }
      this.gridHelper.visible = true;
    } else if (this.gridHelper) {
      this.gridHelper.visible = false;
    }

    // Axes helper
    if (props.axesVisible) {
      if (!this.axesHelper) {
        this.axesHelper = new THREE.AxesHelper(props.axesSize);
        this.axesHelper.name = "axes-helper-3d";
        this.scene.add(this.axesHelper);
      } else {
        this.scene.remove(this.axesHelper);
        this.axesHelper.geometry.dispose();
        this.axesHelper = new THREE.AxesHelper(props.axesSize);
        this.axesHelper.name = "axes-helper-3d";
        this.scene.add(this.axesHelper);
      }
      this.axesHelper.visible = true;
    } else if (this.axesHelper) {
      this.axesHelper.visible = false;
    }

    this.render();
  }

  render(): void {
    if (this.disposed) return;

    this.renderer.render(this.scene, this.camera.camera);
  }

  /**
   * Resize the drawing buffer while keeping CSS size under the caller's
   * control (`setSize(..., false)`), matching `Scene.resize()`.
   */
  resize(width: number, height: number, pixelRatio = 1): void {
    if (this.disposed) return;

    const nextWidth = Math.max(1, Math.floor(width));
    const nextHeight = Math.max(1, Math.floor(height));
    const ratio = Math.min(this.maxPixelRatio, Math.max(1, pixelRatio));

    this.width = nextWidth;
    this.height = nextHeight;
    this.pixelRatio = ratio;

    this.renderer.setPixelRatio(ratio);
    this.renderer.setSize(nextWidth, nextHeight, false);
    this.camera.resize(nextWidth, nextHeight, ratio);

    this.render();
  }

  /** Remove every mobject, keeping the renderer and lights alive. */
  clear(): void {
    this.selection.clear();
    this.animationSystem.clear();
    this.mobjectManager.clear();
    this.render();
  }

  dispose(): void {
    if (this.disposed) return;

    this.disposed = true;

    this.stop();
    this.canvas.removeEventListener("pointerdown", this.onPointerDown);
    this.timer.disconnect();
    this.timer.dispose();
    this.onUpdate.clear();

    this.selection.dispose();
    this.animationSystem.clear();
    this.mobjectManager.dispose();

    if (this.gridHelper) {
      this.scene.remove(this.gridHelper);
      this.gridHelper.geometry.dispose();
      this.gridHelper = null;
    }

    if (this.axesHelper) {
      this.scene.remove(this.axesHelper);
      this.axesHelper.geometry.dispose();
      this.axesHelper = null;
    }

    this.scene.remove(this.lightRig);
    this.lightRig.clear();
    this.scene.clear();

    this.renderer.dispose();
  }
}
