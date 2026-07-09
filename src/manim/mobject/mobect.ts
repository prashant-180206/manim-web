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
import { Value } from "../utils/value";
import { Vector } from "../utils/vector";

export abstract class Mobject {
  readonly id: string;

  name: string;

  protected propertyController: PropertyController<BaseProperty>;

  readonly animations = new AnimationProvider(this);

  visible = true;

  locked = false;

  selected = false;

  constructor(id: string, name: string) {
    this.id = id;
    this.name = name;
    this.propertyController = new PropertyController({
      opacity: new Value(1),
      position: new Value(new Vector(0, 0)),
      zindex: new Value(0),
      scale: new Value(new Vector(1, 1)),
      color: new Value("red"),
    });
  }

  get properties(): BaseProperty {
    return this.propertyController.properties;
  }

  get scale(): Vector {
    return this.properties.scale.get();
  }

  /*
    |--------------------------------------------------------------------------
    | Lifecycle
    |--------------------------------------------------------------------------
    */

  update(_dt: number): void {}

  /*
    |--------------------------------------------------------------------------
    | Rendering
    |--------------------------------------------------------------------------
    */

  abstract render(ctx: CanvasRenderingContext2D): void;

  /*
    |--------------------------------------------------------------------------
    | Picking
    |--------------------------------------------------------------------------
    */

  abstract contains(x: number, y: number): boolean;
}
