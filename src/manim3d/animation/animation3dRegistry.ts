import type { Mobject3D } from "../mobject/mobject3d";
import type { EulerData, Vector3Data } from "../utils/types3d";
import { Value, ValueType } from "@/manim/utils/value";
import { Animation3D } from "./animation3d";
import { Animation3DName } from "./animation3dName";

export class Animation3DRegistry {
  static registerBaseAnimations(mobject: Mobject3D): void {
    const provider = mobject.animations;

    provider.register(Animation3DName.FadeIn, {
      getAnimation: (mob, input) => {
        const id = provider.getUniqueId(Animation3DName.FadeIn);
        const easing = input.easing.get();
        const targetOpacity = Math.max(0.01, mob.properties.opacity.get());

        return new Animation3D(
          id,
          {
            target: mob,
            duration: input.duration.get(),
            onUpdate: (progress) => {
              const eased = easing(progress);
              mob.properties.opacity.set(eased * targetOpacity);
              mob.sync();
            },
          },
          Animation3DName.FadeIn,
        );
      },
      requiredParams: {},
    });

    provider.register(Animation3DName.FadeOut, {
      getAnimation: (mob, input) => {
        const id = provider.getUniqueId(Animation3DName.FadeOut);
        const easing = input.easing.get();
        const startOpacity = Math.max(0.01, mob.properties.opacity.get());

        return new Animation3D(
          id,
          {
            target: mob,
            duration: input.duration.get(),
            onUpdate: (progress) => {
              const eased = easing(progress);
              mob.properties.opacity.set(Math.max(0, (1 - eased) * startOpacity));
              mob.sync();
            },
          },
          Animation3DName.FadeOut,
        );
      },
      requiredParams: {},
    });

    provider.register(Animation3DName.MoveTo, {
      getAnimation: (mob, input) => {
        const id = provider.getUniqueId(Animation3DName.MoveTo);
        const targetVal = input.position as Value<Vector3Data> | undefined;

        if (!targetVal || targetVal.type() !== ValueType.vector) {
          throw new Error("MoveTo animation requires a 'position' vector parameter.");
        }

        const startPos = { ...mob.properties.position.get() };
        const endPos = targetVal.get();
        const easing = input.easing.get();

        return new Animation3D(
          id,
          {
            target: mob,
            duration: input.duration.get(),
            onUpdate: (progress) => {
              const eased = easing(progress);
              mob.properties.position.set({
                x: startPos.x + (endPos.x - startPos.x) * eased,
                y: startPos.y + (endPos.y - startPos.y) * eased,
                z: startPos.z + (endPos.z - startPos.z) * eased,
              });
              mob.sync();
            },
          },
          Animation3DName.MoveTo,
        );
      },
      requiredParams: { position: ValueType.vector },
    });

    provider.register(Animation3DName.Rotate, {
      getAnimation: (mob, input) => {
        const id = provider.getUniqueId(Animation3DName.Rotate);
        const targetVal = input.rotation as Value<EulerData> | undefined;

        if (!targetVal || targetVal.type() !== ValueType.vector) {
          throw new Error("Rotate animation requires a 'rotation' vector parameter.");
        }

        const startRot = { ...mob.properties.rotation.get() };
        const endRot = targetVal.get();
        const easing = input.easing.get();

        return new Animation3D(
          id,
          {
            target: mob,
            duration: input.duration.get(),
            onUpdate: (progress) => {
              const eased = easing(progress);
              mob.properties.rotation.set({
                x: startRot.x + (endRot.x - startRot.x) * eased,
                y: startRot.y + (endRot.y - startRot.y) * eased,
                z: startRot.z + (endRot.z - startRot.z) * eased,
              });
              mob.sync();
            },
          },
          Animation3DName.Rotate,
        );
      },
      requiredParams: { rotation: ValueType.vector },
    });

    provider.register(Animation3DName.Scale, {
      getAnimation: (mob, input) => {
        const id = provider.getUniqueId(Animation3DName.Scale);
        const targetVal = input.scale as Value<Vector3Data> | undefined;

        if (!targetVal || targetVal.type() !== ValueType.vector) {
          throw new Error("Scale animation requires a 'scale' vector parameter.");
        }

        const startScale = { ...mob.properties.scale.get() };
        const endScale = targetVal.get();
        const easing = input.easing.get();

        return new Animation3D(
          id,
          {
            target: mob,
            duration: input.duration.get(),
            onUpdate: (progress) => {
              const eased = easing(progress);
              mob.properties.scale.set({
                x: startScale.x + (endScale.x - startScale.x) * eased,
                y: startScale.y + (endScale.y - startScale.y) * eased,
                z: startScale.z + (endScale.z - startScale.z) * eased,
              });
              mob.sync();
            },
          },
          Animation3DName.Scale,
        );
      },
      requiredParams: { scale: ValueType.vector },
    });
  }
}
