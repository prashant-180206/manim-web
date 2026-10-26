import * as THREE from "three";
import type { Value } from "@/manim/utils/value";
import { Values } from "@/manim/utils/value";
import { Mobject3D } from "./mobject3d";
import { Mobject3DName } from "./helpers/mobject3dName";
import {
  createBaseProperties3D,
  type BaseProperty3D,
} from "./helpers/propertycontroller3d";

export const DEFAULT_SPHERE_COLOR = "#4f8cff";

export interface Sphere3DProperty extends BaseProperty3D {
  radius: Value<number>;
  color: Value<string>;
}

export interface Sphere3DOptions {
  /** Radius in world units. Defaults to 1. */
  radius?: number;
  widthSegments?: number;
  heightSegments?: number;
  color?: string;
  roughness?: number;
  metalness?: number;
}

/**
 * A UV sphere primitive. Geometry properties are stored in world units; the
 * global `scale` property still applies on top of `radius`.
 */
export class Sphere3D extends Mobject3D<Sphere3DProperty> {
  private geometry: THREE.SphereGeometry;

  private readonly material: THREE.MeshStandardMaterial;

  private readonly mesh: THREE.Mesh;

  constructor(id: string, name: string, options: Sphere3DOptions = {}) {
    const radius = Math.max(0, options.radius ?? 1);
    const color = options.color ?? DEFAULT_SPHERE_COLOR;

    const geometry = new THREE.SphereGeometry(
      radius,
      options.widthSegments ?? 48,
      options.heightSegments ?? 32,
    );
    const material = new THREE.MeshStandardMaterial({
      color,
      roughness: options.roughness ?? 0.45,
      metalness: options.metalness ?? 0.05,
    });
    const mesh = new THREE.Mesh(geometry, material);
    mesh.name = name;

    const properties: Sphere3DProperty = {
      ...createBaseProperties3D(),
      radius: Values.number(radius),
      color: Values.color(color),
    };

    super(id, Mobject3DName.Sphere, name, mesh, properties);

    this.geometry = geometry;
    this.material = material;
    this.mesh = mesh;

    this.sync();
  }

  get radius(): number {
    return this.properties.radius.get();
  }

  get color(): string {
    return this.properties.color.get();
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
    const radius = Math.max(0, this.properties.radius.get());
    const { widthSegments, heightSegments } = this.geometry.parameters;

    if (radius !== this.geometry.parameters.radius) {
      const next = new THREE.SphereGeometry(
        radius,
        widthSegments,
        heightSegments,
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
