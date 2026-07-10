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
import { Mobject } from "../mobject/mobect";
// import { Property } from "../property/property";
import { Value, ValueType } from "../utils/value";
import { Easing, EasingFunction } from "../utils/easing";
import { AnimationName } from "./animationName";
// import { Property } from "../properties/property";

export interface AnimationInput {
  duration: Value<number>;
  easing: EasingFunction;
  [key: string]: Value<any>;
}

export interface AnimationFactory {
  getAnimation: (mob: Mobject, obj: AnimationInput) => Animation;
  requiredParams: { [key: string]: ValueType };
}

export class AnimationProvider {
  private readonly animations = new Map<AnimationName, AnimationFactory>();
  private idGenerator = new IdGenerator();

  constructor(private readonly owner: Mobject) {}

  getUniqueId(name: AnimationName): string {
    const id = this.idGenerator.increment(name);
    return `${name}-${id}`;
  }

  register(name: AnimationName, factory: Omit<AnimationFactory, "id">): void {
    this.animations.set(name, factory);
  }

  unregister(name: AnimationName): void {
    this.animations.delete(name);
  }

  supportedAnimations(): AnimationName[] {
    return [...this.animations.keys()];
  }

  create(name: AnimationName): Animation | null {
    const factory = this.animations.get(name);
    if (!factory) {
      console.warn(`Animation "${name}" is not supported by this Mobject.`);
      return null;
    }
    return factory.getAnimation(this.owner, {
      duration: new Value(1, ValueType.number),
      easing: Easing.linear,
      // easing: Easing.linear.get(),
    });
  }
}

class IdGenerator {
  private map = new Map<AnimationName, number>();

  increment(n: AnimationName): number {
    const current = this.map.get(n) || 0;
    const next = current + 1;
    this.map.set(n, next);
    return next;
  }
}
