import { createContext, useContext, ReactNode, useRef, useEffect } from "react";
import { Scene } from "../manim/scene";

interface ManimContextType {
  scene: Scene | null;
}

const ManimContext = createContext<ManimContextType | null>(null);

interface ManimProviderProps {
  children: ReactNode;
}

export function ManimProvider({ children }: ManimProviderProps) {
  const scene = useRef<Scene>(null);

  useEffect(() => {
    const canvas = document.createElement("canvas");
    scene.current = new Scene(canvas);
  }, []);

  return (
    <ManimContext.Provider
      value={{
        scene: scene.current,
      }}
    >
      {children}
    </ManimContext.Provider>
  );
}

export function useManim() {
  const context = useContext(ManimContext);

  if (!context) {
    throw new Error("useManim must be used inside ManimProvider");
  }

  return context;
}
