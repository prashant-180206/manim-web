import * as THREE from "three";
import type { Value } from "@/manim/utils/value";
import { Values } from "@/manim/utils/value";
import { Mobject3D } from "./mobject3d";
import { Mobject3DName } from "./helpers/mobject3dName";
import {
  createBaseProperties3D,
  type BaseProperty3D,
} from "./helpers/propertycontroller3d";

export const DEFAULT_CONE_COLOR = "#e07be0";

export interface Cone3DProperty extends BaseProperty3D {
  radius: Value<number>;
  height: Value<number>;
  color: Value<string>;
}

export interface Cone3DOptions {
  /** Base radius in world units. Defaults to 1. */
  radius?: number;
  /** Height in world units. Defaults to 2. */
  height?: number;
  radialSegments?: number;
  color?: string;
  roughness?: number;
  metalness?: number;
}

/** A solid with a circular base and a pointed tip, centred on the origin. */
export class Cone3D extends Mobject3D<Cone3DProperty> {
  private geometry: THREE.ConeGeometry;

  private readonly material: THREE.MeshStandardMaterial;

  private readonly mesh: THREE.Mesh;

  private readonly radialSegments: number;

  constructor(id: string, name: string, options: Cone3DOptions = {}) {
    const radius = Math.max(0, options.radius ?? 1);
    const height = Math.max(0, options.height ?? 2);
    const color = options.color ?? DEFAULT_CONE_COLOR;
    const radialSegments = Math.max(3, options.radialSegments ?? 48);

    const geometry = new THREE.ConeGeometry(radius, height, radialSegments);
    const material = new THREE.MeshStandardMaterial({
      color,
      roughness: options.roughness ?? 0.5,
      metalness: options.metalness ?? 0.05,
    });
    const mesh = new THREE.Mesh(geometry, material);
    mesh.name = name;

    const properties: Cone3DProperty = {
      ...createBaseProperties3D(),
      radius: Values.number(radius),
      height: Values.number(height),
      color: Values.color(color),
    };

    super(id, Mobject3DName.Cone, name, mesh, properties);

    this.geometry = geometry;
    this.material = material;
    this.mesh = mesh;
    this.radialSegments = radialSegments;

    this.sync();
  }

  get radius(): number {
    return this.properties.radius.get();
  }

  get height(): number {
    return this.properties.height.get();
  }

  get color(): string {
    return this.properties.color.get();
  }

  setRadius(radius: number): void {
    this.properties.radius.set(Math.max(0, radius));
    this.sync();
  }

  setHeight(height: number): void {
    this.properties.height.set(Math.max(0, height));
    this.sync();
  }

  setColor(color: string): void {
    this.properties.color.set(color);
    this.sync();
  }

  protected override applyProperties(): void {
    const radius = Math.max(0, this.properties.radius.get());
    const height = Math.max(0, this.properties.height.get());
    const current = this.geometry.parameters;

    if (radius !== current.radius || height !== current.height) {
      const next = new THREE.ConeGeometry(
        radius,
        height,
        this.radialSegments,
      );

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
