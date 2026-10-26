import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type PointerEvent as ReactPointerEvent,
} from "react";
import { Link } from "react-router-dom";
import {
  Boxes,
  Camera as CameraIcon,
  CircleQuestionMark,
  FileCode,
  FileX,
  FolderOpen,
  MonitorPlay,
  PanelBottomClose,
  PanelBottomOpen,
  PanelLeftClose,
  PanelLeftOpen,
  Redo2,
  Save,
  Settings,
  SlidersHorizontal,
  Terminal,
  Undo2,
  X,
  type LucideIcon,
} from "lucide-react";

import { cn } from "@/lib/utils";
import type { Scene3D } from "@/manim3d/scene3d";
import type { Mobject3D } from "@/manim3d/mobject/mobject3d";
import {
  applyScene3D,
  clearScene3D,
  serializeScene3D,
} from "@/manim3d/serialization/scene3dSerializer";
import Scene3DCanvas from "@/components/Scene3DCanvas";
import { Badge } from "@/components/ui/badge";
import { Button, buttonVariants } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { ConsolePanel } from "../editor/ConsolePanel";
import { isTypingTarget } from "../editor/editorActions";
import { KeyHint } from "../editor/editorPrimitives";
import { Scene3DTreePanel } from "./Scene3DTreePanel";
import { Inspector3DPanel } from "./Inspector3DPanel";
import { Camera3DPanel } from "./Camera3DPanel";
import {
  Editor3DContext,
  formatErrorMessage,
  useEditor3D,
  type ConsoleEntry,
  type ConsoleLevel,
  type RefreshOptions,
} from "./editor3dContext";
import {
  downloadScene3DFile,
  hasScene3DContent,
  readScene3DFile,
  scene3DNameFromFile,
} from "./scene3dFiles";
import { Scene3DHistory } from "./scene3dHistory";

type Editor3DView = "scene" | "inspector" | "camera";

interface ViewDefinition {
  id: Editor3DView;
  label: string;
  icon: LucideIcon;
  shortcut: string;
}

const views: ViewDefinition[] = [
  { id: "scene", label: "Scene", icon: Boxes, shortcut: "1" },
  {
    id: "inspector",
    label: "Inspector",
    icon: SlidersHorizontal,
    shortcut: "2",
  },
  { id: "camera", label: "Camera", icon: CameraIcon, shortcut: "3" },
];

const shortcuts: { keys: string[]; label: string }[] = [
  { keys: ["Ctrl", "S"], label: "Save the 3D scene as JSON" },
  { keys: ["Ctrl", "O"], label: "Open a 3D scene from JSON" },
  { keys: ["Ctrl", "Z"], label: "Undo the last change" },
  { keys: ["Ctrl", "Shift", "Z"], label: "Redo the last undone change" },
  {
    keys: ["Shift", "Click"],
    label: "Add or remove an object from the selection",
  },
  { keys: ["Del"], label: "Delete the current selection" },
  { keys: ["Esc"], label: "Clear the selection" },
  { keys: ["Ctrl", "B"], label: "Toggle the sidebar" },
  { keys: ["Ctrl", "J"], label: "Toggle the bottom panel" },
  { keys: ["1", "–", "3"], label: "Switch sidebar views" },
];

interface FileMenuItemProps {
  icon: LucideIcon;
  label: string;
  hint?: string;
  onSelect: () => void;
}

function FileMenuItem({ icon: Icon, label, hint, onSelect }: FileMenuItemProps) {
  return (
    <button
      type="button"
      className="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-xs transition-colors hover:bg-accent hover:text-accent-foreground focus-visible:bg-accent focus-visible:outline-none"
      onClick={onSelect}
    >
      <Icon className="size-3.5 shrink-0 text-muted-foreground" />
      <span className="flex-1 truncate">{label}</span>
      {hint && (
        <span className="shrink-0 font-mono text-[10px] text-muted-foreground">
          {hint}
        </span>
      )}
    </button>
  );
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

function getSelectedMobjects3D(scene: Scene3D): Mobject3D[] {
  const selected = new Set<Mobject3D>();

  if (scene.selection.selectedMobject) {
    selected.add(scene.selection.selectedMobject);
  }

  for (const mobject of scene.selection.editingSelection) {
    selected.add(mobject);
  }

  return [...selected];
}

function CanvasPane() {
  const { scene } = useEditor3D();
  const containerRef = useRef<HTMLDivElement>(null);
  const [size, setSize] = useState({ width: scene.width, height: scene.height });
  const selectedMobject = scene.selection.selectedMobject;
  const extraSelectionCount = scene.selection.editingSelection.size;
  const hasMobjects = scene.mobjectManager.all().length > 0;

  useEffect(() => {
    const element = containerRef.current;

    if (!element) return;

    const observer = new ResizeObserver((entries) => {
      const rect = entries[0]?.contentRect;

      if (!rect) return;

      setSize({
        width: Math.max(1, Math.floor(rect.width)),
        height: Math.max(1, Math.floor(rect.height)),
      });
    });

    observer.observe(element);

    return () => observer.disconnect();
  }, []);

  return (
    <div
      ref={containerRef}
      className="editor-canvas-grid relative min-h-0 flex-1 overflow-hidden"
    >
      <Scene3DCanvas />

      <div className="pointer-events-none absolute inset-x-0 top-0 flex items-start justify-between gap-2 p-2">
        {selectedMobject ? (
          <Badge
            variant="secondary"
            className="pointer-events-auto max-w-56 bg-background/80 backdrop-blur"
          >
            <Boxes />{" "}
            <span className="truncate">
              {selectedMobject.name}
              {extraSelectionCount > 0 ? ` +${extraSelectionCount}` : ""}
            </span>
          </Badge>
        ) : (
          <span />
        )}

        <Badge
          variant="outline"
          className="bg-background/80 font-mono tabular-nums backdrop-blur"
        >
          {size.width} × {size.height}
        </Badge>
      </div>

      {!hasMobjects && (
        <div className="pointer-events-none absolute inset-0 grid place-items-center p-6">
          <div className="max-w-xs text-center">
            <div className="mx-auto mb-3 flex size-12 items-center justify-center rounded-2xl border border-border/70 bg-background/70 text-muted-foreground shadow-sm backdrop-blur">
              <Boxes className="size-6" />
            </div>
            <p className="text-sm font-medium">The 3D canvas is empty</p>
            <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
              Create a sphere or box from the Scene panel, then inspect its
              transform, material and geometry.
            </p>
          </div>
        </div>
      )}

      <div className="pointer-events-none absolute right-2 bottom-2 flex items-center gap-1.5">
        <Badge
          variant="outline"
          className="bg-background/80 font-mono text-[10px] text-muted-foreground backdrop-blur"
        >
          +x right · +y up · +z forward
        </Badge>
      </div>
    </div>
  );
}

interface Editor3DShellProps {
  scene: Scene3D;
}

export function Editor3DShell({ scene }: Editor3DShellProps) {
  const [activeView, setActiveView] = useState<Editor3DView>("scene");
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [sidebarWidth, setSidebarWidth] = useState(304);
  const [bottomOpen, setBottomOpen] = useState(true);
  const [bottomHeight, setBottomHeight] = useState(232);
  const [helpOpen, setHelpOpen] = useState(false);
  const [sceneName, setSceneName] = useState("untitled.scene3d");
  const [fileMenuOpen, setFileMenuOpen] = useState(false);
  const [logs, setLogs] = useState<ConsoleEntry[]>([]);
  const [, setVersion] = useState(0);
  const [history] = useState(() => new Scene3DHistory(scene));

  const logId = useRef(0);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const suppressEngineLogs = useRef(false);

  const refresh = useCallback(
    (options?: RefreshOptions) => {
      if (options?.record === false) {
        history.rebase();
      } else {
        history.markChanged();
      }

      setVersion((version) => version + 1);
    },
    [history],
  );

  const log = useCallback((level: ConsoleLevel, message: string) => {
    logId.current += 1;

    const entry: ConsoleEntry = {
      id: logId.current,
      level,
      message,
      time: new Date(),
    };

    setLogs((previous) => {
      const next = [...previous, entry];

      return next.length > 250 ? next.slice(next.length - 250) : next;
    });
  }, []);

  const runHistory = useCallback(
    (direction: "undo" | "redo") => {
      suppressEngineLogs.current = true;

      let changed = false;
      let failed = false;

      try {
        changed = direction === "undo" ? history.undo() : history.redo();
      } catch (error) {
        failed = true;
        log("error", `Could not ${direction}: ${formatErrorMessage(error)}`);
      } finally {
        suppressEngineLogs.current = false;
      }

      if (failed) return;

      if (!changed) {
        log("info", `Nothing to ${direction}`);
        return;
      }

      refresh({ record: false });
      log(
        "success",
        direction === "undo"
          ? "Undid the last change"
          : "Redid the last undone change",
      );
    },
    [history, refresh, log],
  );

  const saveScene = useCallback(
    (name = sceneName) => {
      const targetName = name.trim() || "untitled.scene3d";

      try {
        const document = serializeScene3D(scene, targetName);

        downloadScene3DFile(document);
        setSceneName(targetName);
        setFileMenuOpen(false);
        log("success", `Saved ${targetName}`);
      } catch (error) {
        log("error", `Could not save scene: ${formatErrorMessage(error)}`);
      }
    },
    [scene, sceneName, log],
  );

  const openScene = useCallback(
    async (file: File) => {
      suppressEngineLogs.current = true;

      try {
        const document = await readScene3DFile(file);
        const summary = applyScene3D(scene, document);

        setSceneName(scene3DNameFromFile(file.name));
        setActiveView("scene");
        setFileMenuOpen(false);
        log(
          "success",
          `Opened ${file.name} · ${summary.mobjects} object${
            summary.mobjects === 1 ? "" : "s"
          }`,
        );
      } catch (error) {
        log("error", `Could not open scene: ${formatErrorMessage(error)}`);
      } finally {
        suppressEngineLogs.current = false;
        refresh();
        history.reset();
      }
    },
    [scene, log, refresh, history],
  );

  const closeCurrentScene = useCallback(() => {
    if (
      hasScene3DContent(scene) &&
      !window.confirm("Close this 3D scene? Unsaved changes will be lost.")
    ) {
      return;
    }

    suppressEngineLogs.current = true;
    clearScene3D(scene);
    suppressEngineLogs.current = false;

    setSceneName("untitled.scene3d");
    setFileMenuOpen(false);
    refresh();
    history.reset();
    log("info", "Closed the scene");
  }, [scene, log, refresh, history]);

  useEffect(() => {
    const connections = [
      scene.mobjectManager.onAdd.connect((mobject) => {
        refresh();
        if (!suppressEngineLogs.current) log("info", `Added ${mobject.name}`);
      }),
      scene.mobjectManager.onRemove.connect((mobject) => {
        refresh();
        if (!suppressEngineLogs.current) {
          log("info", `Removed ${mobject.name}`);
        }
      }),
      scene.mobjectManager.onTreeChanged.connect(() => refresh()),
      // Selection is not part of the scene document, so it must not create an
      // undo step. `record: false` only refreshes the history baseline.
      scene.selection.onSelectionChanged.connect(() =>
        refresh({ record: false }),
      ),
    ];

    return () => connections.forEach((connection) => connection.disconnect());
  }, [scene, refresh, log]);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (isTypingTarget(event.target)) return;

      const modifier = event.metaKey || event.ctrlKey;
      const key = event.key;

      if (modifier && key.toLowerCase() === "s") {
        event.preventDefault();
        saveScene();
        return;
      }

      if (modifier && key.toLowerCase() === "o") {
        event.preventDefault();
        fileInputRef.current?.click();
        return;
      }

      if (modifier && key.toLowerCase() === "z") {
        event.preventDefault();
        runHistory(event.shiftKey ? "redo" : "undo");
        return;
      }

      if (modifier && key.toLowerCase() === "b") {
        event.preventDefault();
        setSidebarOpen((open) => !open);
        return;
      }

      if (modifier && key.toLowerCase() === "j") {
        event.preventDefault();
        setBottomOpen((open) => !open);
        return;
      }

      if (modifier) return;

      if (key === "Escape") {
        scene.selection.clear();
        refresh({ record: false });
        return;
      }

      if (key === "Delete" || key === "Backspace") {
        event.preventDefault();

        const selected = getSelectedMobjects3D(scene);
        const removed = selected.map((mobject) => mobject.name);

        for (const mobject of selected) {
          scene.mobjectManager.delete(mobject);
        }

        scene.selection.clear();

        if (removed.length > 0) {
          log("info", `Deleted ${removed.join(", ")}`);
        }

        refresh();
        return;
      }

      if (key === "?") {
        setHelpOpen(true);
        return;
      }

      const view = views.find((item) => item.shortcut === key);

      if (view) {
        setActiveView(view.id);
        setSidebarOpen(true);
      }
    };

    window.addEventListener("keydown", handleKeyDown);

    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [scene, refresh, log, saveScene, runHistory]);

  const startSidebarResize = (event: ReactPointerEvent<HTMLDivElement>) => {
    event.preventDefault();

    const startX = event.clientX;
    const startWidth = sidebarWidth;

    const handleMove = (moveEvent: PointerEvent) => {
      setSidebarWidth(
        clamp(
          startWidth + moveEvent.clientX - startX,
          220,
          Math.min(560, window.innerWidth * 0.55),
        ),
      );
    };

    const handleUp = () => {
      document.body.style.cursor = "";
      window.removeEventListener("pointermove", handleMove);
      window.removeEventListener("pointerup", handleUp);
    };

    document.body.style.cursor = "col-resize";
    window.addEventListener("pointermove", handleMove);
    window.addEventListener("pointerup", handleUp);
  };

  const startBottomResize = (event: ReactPointerEvent<HTMLDivElement>) => {
    event.preventDefault();

    const startY = event.clientY;
    const startHeight = bottomHeight;

    const handleMove = (moveEvent: PointerEvent) => {
      setBottomHeight(
        clamp(
          startHeight + (startY - moveEvent.clientY),
          120,
          Math.min(560, window.innerHeight * 0.62),
        ),
      );
    };

    const handleUp = () => {
      document.body.style.cursor = "";
      window.removeEventListener("pointermove", handleMove);
      window.removeEventListener("pointerup", handleUp);
    };

    document.body.style.cursor = "row-resize";
    window.addEventListener("pointermove", handleMove);
    window.addEventListener("pointerup", handleUp);
  };

  const activeViewDefinition =
    views.find((view) => view.id === activeView) ?? views[0];

  const nodeCount = scene.mobjectManager.all().length;
  const selectedMobject = scene.selection.selectedMobject;
  const selectedCount = getSelectedMobjects3D(scene).length;

  const renderPanel = () => {
    switch (activeView) {
      case "scene":
        return <Scene3DTreePanel />;
      case "inspector":
        return <Inspector3DPanel />;
      case "camera":
        return <Camera3DPanel />;
      default:
        return null;
    }
  };

  return (
    <TooltipProvider delay={200}>
      <Editor3DContext.Provider value={{ scene, refresh, log }}>
        <div
          className="dark relative flex h-screen w-screen flex-col overflow-hidden bg-background text-foreground"
          style={{ colorScheme: "dark" }}
        >
          <header className="flex h-9 shrink-0 items-center gap-2 border-b border-border/70 bg-sidebar px-2 text-sidebar-foreground">
            <div className="flex items-center gap-2 pl-1">
              <Boxes className="size-4 text-primary" />
              <span className="text-xs font-semibold tracking-wide">
                manim-web
              </span>
              <Badge variant="outline" className="h-4 text-[9px]">
                3D studio
              </Badge>
            </div>

            <Popover open={fileMenuOpen} onOpenChange={setFileMenuOpen}>
              <PopoverTrigger
                render={
                  <Button
                    variant="ghost"
                    size="xs"
                    className="text-muted-foreground"
                  />
                }
              >
                <FileCode /> File
              </PopoverTrigger>
              <PopoverContent align="start" className="w-56 gap-0.5 p-1">
                <FileMenuItem
                  icon={Save}
                  label="Save 3D scene"
                  hint="Ctrl S"
                  onSelect={() => saveScene()}
                />
                <FileMenuItem
                  icon={FolderOpen}
                  label="Open 3D scene…"
                  hint="Ctrl O"
                  onSelect={() => {
                    setFileMenuOpen(false);
                    fileInputRef.current?.click();
                  }}
                />
                <Separator className="my-1" />
                <FileMenuItem
                  icon={Undo2}
                  label="Undo"
                  hint="Ctrl Z"
                  onSelect={() => {
                    setFileMenuOpen(false);
                    runHistory("undo");
                  }}
                />
                <FileMenuItem
                  icon={Redo2}
                  label="Redo"
                  hint="Ctrl Shift Z"
                  onSelect={() => {
                    setFileMenuOpen(false);
                    runHistory("redo");
                  }}
                />
                <Separator className="my-1" />
                <FileMenuItem
                  icon={FileX}
                  label="Close scene"
                  onSelect={closeCurrentScene}
                />
              </PopoverContent>
            </Popover>

            <input
              ref={fileInputRef}
              type="file"
              accept=".json,application/json"
              className="hidden"
              onChange={(event) => {
                const file = event.target.files?.[0];

                event.target.value = "";

                if (file) void openScene(file);
              }}
            />

            <div className="flex min-w-0 flex-1 items-center justify-center gap-1.5 text-[11px] text-muted-foreground">
              <FileCode className="size-3.5 shrink-0" />
              <span className="truncate">3D scene — {sceneName}</span>
              <span className="text-muted-foreground/50">·</span>
              <span className="truncate">{activeViewDefinition.label}</span>
            </div>

            <div className="flex items-center gap-0.5">
              <Link
                to="/scene"
                className={cn(
                  buttonVariants({ variant: "ghost", size: "xs" }),
                  "text-muted-foreground",
                )}
              >
                <Boxes /> 2D scene
              </Link>
              <Link
                to="/playground"
                className={cn(
                  buttonVariants({ variant: "ghost", size: "xs" }),
                  "text-muted-foreground",
                )}
              >
                <MonitorPlay /> Playground
              </Link>
              <Link
                to="/values"
                className={cn(
                  buttonVariants({ variant: "ghost", size: "xs" }),
                  "text-muted-foreground",
                )}
              >
                <Settings /> Value lab
              </Link>

              <Tooltip>
                <TooltipTrigger
                  render={
                    <Button
                      variant="ghost"
                      size="icon-sm"
                      className="text-muted-foreground"
                      onClick={() => setHelpOpen(true)}
                    />
                  }
                >
                  <CircleQuestionMark />
                </TooltipTrigger>
                <TooltipContent>Keyboard shortcuts</TooltipContent>
              </Tooltip>
            </div>
          </header>

          <div className="flex min-h-0 flex-1">
            <nav
              aria-label="3D editor views"
              className="flex w-12 shrink-0 flex-col items-center gap-1 border-r border-border/70 bg-sidebar py-2"
            >
              {views.map((view) => {
                const Icon = view.icon;
                const active = sidebarOpen && activeView === view.id;

                return (
                  <Tooltip key={view.id}>
                    <TooltipTrigger
                      render={
                        <Button
                          variant={active ? "secondary" : "ghost"}
                          size="icon-sm"
                          className={cn(
                            "relative rounded-lg",
                            !active && "text-muted-foreground",
                          )}
                          onClick={() => {
                            setActiveView(view.id);
                            setSidebarOpen(true);
                          }}
                        />
                      }
                    >
                      {active && (
                        <span className="absolute top-1/2 -left-1.5 h-4 w-0.5 -translate-y-1/2 rounded-full bg-primary" />
                      )}
                      <Icon />
                    </TooltipTrigger>
                    <TooltipContent side="right">
                      <span>{view.label}</span>
                      <KeyHint>{view.shortcut}</KeyHint>
                    </TooltipContent>
                  </Tooltip>
                );
              })}

              <div className="mt-auto flex flex-col items-center gap-1">
                <Tooltip>
                  <TooltipTrigger
                    render={
                      <Button
                        render={<Link to="/scene" />}
                        nativeButton={false}
                        variant="ghost"
                        size="icon-sm"
                        className="text-muted-foreground"
                      />
                    }
                  >
                    <Boxes />
                  </TooltipTrigger>
                  <TooltipContent side="right">
                    Open the 2D scene editor
                  </TooltipContent>
                </Tooltip>

                <Tooltip>
                  <TooltipTrigger
                    render={
                      <Button
                        render={<Link to="/values" />}
                        nativeButton={false}
                        variant="ghost"
                        size="icon-sm"
                        className="text-muted-foreground"
                      />
                    }
                  >
                    <Settings />
                  </TooltipTrigger>
                  <TooltipContent side="right">Open the value lab</TooltipContent>
                </Tooltip>
              </div>
            </nav>

            {sidebarOpen && (
              <>
                <aside
                  className="flex shrink-0 flex-col overflow-hidden border-r border-border/70 bg-sidebar"
                  style={{ width: sidebarWidth }}
                >
                  <div className="min-h-0 flex-1 overflow-hidden">
                    {renderPanel()}
                  </div>
                </aside>

                <div
                  role="separator"
                  aria-orientation="vertical"
                  aria-label="Resize sidebar"
                  className="w-1 shrink-0 cursor-col-resize bg-border/40 transition-colors hover:bg-primary/50"
                  onPointerDown={startSidebarResize}
                />
              </>
            )}

            <main className="flex min-w-0 flex-1 flex-col">
              <div className="flex h-9 shrink-0 items-center gap-1 border-b border-border/70 bg-background px-2">
                <Tooltip>
                  <TooltipTrigger
                    render={
                      <Button
                        variant="ghost"
                        size="icon-xs"
                        className="text-muted-foreground"
                        onClick={() => setSidebarOpen((open) => !open)}
                      />
                    }
                  >
                    {sidebarOpen ? <PanelLeftClose /> : <PanelLeftOpen />}
                  </TooltipTrigger>
                  <TooltipContent>
                    {sidebarOpen ? "Hide sidebar" : "Show sidebar"}
                  </TooltipContent>
                </Tooltip>

                <Separator orientation="vertical" className="mx-1 h-4" />

                <div className="flex h-full items-center gap-1.5 border-x border-border/60 bg-muted/30 px-3 text-xs">
                  <Boxes className="size-3.5 text-primary" />
                  <span>3D scene</span>
                  <Badge variant="outline" className="h-4 text-[9px]">
                    editor
                  </Badge>
                </div>

                <div className="ml-auto flex items-center gap-0.5">
                  <Tooltip>
                    <TooltipTrigger
                      render={
                        <Button
                          variant="ghost"
                          size="icon-xs"
                          className="text-muted-foreground"
                          onClick={() => setBottomOpen((open) => !open)}
                        />
                      }
                    >
                      {bottomOpen ? <PanelBottomClose /> : <PanelBottomOpen />}
                    </TooltipTrigger>
                    <TooltipContent>
                      {bottomOpen ? "Hide panel" : "Show panel"}
                    </TooltipContent>
                  </Tooltip>
                </div>
              </div>

              <div className="flex min-h-0 flex-1 flex-col">
                <CanvasPane />

                {bottomOpen && (
                  <>
                    <div
                      role="separator"
                      aria-orientation="horizontal"
                      aria-label="Resize bottom panel"
                      className="h-1 shrink-0 cursor-row-resize bg-border/40 transition-colors hover:bg-primary/50"
                      onPointerDown={startBottomResize}
                    />

                    <section
                      className="flex shrink-0 flex-col overflow-hidden border-t border-border/60 bg-sidebar"
                      style={{ height: bottomHeight }}
                    >
                      <Tabs
                        value="console"
                        className="flex h-full min-h-0 flex-col gap-0"
                      >
                        <div className="flex h-9 shrink-0 items-center gap-1 border-b border-border/60 px-2">
                          <TabsList
                            variant="line"
                            className="h-full gap-0 p-0"
                          >
                            <TabsTrigger
                              value="console"
                              className="h-full rounded-none px-3"
                            >
                              <Terminal /> Console
                              {logs.length > 0 && (
                                <Badge
                                  variant="secondary"
                                  className="ml-1 h-4 px-1 text-[9px]"
                                >
                                  {logs.length}
                                </Badge>
                              )}
                            </TabsTrigger>
                          </TabsList>

                          <div className="ml-auto flex items-center gap-0.5">
                            <Tooltip>
                              <TooltipTrigger
                                render={
                                  <Button
                                    variant="ghost"
                                    size="icon-xs"
                                    className="text-muted-foreground"
                                    onClick={() => setBottomOpen(false)}
                                  />
                                }
                              >
                                <PanelBottomClose />
                              </TooltipTrigger>
                              <TooltipContent>Close panel</TooltipContent>
                            </Tooltip>
                          </div>
                        </div>

                        <TabsContent
                          value="console"
                          className="min-h-0 flex-1 overflow-hidden"
                        >
                          <ConsolePanel
                            entries={logs}
                            onClear={() => setLogs([])}
                          />
                        </TabsContent>
                      </Tabs>
                    </section>
                  </>
                )}
              </div>
            </main>
          </div>

          <footer className="flex h-6 shrink-0 items-center gap-2 border-t border-border/70 bg-sidebar px-2 text-[10px] text-muted-foreground">
            <span className="flex items-center gap-1">
              <Boxes className="size-3" /> {nodeCount} object
              {nodeCount === 1 ? "" : "s"}
            </span>
            <Separator orientation="vertical" className="h-3" />
            <span className="flex items-center gap-1">
              <CameraIcon className="size-3" />{" "}
              {scene.camera.camera.fov.toFixed(0)}° fov
            </span>
            <Separator orientation="vertical" className="h-3" />
            <span className="max-w-52 truncate">
              {selectedMobject
                ? `Selected: ${selectedMobject.name}${
                    selectedCount > 1 ? ` +${selectedCount - 1}` : ""
                  }`
                : selectedCount > 0
                  ? `${selectedCount} selected`
                  : "No selection"}
            </span>

            <span className="ml-auto flex items-center gap-3">
              <span className="hidden sm:inline">
                {activeViewDefinition.label} view
              </span>
              <span className="hidden md:inline">
                Double-click a scene name to rename
              </span>
              <span className="flex items-center gap-1">
                <span className="size-1.5 rounded-full bg-chart-2" />
                WebGL
              </span>
            </span>
          </footer>

          {helpOpen && (
            <div
              className="absolute inset-0 z-50 grid place-items-center bg-background/70 p-4 backdrop-blur-sm"
              onClick={() => setHelpOpen(false)}
            >
              <div
                className="w-full max-w-md rounded-2xl border border-border bg-popover p-4 text-popover-foreground shadow-2xl"
                onClick={(event) => event.stopPropagation()}
              >
                <div className="flex items-start justify-between gap-2 pb-3">
                  <div>
                    <p className="text-sm font-medium">3D keyboard shortcuts</p>
                    <p className="text-xs text-muted-foreground">
                      Work faster without leaving the canvas.
                    </p>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon-xs"
                    onClick={() => setHelpOpen(false)}
                  >
                    <X />
                  </Button>
                </div>

                <div className="space-y-1">
                  {shortcuts.map((shortcut) => (
                    <div
                      key={shortcut.label}
                      className="flex items-center justify-between gap-2 rounded-md px-1 py-1 text-xs hover:bg-accent/40"
                    >
                      <span className="text-muted-foreground">
                        {shortcut.label}
                      </span>
                      <span className="flex shrink-0 items-center gap-1">
                        {shortcut.keys.map((key) => (
                          <KeyHint key={key}>{key}</KeyHint>
                        ))}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>
      </Editor3DContext.Provider>
    </TooltipProvider>
  );
}
