import {
  createContext,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";
import { Scene3D } from "@/manim3d/scene3d";

interface Scene3DContextType {
  scene: Scene3D | null;
}

const Scene3DContext = createContext<Scene3DContextType | null>(null);

interface Scene3DProviderProps {
  children: ReactNode;
}

/**
 * Owns the single 3D scene used by the 3D editor. It is deliberately separate
 * from `ManimProvider`, which owns the 2D scene; the two scenes never share a
 * canvas, renderer or mobject manager.
 */
export function Scene3DProvider({ children }: Scene3DProviderProps) {
  const [scene, setScene] = useState<Scene3D | null>(null);

  useEffect(() => {
    const canvas = document.createElement("canvas");
    const instance = new Scene3D(canvas);

    instance.start();
    setScene(instance);

    return () => {
      instance.dispose();
    };
  }, []);

  return (
    <Scene3DContext.Provider value={{ scene }}>
      {children}
    </Scene3DContext.Provider>
  );
}

export function useScene3D() {
  const context = useContext(Scene3DContext);

  if (!context) {
    throw new Error("useScene3D must be used inside Scene3DProvider");
  }

  return context;
}
