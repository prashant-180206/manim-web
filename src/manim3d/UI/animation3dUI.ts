import type { IconType } from "react-icons";
import {
  FaArrowRight,
  FaExpand,
  FaEye,
  FaEyeSlash,
  FaRotate,
} from "react-icons/fa6";
import { Animation3DName } from "../animation/animation3dName";
import type { Animation3DInput } from "../animation/animation3dProvider";
import type { Animation3DTarget, Animation3DTargetType } from "../animation/animation3d";
import type { Mobject3D } from "../mobject/mobject3d";
import type { Scene3D } from "../scene3d";
import type { ValueType } from "@/manim/utils/value";

export interface Anim3DCreationUiData {
  name: Animation3DName;
  requiredParameters: { [key: string]: ValueType };
  create: (input: Animation3DInput) => void;
  icon: IconType;
}

export interface Animation3DItemUIData {
  id: string;
  name: Animation3DName;
  icon: IconType;
  start: number;
  end: number;
  duration: number;
  target: Animation3DTarget;
  targetType: Animation3DTargetType;
  targetName: string;
  moveStart: (start: number) => void;
  remove: () => void;
}

export interface Animation3DTimelineUIData {
  totalDuration: number;
  play: (reverse?: boolean) => void;
  pause: () => void;
  stop: () => void;
  animations: Animation3DItemUIData[];
}

export interface Animation3DPlaybackUIData {
  currentTime: number;
  playing: boolean;
  reversed: boolean;
  seek: (time: number) => void;
}

export const ANIMATION3D_ICONS: Record<Animation3DName, IconType> = {
  [Animation3DName.FadeIn]: FaEye,
  [Animation3DName.FadeOut]: FaEyeSlash,
  [Animation3DName.MoveTo]: FaArrowRight,
  [Animation3DName.Rotate]: FaRotate,
  [Animation3DName.Scale]: FaExpand,
};

export class Animation3DUI {
  static getAnimCreationUIData(
    scene: Scene3D,
    mobj: Mobject3D,
  ): Anim3DCreationUiData[] {
    return mobj.animations.supportedAnimations().map((animation) => ({
      name: animation.name,
      requiredParameters: animation.requiredParameters,
      create: (input: Animation3DInput) => {
        scene.animationSystem.addTo(mobj, animation.name, input);
      },
      icon: ANIMATION3D_ICONS[animation.name],
    }));
  }

  static getTimelineData(scene: Scene3D): Animation3DTimelineUIData {
    const system = scene.animationSystem;

    return {
      totalDuration: system.totalDuration,
      play: (reverse = false) => system.play(reverse),
      pause: () => system.pause(),
      stop: () => system.stop(),
      animations: [...system.all()].map((animation) => {
        const start = system.getStart(animation.id);

        return {
          id: animation.id,
          name: animation.name,
          icon: ANIMATION3D_ICONS[animation.name],
          start,
          end: start + animation.duration,
          duration: animation.duration,
          target: animation.target,
          targetType: animation.target.animationTargetType,
          targetName: animation.target.name,
          moveStart: (time: number) => system.moveStart(animation.id, time),
          remove: () => system.remove(animation.id),
        };
      }),
    };
  }

  static getPlaybackData(scene: Scene3D): Animation3DPlaybackUIData {
    const system = scene.animationSystem;
    return {
      currentTime: system.currentTime,
      playing: system.playing,
      reversed: system.reversed,
      seek: (time: number) => system.setCurrentTime(time),
    };
  }
}
