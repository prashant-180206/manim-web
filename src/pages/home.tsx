import { useEffect, useRef } from "react";
import { Scene } from "../manim/scene";
// import { Rectangle } from "../manim/mobject/rect";
import { MobjectName } from "../manim/mobject/mobjectName";
import { Rectangle } from "../manim/mobject/rect";
import { Vector } from "../manim/utils/vector";
// import Scene from "./scene";

export default function Home() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  let scene: Scene;

  useEffect(() => {
    if (canvasRef.current) {
      scene = new Scene(canvasRef.current);
      scene.start();
      const canvas = canvasRef.current;
      canvas.width = 500;
      canvas.height = 400;
    }
  }, [canvasRef]);

  const rect = useRef<Rectangle | null>(null);
  const scalevect = useRef<Vector | null>(null);

  return (
    <main>
      <canvas ref={canvasRef}></canvas>
      <button
        onClick={() => {
          const rectangle = scene.mobjects.add(MobjectName.Rectangle);
          console.log("Added rectangle", rectangle);
          rect.current = rectangle;
          scalevect.current = rectangle.scale;
        }}
      >
        add Rectangle
      </button>
      <button
        onClick={() => {
          const circle = scene.mobjects.add(MobjectName.Circle);
          console.log("Added circle", circle);
          scalevect.current = circle.scale;
        }}
      >
        add Circle
      </button>
      <button
        onClick={() => {
          scalevect.current?.modify(
            scalevect.current.x + 0.1,
            scalevect.current.y + 0.1,
          );
          console.log("Changed scale to", scalevect.current);
        }}
      >
        changex
      </button>
    </main>
  );
}
