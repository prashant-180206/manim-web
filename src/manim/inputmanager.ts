// /*
// |--------------------------------------------------------------------------
// | InputManager.ts
// |--------------------------------------------------------------------------
// |
// | Handles all canvas interaction.
// |
// | Responsibilities:
// |
// | • Mouse
// | • Pointer
// | • Wheel
// | • Keyboard
// |
// | Converts browser events into engine events.
// |
// |--------------------------------------------------------------------------
// */

// /*
// |--------------------------------------------------------------------------
// | Files Required
// |--------------------------------------------------------------------------
// |
// | ./Scene.ts
// |
// |--------------------------------------------------------------------------
// */

// import { Scene } from "./scene";

// export class InputManager {
//   constructor(private readonly scene: Scene) {}

//   attach(): void {
//     const canvas = this.scene.canvas;

//     canvas.addEventListener("pointerdown", this.onPointerDown);

//     canvas.addEventListener("pointermove", this.onPointerMove);

//     canvas.addEventListener("pointerup", this.onPointerUp);

//     canvas.addEventListener("wheel", this.onWheel);

//     window.addEventListener("keydown", this.onKeyDown);

//     window.addEventListener("keyup", this.onKeyUp);
//   }

//   detach(): void {
//     const canvas = this.scene.canvas;

//     canvas.removeEventListener("pointerdown", this.onPointerDown);

//     canvas.removeEventListener("pointermove", this.onPointerMove);

//     canvas.removeEventListener("pointerup", this.onPointerUp);

//     canvas.removeEventListener("wheel", this.onWheel);

//     window.removeEventListener("keydown", this.onKeyDown);

//     window.removeEventListener("keyup", this.onKeyUp);
//   }

// //   private onPointerDown = (event: PointerEvent): void => {};

// //   private onPointerMove = (event: PointerEvent): void => {};

// //   private onPointerUp = (event: PointerEvent): void => {};

// //   private onWheel = (event: WheelEvent): void => {};

// //   private onKeyDown = (event: KeyboardEvent): void => {};

// //   private onKeyUp = (event: KeyboardEvent): void => {};

// }
