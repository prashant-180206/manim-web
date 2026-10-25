import { useEffect, useRef } from "react";
import { useManim } from "../context/manimContext";

const SceneCanvas = () => {
  const { scene } = useManim();
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const container = containerRef.current;

    if (!container || !scene) return;

    const canvas = scene.canvas;

    canvas.style.display = "block";
    container.appendChild(canvas);

    const resize = () => {
      const rect = container.getBoundingClientRect();

      if (rect.width === 0 || rect.height === 0) return;

      scene.resize(rect.width, rect.height, window.devicePixelRatio || 1);
    };

    const observer = new ResizeObserver(resize);

    observer.observe(container);
    resize();

    return () => {
      observer.disconnect();

      if (canvas.parentElement === container) {
        container.removeChild(canvas);
      }
    };
  }, [scene]);

  return <div ref={containerRef} className="absolute inset-0 overflow-hidden" />;
};

export default SceneCanvas;
