import { useEffect, useRef } from "react";
import { Link } from "react-router-dom";
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
      scene.resize(500, 400, window.devicePixelRatio || 1);
    }
  }, [canvasRef]);

  const scalevect = useRef<Vector | null>(null);

  return (
    <main className="min-h-screen p-6 text-stone-100 md:p-8">
      <div className="flex flex-wrap gap-3">
        <Link
          to="/"
          className="inline-flex items-center justify-center rounded-2xl bg-linear-to-br from-sky-300 to-indigo-500 px-4 py-3 font-semibold text-slate-950 transition hover:brightness-110 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-300/80"
        >
          Open Scene Studio
        </Link>
        <Link
          to="/values"
          className="inline-flex items-center justify-center rounded-2xl bg-linear-to-br from-amber-300 to-orange-500 px-4 py-3 font-semibold text-slate-950 transition hover:brightness-110 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-300/80"
        >
          Open value editor lab
        </Link>
      </div>
      <canvas
        ref={canvasRef}
        className="mt-6 rounded-3xl border border-white/10 bg-slate-950/75 shadow-[0_24px_60px_rgba(0,0,0,0.24)]"
      />
      <button
        className="mr-3 mt-4 inline-flex items-center justify-center rounded-2xl border border-white/10 bg-slate-950/90 px-4 py-3 font-medium text-stone-100 transition hover:border-white/25 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-300/80"
        onClick={() => {
          const circle = scene.mobjectManager.add(MobjectName.Circle);
          console.log("Added circle", circle);
          scalevect.current = circle.scale;
        }}
      >
        add Circle
      </button>
      <button
        className="mr-3 mt-4 inline-flex items-center justify-center rounded-2xl border border-white/10 bg-slate-950/90 px-4 py-3 font-medium text-stone-100 transition hover:border-white/25 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-300/80"
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
        className="mr-3 mt-4 inline-flex items-center justify-center rounded-2xl border border-white/10 bg-slate-950/90 px-4 py-3 font-medium text-stone-100 transition hover:border-white/25 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-300/80"
        onClick={() => {
          const polygon = scene.mobjectManager.add(MobjectName.Polygon);
          console.log("Added Polygon", polygon);
          scalevect.current = polygon.scale;
        }}
      >
        add Polygon
      </button>
      <button
        className="mr-3 mt-4 inline-flex items-center justify-center rounded-2xl border border-white/10 bg-slate-950/90 px-4 py-3 font-medium text-stone-100 transition hover:border-white/25 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-300/80"
        onClick={() => {
          const text = scene.mobjectManager.add(MobjectName.Text);
          console.log("Added Text", text);
          scalevect.current = text.scale;
        }}
      >
        add Text
      </button>
      <button
        className="mr-3 mt-4 inline-flex items-center justify-center rounded-2xl border border-white/10 bg-slate-950/90 px-4 py-3 font-medium text-stone-100 transition hover:border-white/25 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-300/80"
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
        className="mr-3 mt-4 inline-flex items-center justify-center rounded-2xl border border-white/10 bg-slate-950/90 px-4 py-3 font-medium text-stone-100 transition hover:border-white/25 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-300/80"
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
        className="mr-3 mt-4 inline-flex items-center justify-center rounded-2xl border border-white/10 bg-slate-950/90 px-4 py-3 font-medium text-stone-100 transition hover:border-white/25 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-300/80"
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
