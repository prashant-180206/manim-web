import {
  useState,
  type DragEvent,
  type MouseEvent as ReactMouseEvent,
} from "react";
import {
  ArrowDown,
  ArrowUp,
  ChevronRight,
  ChevronsDown,
  ChevronsUp,
  EyeOff,
  GripVertical,
  ListTree,
  Lock,
} from "lucide-react";

import { cn } from "@/lib/utils";
import type { Scene } from "@/manim/scene";
import { MobjectUI, type MobjectTreeControlData } from "@/manim/UI/mobjectUI";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { PanelHeader } from "./editorPrimitives";
import { formatErrorMessage, useEditor } from "./editorContext";
import { getSelectedMobjectIds } from "./editorActions";

type DropPosition = "above" | "inside" | "below";

interface DropTarget {
  id: string;
  position: DropPosition;
}

type ArrangeAction = "front" | "forward" | "backward" | "back";

const arrangeActions: {
  action: ArrangeAction;
  label: string;
  icon: typeof ChevronsUp;
}[] = [
  { action: "front", label: "Bring selection to front", icon: ChevronsUp },
  { action: "forward", label: "Bring selection forward", icon: ArrowUp },
  { action: "backward", label: "Send selection backward", icon: ArrowDown },
  { action: "back", label: "Send selection to back", icon: ChevronsDown },
];

/** Front-most first: sibling order is reversed draw order. */
function frontToBack(
  nodes: MobjectTreeControlData[],
): MobjectTreeControlData[] {
  return [...nodes].sort((a, b) => b.zIndex - a.zIndex);
}

function isDescendantOf(
  scene: Scene,
  ancestorId: string,
  nodeId: string,
): boolean {
  let node = scene.mobjectManager.tree.nodes.get(nodeId)?.parent ?? null;

  while (node) {
    if (node.id === ancestorId) return true;
    node = node.parent;
  }

  return false;
}

function dropPositionFromEvent(
  event: DragEvent<HTMLElement>,
  isGroup: boolean,
): DropPosition {
  const rect = event.currentTarget.getBoundingClientRect();
  const ratio = (event.clientY - rect.top) / rect.height;

  if (isGroup) {
    if (ratio < 0.28) return "above";
    if (ratio > 0.72) return "below";
    return "inside";
  }

  return ratio < 0.5 ? "above" : "below";
}

interface LayerRowProps {
  scene: Scene;
  data: MobjectTreeControlData;
  depth: number;
  selectedIds: Set<string>;
  collapsedIds: Set<string>;
  toggleCollapsed: (id: string) => void;
  draggedId: string | null;
  dropTarget: DropTarget | null;
  startDrag: (id: string) => void;
  endDrag: () => void;
  hoverDrop: (target: DropTarget | null) => void;
  drop: (target: DropTarget) => void;
  refresh: () => void;
}

function LayerRow({
  scene,
  data,
  depth,
  selectedIds,
  collapsedIds,
  toggleCollapsed,
  draggedId,
  dropTarget,
  startDrag,
  endDrag,
  hoverDrop,
  drop,
  refresh,
}: LayerRowProps) {
  const selected = selectedIds.has(data.id);
  const expanded = !collapsedIds.has(data.id);
  const Icon = data.icon;
  const dragging = draggedId === data.id;
  const invalidTarget =
    draggedId !== null &&
    (draggedId === data.id || isDescendantOf(scene, draggedId, data.id));
  const dropPosition =
    dropTarget?.id === data.id ? dropTarget.position : null;

  const handleSelect = (event: ReactMouseEvent) => {
    if (event.metaKey || event.ctrlKey || event.shiftKey) {
      data.multiselect();
    } else {
      data.select();
    }

    refresh();
  };

  return (
    <div>
      <div
        draggable
        className={cn(
          "group/layer relative flex items-center gap-0.5 rounded-md border border-transparent pr-1.5 transition-colors",
          selected ? "bg-accent text-accent-foreground" : "hover:bg-accent/50",
          dragging && "opacity-40",
          dropPosition === "inside" &&
            "border-primary/60 bg-primary/10 text-foreground",
        )}
        style={{ paddingLeft: `${3 + depth * 14}px` }}
        onClick={handleSelect}
        onDragStart={(event) => {
          event.dataTransfer.effectAllowed = "move";
          event.dataTransfer.setData("text/plain", data.id);
          startDrag(data.id);
        }}
        onDragEnd={endDrag}
        onDragLeave={(event) => {
          if (dropPosition === null) return;

          const next = event.relatedTarget;

          if (next instanceof Node && event.currentTarget.contains(next)) return;

          hoverDrop(null);
        }}
        onDragOver={(event) => {
          if (invalidTarget) {
            hoverDrop(null);
            return;
          }

          event.preventDefault();
          event.stopPropagation();
          event.dataTransfer.dropEffect = "move";
          hoverDrop({
            id: data.id,
            position: dropPositionFromEvent(event, data.isGroup),
          });
        }}
        onDrop={(event) => {
          if (invalidTarget) return;

          event.preventDefault();
          event.stopPropagation();
          drop({
            id: data.id,
            position: dropPositionFromEvent(event, data.isGroup),
          });
        }}
      >
        {dropPosition === "above" && (
          <span className="pointer-events-none absolute inset-x-1 -top-px z-10 h-0.5 rounded-full bg-primary" />
        )}
        {dropPosition === "below" && (
          <span className="pointer-events-none absolute inset-x-1 -bottom-px z-10 h-0.5 rounded-full bg-primary" />
        )}

        <GripVertical
          className="size-3 shrink-0 cursor-grab text-muted-foreground/50 group-hover/layer:text-muted-foreground active:cursor-grabbing"
          aria-hidden
        />

        <button
          type="button"
          className="flex size-4 shrink-0 items-center justify-center text-muted-foreground"
          onClick={(event) => {
            event.stopPropagation();
            toggleCollapsed(data.id);
          }}
          aria-label={expanded ? "Collapse group" : "Expand group"}
        >
          {data.hasChildren ? (
            <ChevronRight
              className={cn(
                "size-3 transition-transform",
                expanded && "rotate-90",
              )}
            />
          ) : (
            <span className="size-3" />
          )}
        </button>

        <Icon className="size-3.5 shrink-0 text-muted-foreground" />

        <button
          type="button"
          className={cn(
            "min-w-0 flex-1 truncate py-1 text-left text-xs",
            !data.visible && "text-muted-foreground line-through",
          )}
          title={`${data.name} · z ${data.zIndex}`}
          onClick={(event) => {
            event.stopPropagation();
            handleSelect(event);
          }}
        >
          {data.name}
        </button>

        {!data.visible && (
          <EyeOff className="size-3 shrink-0 text-muted-foreground/70" />
        )}
        {data.locked && (
          <Lock className="size-3 shrink-0 text-muted-foreground/70" />
        )}

        <Tooltip>
          <TooltipTrigger
            render={
              <span className="shrink-0 cursor-default rounded bg-muted/80 px-1 font-mono text-[9px] leading-4 text-muted-foreground" />
            }
          >
            z{data.zIndex}
          </TooltipTrigger>
          <TooltipContent>
            Draw order {data.zIndex} · higher renders in front
          </TooltipContent>
        </Tooltip>
      </div>

      {expanded && data.hasChildren && (
        <div className="relative">
          <div
            className="pointer-events-none absolute inset-y-0 w-px bg-border/50"
            style={{ left: `${13 + depth * 14}px` }}
          />
          {frontToBack(data.children).map((child) => (
            <LayerRow
              key={child.id}
              scene={scene}
              data={child}
              depth={depth + 1}
              selectedIds={selectedIds}
              collapsedIds={collapsedIds}
              toggleCollapsed={toggleCollapsed}
              draggedId={draggedId}
              dropTarget={dropTarget}
              startDrag={startDrag}
              endDrag={endDrag}
              hoverDrop={hoverDrop}
              drop={drop}
              refresh={refresh}
            />
          ))}
        </div>
      )}
    </div>
  );
}

export function LayersPanel() {
  const { scene, refresh, log } = useEditor();
  const [collapsedIds, setCollapsedIds] = useState<Set<string>>(
    () => new Set(),
  );
  const [draggedId, setDraggedId] = useState<string | null>(null);
  const [dropTarget, setDropTarget] = useState<DropTarget | null>(null);
  const [rootDropActive, setRootDropActive] = useState(false);

  const tree = MobjectUI.getMobjectTreeUIData(scene);
  const selectedIds = getSelectedMobjectIds(scene);
  const total = scene.mobjectManager.tree.nodes.size;
  const hasSelection = selectedIds.size > 0;

  const toggleCollapsed = (id: string) => {
    setCollapsedIds((previous) => {
      const next = new Set(previous);

      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }

      return next;
    });
  };

  const startDrag = (id: string) => {
    setDraggedId(id);
    setDropTarget(null);
    setRootDropActive(false);
  };

  const endDrag = () => {
    setDraggedId(null);
    setDropTarget(null);
    setRootDropActive(false);
  };

  const mobjectName = (id: string) =>
    scene.mobjectManager.tree.nodes.get(id)?.mobject.name ?? id;

  const drop = (target: DropTarget) => {
    if (!draggedId) return;

    const draggedName = mobjectName(draggedId);

    try {
      if (target.position === "inside") {
        scene.mobjectManager.moveIntoGroup(target.id, draggedId);
        log(
          "info",
          `Moved ${draggedName} into ${mobjectName(target.id)}`,
        );
      } else if (target.position === "above") {
        // Front-to-back display: "above" means in front of the target.
        scene.mobjectManager.moveInFrontOf(draggedId, target.id);
        log("info", `Moved ${draggedName} in front of ${mobjectName(target.id)}`);
      } else {
        scene.mobjectManager.moveBehind(draggedId, target.id);
        log(
          "info",
          `Moved ${draggedName} behind ${mobjectName(target.id)}`,
        );
      }
    } catch (error) {
      log("error", formatErrorMessage(error));
    }

    endDrag();
    refresh();
  };

  const moveToRoot = () => {
    if (!draggedId) return;

    try {
      scene.mobjectManager.moveToRoot(draggedId);
      log("info", `Moved ${mobjectName(draggedId)} to the root layer`);
    } catch (error) {
      log("error", formatErrorMessage(error));
    }

    endDrag();
    refresh();
  };

  const arrange = (action: ArrangeAction) => {
    const mobjects = [...selectedIds].flatMap((id) => {
      const node = scene.mobjectManager.tree.nodes.get(id);
      return node ? [node.mobject] : [];
    });

    if (mobjects.length === 0) return;

    // Send-to-back runs in reverse so the first selected object stays in back.
    const ordered = action === "back" ? [...mobjects].reverse() : mobjects;

    try {
      for (const mobject of ordered) {
        if (action === "front") scene.mobjectManager.bringToFront(mobject);
        if (action === "forward") scene.mobjectManager.bringForward(mobject);
        if (action === "backward") scene.mobjectManager.sendBackward(mobject);
        if (action === "back") scene.mobjectManager.sendToBack(mobject);
      }
    } catch (error) {
      log("error", formatErrorMessage(error));
    }

    refresh();
  };

  return (
    <div className="flex h-full min-h-0 flex-col">
      <PanelHeader title="Layers" icon={<ListTree />}>
        <Badge variant="secondary" className="h-5">
          {total}
        </Badge>
      </PanelHeader>

      <div className="flex items-center gap-1 border-b border-border/60 px-2 py-1">
        <span className="text-[10px] text-muted-foreground">Draw order</span>
        <span className="text-[10px] text-muted-foreground/50">front → back</span>

        <div className="ml-auto flex items-center gap-0.5">
          {arrangeActions.map(({ action, label, icon: Icon }) => (
            <Tooltip key={action}>
              <TooltipTrigger
                render={
                  <Button
                    variant="ghost"
                    size="icon-xs"
                    className="size-5 text-muted-foreground"
                    onClick={() => arrange(action)}
                    disabled={!hasSelection}
                    aria-label={label}
                  />
                }
              >
                <Icon />
              </TooltipTrigger>
              <TooltipContent>{label}</TooltipContent>
            </Tooltip>
          ))}
        </div>
      </div>

      <ScrollArea className="min-h-0 flex-1">
        <div className="p-1.5">
          {tree.length === 0 ? (
            <div className="rounded-lg border border-dashed border-border/70 px-3 py-6 text-center text-xs text-muted-foreground">
              The scene is empty. Create a mobject in the Scene panel.
            </div>
          ) : (
            <div className="space-y-0.5">
              {frontToBack(tree).map((node) => (
                <LayerRow
                  key={node.id}
                  scene={scene}
                  data={node}
                  depth={0}
                  selectedIds={selectedIds}
                  collapsedIds={collapsedIds}
                  toggleCollapsed={toggleCollapsed}
                  draggedId={draggedId}
                  dropTarget={dropTarget}
                  startDrag={startDrag}
                  endDrag={endDrag}
                  hoverDrop={setDropTarget}
                  drop={drop}
                  refresh={refresh}
                />
              ))}
            </div>
          )}

          {tree.length > 0 && (
            <div
              className={cn(
                "mt-2 rounded-lg border border-dashed px-3 py-2.5 text-center text-[11px] transition-colors",
                draggedId
                  ? "border-primary/40 bg-primary/5 text-foreground"
                  : "border-border/60 text-muted-foreground",
                rootDropActive && "border-primary bg-primary/10",
              )}
              onDragOver={(event) => {
                if (!draggedId) return;

                event.preventDefault();
                event.stopPropagation();
                event.dataTransfer.dropEffect = "move";
                setDropTarget(null);
                setRootDropActive(true);
              }}
              onDragLeave={(event) => {
                if (
                  !event.currentTarget.contains(event.relatedTarget as Node | null)
                ) {
                  setRootDropActive(false);
                }
              }}
              onDrop={(event) => {
                if (!draggedId) return;

                event.preventDefault();
                event.stopPropagation();
                moveToRoot();
              }}
            >
              {draggedId
                ? "Drop here to move out of its group (front of the root layer)"
                : "Drag a row here to move it to the root layer"}
            </div>
          )}

          <p className="px-1 pt-2 text-[10px] leading-relaxed text-muted-foreground/80">
            Drag rows to reorder or onto a Group to nest. Rows are sorted by
            z-index: the top row renders in front. Ctrl/Cmd-click to
            multi-select.
          </p>
        </div>
      </ScrollArea>
    </div>
  );
}
