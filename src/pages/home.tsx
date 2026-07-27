import { useEffect, useRef } from "react";
import { Scene } from "../manim/scene";
import { MobjectName } from "../manim/mobject/helpers/mobjectName";
import { Vector } from "../manim/utils/types";

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

  const scalevect = useRef<Vector | null>(null);

  return (
    <main>
      <canvas ref={canvasRef}></canvas>
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
          const regularPolygon = scene.mobjectManager.add(
            MobjectName.RegularPolygon,
          );
          console.log("Added RegularPolygon", regularPolygon);
          scalevect.current = regularPolygon.scale;
        }}
      >
        add RegularPolygon
      </button>
      <button
        onClick={() => {
          const polygon = scene.mobjectManager.add(MobjectName.Polygon);
          console.log("Added Polygon", polygon);
          scalevect.current = polygon.scale;
        }}
      >
        add Polygon
      </button>
      <button
        onClick={() => {
          const text = scene.mobjectManager.add(MobjectName.Text);
          console.log("Added Text", text);
          scalevect.current = text.scale;
        }}
      >
        add Text
      </button>
      <button
        onClick={() => {
          const parametricPath = scene.mobjectManager.add(
            MobjectName.ParametricPath,
          );
          console.log("Added ParametricPath", parametricPath);
          scalevect.current = parametricPath.scale;
        }}
      >
        add ParametricPath
      </button>
      <button
        onClick={() => {
          const parametricShape = scene.mobjectManager.add(
            MobjectName.ParametricShape,
          );
          console.log("Added ParametricShape", parametricShape);
          scalevect.current = parametricShape.scale;
        }}
      >
        add ParametricShape
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
