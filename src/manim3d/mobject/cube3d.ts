import * as THREE from "three";
import type { Value } from "@/manim/utils/value";
import { Values } from "@/manim/utils/value";
import { Mobject3D } from "./mobject3d";
import { Mobject3DName } from "./helpers/mobject3dName";
import {
  createBaseProperties3D,
  type BaseProperty3D,
} from "./helpers/propertycontroller3d";

export const DEFAULT_CUBE_COLOR = "#f4c95d";

export interface Cube3DProperty extends BaseProperty3D {
  side: Value<number>;
  color: Value<string>;
}

export interface Cube3DOptions {
  /** Edge length in world units. Defaults to 1. */
  side?: number;
  color?: string;
  roughness?: number;
  metalness?: number;
}

/** A six-faced solid with equal edges. */
export class Cube3D extends Mobject3D<Cube3DProperty> {
  private geometry: THREE.BoxGeometry;

  private readonly material: THREE.MeshStandardMaterial;

  private readonly mesh: THREE.Mesh;

  constructor(id: string, name: string, options: Cube3DOptions = {}) {
    const side = Math.max(0, options.side ?? 1);
    const color = options.color ?? DEFAULT_CUBE_COLOR;

    const geometry = new THREE.BoxGeometry(side, side, side);
    const material = new THREE.MeshStandardMaterial({
      color,
      roughness: options.roughness ?? 0.5,
      metalness: options.metalness ?? 0.05,
    });
    const mesh = new THREE.Mesh(geometry, material);
    mesh.name = name;

    const properties: Cube3DProperty = {
      ...createBaseProperties3D(),
      side: Values.number(side),
      color: Values.color(color),
    };

    super(id, Mobject3DName.Cube, name, mesh, properties);

    this.geometry = geometry;
    this.material = material;
    this.mesh = mesh;

    this.sync();
  }

  get side(): number {
    return this.properties.side.get();
  }

  get color(): string {
    return this.properties.color.get();
  }

  setSide(side: number): void {
    this.properties.side.set(Math.max(0, side));
    this.sync();
  }

  setColor(color: string): void {
    this.properties.color.set(color);
    this.sync();
  }

  protected override applyProperties(): void {
    const side = Math.max(0, this.properties.side.get());

    if (side !== this.geometry.parameters.width) {
      const next = new THREE.BoxGeometry(side, side, side);

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
