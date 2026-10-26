import { useEffect, useRef } from "react";
import { useScene3D } from "../context/scene3dContext";

/**
 * Mounts the provider-owned 3D canvas and keeps its drawing buffer in sync with
 * the CSS layout. Mirrors `src/components/SceneCanvas.tsx`, but the scene owns a
 * WebGL renderer instead of a 2D context.
 */
const Scene3DCanvas = () => {
  const { scene } = useScene3D();
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const container = containerRef.current;

    if (!container || !scene || scene.isDisposed) return;

    const canvas = scene.canvas;

    canvas.style.display = "block";
    canvas.style.width = "100%";
    canvas.style.height = "100%";
    canvas.style.touchAction = "none";
    canvas.style.cursor = "default";
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

export default Scene3DCanvas;
