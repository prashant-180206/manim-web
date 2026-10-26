import { PropertyController } from "./helpers/propertycontroller";
import { BaseProperty } from "./helpers/proprertytypes";
import { Value, Values } from "../utils/value";
import { Mobject } from "./mobect";
import { PIXELS_PER_UNIT } from "../utils/units";

interface PlaneProperty extends BaseProperty {
  width: Value<number>;
  height: Value<number>;
  gridStep: Value<number>;
  labelStep: Value<number>;
  showGridlines: Value<boolean>;
  showAxes: Value<boolean>;
  showLabels: Value<boolean>;
  gridColor: Value<string>;
  axisColor: Value<string>;
  labelColor: Value<string>;
  strokeWidth: Value<number>;
  gridStrokeWidth: Value<number>;
  fontSize: Value<number>;
}

/** Prevent a tiny grid step from generating an unbounded number of lines. */
const MAX_GRID_LINES = 2000;

/** Click tolerance around gridlines and axes, in CSS pixels. */
const HIT_TOLERANCE_PIXELS = 8;

function positiveSize(value: number): number {
  return Number.isFinite(value) ? Math.abs(value) / 2 : 0;
}

function positiveStep(value: number): number {
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
 * A coordinate plane with an optional grid, axes and numeric labels.
 *
 * The plane is centred on its position and spans `width` × `height` world
 * units. Grid and label spacing are geometry properties in world units, while
 * stroke widths and font size are screen styles in CSS pixels.
 */
export class Plane extends Mobject {
  constructor(id: string, name: string) {
    super(id, name);

    this.propertyController = new PropertyController<PlaneProperty>({
      ...this.propertyController.properties,
      width: Values.number(12),
      height: Values.number(8),
      gridStep: Values.number(1),
      labelStep: Values.number(1),
      showGridlines: Values.boolean(true),
      showAxes: Values.boolean(true),
      showLabels: Values.boolean(true),
      gridColor: Values.color("#3f3f46"),
      axisColor: Values.color("#a1a1aa"),
      labelColor: Values.color("#e4e4e7"),
      strokeWidth: Values.number(2),
      gridStrokeWidth: Values.number(1),
      fontSize: Values.number(12),
    }) as any;
  }

  override render(ctx: CanvasRenderingContext2D): void {
    const p = this.propertyController.properties as PlaneProperty;
    const halfWidth = positiveSize(p.width.get());
    const halfHeight = positiveSize(p.height.get());

    this.beginRender(ctx);

    if (halfWidth > 0 && halfHeight > 0) {
      if (p.showGridlines.get()) {
        this.renderGrid(ctx, p, halfWidth, halfHeight);
      }

      if (p.showAxes.get()) {
        this.renderAxes(ctx, p, halfWidth, halfHeight);
      }

      if (p.showLabels.get()) {
        this.renderLabels(ctx, p, halfWidth, halfHeight);
      }
    }

    this.endRender(ctx);
  }

  /**
   * Hit testing targets the visible gridlines and axes rather than the whole
   * rectangle, so a large background plane does not swallow every canvas
   * click. Labels also make the axis lines clickable when axes are hidden.
   */
  contains(x: number, y: number): boolean {
    const p = this.propertyController.properties as PlaneProperty;
    const halfWidth = positiveSize(p.width.get());
    const halfHeight = positiveSize(p.height.get());

    if (halfWidth <= 0 || halfHeight <= 0) return false;

    const point = this.worldToLocal(x, y);

    if (
      Math.abs(point.x) > halfWidth + 1e-9 ||
      Math.abs(point.y) > halfHeight + 1e-9
    ) {
      return false;
    }

    const scale = this.scale;
    const toleranceX =
      HIT_TOLERANCE_PIXELS /
      PIXELS_PER_UNIT /
      (Math.abs(scale.x) || 1);
    const toleranceY =
      HIT_TOLERANCE_PIXELS /
      PIXELS_PER_UNIT /
      (Math.abs(scale.y) || 1);

    const axisVisible = p.showAxes.get() || p.showLabels.get();

    if (
      axisVisible &&
      (Math.abs(point.y) <= toleranceY ||
        Math.abs(point.x) <= toleranceX)
    ) {
      return true;
    }

    if (!p.showGridlines.get()) return false;

    const step = positiveStep(p.gridStep.get());

    if (step <= 0) return false;

    const distanceX = Math.abs(
      point.x - Math.round(point.x / step) * step,
    );
    const distanceY = Math.abs(
      point.y - Math.round(point.y / step) * step,
    );

    return distanceX <= toleranceX || distanceY <= toleranceY;
  }

  private safeStep(requested: number, halfExtent: number): number {
    const step = positiveStep(requested);

    if (step <= 0 || halfExtent <= 0) return 0;

    // Keep the number of lines bounded even if the inspector gets an extreme
    // value such as 0.0001.
    return Math.max(step, (halfExtent * 2) / MAX_GRID_LINES);
  }

  private renderGrid(
    ctx: CanvasRenderingContext2D,
    p: PlaneProperty,
    halfWidth: number,
    halfHeight: number,
  ): void {
    const step = this.safeStep(
      p.gridStep.get(),
      Math.max(halfWidth, halfHeight),
    );

    if (step <= 0 || p.gridStrokeWidth.get() <= 0) return;

    const maxX = Math.floor(halfWidth / step + 1e-9);
    const maxY = Math.floor(halfHeight / step + 1e-9);

    ctx.strokeStyle = p.gridColor.get();
    this.applyStrokeWidth(ctx, p.gridStrokeWidth.get());
    ctx.beginPath();

    for (let i = -maxX; i <= maxX; i += 1) {
      if (i === 0) continue;

      const x = i * step;
      ctx.moveTo(x, -halfHeight);
      ctx.lineTo(x, halfHeight);
    }

    for (let i = -maxY; i <= maxY; i += 1) {
      if (i === 0) continue;

      const y = i * step;
      ctx.moveTo(-halfWidth, y);
      ctx.lineTo(halfWidth, y);
    }

    ctx.stroke();
  }

  private renderAxes(
    ctx: CanvasRenderingContext2D,
    p: PlaneProperty,
    halfWidth: number,
    halfHeight: number,
  ): void {
    if (p.strokeWidth.get() <= 0) return;

    ctx.strokeStyle = p.axisColor.get();
    this.applyStrokeWidth(ctx, p.strokeWidth.get());
    ctx.beginPath();

    ctx.moveTo(-halfWidth, 0);
    ctx.lineTo(halfWidth, 0);

    ctx.moveTo(0, -halfHeight);
    ctx.lineTo(0, halfHeight);

    ctx.stroke();
  }

  private renderLabels(
    ctx: CanvasRenderingContext2D,
    p: PlaneProperty,
    halfWidth: number,
    halfHeight: number,
  ): void {
    const fontSize = p.fontSize.get();

    if (!Number.isFinite(fontSize) || fontSize <= 0) return;

    const step = this.safeStep(
      p.labelStep.get(),
      Math.max(halfWidth, halfHeight),
    );

    if (step > 0) {
      const maxX = Math.floor(halfWidth / step + 1e-9);
      const maxY = Math.floor(halfHeight / step + 1e-9);

      for (let i = -maxX; i <= maxX; i += 1) {
        if (i === 0) continue;

        const x = i * step;
        this.drawLabel(
          ctx,
          p,
          formatTick(x),
          x,
          0,
          0,
          fontSize * 0.95,
          "center",
        );
      }

      for (let i = -maxY; i <= maxY; i += 1) {
        if (i === 0) continue;

        const y = i * step;
        this.drawLabel(
          ctx,
          p,
          formatTick(y),
          0,
          y,
          -6,
          0,
          "right",
        );
      }
    }

    // Axis names sit just beyond the positive ends of the axes.
    if (p.showAxes.get()) {
      this.drawLabel(
        ctx,
        p,
        "x",
        halfWidth,
        0,
        8,
        fontSize * 0.85,
        "left",
      );
      this.drawLabel(
        ctx,
        p,
        "y",
        0,
        halfHeight,
        -8,
        -fontSize * 0.85,
        "right",
      );
    }
  }

  /**
   * Draw upright, screen-sized text at a local world position. Cancelling the
   * object's scale keeps `fontSize` in CSS pixels even when the plane is
   * scaled, matching the other text mobjects' screen-style semantics.
   */
  private drawLabel(
    ctx: CanvasRenderingContext2D,
    p: PlaneProperty,
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
