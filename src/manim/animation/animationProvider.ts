/*
|--------------------------------------------------------------------------
| AnimationProvider.ts
|--------------------------------------------------------------------------
|
| Factory for animations supported by a Mobject.
|
| Responsibilities:
|
| • Register animation types.
| • Report supported animations.
| • Create animation instances.
|
|--------------------------------------------------------------------------
*/

import { Animation } from "./animation";
import { Mobject } from "../mobjects/mobect";
import { Property } from "../property/property";
// import { Property } from "../properties/property";

export type AnimationFactory = (
  target: Mobject,
  property: Property<any>,
) => Animation;

export class AnimationProvider {
  private readonly animations = new Map<string, AnimationFactory>();

  constructor(private readonly owner: Mobject) {}

  register(name: string, factory: AnimationFactory): void {
    this.animations.set(name, factory);
  }

  unregister(name: string): void {
    this.animations.delete(name);
  }

  supportedAnimations(): string[] {
    return [...this.animations.keys()];
  }

  create(name: string, property: Property<any>): Animation {
    const factory = this.animations.get(name);

    if (!factory) {
      throw new Error(`Animation '${name}' is not registered.`);
    }

    return factory(this.owner, property);
  }
}
