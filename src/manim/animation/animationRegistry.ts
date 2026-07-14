import { ValueType } from "../utils/value";
import { Animation } from "./animation";
import { AnimationName } from "./animationName";
import { AnimationProvider } from "./animationProvider";

export class AnimationRegistry {
  static registerBaseAnimation(animationProvider: AnimationProvider) {
    animationProvider.register(AnimationName.FadeIn, {
      getAnimation: (mob, input) => {
        const id = animationProvider.getUniqueId(AnimationName.FadeIn);
        const easing = input.easing.get();
        return new Animation(`${mob.id}-${id}`, {
          mobject: mob,
          duration: input.duration.get(),
          onUpdate: (progress) => {
            const easedProgress = easing(progress);
            mob.properties.opacity.set(easedProgress);
          },
        });
      },
      requiredParams: {},
    });
    animationProvider.register(AnimationName.FadeOut, {
      getAnimation: (mob, input) => {
        const id = animationProvider.getUniqueId(AnimationName.FadeOut);
        const easing = input.easing.get();
        return new Animation(`${mob.id}-${id}`, {
          mobject: mob,
          duration: input.duration.get(),
          onUpdate: (progress) => {
            const easedProgress = easing(progress);
            mob.properties.opacity.set(1 - easedProgress);
          },
        });
      },
      requiredParams: {},
    });
    animationProvider.register(AnimationName.MoveTo, {
      getAnimation: (mob, input) => {
        const id = animationProvider.getUniqueId(AnimationName.MoveTo);
        if (!input.position || input.position.type() !== ValueType.vector) {
          throw new Error("MoveTo animation requires a 'position' parameter.");
        }
        const startPos = mob.properties.position.get();
        const endPos = input.position.get();

        return new Animation(`${mob.id}-${id}`, {
          mobject: mob,
          duration: input.duration.get(),
          onUpdate: (progress) => {
            const easing = input.easing.get();
            const easedProgress = easing(progress);
            mob.properties.position.set({
              x: startPos.x + (endPos.x - startPos.x) * easedProgress,
              y: startPos.y + (endPos.y - startPos.y) * easedProgress,
            });
          },
        });
      },
      requiredParams: { position: ValueType.vector },
    });
  }
}
