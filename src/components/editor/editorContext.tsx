import { createContext, useContext } from "react";
import type { Scene } from "@/manim/scene";

export type ConsoleLevel = "info" | "success" | "warn" | "error";

export interface ConsoleEntry {
  id: number;
  level: ConsoleLevel;
  message: string;
  time: Date;
}

export interface RefreshOptions {
  /**
   * Whether this refresh follows an authored edit. Pass `false` for timeline
   * scrubbing/playback, which changes animated values but should not create an
   * undo step.
   */
  record?: boolean;
}

export interface EditorContextValue {
  scene: Scene;
  /** Force the editor to read fresh engine state. */
  refresh: (options?: RefreshOptions) => void;
  log: (level: ConsoleLevel, message: string) => void;
}

export const EditorContext = createContext<EditorContextValue | null>(null);

export function useEditor(): EditorContextValue {
  const context = useContext(EditorContext);

  if (!context) {
    throw new Error("useEditor must be used inside an EditorContext provider");
  }

  return context;
}

export function formatErrorMessage(error: unknown): string {
  if (error instanceof Error) return error.message;
  return String(error);
}
