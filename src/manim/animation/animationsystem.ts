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
  readonly onSequenceUpdated = new Signal<[Animation]>();

  totalDuration = 0;
  private _currentTime = 0;

  get currentTime() {
    return this._currentTime;
  }

  setCurrentTime(time: number) {
    this._currentTime = Math.max(0, Math.min(time, this.totalDuration));
    this.refreshAnimations();
  }

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
    this._currentTime = 0;
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
    this._currentTime = this.reversed ? this.totalDuration : 0;

    this.activeAnimations.clear();

    for (const animation of this.animations.values()) {
      animation.stop();
    }
  }

  getStart(id: string): number {
    const start = this.sequence.get(id);
    if (start === undefined) {
      throw new Error(`Animation ${id} does not have a start time.`);
    }
    return start;
  }

  moveStart(id: string, start: number): void {
    const animation = this.find(id);

    if (!animation) {
      throw new Error("Animation not found.");
    }

    this.sequence.set(id, Math.max(0, start));

    this.recalculateTotalDuration();
    this.onSequenceUpdated.emit(animation);
    this.refreshAnimations();
  }

  private recalculateTotalDuration(): void {
    let max = 0;

    for (const animation of this.animations.values()) {
      const start = this.sequence.get(animation.id)!;
      max = Math.max(max, start + animation.duration);
    }

    this.totalDuration = max;

    if (this._currentTime > max) {
      this._currentTime = max;
    }
  }

  private refreshAnimations(): void {
    this.activeAnimations.clear();

    const entries = [...this.animations.values()].sort(
      (a, b) => this.sequence.get(a.id)! - this.sequence.get(b.id)!,
    );

    for (const animation of entries) {
      const start = this.sequence.get(animation.id)!;
      const end = start + animation.duration;

      if (this._currentTime < start) {
        // Animation hasn't started yet
        animation.seek(0);
      } else if (this._currentTime >= end) {
        // Animation has finished
        animation.seek(animation.duration);
      } else {
        // Active animation
        animation.seek(this._currentTime - start);
        this.activeAnimations.add(animation);
      }
    }
  }

  update(dt: number): void {
    if (!this.playing) {
      return;
    }

    // Advance global time
    this._currentTime += this.reversed ? -dt : dt;

    if (this._currentTime < 0) {
      this._currentTime = 0;
      this.playing = false;
    }

    if (this._currentTime > this.totalDuration) {
      this._currentTime = this.totalDuration;
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

      if (this._currentTime >= start && this._currentTime <= end) {
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
