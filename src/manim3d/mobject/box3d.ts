import * as THREE from "three";
import type { Value } from "@/manim/utils/value";
import { Values } from "@/manim/utils/value";
import { Mobject3D } from "./mobject3d";
import { Mobject3DName } from "./helpers/mobject3dName";
import {
  createBaseProperties3D,
  type BaseProperty3D,
} from "./helpers/propertycontroller3d";

export const DEFAULT_BOX_COLOR = "#ff8a4c";

export interface Box3DProperty extends BaseProperty3D {
  width: Value<number>;
  height: Value<number>;
  depth: Value<number>;
  color: Value<string>;
}

export interface Box3DOptions {
  /** Edge lengths in world units. Each defaults to 1. */
  width?: number;
  height?: number;
  depth?: number;
  color?: string;
  roughness?: number;
  metalness?: number;
}

/** An axis-aligned box primitive whose edges are authored in world units. */
export class Box3D extends Mobject3D<Box3DProperty> {
  private geometry: THREE.BoxGeometry;

  private readonly material: THREE.MeshStandardMaterial;

  private readonly mesh: THREE.Mesh;

  constructor(id: string, name: string, options: Box3DOptions = {}) {
    const width = Math.max(0, options.width ?? 1);
    const height = Math.max(0, options.height ?? 1);
    const depth = Math.max(0, options.depth ?? 1);
    const color = options.color ?? DEFAULT_BOX_COLOR;

    const geometry = new THREE.BoxGeometry(width, height, depth);
    const material = new THREE.MeshStandardMaterial({
      color,
      roughness: options.roughness ?? 0.55,
      metalness: options.metalness ?? 0.05,
    });
    const mesh = new THREE.Mesh(geometry, material);
    mesh.name = name;

    const properties: Box3DProperty = {
      ...createBaseProperties3D(),
      width: Values.number(width),
      height: Values.number(height),
      depth: Values.number(depth),
      color: Values.color(color),
    };

    super(id, Mobject3DName.Box, name, mesh, properties);

    this.geometry = geometry;
    this.material = material;
    this.mesh = mesh;

    this.sync();
  }

  get width(): number {
    return this.properties.width.get();
  }

  get height(): number {
    return this.properties.height.get();
  }

  get depth(): number {
    return this.properties.depth.get();
  }

  get color(): string {
    return this.properties.color.get();
  }

  setSize(width: number, height: number, depth: number): void {
    this.properties.width.set(Math.max(0, width));
    this.properties.height.set(Math.max(0, height));
    this.properties.depth.set(Math.max(0, depth));
    this.sync();
  }

  setColor(color: string): void {
    this.properties.color.set(color);
    this.sync();
  }

  protected override applyProperties(): void {
    const width = Math.max(0, this.properties.width.get());
    const height = Math.max(0, this.properties.height.get());
    const depth = Math.max(0, this.properties.depth.get());
    const current = this.geometry.parameters;

    if (
      width !== current.width ||
      height !== current.height ||
      depth !== current.depth
    ) {
      const next = new THREE.BoxGeometry(width, height, depth);

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
