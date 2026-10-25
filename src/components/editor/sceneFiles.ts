import type { Scene } from "@/manim/scene";
import {
  parseSceneDocument,
  type SceneDocument,
} from "@/manim/serialization/sceneSerializer";

/** Suggested download name for a scene, always ending in `.json`. */
export function sceneFileName(name: string): string {
  const trimmed = name.trim() || "untitled.scene";

  return /\.json$/i.test(trimmed) ? trimmed : `${trimmed}.json`;
}

/** Display name for an opened scene file. */
export function sceneNameFromFile(fileName: string): string {
  const name = fileName.replace(/\.json$/i, "").trim();

  return name || "untitled.scene";
}

export function downloadSceneFile(document: SceneDocument): void {
  const blob = new Blob([JSON.stringify(document, null, 2)], {
    type: "application/json",
  });
  const url = URL.createObjectURL(blob);
  const anchor = window.document.createElement("a");

  anchor.href = url;
  anchor.download = sceneFileName(document.name);
  window.document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();

  // Give the browser a tick to start the download before revoking the URL.
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export async function readSceneFile(file: File): Promise<SceneDocument> {
  return parseSceneDocument(await file.text());
}

export function hasSceneContent(scene: Scene): boolean {
  return (
    scene.mobjectManager.tree.nodes.size > 0 ||
    [...scene.animationSystem.all()].length > 0 ||
    [...scene.trackerSystem.getTrackerInfo()].length > 0
  );
}
