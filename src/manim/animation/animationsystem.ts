/*
|--------------------------------------------------------------------------
| AnimationSystem.ts
|--------------------------------------------------------------------------
*/

import { Signal } from "../events/signal";
import { Scene } from "../scene";
import type { Mobject } from "../mobject/mobect";
import type { Tracker } from "../tracker/tracker";
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

    return this.addTo(mobj, animation, input);
  }

  /** Add an animation for a mobject or tracker target. */
  addTo(
    target: Mobject | Tracker,
    animation: AnimationName,
    input: AnimationInput,
  ): string {
    const animationInstance = target.animations.create(animation, input);
    this.animations.set(animationInstance.id, animationInstance);
    this.sequence.set(animationInstance.id, this.totalDuration);
    this.totalDuration += animationInstance.duration;
    this.refreshAnimations();
    this.onAnimationAdded.emit(animationInstance);

    return animationInstance.id;
  }

  /**
   * Re-register an animation that was rebuilt from a saved scene, keeping its
   * original timeline start.
   */
  restore(animation: Animation, start: number): void {
    this.animations.set(animation.id, animation);
    this.sequence.set(animation.id, Math.max(0, start));

    this.recalculateTotalDuration();
    this.refreshAnimations();
    this.onAnimationAdded.emit(animation);
  }

  remove(id: string): void {
    const animation = this.animations.get(id);

    if (!animation) return;
    this.animations.delete(id);
    this.sequence.delete(id);

    this.recalculateTotalDuration();
    this.refreshAnimations();

    this.onAnimationRemoved.emit(animation);
    this.onSequenceUpdated.emit(animation);
  }

  removeMobject(id: string): void {
    this.removeTarget(id);
  }

  /** Remove every animation whose target has this id. */
  removeTarget(id: string): void {
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
    if (this.totalDuration <= 0) return;

    if (reverse && this._currentTime <= 0) {
      this._currentTime = this.totalDuration;
    } else if (!reverse && this._currentTime >= this.totalDuration) {
      this._currentTime = 0;
    }

    this.playing = true;
    this.reversed = reverse;

    this.refreshAnimations();
  }

  pause(): void {
    this.playing = false;
  }

  stop(): void {
    this.playing = false;
    this.reversed = false;
    this._currentTime = 0;

    this.refreshAnimations();
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
        animation.playing = false;
        animation.completed = false;
        animation.seek(0);
      } else if (this._currentTime >= end) {
        animation.playing = false;
        animation.completed = true;
        animation.seek(1);
      } else {
        const progress = (this._currentTime - start) / animation.duration;

        animation.playing = this.playing;
        animation.completed = false;
        animation.seek(progress);
        this.activeAnimations.add(animation);
      }
    }
  }

  update(dt: number): void {
    if (!this.playing) {
      return;
    }

    // Advance global time. Animation progress is derived from this clock so
    // scrubbing and playback always agree.
    this._currentTime += this.reversed ? -dt : dt;

    if (this._currentTime <= 0) {
      this._currentTime = 0;
      this.playing = false;
    }

    if (this._currentTime >= this.totalDuration) {
      this._currentTime = this.totalDuration;
      this.playing = false;
    }

    this.refreshAnimations();
  }
}
