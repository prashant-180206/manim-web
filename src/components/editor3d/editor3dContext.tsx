import { createContext, useContext } from "react";
import type { Scene3D } from "@/manim3d/scene3d";
import type {
  ConsoleLevel,
  RefreshOptions,
} from "@/components/editor/editorContext";

export type {
  ConsoleEntry,
  ConsoleLevel,
  RefreshOptions,
} from "@/components/editor/editorContext";
export { formatErrorMessage } from "@/components/editor/editorContext";

export interface Editor3DContextValue {
  scene: Scene3D;
  /** Force the editor to read fresh engine state. */
  refresh: (options?: RefreshOptions) => void;
  log: (level: ConsoleLevel, message: string) => void;
}

export const Editor3DContext = createContext<Editor3DContextValue | null>(
  null,
);

export function useEditor3D(): Editor3DContextValue {
  const context = useContext(Editor3DContext);

  if (!context) {
    throw new Error("useEditor3D must be used inside an Editor3DContext provider");
  }

  return context;
}
