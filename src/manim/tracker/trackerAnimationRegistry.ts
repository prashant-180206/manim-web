import { Animation } from "../animation/animation";
import { AnimationName } from "../animation/animationName";
import { ValueType } from "../utils/value";
import type { Vector } from "../utils/types";
import type { Tracker } from "./tracker";

/**
 * Animations that can drive a tracker value.
 *
 * A numeric tracker animates its scalar value; a vector tracker interpolates
 * both components in one timeline item. `TrackerTo` keeps the tracker's own
 * animation provider, so tracker animations serialise exactly like mobject
 * animations and share the same timeline.
 */
export class TrackerAnimationRegistry {
  static registerBaseAnimations(tracker: Tracker) {
    const provider = tracker.animations;

    provider.register(AnimationName.TrackerTo, {
      getAnimation: (target, input) => {
        const value = input.value;

        if (!value) {
          throw new Error("TrackerTo animation requires a 'value' parameter.");
        }

        const easing = input.easing.get();

        if (target.isVector) {
          if (value.type() !== ValueType.vector) {
            throw new Error(
              "TrackerTo animation on a vector tracker requires a vector 'value'.",
            );
          }

          const start = target.getVector();
          const end = value.get() as Vector;

          return new Animation(
            provider.getUniqueId(AnimationName.TrackerTo),
            {
              target,
              duration: input.duration.get(),
              onUpdate: (progress) => {
                const eased = easing(progress);

                target.setVector({
                  x: start.x + (end.x - start.x) * eased,
                  y: start.y + (end.y - start.y) * eased,
                });
              },
            },
            AnimationName.TrackerTo,
          );
        }

        if (value.type() !== ValueType.number) {
          throw new Error(
            "TrackerTo animation on a numeric tracker requires a number 'value'.",
          );
        }

        const start = target.get();
        const end = value.get() as number;

        return new Animation(
          provider.getUniqueId(AnimationName.TrackerTo),
          {
            target,
            duration: input.duration.get(),
            onUpdate: (progress) => {
              const eased = easing(progress);

              target.set(start + (end - start) * eased);
            },
          },
          AnimationName.TrackerTo,
        );
      },
      requiredParams: {
        value: tracker.isVector ? ValueType.vector : ValueType.number,
      },
    });
  }
}
