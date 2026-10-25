import type { Mobject } from "@/manim/mobject/mobect";
import type { MobjectNode } from "@/manim/mobject/helpers/MobjectTree";
import type { Scene } from "@/manim/scene";

/** Every mobject currently selected, single selection first. */
export function getSelectedMobjects(scene: Scene): Mobject[] {
  const selected = new Set<Mobject>();

  if (scene.selection.selectedMobject) {
    selected.add(scene.selection.selectedMobject);
  }

  for (const mobject of scene.selection.editingSelection) {
    selected.add(mobject);
  }

  return [...selected];
}

export function getSelectedMobjectIds(scene: Scene): Set<string> {
  return new Set(getSelectedMobjects(scene).map((mobject) => mobject.id));
}

function collectNodeMobjects(node: MobjectNode): Mobject[] {
  const mobjects: Mobject[] = [node.mobject];

  for (const child of node.children) {
    mobjects.push(...collectNodeMobjects(child));
  }

  return mobjects;
}

function cleanupMobject(scene: Scene, mobject: Mobject): void {
  scene.animationSystem.removeMobject(mobject.id);
  scene.trackerSystem.deleteConnectionsForMobject(mobject.id);
  scene.trackerSystem.removeTracker(mobject.id);
}

/**
 * Delete the active selection. Descendants are cleaned up (animations and
 * tracker bindings) before their parent group is removed.
 */
export function deleteSelection(scene: Scene): string[] {
  const tree = scene.mobjectManager.tree;
  const selected = getSelectedMobjects(scene);

  // Skip objects that are already handled by an ancestor group.
  const isDescendantOfSelection = (mobject: Mobject): boolean => {
    let parent = tree.nodes.get(mobject.id)?.parent ?? null;

    while (parent) {
      if (selected.some((candidate) => candidate.id === parent?.id)) {
        return true;
      }

      parent = parent.parent;
    }

    return false;
  };

  const roots = selected.filter(
    (mobject) =>
      tree.nodes.has(mobject.id) && !isDescendantOfSelection(mobject),
  );

  const removed: string[] = [];

  for (const mobject of roots) {
    const node = tree.nodes.get(mobject.id);
    if (!node) continue;

    for (const descendant of collectNodeMobjects(node)) {
      cleanupMobject(scene, descendant);
    }

    removed.push(mobject.name);
    scene.mobjectManager.delete(mobject);
  }

  scene.selection.editingSelection.clear();
  scene.selection.selectMobject(null);

  return removed;
}

export function togglePlayback(scene: Scene): boolean {
  const system = scene.animationSystem;

  if (system.playing) {
    system.pause();
    return false;
  }

  if (system.currentTime >= system.totalDuration) {
    system.setCurrentTime(0);
  }

  system.play();
  return true;
}

export function seekBy(scene: Scene, delta: number): number {
  const system = scene.animationSystem;
  const next = Math.max(
    0,
    Math.min(system.currentTime + delta, system.totalDuration),
  );

  system.setCurrentTime(next);
  return next;
}

export function isTypingTarget(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false;

  const tag = target.tagName;

  return (
    tag === "INPUT" ||
    tag === "TEXTAREA" ||
    tag === "SELECT" ||
    target.isContentEditable
  );
}
