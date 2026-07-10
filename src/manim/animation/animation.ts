// import { Mobject } from "../mobject/mobject";

export interface AnimationOptions {
  duration: number;
  onStart?: () => void;
  onUpdate: (progress: number) => void;
  onComplete?: () => void;
}

export class Animation {
  readonly id: string;

  duration: number;
  progress = 0;

  playing = false;
  completed = false;

  reversed = false;

  private readonly onStart?;
  private readonly onUpdate;
  private readonly onComplete?;

  constructor(id: string, options: AnimationOptions) {
    this.id = id;

    this.duration = Math.max(options.duration, 0.0001);

    this.onStart = options.onStart;
    this.onUpdate = options.onUpdate;
    this.onComplete = options.onComplete;
  }

  play(reverse = false) {
    if (this.playing) return;

    this.reversed = reverse;
    this.playing = true;
    this.completed = false;

    this.onStart?.();
  }

  pause() {
    this.playing = false;
  }

  stop() {
    this.playing = false;
    this.completed = false;
    this.progress = this.reversed ? 1 : 0;

    this.onUpdate(this.progress);
  }

  seek(progress: number) {
    this.progress = Math.max(0, Math.min(1, progress));
    this.onUpdate(this.progress);
  }

  update(dt: number) {
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
