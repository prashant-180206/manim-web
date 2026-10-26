import type { Scene } from "@/manim/scene";
import {
  applyScene,
  serializeScene,
  type SceneDocument,
} from "@/manim/serialization/sceneSerializer";

/**
 * Snapshot-based undo/redo for the editor.
 *
 * The scene serializer already captures every authored piece of state (the
 * mobject tree, properties, animations, trackers and timeline position), so a
 * history entry is just a scene document. This keeps undo correct for every
 * mutation path without each panel having to describe an inverse operation.
 *
 * Rapid mutations (typing in a property field, dragging a slider or a timeline
 * clip) are coalesced into one step. Anything still pending is flushed before
 * an undo/redo so the newest change is always undoable.
 */

interface SelectionSnapshot {
  primary: string | null;
  extra: string[];
}

interface HistoryEntry {
  document: SceneDocument;
  signature: string;
  selection: SelectionSnapshot;
}

const HISTORY_LIMIT = 100;
const COALESCE_MS = 350;

/**
 * Everything that makes an edit meaningful. Volatile fields such as `savedAt`,
 * canvas size and the timeline playhead are deliberately excluded so seeking,
 * resizing and saving never create undo steps.
 */
function contentSignature(document: SceneDocument): string {
  return JSON.stringify({
    mobjects: document.mobjects,
    animations: document.animations,
    trackers: document.trackers,
    bindings: document.bindings,
    trackerConnections: document.trackerConnections,
  });
}

function captureSelection(scene: Scene): SelectionSnapshot {
  return {
    primary: scene.selection.selectedMobject?.id ?? null,
    extra: [...scene.selection.editingSelection].map((mobject) => mobject.id),
  };
}

function restoreSelection(scene: Scene, selection: SelectionSnapshot): void {
  const lookup = (id: string) =>
    scene.mobjectManager.tree.nodes.get(id)?.mobject ?? null;

  scene.selection.editingSelection.clear();
  scene.selection.selectMobject(
    selection.primary ? lookup(selection.primary) : null,
  );

  for (const id of selection.extra) {
    const mobject = lookup(id);

    if (mobject && mobject !== scene.selection.selectedMobject) {
      scene.selection.editingSelection.add(mobject);
    }
  }

  // Adding to `editingSelection` directly does not notify, so emit once more
  // to keep the editor panels in sync with the restored multi-selection.
  scene.selection.onSelectionChanged.emit(scene.selection.selectedMobject);
}

export class SceneHistory {
  private past: HistoryEntry[] = [];
  private future: HistoryEntry[] = [];
  private present: HistoryEntry;

  private pendingTimer: number | null = null;

  /** True while a snapshot is being restored, to ignore engine signals. */
  private applying = false;

  constructor(private readonly scene: Scene) {
    this.present = this.capture();
  }

  /**
   * Record a potential mutation. Repeated calls within the coalescing window
   * collapse into a single undo step.
   */
  markChanged(): void {
    if (this.applying) return;

    this.clearPendingTimer();
    this.pendingTimer = window.setTimeout(() => {
      this.pendingTimer = null;
      this.commit();
    }, COALESCE_MS);
  }

  /**
   * Update the baseline without creating an undo step. Used for timeline
   * scrubbing/playback, which changes animated property values but is not an
   * authored edit.
   */
  rebase(): void {
    if (this.applying) return;

    // A timer means a real edit is still inside the coalescing window. Commit
    // it so the edit is not folded into the new baseline. With no pending
    // edit, the change is timeline-only and can be absorbed silently.
    if (this.pendingTimer !== null) {
      this.commit();
      return;
    }

    this.present = this.capture();
  }

  /** Flush any pending change into a concrete undo step. */
  commit(): void {
    if (this.applying) return;

    this.clearPendingTimer();

    const next = this.capture();

    if (next.signature === this.present.signature) {
      // Selection, timeline position or canvas size changed only.
      this.present = next;
      return;
    }

    this.past.push(this.present);

    if (this.past.length > HISTORY_LIMIT) {
      this.past.shift();
    }

    this.present = next;
    this.future = [];
  }

  undo(): boolean {
    if (this.applying) return false;

    this.commit();

    const target = this.past.pop();

    if (!target) return false;

    const previous = this.present;

    this.future.unshift(previous);

    try {
      this.apply(target);
      return true;
    } catch (error) {
      this.future.shift();
      this.past.push(target);
      this.present = previous;
      throw error;
    }
  }

  redo(): boolean {
    if (this.applying) return false;

    this.commit();

    const target = this.future.shift();

    if (!target) return false;

    const previous = this.present;

    this.past.push(previous);

    try {
      this.apply(target);
      return true;
    } catch (error) {
      this.past.pop();
      this.future.unshift(target);
      this.present = previous;
      throw error;
    }
  }

  /** Forget the current history and start from the live scene (open/close). */
  reset(): void {
    this.clearPendingTimer();
    this.past = [];
    this.future = [];
    this.present = this.capture();
  }

  private apply(entry: HistoryEntry): void {
    this.applying = true;

    try {
      applyScene(this.scene, entry.document);
      restoreSelection(this.scene, entry.selection);
    } finally {
      this.applying = false;
    }

    // Capture the live state rather than trusting the document verbatim: the
    // animation system may re-derive property values when it moves the
    // playhead, and the baseline should match what is actually on screen.
    this.present = this.capture();
  }

  private capture(): HistoryEntry {
    const document = serializeScene(this.scene);

    return {
      document,
      signature: contentSignature(document),
      selection: captureSelection(this.scene),
    };
  }

  private clearPendingTimer(): void {
    if (this.pendingTimer === null) return;

    window.clearTimeout(this.pendingTimer);
    this.pendingTimer = null;
  }
}
