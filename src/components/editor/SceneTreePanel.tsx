import { useMemo, useState, type MouseEvent } from "react";
import {
  ArrowDown,
  ArrowUp,
  ChevronRight,
  ChevronsDown,
  ChevronsUp,
  Ellipsis,
  Eye,
  EyeOff,
  Group as GroupIcon,
  Layers2,
  Lock,
  LockOpen,
  Plus,
  Trash2,
  Ungroup,
} from "lucide-react";

import { cn } from "@/lib/utils";
import { Group } from "@/manim/mobject/group";
import {
  MobjectUI,
  type MobjectTreeControlData,
} from "@/manim/UI/mobjectUI";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { CollapsibleSection } from "./CollapsibleSection";
import { PanelHeader } from "./editorPrimitives";
import { formatErrorMessage, useEditor } from "./editorContext";
import { deleteSelection, getSelectedMobjectIds } from "./editorActions";

function collectGroupNodes(
  nodes: MobjectTreeControlData[],
): MobjectTreeControlData[] {
  return nodes.flatMap((node) => [
    ...(node.isGroup ? [node] : []),
    ...collectGroupNodes(node.children),
  ]);
}

function collectNodeIds(nodes: MobjectTreeControlData[]): Set<string> {
  const ids = new Set<string>();

  const visit = (node: MobjectTreeControlData) => {
    ids.add(node.id);
    node.children.forEach(visit);
  };

  nodes.forEach(visit);

  return ids;
}

interface TreeRowProps {
  data: MobjectTreeControlData;
  depth: number;
  selectedIds: Set<string>;
  groups: MobjectTreeControlData[];
}

function TreeRow({ data, depth, selectedIds, groups }: TreeRowProps) {
  const { scene, refresh, log } = useEditor();
  const [expanded, setExpanded] = useState(true);
  const [menuOpen, setMenuOpen] = useState(false);
  const [renaming, setRenaming] = useState(false);
  const [draftName, setDraftName] = useState(data.name);

  const selected = selectedIds.has(data.id);
  const Icon = data.icon;
  const descendantIds = useMemo(() => collectNodeIds(data.children), [data]);

  const groupTargets = groups.filter(
    (group) => group.id !== data.id && !descendantIds.has(group.id),
  );

  const startRenaming = () => {
    setDraftName(data.name);
    setRenaming(true);
    setMenuOpen(false);
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

  const handleDelete = () => {
    setMenuOpen(false);

    try {
      if (!selected) {
        data.select();
      }

      const removed = deleteSelection(scene);
      if (removed.length > 0) {
        log("info", `Deleted ${removed.join(", ")}`);
      }
    } catch (error) {
      log("error", formatErrorMessage(error));
    }

    refresh();
  };

  const runAction = (action: () => void, message?: string) => {
    try {
      action();
      if (message) log("info", message);
    } catch (error) {
      log("error", formatErrorMessage(error));
    }

    setMenuOpen(false);
    refresh();
  };

  return (
    <div>
      <div
        className={cn(
          "group/row flex items-center gap-0.5 rounded-md pr-1 transition-colors",
          selected ? "bg-accent text-accent-foreground" : "hover:bg-accent/50",
        )}
        style={{ paddingLeft: `${4 + depth * 14}px` }}
        onClick={handleSelect}
      >
        <button
          type="button"
          className="flex size-4 shrink-0 items-center justify-center text-muted-foreground"
          onClick={(event) => {
            event.stopPropagation();
            setExpanded((value) => !value);
          }}
          aria-label={expanded ? "Collapse group" : "Expand group"}
        >
          {data.hasChildren ? (
            <ChevronRight
              className={cn("size-3 transition-transform", expanded && "rotate-90")}
            />
          ) : (
            <span className="size-3" />
          )}
        </button>

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
                  onClick={() => data.toggleVisibility()}
                />
              }
            >
              {data.visible ? <Eye /> : <EyeOff />}
            </TooltipTrigger>
            <TooltipContent>
              {data.visible ? "Hide mobject" : "Show mobject"}
            </TooltipContent>
          </Tooltip>

          <Tooltip>
            <TooltipTrigger
              render={
                <Button
                  variant="ghost"
                  size="icon-xs"
                  className="size-5 text-muted-foreground"
                  onClick={() => data.toggleLocked()}
                />
              }
            >
              {data.locked ? <Lock /> : <LockOpen />}
            </TooltipTrigger>
            <TooltipContent>
              {data.locked ? "Unlock mobject" : "Lock mobject"}
            </TooltipContent>
          </Tooltip>

          <Popover open={menuOpen} onOpenChange={setMenuOpen}>
            <PopoverTrigger
              render={
                <Button
                  variant="ghost"
                  size="icon-xs"
                  className="size-5 text-muted-foreground"
                />
              }
            >
              <Ellipsis />
            </PopoverTrigger>

            <PopoverContent
              align="end"
              className="w-52 gap-0.5 p-1"
              onClick={(event) => event.stopPropagation()}
            >
              <div className="px-2 py-1.5 text-[10px] font-semibold tracking-wider text-muted-foreground uppercase">
                Arrange
              </div>
              <Button
                variant="ghost"
                size="xs"
                className="w-full justify-start"
                onClick={() =>
                  runAction(data.bringToFront, `Brought ${data.name} to front`)
                }
              >
                <ChevronsUp /> Bring to front
              </Button>
              <Button
                variant="ghost"
                size="xs"
                className="w-full justify-start"
                onClick={() =>
                  runAction(data.bringForward, `Moved ${data.name} forward`)
                }
              >
                <ArrowUp /> Bring forward
              </Button>
              <Button
                variant="ghost"
                size="xs"
                className="w-full justify-start"
                onClick={() =>
                  runAction(data.sendBackward, `Moved ${data.name} backward`)
                }
              >
                <ArrowDown /> Send backward
              </Button>
              <Button
                variant="ghost"
                size="xs"
                className="w-full justify-start"
                onClick={() =>
                  runAction(data.sendToBack, `Sent ${data.name} to back`)
                }
              >
                <ChevronsDown /> Send to back
              </Button>

              <div className="my-1 h-px bg-border/60" />

              <Button
                variant="ghost"
                size="xs"
                className="w-full justify-start"
                onClick={startRenaming}
              >
                Rename
              </Button>

              {groupTargets.length > 0 && (
                <>
                  <div className="px-2 pt-1.5 pb-1 text-[10px] font-semibold tracking-wider text-muted-foreground uppercase">
                    Move into group
                  </div>
                  {groupTargets.map((group) => (
                    <Button
                      key={group.id}
                      variant="ghost"
                      size="xs"
                      className="w-full justify-start"
                      onClick={() =>
                        runAction(
                          () => data.addtoGroup(group.id),
                          `Moved ${data.name} into ${group.name}`,
                        )
                      }
                    >
                      <Layers2 /> {group.name}
                    </Button>
                  ))}
                </>
              )}

              <div className="my-1 h-px bg-border/60" />

              <Button
                variant="ghost"
                size="xs"
                className="w-full justify-start text-destructive hover:text-destructive"
                onClick={handleDelete}
              >
                <Trash2 /> Delete
              </Button>
            </PopoverContent>
          </Popover>
        </div>
      </div>

      {expanded && data.hasChildren && (
        <div className="relative">
          <div
            className="pointer-events-none absolute inset-y-0 w-px bg-border/50"
            style={{ left: `${13 + depth * 14}px` }}
          />
          {data.children.map((child) => (
            <TreeRow
              key={child.id}
              data={child}
              depth={depth + 1}
              selectedIds={selectedIds}
              groups={groups}
            />
          ))}
        </div>
      )}
    </div>
  );
}

export function SceneTreePanel() {
  const { scene, refresh, log } = useEditor();

  const tree = MobjectUI.getMobjectTreeUIData(scene);
  const creationData = MobjectUI.getMobjectCreationUIData(scene);
  const selectedIds = getSelectedMobjectIds(scene);
  const groups = collectGroupNodes(tree);

  const totalMobjects = scene.mobjectManager.tree.nodes.size;
  const selectedMobject = scene.selection.selectedMobject;
  const multiSelection = [...scene.selection.editingSelection];

  const createMobject = (create: (position?: { x: number; y: number }) => void) => {
    try {
      create({ x: 0, y: 0 });
    } catch (error) {
      log("error", formatErrorMessage(error));
    }

    refresh();
  };

  const groupSelection = () => {
    try {
      scene.selection.groupSelected();
    } catch (error) {
      log("error", formatErrorMessage(error));
    }

    refresh();
  };

  const ungroupSelection = () => {
    try {
      scene.selection.ungroupSelected();
    } catch (error) {
      log("error", formatErrorMessage(error));
    }

    refresh();
  };

  return (
    <div className="flex h-full min-h-0 flex-col">
      <PanelHeader title="Scene" icon={<Layers2 />}>
        <Tooltip>
          <TooltipTrigger
            render={
              <Button
                variant="ghost"
                size="icon-xs"
                className="text-muted-foreground"
                onClick={groupSelection}
                disabled={multiSelection.length < 1}
              />
            }
          >
            <GroupIcon />
          </TooltipTrigger>
          <TooltipContent>Group selected mobjects</TooltipContent>
        </Tooltip>

        <Tooltip>
          <TooltipTrigger
            render={
              <Button
                variant="ghost"
                size="icon-xs"
                className="text-muted-foreground"
                onClick={ungroupSelection}
                disabled={!(selectedMobject instanceof Group)}
              />
            }
          >
            <Ungroup />
          </TooltipTrigger>
          <TooltipContent>Ungroup selected group</TooltipContent>
        </Tooltip>

        <Tooltip>
          <TooltipTrigger
            render={
              <Button
                variant="ghost"
                size="icon-xs"
                className="text-muted-foreground hover:text-destructive"
                onClick={() => {
                  try {
                    const removed = deleteSelection(scene);

                    if (removed.length > 0) {
                      log("info", `Deleted ${removed.join(", ")}`);
                    }
                  } catch (error) {
                    log("error", formatErrorMessage(error));
                  }

                  refresh();
                }}
                disabled={!selectedMobject && multiSelection.length === 0}
              />
            }
          >
            <Trash2 />
          </TooltipTrigger>
          <TooltipContent>Delete selection</TooltipContent>
        </Tooltip>
      </PanelHeader>

      <ScrollArea className="min-h-0 flex-1">
        <CollapsibleSection
          title="Create mobject"
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
                    <span className="max-w-full truncate">{item.name}</span>
                  </TooltipTrigger>
                  <TooltipContent>Add {item.name} to the scene</TooltipContent>
                </Tooltip>
              );
            })}
          </div>
        </CollapsibleSection>

        <CollapsibleSection
          title={`Scene tree · ${totalMobjects}`}
          icon={<Layers2 className="size-3" />}
          defaultOpen
        >
          {tree.length === 0 ? (
            <div className="rounded-lg border border-dashed border-border/70 px-3 py-6 text-center text-xs text-muted-foreground">
              The scene is empty. Create a mobject above to get started.
            </div>
          ) : (
            <div className="space-y-0.5">
              {tree.map((node) => (
                <TreeRow
                  key={node.id}
                  data={node}
                  depth={0}
                  selectedIds={selectedIds}
                  groups={groups}
                />
              ))}
            </div>
          )}

          <p className="pt-1 text-[10px] leading-relaxed text-muted-foreground/80">
            Top of the list renders first (back layer). Ctrl/Cmd-click to
            multi-select.
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
                  {multiSelection.length} additional mobject
                  {multiSelection.length === 1 ? "" : "s"} in the
                  multi-selection.
                </p>
              )}
            </div>
          ) : (
            <p className="text-xs text-muted-foreground">Nothing selected.</p>
          )}

          {multiSelection.length >= 1 && (
            <Button
              variant="outline"
              size="sm"
              className="w-full"
              onClick={groupSelection}
            >
              <GroupIcon /> Group {multiSelection.length + 1} mobjects
            </Button>
          )}

          {selectedMobject instanceof Group && (
            <Button
              variant="outline"
              size="sm"
              className="w-full"
              onClick={ungroupSelection}
            >
              Ungroup {selectedMobject.name}
            </Button>
          )}
        </CollapsibleSection>
      </ScrollArea>
    </div>
  );
}
