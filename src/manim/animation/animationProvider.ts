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
import { Value, Values, ValueType } from "../utils/value";
import { Easing, EasingFunction } from "../utils/easing";
import { AnimationName } from "./animationName";
import { Vector } from "../utils/types";
// import { Property } from "../properties/property";

export interface AnimationInput {
  duration: Value<number>;
  easing: EasingFunction;
  [key: string]: Value<boolean | number | Vector | ((t: number) => number)>;
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
    // adds a unique id to the animation name to ensure that each animation instance has a unique identifier
    const id = this.idGenerator.increment(name);
    return `${this.owner.id}-${name}-${id}`;
  }

  register(name: AnimationName, factory: Omit<AnimationFactory, "id">): void {
    this.animations.set(name, factory);
  }

  unregister(name: AnimationName): void {
    this.animations.delete(name);
  }

  supportedAnimations(): {
    name: AnimationName;
    requiredParameters: { [key: string]: ValueType };
  }[] {
    return [...this.animations.entries()].map(([name, factory]) => ({
      name,
      requiredParameters: factory.requiredParams,
    }));
  }

  create(name: AnimationName, input: AnimationInput): Animation {
    const factory = this.animations.get(name);
    if (!factory) {
      throw new Error(`Animation ${name} is not supported by this mobject.`);
    }
    return factory.getAnimation(this.owner, {
      ...input,
      duration: Values.number(1),
      easing: Easing.linear,
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
