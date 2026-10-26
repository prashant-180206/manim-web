import type { Scene3D } from "@/manim3d/scene3d";
import {
  parseScene3DDocument,
  type Scene3DDocument,
} from "@/manim3d/serialization/scene3dSerializer";

/** Suggested download name for a 3D scene, always ending in `.json`. */
export function scene3DFileName(name: string): string {
  const trimmed = name.trim() || "untitled.scene3d";

  return /\.json$/i.test(trimmed) ? trimmed : `${trimmed}.json`;
}

/** Display name for an opened 3D scene file. */
export function scene3DNameFromFile(fileName: string): string {
  const name = fileName.replace(/\.json$/i, "").trim();

  return name || "untitled.scene3d";
}

export function downloadScene3DFile(document: Scene3DDocument): void {
  const blob = new Blob([JSON.stringify(document, null, 2)], {
    type: "application/json",
  });
  const url = URL.createObjectURL(blob);
  const anchor = window.document.createElement("a");

  anchor.href = url;
  anchor.download = scene3DFileName(document.name);
  window.document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();

  // Give the browser a tick to start the download before revoking the URL.
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export async function readScene3DFile(file: File): Promise<Scene3DDocument> {
  return parseScene3DDocument(await file.text());
}

export function hasScene3DContent(scene: Scene3D): boolean {
  return scene.mobjectManager.all().length > 0;
}
