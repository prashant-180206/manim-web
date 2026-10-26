import type { Scene3D } from "@/manim3d/scene3d";
import {
  applyScene3D,
  serializeScene3D,
  type Scene3DDocument,
} from "@/manim3d/serialization/scene3dSerializer";

/**
 * Snapshot-based undo/redo for the 3D editor.
 *
 * The 3D serializer captures the authored state (mobjects and camera), so a
 * history entry is just a scene document. Rapid mutations (typing in a
 * property field or dragging a number stepper) are coalesced into one step.
 */

interface SelectionSnapshot {
  primary: string | null;
  extra: string[];
}

interface HistoryEntry {
  document: Scene3DDocument;
  signature: string;
  selection: SelectionSnapshot;
}

const HISTORY_LIMIT = 100;
const COALESCE_MS = 350;

/**
 * Everything that makes an edit meaningful. `savedAt` and viewport size are
 * deliberately excluded so saving and resizing never create undo steps.
 */
function contentSignature(document: Scene3DDocument): string {
  return JSON.stringify({
    mobjects: document.mobjects,
    camera: document.camera,
  });
}

function captureSelection(scene: Scene3D): SelectionSnapshot {
  return {
    primary: scene.selection.selectedMobject?.id ?? null,
    extra: [...scene.selection.editingSelection].map(
      (mobject) => mobject.id,
    ),
  };
}

function restoreSelection(scene: Scene3D, selection: SelectionSnapshot): void {
  const lookup = (id: string) => scene.mobjectManager.get(id) ?? null;

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

export class Scene3DHistory {
  private past: HistoryEntry[] = [];
  private future: HistoryEntry[] = [];
  private present: HistoryEntry;

  private pendingTimer: number | null = null;

  /** True while a snapshot is being restored, to ignore engine signals. */
  private applying = false;

  constructor(private readonly scene: Scene3D) {
    this.present = this.capture();
  }

  markChanged(): void {
    if (this.applying) return;

    this.clearPendingTimer();
    this.pendingTimer = window.setTimeout(() => {
      this.pendingTimer = null;
      this.commit();
    }, COALESCE_MS);
  }

  /** Update the baseline without creating an undo step. */
  rebase(): void {
    if (this.applying) return;

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
      applyScene3D(this.scene, entry.document);
      restoreSelection(this.scene, entry.selection);
    } finally {
      this.applying = false;
    }

    this.present = this.capture();
  }

  private capture(): HistoryEntry {
    const document = serializeScene3D(this.scene);

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
