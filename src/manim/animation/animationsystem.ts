/*
|--------------------------------------------------------------------------
| AnimationSystem.ts
|--------------------------------------------------------------------------
*/

import { Signal } from "../events/signal";
import { Scene } from "../scene";
import { Animation } from "./animation";
import { AnimationName } from "./animationName";
import { AnimationInput } from "./animationProvider";

export class AnimationSystem {
  private readonly animations = new Map<string, Animation>();
  private readonly sequence = new Map<string, number>();
  private readonly activeAnimations = new Set<Animation>();
  private readonly scene: Scene;

  readonly onAnimationAdded = new Signal<[Animation]>();
  readonly onAnimationRemoved = new Signal<[Animation]>();

  private totalDuration = 0;
  private elapsedTime = 0;

  playing = false;
  reversed = false;

  constructor(scene: Scene) {
    this.scene = scene;
  }

  /*
  |--------------------------------------------------------------------------
  | Animation Management
  |--------------------------------------------------------------------------
  */

  add(animation: AnimationName, input: AnimationInput): string {
    const mobj = this.scene.selection.selectedMobject;
    if (!mobj) {
      throw new Error("No mobject selected to add animation.");
    }
    const animationInstance = mobj.animations.create(animation, input);
    this.animations.set(animationInstance.id, animationInstance);
    this.sequence.set(animationInstance.id, this.totalDuration);
    this.totalDuration += animationInstance.duration;
    this.onAnimationAdded.emit(animationInstance);

    return animationInstance.id;
  }

  // add(animation: Animation): void {
  //   this.animations.set(animation.id, animation);
  //   this.sequence.set(animation.id, this.totalDuration);
  //   this.totalDuration += animation.duration;
  //   this.onAnimationAdded.emit(animation);
  // }

  remove(id: string): void {
    const animation = this.animations.get(id);
    if (animation) {
      this.onAnimationRemoved.emit(animation);
    }
    this.animations.delete(id);
    this.sequence.delete(id);
  }

  removeMobject(id: string): void {
    for (const animation of this.animations.values()) {
      if (animation.target.id === id) {
        this.remove(animation.id);
      }
    }
  }

  find(id: string): Animation | undefined {
    return this.animations.get(id);
  }

  all(): IterableIterator<Animation> {
    return this.animations.values();
  }

  clear(): void {
    this.animations.clear();
    this.sequence.clear();

    this.activeAnimations.clear();

    this.totalDuration = 0;
    this.elapsedTime = 0;
    this.playing = false;
  }

  /*
  |--------------------------------------------------------------------------
  | Playback
  |--------------------------------------------------------------------------
  */

  play(reverse = false): void {
    this.playing = true;
    this.reversed = reverse;
  }

  pause(): void {
    this.playing = false;
  }

  stop(): void {
    this.playing = false;
    this.elapsedTime = this.reversed ? this.totalDuration : 0;

    this.activeAnimations.clear();

    for (const animation of this.animations.values()) {
      animation.stop();
    }
  }

  update(dt: number): void {
    if (!this.playing) {
      return;
    }

    // Advance global time
    this.elapsedTime += this.reversed ? -dt : dt;

    if (this.elapsedTime < 0) {
      this.elapsedTime = 0;
      this.playing = false;
    }

    if (this.elapsedTime > this.totalDuration) {
      this.elapsedTime = this.totalDuration;
      this.playing = false;
    }

    // Recompute active animations every frame
    this.activeAnimations.clear();

    for (const animation of this.animations.values()) {
      const start = this.sequence.get(animation.id);

      if (start === undefined) {
        throw new Error(
          `Animation ${animation.id} does not have a start time.`,
        );
      }

      const end = start + animation.duration;

      if (this.elapsedTime >= start && this.elapsedTime <= end) {
        if (!animation.playing && !animation.completed) {
          animation.play(this.reversed);
        }

        this.activeAnimations.add(animation);
      }
    }

    // Update active animations
    for (const animation of this.activeAnimations) {
      animation.update(dt);
    }
  }
}
