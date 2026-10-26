import { AnimationName } from "../animation/animationName";
import type { AnimationInput } from "../animation/animationProvider";
import type { AnimationTarget, AnimationTargetType } from "../animation/animation";
import { Mobject } from "../mobject/mobect";
import { Scene } from "../scene";
import { ValueType } from "../utils/value";
import { IconType } from "react-icons";
import {
  FaArrowRight,
  FaExpand,
  FaRotateRight,
  FaShuffle,
  FaWaveSquare,
} from "react-icons/fa6";
import { MdVisibility, MdVisibilityOff } from "react-icons/md";

export interface AnimCreationUiData {
  name: AnimationName;
  requiredParameters: { [key: string]: ValueType };
  create: (input: AnimationInput) => void;
  icon: IconType;
}

export interface AnimationItemUIData {
  id: string;
  name: AnimationName;

  icon: IconType;

  start: number;
  end: number;
  duration: number;

  selected: boolean;
  target: AnimationTarget;
  targetType: AnimationTargetType;
  targetName: string;

  moveStart(start: number): void;
  remove(): void;
}

export interface AnimationTimelineUIData {
  totalDuration: number;

  play(reverse?: boolean): void;
  pause(): void;
  stop(): void;

  animations: AnimationItemUIData[];
}

export interface AnimationPlaybackUIData {
  currentTime: number;
  playing: boolean;
  reversed: boolean;

  seek(time: number): void;
}

const AnimationIcons: Record<AnimationName, IconType> = {
  [AnimationName.FadeIn]: MdVisibility,
  [AnimationName.FadeOut]: MdVisibilityOff,
  [AnimationName.MoveTo]: FaArrowRight,
  [AnimationName.TrackerTo]: FaWaveSquare,
  [AnimationName.Scale]: FaExpand,
  [AnimationName.Rotate]: FaRotateRight,
  [AnimationName.Transform]: FaShuffle,
};

export class AnimationUI {
  static getAnimCreationUIData(
    scene: Scene,
    mobj: Mobject,
  ): AnimCreationUiData[] {
    return mobj.animations.supportedAnimations().map((animation) => ({
      name: animation.name,
      requiredParameters: animation.requiredParameters,
      create: (input) => {
        scene.animationSystem.addTo(mobj, animation.name, input);
      },
      icon: AnimationIcons[animation.name],
    }));
  }

  static getTimelineData(scene: Scene): AnimationTimelineUIData {
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
          icon: AnimationIcons[animation.name],
          start,
          end: start + animation.duration,
          duration: animation.duration,
          selected: true,
          target: animation.target,
          targetType: animation.target.animationTargetType,
          targetName: animation.target.name,
          moveStart: (time) => system.moveStart(animation.id, time),
          remove: () => system.remove(animation.id),
        };
      }),
    };
  }

  static getPlaybackData(scene: Scene): AnimationPlaybackUIData {
    const system = scene.animationSystem;
    return {
      currentTime: system.currentTime,
      playing: system.playing,
      reversed: system.reversed,
      seek: (time) => system.setCurrentTime(time),
    };
  }
}
