import * as THREE from "three";
import { Parser } from "expr-eval";
import type { Value } from "@/manim/utils/value";
import { Values } from "@/manim/utils/value";
import { Mobject3D } from "./mobject3d";
import { Mobject3DName } from "./helpers/mobject3dName";
import {
  createBaseProperties3D,
  type BaseProperty3D,
} from "./helpers/propertycontroller3d";

export const DEFAULT_SURFACE_COLOR = "#7dd3fc";

export interface Surface3DProperty extends BaseProperty3D {
  xExpression: Value<string>;
  yExpression: Value<string>;
  zExpression: Value<string>;
  uMin: Value<number>;
  uMax: Value<number>;
  vMin: Value<number>;
  vMax: Value<number>;
  samples: Value<number>;
  color: Value<string>;
}

export interface Surface3DOptions {
  xExpression?: string;
  yExpression?: string;
  zExpression?: string;
  uMin?: number;
  uMax?: number;
  vMin?: number;
  vMax?: number;
  samples?: number;
  color?: string;
  roughness?: number;
  metalness?: number;
}

const MIN_SAMPLES = 2;

const MAX_SAMPLES = 160;

/**
 * A parametric surface sampled over a `(u, v)` grid. The three expressions
 * return the world-space x/y/z position for each sample; `expr-eval` exposes
 * `u` and `v` (plus the usual math functions). Invalid expressions keep the
 * last good mesh instead of breaking the render loop.
 */
export class Surface3D extends Mobject3D<Surface3DProperty> {
  private parser = new Parser();

  private geometry: THREE.BufferGeometry;

  private readonly material: THREE.MeshStandardMaterial;

  private readonly mesh: THREE.Mesh;

  private lastSignature = "";

  constructor(id: string, name: string, options: Surface3DOptions = {}) {
    const geometry = new THREE.BufferGeometry();
    const material = new THREE.MeshStandardMaterial({
      color: options.color ?? DEFAULT_SURFACE_COLOR,
      roughness: options.roughness ?? 0.55,
      metalness: options.metalness ?? 0.05,
      side: THREE.DoubleSide,
    });
    const mesh = new THREE.Mesh(geometry, material);
    mesh.name = name;

    const properties: Surface3DProperty = {
      ...createBaseProperties3D(),
      xExpression: Values.string(options.xExpression ?? "u"),
      yExpression: Values.string(
        options.yExpression ?? "0.4 * sin(u * PI) * cos(v * PI)",
      ),
      zExpression: Values.string(options.zExpression ?? "v"),
      uMin: Values.number(options.uMin ?? -1),
      uMax: Values.number(options.uMax ?? 1),
      vMin: Values.number(options.vMin ?? -1),
      vMax: Values.number(options.vMax ?? 1),
      samples: Values.number(options.samples ?? 32),
      color: Values.color(options.color ?? DEFAULT_SURFACE_COLOR),
    };

    super(id, Mobject3DName.Surface, name, mesh, properties);

    this.geometry = geometry;
    this.material = material;
    this.mesh = mesh;

    this.sync();
  }

  get xExpression(): string {
    return this.properties.xExpression.get();
  }

  get yExpression(): string {
    return this.properties.yExpression.get();
  }

  get zExpression(): string {
    return this.properties.zExpression.get();
  }

  get color(): string {
    return this.properties.color.get();
  }

  setExpression(axis: "x" | "y" | "z", expression: string): void {
    this.properties[`${axis}Expression`].set(expression);
    this.sync();
  }

  setColor(color: string): void {
    this.properties.color.set(color);
    this.sync();
  }

  private geometrySignature(): string {
    const p = this.properties;

    return [
      p.xExpression.get(),
      p.yExpression.get(),
      p.zExpression.get(),
      p.uMin.get(),
      p.uMax.get(),
      p.vMin.get(),
      p.vMax.get(),
      this.sampleCount(),
    ].join("|");
  }

  private sampleCount(): number {
    return Math.min(
      MAX_SAMPLES,
      Math.max(MIN_SAMPLES, Math.round(this.properties.samples.get())),
    );
  }

  private buildGeometry(): THREE.BufferGeometry | null {
    const p = this.properties;
    const samples = this.sampleCount();
    const uMin = Math.min(p.uMin.get(), p.uMax.get());
    const uMax = Math.max(p.uMin.get(), p.uMax.get());
    const vMin = Math.min(p.vMin.get(), p.vMax.get());
    const vMax = Math.max(p.vMin.get(), p.vMax.get());
    const row = samples + 1;
    const positions = new Float32Array(row * row * 3);
    const indices: number[] = [];

    try {
      const xExpression = this.parser.parse(p.xExpression.get());
      const yExpression = this.parser.parse(p.yExpression.get());
      const zExpression = this.parser.parse(p.zExpression.get());

      for (let i = 0; i < row; i += 1) {
        const v = vMin + ((vMax - vMin) * i) / samples;

        for (let j = 0; j < row; j += 1) {
          const u = uMin + ((uMax - uMin) * j) / samples;
          const scope = { u, v };
          const x = xExpression.evaluate(scope);
          const y = yExpression.evaluate(scope);
          const z = zExpression.evaluate(scope);

          if (
            !Number.isFinite(x) ||
            !Number.isFinite(y) ||
            !Number.isFinite(z)
          ) {
            return null;
          }

          const offset = (i * row + j) * 3;

          positions[offset] = x;
          positions[offset + 1] = y;
          positions[offset + 2] = z;
        }
      }
    } catch {
      return null;
    }

    for (let i = 0; i < samples; i += 1) {
      for (let j = 0; j < samples; j += 1) {
        const a = i * row + j;
        const b = a + 1;
        const c = a + row;
        const d = c + 1;

        indices.push(a, c, b, b, c, d);
      }
    }

    const geometry = new THREE.BufferGeometry();

    geometry.setAttribute(
      "position",
      new THREE.BufferAttribute(positions, 3),
    );
    geometry.setIndex(indices);
    geometry.computeVertexNormals();

    return geometry;
  }

  protected override applyProperties(): void {
    const signature = this.geometrySignature();

    if (signature !== this.lastSignature) {
      const next = this.buildGeometry();

      if (next) {
        this.geometry.dispose();
        this.geometry = next;
        this.mesh.geometry = next;
        this.lastSignature = signature;
      }
    }

    this.material.color.set(this.properties.color.get());
  }

  override dispose(): void {
    if (this.isDisposed) return;

    super.dispose();
    this.geometry.dispose();
  }
}
