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

  constructor(private readonly callback: (dt: number) => void) {}

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

    const dt = (time - this.previousTime) / 1000;

    this.previousTime = time;

    this.callback(dt);

    this.frameId = requestAnimationFrame(this.loop);
  };
}
