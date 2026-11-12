import type { Animation3DInput } from "./animation3dProvider";
import { Animation3DName } from "./animation3dName";

export type Animation3DTargetType = "mobject3d";

export interface Animation3DTarget {
  readonly id: string;
  name: string;
  readonly animationTargetType: Animation3DTargetType;
}

export interface Animation3DOptions {
  target: Animation3DTarget;
  duration: number;
  onStart?: () => void;
  onUpdate: (progress: number) => void;
  onComplete?: () => void;
}

export class Animation3D {
  readonly id: string;
  readonly name: Animation3DName;
  duration: number;
  /** Inputs that produced this animation, kept for scene serialization. */
  input?: Animation3DInput;
  progress = 0;
  playing = false;
  completed = false;
  reversed = false;
  target: Animation3DTarget;

  private readonly onStart?: () => void;
  private readonly onUpdate: (progress: number) => void;
  private readonly onComplete?: () => void;

  constructor(id: string, options: Animation3DOptions, name: Animation3DName) {
    this.id = id;
    this.name = name;
    this.duration = Math.max(options.duration, 0.0001);
    this.onStart = options.onStart;
    this.onUpdate = options.onUpdate;
    this.onComplete = options.onComplete;
    this.target = options.target;
  }

  play(reverse = false): void {
    if (this.playing) return;

    this.reversed = reverse;
    this.playing = true;
    this.completed = false;

    this.onStart?.();
  }

  pause(): void {
    this.playing = false;
  }

  stop(): void {
    this.playing = false;
    this.completed = false;
    this.progress = this.reversed ? 1 : 0;

    this.onUpdate(this.progress);
  }

  seek(progress: number): void {
    this.progress = Math.max(0, Math.min(1, progress));
    this.onUpdate(this.progress);
  }

  update(dt: number): void {
    if (!this.playing || this.completed) return;

    const delta = dt / this.duration;
    this.progress += this.reversed ? -delta : delta;

    if (!this.reversed && this.progress >= 1) {
      this.progress = 1;
      this.playing = false;
      this.completed = true;
    }

    if (this.reversed && this.progress <= 0) {
      this.progress = 0;
      this.playing = false;
      this.completed = true;
    }

    this.onUpdate(this.progress);

    if (this.completed) {
      this.onComplete?.();
    }
  }
}
