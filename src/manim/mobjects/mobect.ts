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

export abstract class Mobject {
  readonly id: string;

  name: string;

  readonly properties = new PropertyController();

  readonly animations = new AnimationProvider(this);

  visible = true;

  locked = false;

  selected = false;

  constructor(id: string, name: string) {
    this.id = id;

    this.name = name;
  }

  /*
    |--------------------------------------------------------------------------
    | Lifecycle
    |--------------------------------------------------------------------------
    */

  update(dt: number): void {}

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
