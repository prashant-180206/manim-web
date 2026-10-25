import { AnimationProvider } from "../animation/animationProvider";
import { PropertyController } from "./helpers/propertycontroller";
import { BaseProperty } from "./helpers/proprertytypes";
import { Values } from "../utils/value";
import { Vector } from "../utils/types";
import { TrackerProvider } from "../tracker/trackerProvider";
import { AnimationRegistry } from "../animation/animationRegistry";
import { TrackerConnectorRegistry } from "../tracker/trackerConnectorRegistry";
import { MobjectName } from "./helpers/mobjectName";
import { PIXELS_PER_UNIT } from "../utils/units";

export abstract class Mobject {
  readonly id: string;
  /** Registry kind used to rebuild the object from a saved scene. */
  readonly kind: MobjectName;
  name: string;

  protected propertyController: PropertyController<BaseProperty>;

  readonly animations = new AnimationProvider(this);
  readonly trackerConnector = new TrackerProvider(this);

  constructor(id: string, name: string) {
    this.id = id;
    this.kind = name as MobjectName;
    this.name = name;
    this.propertyController = new PropertyController({
      opacity: Values.number(1),
      position: Values.vector({ x: 0, y: 0 }),
      scale: Values.vector({ x: 1, y: 1 }),
    });
    AnimationRegistry.registerBaseAnimations(this);
    TrackerConnectorRegistry.registerBaseConnectors(this);
  }

  get properties(): BaseProperty {
    return this.propertyController.properties;
  }

  get position(): Vector {
    return this.properties.position.get();
  }

  get scale(): Vector {
    return this.properties.scale.get();
  }

  getPropertyByName(type: keyof BaseProperty) {
    return this.propertyController.properties[type];
  }

  update(_dt: number): void {}

  abstract render(ctx: CanvasRenderingContext2D): void;

  /**
   * Hit testing uses world coordinates, just like `position`. Subclasses work
   * in their own local space, so this removes the object transform first.
   */
  abstract contains(x: number, y: number): boolean;

  /** Convert a world-space point into this mobject's local space. */
  protected worldToLocal(x: number, y: number): Vector {
    const position = this.position;
    const scale = this.scale;

    return {
      x: (x - position.x) / (scale.x || 1),
      y: (y - position.y) / (scale.y || 1),
    };
  }

  /**
   * Stroke widths are a screen style, not a design coordinate. Keeping them in
   * CSS pixels means `strokeWidth: 1` always draws a one-pixel line, no matter
   * the scene scale or the object's scale.
   */
  protected applyStrokeWidth(
    ctx: CanvasRenderingContext2D,
    strokeWidth: number,
  ): void {
    const scale = this.scale;
    const objectScale = Math.sqrt(Math.abs(scale.x * scale.y)) || 1;

    ctx.lineWidth = strokeWidth / (PIXELS_PER_UNIT * objectScale);
  }

  protected beginRender(ctx: CanvasRenderingContext2D) {
    const p = this.propertyController.properties as BaseProperty;
    ctx.save();
    ctx.globalAlpha = p.opacity.get();
    // The camera already maps units to pixels and puts the origin at the
    // viewport centre, so the base transform works directly in world units.
    const pos = p.position.get();
    const scale = p.scale.get();
    ctx.translate(pos.x, pos.y);
    ctx.scale(scale.x, scale.y);
  }

  protected endRender(ctx: CanvasRenderingContext2D) {
    ctx.restore();
  }
}
