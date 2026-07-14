import { useEffect, useRef } from "react";
import { Scene } from "../manim/scene";
// import { Rectangle } from "../manim/mobject/rect";
import { MobjectName } from "../manim/mobject/helpers/mobjectName";
import { Rectangle } from "../manim/mobject/rect";
import { Vector } from "../manim/utils/types";
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
          const rectangle = scene.mobjectManager.add(MobjectName.Rectangle);
          console.log("Added rectangle", rectangle);
          rect.current = rectangle;
          scalevect.current = rectangle.scale;
        }}
      >
        add Rectangle
      </button>
      <button
        onClick={() => {
          const circle = scene.mobjectManager.add(MobjectName.Circle);
          console.log("Added circle", circle);
          scalevect.current = circle.scale;
        }}
      >
        add Circle
      </button>
      <button
        onClick={() => {
          const latexText = scene.mobjectManager.add(MobjectName.LatexText);
          console.log("Added LatexText", latexText);
          scalevect.current = latexText.scale;

          console.log("Changed scale to", scalevect.current);
        }}
      >
        add LatexText
      </button>
    </main>
  );
}
