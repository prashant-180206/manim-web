import {
  createContext,
  useContext,
  useState,
  useEffect,
  type ReactNode,
} from "react";
import { Scene } from "../manim/scene";

interface ManimContextType {
  scene: Scene | null;
}

const ManimContext = createContext<ManimContextType | null>(null);

interface ManimProviderProps {
  children: ReactNode;
}

export function ManimProvider({ children }: ManimProviderProps) {
  const [scene, setScene] = useState<Scene | null>(null);

  useEffect(() => {
    const canvas = document.createElement("canvas");
    const instance = new Scene(canvas);

    setScene(instance);

    return () => {
      instance.dispose();
    };
  }, []);

  return (
    <ManimContext.Provider value={{ scene }}>
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
