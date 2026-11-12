import { Animation3D, type Animation3DTarget } from "./animation3d";
import { Value, Values, ValueType } from "@/manim/utils/value";
import { Easing, type EasingFunction } from "@/manim/utils/easing";
import { Animation3DName } from "./animation3dName";

export interface Animation3DInput {
  duration: Value<number>;
  easing: EasingFunction;
  easingName?: string;
  [key: string]: Value<unknown> | EasingFunction | string | undefined;
}

export interface Animation3DFactory<T extends Animation3DTarget> {
  getAnimation: (target: T, obj: Animation3DInput) => Animation3D;
  requiredParams: { [key: string]: ValueType };
}

export class Animation3DProvider<
  T extends Animation3DTarget = Animation3DTarget,
> {
  private readonly animations = new Map<
    Animation3DName,
    Animation3DFactory<T>
  >();
  private idGenerator = new IdGenerator3D();

  constructor(private readonly owner: T) {}

  getUniqueId(name: Animation3DName): string {
    const id = this.idGenerator.increment(name);
    return `${this.owner.id}-${name}-${id}`;
  }

  register(
    name: Animation3DName,
    factory: Omit<Animation3DFactory<T>, "id">,
  ): void {
    this.animations.set(name, factory);
  }

  unregister(name: Animation3DName): void {
    this.animations.delete(name);
  }

  supportedAnimations(): {
    name: Animation3DName;
    requiredParameters: { [key: string]: ValueType };
  }[] {
    return [...this.animations.entries()].map(([name, factory]) => ({
      name,
      requiredParameters: factory.requiredParams,
    }));
  }

  create(name: Animation3DName, input: Animation3DInput): Animation3D {
    const factory = this.animations.get(name);
    if (!factory) {
      throw new Error(`3D Animation ${name} is not supported by this target.`);
    }

    const {
      duration = Values.number(1),
      easing = Easing.easeInOut,
      ...rest
    } = input;

    const animation = factory.getAnimation(this.owner, {
      ...rest,
      duration: duration as Value<number>,
      easing,
    });

    animation.input = input;

    return animation;
  }
}

class IdGenerator3D {
  private map = new Map<Animation3DName, number>();

  increment(n: Animation3DName): number {
    const current = this.map.get(n) || 0;
    const next = current + 1;
    this.map.set(n, next);
    return next;
  }
}
