/*
|--------------------------------------------------------------------------
| AnimationSystem.ts
|--------------------------------------------------------------------------
|
| Global animation manager for a Scene.
|
| Responsibilities:
|
| • Store animations.
| • Update active animations.
| • Playback controls.
| • Timeline controls.
|
|--------------------------------------------------------------------------
*/

import { Animation } from "./animation";

export class AnimationSystem {
  private readonly animations = new Map<string, Animation>();

  currentIndex = 0;

  playing = false;

  /*
    |--------------------------------------------------------------------------
    | Animation Management
    |--------------------------------------------------------------------------
    */

  add(animation: Animation): void {
    this.animations.set(animation.id, animation);
  }

  remove(id: string): void {
    this.animations.delete(id);
  }

  find(id: string): Animation | undefined {
    return this.animations.get(id);
  }

  all(): IterableIterator<Animation> {
    return this.animations.values();
  }

  clear(): void {
    this.animations.clear();
  }

  /*
    |--------------------------------------------------------------------------
    | Playback
    |--------------------------------------------------------------------------
    */

  play(): void {
    this.playing = true;

    for (const animation of this.animations.values()) {
      animation.play();
    }
  }

  pause(): void {
    this.playing = false;

    for (const animation of this.animations.values()) {
      animation.pause();
    }
  }

  stop(): void {
    this.playing = false;

    for (const animation of this.animations.values()) {
      animation.stop();
    }
  }

  seek(progress: number): void {
    for (const animation of this.animations.values()) {
      animation.seek(progress);
    }
  }

  /*
    |--------------------------------------------------------------------------
    | Update
    |--------------------------------------------------------------------------
    */

  update(dt: number): void {
    if (!this.playing) {
      return;
    }

    for (const animation of this.animations.values()) {
      animation.update(dt);
    }
  }
}
