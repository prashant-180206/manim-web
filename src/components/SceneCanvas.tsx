// import React from "react";
import { useEffect, useRef } from "react";
import { useManim } from "../context/manimContext";

const SceneCanvas = () => {
  const { scene } = useManim();
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (containerRef.current && scene) {
      containerRef.current.appendChild(scene.canvas);
    }
  }, [scene]);

  return <div ref={containerRef}></div>;
};

export default SceneCanvas;
