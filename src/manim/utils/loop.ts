/*
|--------------------------------------------------------------------------
| RenderLoop.ts
|--------------------------------------------------------------------------
|
| Controls requestAnimationFrame.
|
|--------------------------------------------------------------------------
*/

export class RenderLoop {
  private running = false;

  private frameId = 0;

  private previousTime = 0;

  private readonly frameDuration: number;

  constructor(
    private readonly callback: (dt: number) => void,
    fps = 60,
  ) {
    this.frameDuration = 1000 / fps;
  }

  restart(): void {
    this.stop();
    this.start();
  }

  start(): void {
    if (this.running) {
      return;
    }

    this.running = true;

    this.previousTime = performance.now();

    this.frameId = requestAnimationFrame(this.loop);
  }

  stop(): void {
    this.running = false;

    cancelAnimationFrame(this.frameId);
  }

  private loop = (time: number): void => {
    if (!this.running) {
      return;
    }

    const elapsed = time - this.previousTime;

    if (elapsed >= this.frameDuration) {
      // Prevent accumulated timing drift
      this.previousTime = time - (elapsed % this.frameDuration);

      this.callback(elapsed / 1000);
    }

    this.frameId = requestAnimationFrame(this.loop);
  };
}
