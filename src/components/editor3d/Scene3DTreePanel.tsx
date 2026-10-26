import { useState, type MouseEvent } from "react";
import {
  ChevronRight,
  Eye,
  EyeOff,
  Layers2,
  Lock,
  LockOpen,
  Plus,
  Trash2,
} from "lucide-react";

import { cn } from "@/lib/utils";
import {
  Mobject3DUI,
  type Mobject3DTreeControlData,
} from "@/manim3d/UI/mobject3dUI";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { CollapsibleSection } from "../editor/CollapsibleSection";
import { PanelHeader } from "../editor/editorPrimitives";
import { formatErrorMessage, useEditor3D } from "./editor3dContext";

interface TreeRowProps {
  data: Mobject3DTreeControlData;
  selectedIds: Set<string>;
}

function TreeRow({ data, selectedIds }: TreeRowProps) {
  const { refresh, log } = useEditor3D();
  const [renaming, setRenaming] = useState(false);
  const [draftName, setDraftName] = useState(data.name);

  const selected = selectedIds.has(data.id);
  const Icon = data.icon;

  const startRenaming = () => {
    setDraftName(data.name);
    setRenaming(true);
  };

  const commitRename = () => {
    setRenaming(false);

    const nextName = draftName.trim();

    if (!nextName || nextName === data.name) {
      setDraftName(data.name);
      return;
    }

    try {
      data.rename(nextName);
      log("info", `Renamed ${data.name} to ${nextName}`);
    } catch (error) {
      log("error", formatErrorMessage(error));
    }

    refresh();
  };

  const handleSelect = (event: MouseEvent) => {
    if (event.metaKey || event.ctrlKey || event.shiftKey) {
      data.multiselect();
      refresh({ record: false });
      return;
    }

    data.select();
  };

  return (
    <div
      className={cn(
        "group/row flex items-center gap-0.5 rounded-md pr-1 transition-colors",
        selected ? "bg-accent text-accent-foreground" : "hover:bg-accent/50",
      )}
      onClick={handleSelect}
    >
      <span className="flex size-4 shrink-0 items-center justify-center text-muted-foreground">
        <ChevronRight className="size-3 opacity-30" />
      </span>

      <Icon className="size-3.5 shrink-0 text-muted-foreground" />

      {renaming ? (
        <Input
          autoFocus
          value={draftName}
          onChange={(event) => setDraftName(event.target.value)}
          onClick={(event) => event.stopPropagation()}
          onBlur={commitRename}
          onKeyDown={(event) => {
            if (event.key === "Enter") commitRename();
            if (event.key === "Escape") {
              setDraftName(data.name);
              setRenaming(false);
            }
          }}
          className="my-0.5 h-6 rounded px-1.5 text-xs"
        />
      ) : (
        <button
          type="button"
          className={cn(
            "min-w-0 flex-1 truncate py-1 text-left text-xs",
            !data.visible && "text-muted-foreground line-through",
          )}
          onDoubleClick={(event) => {
            event.stopPropagation();
            startRenaming();
          }}
          title={data.name}
        >
          {data.name}
        </button>
      )}

      <div
        className={cn(
          "flex shrink-0 items-center gap-0.5 opacity-0 transition-opacity group-hover/row:opacity-100 focus-within:opacity-100",
          (selected || data.locked || !data.visible) && "opacity-100",
        )}
        onClick={(event) => event.stopPropagation()}
      >
        <Tooltip>
          <TooltipTrigger
            render={
              <Button
                variant="ghost"
                size="icon-xs"
                className="size-5 text-muted-foreground"
                onClick={() => {
                  data.toggleVisibility();
                  refresh();
                }}
              />
            }
          >
            {data.visible ? <Eye /> : <EyeOff />}
          </TooltipTrigger>
          <TooltipContent>
            {data.visible ? "Hide object" : "Show object"}
          </TooltipContent>
        </Tooltip>

        <Tooltip>
          <TooltipTrigger
            render={
              <Button
                variant="ghost"
                size="icon-xs"
                className="size-5 text-muted-foreground"
                onClick={() => {
                  data.toggleLocked();
                  refresh();
                }}
              />
            }
          >
            {data.locked ? <Lock /> : <LockOpen />}
          </TooltipTrigger>
          <TooltipContent>
            {data.locked ? "Unlock object" : "Lock object"}
          </TooltipContent>
        </Tooltip>

        <Tooltip>
          <TooltipTrigger
            render={
              <Button
                variant="ghost"
                size="icon-xs"
                className="size-5 text-muted-foreground hover:text-destructive"
                onClick={() => {
                  try {
                    data.delete();
                    log("info", `Deleted ${data.name}`);
                  } catch (error) {
                    log("error", formatErrorMessage(error));
                  }

                  refresh();
                }}
              />
            }
          >
            <Trash2 />
          </TooltipTrigger>
          <TooltipContent>Delete object</TooltipContent>
        </Tooltip>
      </div>
    </div>
  );
}

export function Scene3DTreePanel() {
  const { scene, refresh, log } = useEditor3D();

  const tree = Mobject3DUI.getMobjectTreeUIData(scene);
  const creationData = Mobject3DUI.getCreationUIData(scene);
  const selectedIds = new Set<string>();

  if (scene.selection.selectedMobject) {
    selectedIds.add(scene.selection.selectedMobject.id);
  }

  for (const mobject of scene.selection.editingSelection) {
    selectedIds.add(mobject.id);
  }

  const selectedMobject = scene.selection.selectedMobject;
  const multiSelection = [...scene.selection.editingSelection];

  const createMobject = (create: () => void) => {
    try {
      create();
    } catch (error) {
      log("error", formatErrorMessage(error));
    }

    refresh();
  };

  return (
    <div className="flex h-full min-h-0 flex-col">
      <PanelHeader title="Scene" icon={<Layers2 />}>
        <Badge variant="secondary" className="h-5">
          {tree.length}
        </Badge>
      </PanelHeader>

      <ScrollArea className="min-h-0 flex-1">
        <CollapsibleSection
          title="Create object"
          icon={<Plus className="size-3" />}
          defaultOpen
        >
          <div className="grid grid-cols-2 gap-1.5">
            {creationData.map((item) => {
              const Icon = item.icon;

              return (
                <Tooltip key={item.name}>
                  <TooltipTrigger
                    render={
                      <Button
                        variant="outline"
                        className="h-14 flex-col gap-1 rounded-lg px-1 text-[10px]"
                        onClick={() => createMobject(item.create)}
                      />
                    }
                  >
                    <Icon className="size-4" />
                    <span className="max-w-full truncate">{item.label}</span>
                  </TooltipTrigger>
                  <TooltipContent>{item.description}</TooltipContent>
                </Tooltip>
              );
            })}
          </div>
        </CollapsibleSection>

        <CollapsibleSection
          title={`Scene objects · ${tree.length}`}
          icon={<Layers2 className="size-3" />}
          defaultOpen
        >
          {tree.length === 0 ? (
            <div className="rounded-lg border border-dashed border-border/70 px-3 py-6 text-center text-xs text-muted-foreground">
              The scene is empty. Create a sphere or box above to get started.
            </div>
          ) : (
            <div className="space-y-0.5">
              {tree.map((node) => (
                <TreeRow
                  key={node.id}
                  data={node}
                  selectedIds={selectedIds}
                />
              ))}
            </div>
          )}

          <p className="pt-1 text-[10px] leading-relaxed text-muted-foreground/80">
            Click the canvas or a row to select. Ctrl/Cmd-click adds to the
            selection.
          </p>
        </CollapsibleSection>

        <CollapsibleSection
          title="Selection"
          icon={<Eye className="size-3" />}
          defaultOpen
        >
          {selectedMobject ? (
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <Badge variant="secondary" className="max-w-full truncate">
                  {selectedMobject.name}
                </Badge>
                <span className="truncate font-mono text-[10px] text-muted-foreground">
                  {selectedMobject.id}
                </span>
              </div>

              {multiSelection.length > 0 && (
                <p className="text-xs text-muted-foreground">
                  {multiSelection.length} additional object
                  {multiSelection.length === 1 ? "" : "s"} in the
                  multi-selection.
                </p>
              )}
            </div>
          ) : (
            <p className="text-xs text-muted-foreground">Nothing selected.</p>
          )}
        </CollapsibleSection>
      </ScrollArea>
    </div>
  );
}
