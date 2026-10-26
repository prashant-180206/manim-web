import { PropertyController } from "./helpers/propertycontroller";
import { BaseProperty } from "./helpers/proprertytypes";
import { Value, Values } from "../utils/value";
import { Mobject } from "./mobect";
import { PIXELS_PER_UNIT } from "../utils/units";

interface PolarPlaneProperty extends BaseProperty {
  radius: Value<number>;
  radialStep: Value<number>;
  angleStep: Value<number>;
  showCircles: Value<boolean>;
  showRadialLines: Value<boolean>;
  showLabels: Value<boolean>;
  circleColor: Value<string>;
  radialColor: Value<string>;
  labelColor: Value<string>;
  circleStrokeWidth: Value<number>;
  radialStrokeWidth: Value<number>;
  fontSize: Value<number>;
}

/** Prevent tiny steps from generating an unbounded number of rings. */
const MAX_RINGS = 1000;

/** Prevent tiny angle steps from generating an unbounded number of spokes. */
const MAX_SPOKES = 720;

/** Click tolerance around rings and spokes, in CSS pixels. */
const HIT_TOLERANCE_PIXELS = 8;

function positive(value: number): number {
  return Number.isFinite(value) ? Math.abs(value) : 0;
}

function formatTick(value: number): string {
  if (Math.abs(value) < 1e-9) return "0";

  if (Number.isInteger(value)) {
    return String(value);
  }

  return value.toFixed(2).replace(/\.?0+$/, "");
}

/**
 * A polar coordinate plane with concentric circles, radial spokes and labels.
 *
 * The plane is centred on its position and extends `radius` world units in
 * every direction. `radialStep` is a geometry property in world units,
 * `angleStep` is measured in degrees, and stroke widths / font size are screen
 * styles in CSS pixels.
 */
export class PolarPlane extends Mobject {
  constructor(id: string, name: string) {
    super(id, name);

    this.propertyController = new PropertyController<PolarPlaneProperty>({
      ...this.propertyController.properties,
      radius: Values.number(4),
      radialStep: Values.number(1),
      angleStep: Values.number(30),
      showCircles: Values.boolean(true),
      showRadialLines: Values.boolean(true),
      showLabels: Values.boolean(true),
      circleColor: Values.color("#3f3f46"),
      radialColor: Values.color("#3f3f46"),
      labelColor: Values.color("#e4e4e7"),
      circleStrokeWidth: Values.number(1),
      radialStrokeWidth: Values.number(1),
      fontSize: Values.number(12),
    }) as any;
  }

  override render(ctx: CanvasRenderingContext2D): void {
    const p = this.propertyController.properties as PolarPlaneProperty;
    const radius = positive(p.radius.get());

    this.beginRender(ctx);

    if (radius > 0) {
      if (p.showCircles.get()) {
        this.renderCircles(ctx, p, radius);
      }

      if (p.showRadialLines.get()) {
        this.renderSpokes(ctx, p, radius);
      }

      if (p.showLabels.get()) {
        this.renderLabels(ctx, p, radius);
      }
    }

    this.endRender(ctx);
  }

  /**
   * Hit testing targets the visible circles and spokes rather than the whole
   * disc, so a large plane does not swallow every canvas click.
   */
  contains(x: number, y: number): boolean {
    const p = this.propertyController.properties as PolarPlaneProperty;
    const radius = positive(p.radius.get());

    if (radius <= 0) return false;

    const point = this.worldToLocal(x, y);
    const distance = Math.hypot(point.x, point.y);
    const scale = this.scale;
    const objectScale =
      Math.sqrt(Math.abs(scale.x * scale.y)) || 1;
    const tolerance = HIT_TOLERANCE_PIXELS / PIXELS_PER_UNIT / objectScale;

    if (distance > radius + tolerance) return false;

    if (p.showCircles.get()) {
      const step = this.safeRadialStep(p.radialStep.get(), radius);

      if (step > 0) {
        const nearestRing = Math.round(distance / step) * step;

        if (Math.abs(distance - nearestRing) <= tolerance) return true;
      }

      // The outer boundary is always drawn, even when it is not an exact
      // multiple of `radialStep`.
      if (Math.abs(distance - radius) <= tolerance) return true;
    }

    if (p.showRadialLines.get() && distance > tolerance) {
      const step = this.safeAngleStep(p.angleStep.get());

      if (step > 0) {
        const degrees = (Math.atan2(point.y, point.x) * 180) / Math.PI;
        const wrapped = (degrees + 360) % 360;
        const nearest = Math.round(wrapped / step) * step;
        const delta = (Math.abs(wrapped - nearest) * Math.PI) / 180;
        const perpendicularDistance = Math.abs(distance * Math.sin(delta));

        if (perpendicularDistance <= tolerance) return true;
      }
    }

    return false;
  }

  /** Smallest usable ring spacing, bounded by `MAX_RINGS`. */
  private safeRadialStep(requested: number, radius: number): number {
    const step = positive(requested);

    if (step <= 0 || radius <= 0) return 0;

    return Math.max(step, (radius * 2) / MAX_RINGS);
  }

  /** Smallest usable angle spacing in degrees, bounded by `MAX_SPOKES`. */
  private safeAngleStep(requested: number): number {
    const step = positive(requested);

    if (step <= 0) return 0;

    return Math.min(Math.max(step, 360 / MAX_SPOKES), 360);
  }

  private renderCircles(
    ctx: CanvasRenderingContext2D,
    p: PolarPlaneProperty,
    radius: number,
  ): void {
    const step = this.safeRadialStep(p.radialStep.get(), radius);

    if (step <= 0 || p.circleStrokeWidth.get() <= 0) return;

    const count = Math.floor(radius / step + 1e-9);

    ctx.strokeStyle = p.circleColor.get();
    this.applyStrokeWidth(ctx, p.circleStrokeWidth.get());
    ctx.beginPath();

    for (let i = 1; i <= count; i += 1) {
      const ringRadius = i * step;
      ctx.moveTo(ringRadius, 0);
      ctx.arc(0, 0, ringRadius, 0, Math.PI * 2);
    }

    // Draw the boundary when it falls between two grid rings.
    if (radius - count * step > 1e-9) {
      ctx.moveTo(radius, 0);
      ctx.arc(0, 0, radius, 0, Math.PI * 2);
    }

    ctx.stroke();
  }

  private renderSpokes(
    ctx: CanvasRenderingContext2D,
    p: PolarPlaneProperty,
    radius: number,
  ): void {
    const step = this.safeAngleStep(p.angleStep.get());

    if (step <= 0 || p.radialStrokeWidth.get() <= 0) return;

    const count = Math.min(Math.ceil(360 / step - 1e-9), MAX_SPOKES);

    ctx.strokeStyle = p.radialColor.get();
    this.applyStrokeWidth(ctx, p.radialStrokeWidth.get());
    ctx.beginPath();

    for (let i = 0; i < count; i += 1) {
      const angle = (i * step * Math.PI) / 180;
      ctx.moveTo(0, 0);
      ctx.lineTo(radius * Math.cos(angle), radius * Math.sin(angle));
    }

    ctx.stroke();
  }

  private renderLabels(
    ctx: CanvasRenderingContext2D,
    p: PolarPlaneProperty,
    radius: number,
  ): void {
    const fontSize = p.fontSize.get();

    if (!Number.isFinite(fontSize) || fontSize <= 0) return;

    if (p.showCircles.get()) {
      const step = this.safeRadialStep(p.radialStep.get(), radius);

      if (step > 0) {
        const count = Math.floor(radius / step + 1e-9);

        // Radius labels sit just above the positive x-axis.
        for (let i = 1; i <= count; i += 1) {
          const ringRadius = i * step;
          this.drawLabel(
            ctx,
            p,
            formatTick(ringRadius),
            ringRadius,
            0,
            0,
            -fontSize * 0.85,
            "center",
          );
        }

        if (radius - count * step > 1e-9) {
          this.drawLabel(
            ctx,
            p,
            formatTick(radius),
            radius,
            0,
            0,
            -fontSize * 0.85,
            "center",
          );
        }
      }
    }

    if (p.showRadialLines.get()) {
      const step = this.safeAngleStep(p.angleStep.get());

      if (step > 0) {
        const count = Math.min(Math.ceil(360 / step - 1e-9), MAX_SPOKES);

        // Angle labels sit just outside the outer circle, pushed outwards in
        // screen pixels so they follow the spoke direction.
        for (let i = 0; i < count; i += 1) {
          const degrees = i * step;
          const angle = (degrees * Math.PI) / 180;
          const x = radius * Math.cos(angle);
          const y = radius * Math.sin(angle);

          this.drawLabel(
            ctx,
            p,
            `${formatTick(degrees)}°`,
            x,
            y,
            Math.cos(angle) * fontSize * 1.1,
            -Math.sin(angle) * fontSize * 1.1,
            "center",
          );
        }
      }
    }
  }

  /**
   * Draw upright, screen-sized text at a local world position. Cancelling the
   * object's scale keeps `fontSize` in CSS pixels even when the plane is
   * scaled, matching the other text mobjects' screen-style semantics.
   */
  private drawLabel(
    ctx: CanvasRenderingContext2D,
    p: PolarPlaneProperty,
    text: string,
    x: number,
    y: number,
    offsetX: number,
    offsetY: number,
    align: CanvasTextAlign,
  ): void {
    const scale = this.scale;
    const scaleX = Math.abs(scale.x) > 1e-6 ? scale.x : 1;
    const scaleY = Math.abs(scale.y) > 1e-6 ? scale.y : 1;

    ctx.save();
    ctx.translate(x, y);
    ctx.scale(
      1 / (PIXELS_PER_UNIT * scaleX),
      -1 / (PIXELS_PER_UNIT * scaleY),
    );
    ctx.font = `${p.fontSize.get()}px sans-serif`;
    ctx.fillStyle = p.labelColor.get();
    ctx.textAlign = align;
    ctx.textBaseline = "middle";
    ctx.fillText(text, offsetX, offsetY);
    ctx.restore();
  }
}
