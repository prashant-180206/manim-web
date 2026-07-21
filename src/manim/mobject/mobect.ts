/*
|--------------------------------------------------------------------------
| Mobject.ts
|--------------------------------------------------------------------------
|
| Base class for every drawable object.
|
| Responsibilities:
|
| • Store identity.
| • Own properties.
| • Own supported animations.
| • Update itself.
| • Render itself.
| • Perform hit testing.
|
|--------------------------------------------------------------------------
*/

/*
|--------------------------------------------------------------------------
| Files Required
|--------------------------------------------------------------------------
|
| ../properties/PropertyController.ts
| ../animation/AnimationProvider.ts
|
|--------------------------------------------------------------------------
*/

// import { PropertyController } from "../properties/PropertyController";
// import { AnimationProvider } from "../animation/AnimationProvider";
import { AnimationProvider } from "../animation/animationProvider";
import { PropertyController } from "../property/propertycontroller";
import { BaseProperty } from "../property/proprertytypes";
import { Values } from "../utils/value";
import { Vector } from "../utils/types";
import { TrackerProvider } from "../tracker/trackerProvider";
import { AnimationRegistry } from "../animation/animationRegistry";
import { TrackerConnectorRegistry } from "../tracker/trackerConnectorRegistry";

export abstract class Mobject {
  readonly id: string;
  name: string;

  protected propertyController: PropertyController<BaseProperty>;

  readonly animations = new AnimationProvider(this);
  readonly trackerConnector = new TrackerProvider(this);

  constructor(id: string, name: string) {
    this.id = id;
    this.name = name;
    this.propertyController = new PropertyController({
      opacity: Values.number(1),
      position: Values.vector({ x: 0, y: 0 }),
      // zindex: Values.number(0),
      scale: Values.vector({ x: 1, y: 1 }),
      // color: Values.string("red"),
    });
    AnimationRegistry.registerBaseAnimations(this);
    TrackerConnectorRegistry.registerBaseConnectors(this);
  }

  get properties(): BaseProperty {
    return this.propertyController.properties;
  }

  get scale(): Vector {
    return this.properties.scale.get();
  }

  getPropertyByName(type: keyof BaseProperty) {
    return this.propertyController.properties[type];
  }

  update(_dt: number): void {}

  abstract render(ctx: CanvasRenderingContext2D): void;

  abstract contains(x: number, y: number): boolean;

  protected beginRender(ctx: CanvasRenderingContext2D) {
    const p = this.propertyController.properties as BaseProperty;
    ctx.save();
    ctx.globalAlpha = p.opacity.get();
    const pos = p.position.get();
    const scale = p.scale.get();
    ctx.translate(pos.x, pos.y);
    ctx.scale(scale.x, scale.y);
  }

  protected endRender(ctx: CanvasRenderingContext2D) {
    ctx.restore();
  }
}
