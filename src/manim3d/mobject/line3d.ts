import * as THREE from "three";
import type { Value } from "@/manim/utils/value";
import { Values } from "@/manim/utils/value";
import { Mobject3D } from "./mobject3d";
import { Mobject3DName } from "./helpers/mobject3dName";
import {
  createBaseProperties3D,
  type BaseProperty3D,
} from "./helpers/propertycontroller3d";

export const DEFAULT_LINE_COLOR = "#d7dbe7";

export interface Line3DProperty extends BaseProperty3D {
  length: Value<number>;
  radius: Value<number>;
  color: Value<string>;
}

export interface Line3DOptions {
  /** Length in world units. Defaults to 2. */
  length?: number;
  /** Cross-section radius in world units. Defaults to 0.03. */
  radius?: number;
  color?: string;
  roughness?: number;
  metalness?: number;
}

/**
 * A thin cylindrical segment centred on the origin and oriented along local
 * `+y`. Rotate the mobject to aim it elsewhere.
 */
export class Line3D extends Mobject3D<Line3DProperty> {
  private geometry: THREE.CylinderGeometry;

  private readonly material: THREE.MeshStandardMaterial;

  private readonly mesh: THREE.Mesh;

  constructor(id: string, name: string, options: Line3DOptions = {}) {
    const length = Math.max(0, options.length ?? 2);
    const radius = Math.max(0, options.radius ?? 0.03);
    const color = options.color ?? DEFAULT_LINE_COLOR;

    const geometry = new THREE.CylinderGeometry(radius, radius, length, 16);
    const material = new THREE.MeshStandardMaterial({
      color,
      roughness: options.roughness ?? 0.5,
      metalness: options.metalness ?? 0.05,
    });
    const mesh = new THREE.Mesh(geometry, material);
    mesh.name = name;

    const properties: Line3DProperty = {
      ...createBaseProperties3D(),
      length: Values.number(length),
      radius: Values.number(radius),
      color: Values.color(color),
    };

    super(id, Mobject3DName.Line, name, mesh, properties);

    this.geometry = geometry;
    this.material = material;
    this.mesh = mesh;

    this.sync();
  }

  get length(): number {
    return this.properties.length.get();
  }

  get radius(): number {
    return this.properties.radius.get();
  }

  get color(): string {
    return this.properties.color.get();
  }

  setLength(length: number): void {
    this.properties.length.set(Math.max(0, length));
    this.sync();
  }

  setRadius(radius: number): void {
    this.properties.radius.set(Math.max(0, radius));
    this.sync();
  }

  setColor(color: string): void {
    this.properties.color.set(color);
    this.sync();
  }

  protected override applyProperties(): void {
    const length = Math.max(0, this.properties.length.get());
    const radius = Math.max(0, this.properties.radius.get());
    const current = this.geometry.parameters;

    if (
      length !== current.height ||
      radius !== current.radiusTop ||
      radius !== current.radiusBottom
    ) {
      const next = new THREE.CylinderGeometry(radius, radius, length, 16);

      this.geometry.dispose();
      this.geometry = next;
      this.mesh.geometry = next;
    }

    this.material.color.set(this.properties.color.get());
  }

  override dispose(): void {
    if (this.isDisposed) return;

    super.dispose();
    this.geometry.dispose();
  }
}
