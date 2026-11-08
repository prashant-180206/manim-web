import * as THREE from "three";
import type { Value } from "@/manim/utils/value";
import { Values } from "@/manim/utils/value";
import { Mobject3D } from "./mobject3d";
import { Mobject3DName } from "./helpers/mobject3dName";
import {
  createBaseProperties3D,
  type BaseProperty3D,
} from "./helpers/propertycontroller3d";

export const DEFAULT_ARROW_COLOR = "#ffd166";

export interface Arrow3DProperty extends BaseProperty3D {
  length: Value<number>;
  shaftRadius: Value<number>;
  headRadius: Value<number>;
  headLength: Value<number>;
  color: Value<string>;
}

export interface Arrow3DOptions {
  /** Total length from tail to tip, in world units. Defaults to 2. */
  length?: number;
  /** Shaft cross-section radius in world units. Defaults to 0.05. */
  shaftRadius?: number;
  /** Head base radius in world units. Defaults to 0.16. */
  headRadius?: number;
  /** Head length in world units. Defaults to 0.5. */
  headLength?: number;
  color?: string;
  roughness?: number;
  metalness?: number;
}

/**
 * An arrow built from a cylindrical shaft plus a conical head. The tail sits
 * at local `-y`, the tip at local `+y`, and the whole shape is centred on the
 * origin. Rotate the mobject to aim it.
 */
export class Arrow3D extends Mobject3D<Arrow3DProperty> {
  private shaftGeometry: THREE.CylinderGeometry;

  private headGeometry: THREE.ConeGeometry;

  private readonly material: THREE.MeshStandardMaterial;

  private readonly shaft: THREE.Mesh;

  private readonly head: THREE.Mesh;

  constructor(id: string, name: string, options: Arrow3DOptions = {}) {
    const length = Math.max(0, options.length ?? 2);
    const shaftRadius = Math.max(0, options.shaftRadius ?? 0.05);
    const headRadius = Math.max(0, options.headRadius ?? 0.16);
    const headLength = Math.min(Math.max(0, options.headLength ?? 0.5), length);
    const color = options.color ?? DEFAULT_ARROW_COLOR;

    const shaftLength = Math.max(0.0001, length - headLength);

    const shaftGeometry = new THREE.CylinderGeometry(
      shaftRadius,
      shaftRadius,
      shaftLength,
      16,
    );
    const headGeometry = new THREE.ConeGeometry(
      headRadius,
      Math.max(0.0001, headLength),
      24,
    );
    const material = new THREE.MeshStandardMaterial({
      color,
      roughness: options.roughness ?? 0.45,
      metalness: options.metalness ?? 0.1,
    });

    const shaft = new THREE.Mesh(shaftGeometry, material);
    shaft.name = `${name} shaft`;
    shaft.position.y = -headLength / 2;

    const head = new THREE.Mesh(headGeometry, material);
    head.name = `${name} head`;
    head.position.y = length / 2 - headLength / 2;

    const group = new THREE.Group();
    group.name = name;
    group.add(shaft, head);

    const properties: Arrow3DProperty = {
      ...createBaseProperties3D(),
      length: Values.number(length),
      shaftRadius: Values.number(shaftRadius),
      headRadius: Values.number(headRadius),
      headLength: Values.number(headLength),
      color: Values.color(color),
    };

    super(id, Mobject3DName.Arrow, name, group, properties);

    this.shaftGeometry = shaftGeometry;
    this.headGeometry = headGeometry;
    this.material = material;
    this.shaft = shaft;
    this.head = head;

    this.sync();
  }

  get length(): number {
    return this.properties.length.get();
  }

  get shaftRadius(): number {
    return this.properties.shaftRadius.get();
  }

  get headRadius(): number {
    return this.properties.headRadius.get();
  }

  get headLength(): number {
    return this.properties.headLength.get();
  }

  get color(): string {
    return this.properties.color.get();
  }

  setLength(length: number): void {
    this.properties.length.set(Math.max(0, length));
    this.sync();
  }

  setShaftRadius(radius: number): void {
    this.properties.shaftRadius.set(Math.max(0, radius));
    this.sync();
  }

  setHeadRadius(radius: number): void {
    this.properties.headRadius.set(Math.max(0, radius));
    this.sync();
  }

  setHeadLength(length: number): void {
    this.properties.headLength.set(Math.max(0, length));
    this.sync();
  }

  setColor(color: string): void {
    this.properties.color.set(color);
    this.sync();
  }

  protected override applyProperties(): void {
    const length = Math.max(0, this.properties.length.get());
    const shaftRadius = Math.max(0, this.properties.shaftRadius.get());
    const headRadius = Math.max(0, this.properties.headRadius.get());
    const headLength = Math.min(
      Math.max(0, this.properties.headLength.get()),
      length,
    );
    const shaftLength = Math.max(0.0001, length - headLength);

    const shaftCurrent = this.shaftGeometry.parameters;
    const headCurrent = this.headGeometry.parameters;

    if (
      shaftLength !== shaftCurrent.height ||
      shaftRadius !== shaftCurrent.radiusTop ||
      shaftRadius !== shaftCurrent.radiusBottom
    ) {
      const next = new THREE.CylinderGeometry(
        shaftRadius,
        shaftRadius,
        shaftLength,
        16,
      );

      this.shaftGeometry.dispose();
      this.shaftGeometry = next;
      this.shaft.geometry = next;
    }

    if (
      headLength !== headCurrent.height ||
      headRadius !== headCurrent.radius
    ) {
      const next = new THREE.ConeGeometry(
        headRadius,
        Math.max(0.0001, headLength),
        24,
      );

      this.headGeometry.dispose();
      this.headGeometry = next;
      this.head.geometry = next;
    }

    this.shaft.position.y = -headLength / 2;
    this.head.position.y = length / 2 - headLength / 2;
    this.material.color.set(this.properties.color.get());
  }

  override dispose(): void {
    if (this.isDisposed) return;

    super.dispose();
    this.shaftGeometry.dispose();
    this.headGeometry.dispose();
  }
}
