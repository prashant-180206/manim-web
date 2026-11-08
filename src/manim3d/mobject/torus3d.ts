import * as THREE from "three";
import type { Value } from "@/manim/utils/value";
import { Values } from "@/manim/utils/value";
import { Mobject3D } from "./mobject3d";
import { Mobject3DName } from "./helpers/mobject3dName";
import {
  createBaseProperties3D,
  type BaseProperty3D,
} from "./helpers/propertycontroller3d";

export const DEFAULT_TORUS_COLOR = "#ff7b9c";

export interface Torus3DProperty extends BaseProperty3D {
  radius: Value<number>;
  tube: Value<number>;
  color: Value<string>;
}

export interface Torus3DOptions {
  /** Distance from the centre to the tube centre, in world units. */
  radius?: number;
  /** Tube thickness in world units. */
  tube?: number;
  radialSegments?: number;
  tubularSegments?: number;
  color?: string;
  roughness?: number;
  metalness?: number;
}

/** A donut-shaped solid lying in the xy plane. */
export class Torus3D extends Mobject3D<Torus3DProperty> {
  private geometry: THREE.TorusGeometry;

  private readonly material: THREE.MeshStandardMaterial;

  private readonly mesh: THREE.Mesh;

  private readonly radialSegments: number;

  private readonly tubularSegments: number;

  constructor(id: string, name: string, options: Torus3DOptions = {}) {
    const radius = Math.max(0, options.radius ?? 1);
    const tube = Math.max(0, options.tube ?? 0.3);
    const color = options.color ?? DEFAULT_TORUS_COLOR;
    const radialSegments = Math.max(3, options.radialSegments ?? 24);
    const tubularSegments = Math.max(3, options.tubularSegments ?? 64);

    const geometry = new THREE.TorusGeometry(
      radius,
      tube,
      radialSegments,
      tubularSegments,
    );
    const material = new THREE.MeshStandardMaterial({
      color,
      roughness: options.roughness ?? 0.45,
      metalness: options.metalness ?? 0.05,
    });
    const mesh = new THREE.Mesh(geometry, material);
    mesh.name = name;

    const properties: Torus3DProperty = {
      ...createBaseProperties3D(),
      radius: Values.number(radius),
      tube: Values.number(tube),
      color: Values.color(color),
    };

    super(id, Mobject3DName.Torus, name, mesh, properties);

    this.geometry = geometry;
    this.material = material;
    this.mesh = mesh;
    this.radialSegments = radialSegments;
    this.tubularSegments = tubularSegments;

    this.sync();
  }

  get radius(): number {
    return this.properties.radius.get();
  }

  get tube(): number {
    return this.properties.tube.get();
  }

  get color(): string {
    return this.properties.color.get();
  }

  setRadius(radius: number): void {
    this.properties.radius.set(Math.max(0, radius));
    this.sync();
  }

  setTube(tube: number): void {
    this.properties.tube.set(Math.max(0, tube));
    this.sync();
  }

  setColor(color: string): void {
    this.properties.color.set(color);
    this.sync();
  }

  protected override applyProperties(): void {
    const radius = Math.max(0, this.properties.radius.get());
    const tube = Math.max(0, this.properties.tube.get());
    const current = this.geometry.parameters;

    if (radius !== current.radius || tube !== current.tube) {
      const next = new THREE.TorusGeometry(
        radius,
        tube,
        this.radialSegments,
        this.tubularSegments,
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
