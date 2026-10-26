import * as THREE from "three";
import {
  PropertyController3D,
  type BaseProperty3D,
} from "./helpers/propertycontroller3d";
import type { Mobject3DName } from "./helpers/mobject3dName";
import type { EulerData, Vector3Data } from "../utils/types3d";

/*
|--------------------------------------------------------------------------
| mobject3d.ts
|--------------------------------------------------------------------------
|
| 3D counterpart of `src/manim/mobject/mobect.ts` (the 2D spelling is
| legacy). A mobject wraps one three.js `Object3D`; all editor-facing state
| lives in `Value` properties, and `sync()` pushes that state onto the
| three.js node.
|
| Conventions:
|
|   • position / scale / radius are world units (1 unit = 50 CSS pixels).
|   • rotation is radians, XYZ Euler order.
|   • opacity is unitless and drives material opacity.
|   • materials are owned by the base class, geometry by the primitive.
|
*/

export abstract class Mobject3D<P extends BaseProperty3D = BaseProperty3D> {
  readonly id: string;

  /** Stable registry kind used to rebuild the object from a saved scene. */
  readonly kind: Mobject3DName;

  name: string;

  /** The three.js node that renders this mobject. */
  readonly object: THREE.Object3D;

  private readonly propertyController: PropertyController3D<P>;

  private disposed = false;

  private lastOpacity = Number.NaN;

  private _locked = false;

  protected constructor(
    id: string,
    kind: Mobject3DName,
    name: string,
    object: THREE.Object3D,
    properties: P,
  ) {
    this.id = id;
    this.kind = kind;
    this.name = name;
    this.object = object;
    this.object.userData.mobjectId = id;
    this.propertyController = new PropertyController3D(properties);

    // Subclass fields are not initialised yet, so only apply the transform
    // here. `sync()` is safe to call once the primitive has finished
    // constructing itself.
    this.syncTransform();
  }

  get properties(): P {
    return this.propertyController.properties;
  }

  get position(): Vector3Data {
    return this.properties.position.get();
  }

  get scale(): Vector3Data {
    return this.properties.scale.get();
  }

  get rotation(): EulerData {
    return this.properties.rotation.get();
  }

  getPropertyByName<K extends keyof P>(key: K): P[K] {
    return this.properties[key];
  }

  /** Scene-tree visibility, independent of opacity. */
  get visible(): boolean {
    return this.object.visible;
  }

  set visible(value: boolean) {
    this.object.visible = value;
  }

  /** Editor lock flag. Has no rendering effect. */
  get locked(): boolean {
    return this._locked;
  }

  set locked(value: boolean) {
    this._locked = value;
  }

  get isDisposed(): boolean {
    return this.disposed;
  }

  /**
   * Push every property onto the three.js node. Call after mutating a
   * property; this module does not observe `Value` changes yet.
   */
  sync(): void {
    if (this.disposed) return;

    this.syncTransform();
    this.syncOpacity();
    this.applyProperties();
  }

  /** Per-frame hook, mirroring `Mobject.update(dt)` in the 2D engine. */
  update(_dt: number): void {}

  protected syncTransform(): void {
    const position = this.properties.position.get();
    const scale = this.properties.scale.get();
    const rotation = this.properties.rotation.get();

    this.object.position.set(position.x, position.y, position.z);
    this.object.scale.set(scale.x, scale.y, scale.z);
    this.object.rotation.set(rotation.x, rotation.y, rotation.z);
  }

  protected syncOpacity(): void {
    const opacity = Math.max(0, Math.min(1, this.properties.opacity.get()));

    if (opacity === this.lastOpacity) return;

    this.lastOpacity = opacity;

    this.object.traverse((child) => {
      if (!(child instanceof THREE.Mesh)) return;

      const materials = Array.isArray(child.material)
        ? child.material
        : [child.material];

      for (const material of materials) {
        material.opacity = opacity;
        // Keep opaque materials on the fast path; transparent sorting is only
        // needed once the user actually fades the object.
        material.transparent = opacity < 1;
        material.depthWrite = opacity >= 1;
        material.needsUpdate = true;
      }
    });
  }

  /** Primitive-specific property application (geometry size, colour, …). */
  protected applyProperties(): void {}

  /**
   * Release GPU resources. The base class disposes every material it can
   * find; primitives that own geometry must override and dispose it too.
   */
  dispose(): void {
    if (this.disposed) return;

    this.disposed = true;

    this.object.traverse((child) => {
      if (!(child instanceof THREE.Mesh)) return;

      const materials = Array.isArray(child.material)
        ? child.material
        : [child.material];

      for (const material of materials) {
        material.dispose();
      }
    });

    this.object.removeFromParent();
    this.object.clear();
  }
}
