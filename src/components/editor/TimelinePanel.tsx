import {
  useEffect,
  useState,
  type PointerEvent as ReactPointerEvent,
} from "react";
import {
  Clock,
  Film,
  Pause,
  Play,
  RotateCcw,
  SkipBack,
  Square,
  Trash2,
} from "lucide-react";

import { AnimationUI } from "@/manim/UI/animationUI";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Empty, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from "@/components/ui/empty";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { useEditor } from "./editorContext";

function formatTime(seconds: number): string {
  return `${seconds.toFixed(2)}s`;
}

export function TimelinePanel() {
  const { scene, refresh, log } = useEditor();
  const system = scene.animationSystem;

  const [time, setTime] = useState(system.currentTime);
  const [playing, setPlaying] = useState(system.playing);

  useEffect(() => {
    let frame = 0;

    const update = () => {
      setTime((current) =>
        current === system.currentTime ? current : system.currentTime,
      );
      setPlaying(system.playing);
      frame = requestAnimationFrame(update);
    };

    frame = requestAnimationFrame(update);

    return () => cancelAnimationFrame(frame);
  }, [system]);

  // Playback/scrubbing moves the playhead and re-derives animated property
  // values, but it is not an authored edit, so keep it out of undo history.
  // Rebasing when playback stops keeps the history baseline in sync with the
  // state the user sees before their next edit.
  useEffect(() => {
    refresh({ record: false });
  }, [playing, refresh]);

  const timeline = AnimationUI.getTimelineData(scene);
  const { animations, totalDuration } = timeline;
  const hasAnimations = animations.length > 0;

  const startBarDrag = (
    event: ReactPointerEvent<HTMLDivElement>,
    moveStart: (start: number) => void,
  ) => {
    event.preventDefault();
    event.stopPropagation();

    const track = event.currentTarget.parentElement;

    if (!track || totalDuration <= 0) return;

    const rect = track.getBoundingClientRect();
    const grabOffset =
      event.clientX - event.currentTarget.getBoundingClientRect().left;

    const onMove = (moveEvent: PointerEvent) => {
      if (rect.width <= 0) return;

      const nextStart =
        ((moveEvent.clientX - rect.left - grabOffset) / rect.width) *
        totalDuration;

      moveStart(Math.max(0, Math.round(nextStart * 100) / 100));
      refresh();
    };

    const onUp = () => {
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
    };

    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp);
  };

  const seekTo = (clientX: number, element: HTMLElement) => {
    if (totalDuration <= 0) return;

    const rect = element.getBoundingClientRect();
    const ratio = Math.min(
      1,
      Math.max(0, (clientX - rect.left) / rect.width),
    );

    system.setCurrentTime(ratio * totalDuration);
    setTime(system.currentTime);
    refresh({ record: false });
  };

  const progress = totalDuration > 0 ? Math.min(time / totalDuration, 1) : 0;

  return (
    <div className="flex h-full min-h-0 flex-col">
      <div className="flex h-10 shrink-0 items-center gap-2 border-b border-border/60 px-2">
        <Button
          variant="ghost"
          size="icon-sm"
          className="text-muted-foreground"
          onClick={() => {
            timeline.stop();
            refresh({ record: false });
          }}
          disabled={!hasAnimations}
        >
          <SkipBack />
        </Button>

        <Button
          size="icon-sm"
          className="rounded-full"
          onClick={() => {
            if (system.playing) {
              timeline.pause();
            } else {
              if (system.currentTime >= totalDuration) {
                system.setCurrentTime(0);
              }
              timeline.play();
            }
            refresh({ record: false });
          }}
          disabled={!hasAnimations}
        >
          {playing ? <Pause /> : <Play />}
        </Button>

        <Tooltip>
          <TooltipTrigger
            render={
              <Button
                variant="ghost"
                size="icon-sm"
                className="text-muted-foreground"
                onClick={() => {
                  timeline.play(true);
                  refresh({ record: false });
                }}
                disabled={!hasAnimations}
              />
            }
          >
            <RotateCcw />
          </TooltipTrigger>
          <TooltipContent>Play reverse</TooltipContent>
        </Tooltip>

        <Tooltip>
          <TooltipTrigger
            render={
              <Button
                variant="ghost"
                size="icon-sm"
                className="text-muted-foreground"
                onClick={() => {
                  timeline.stop();
                  refresh({ record: false });
                }}
                disabled={!hasAnimations}
              />
            }
          >
            <Square />
          </TooltipTrigger>
          <TooltipContent>Stop</TooltipContent>
        </Tooltip>

        <div className="mx-1 h-4 w-px bg-border" />

        <Badge variant="outline" className="h-6 font-mono tabular-nums">
          {formatTime(time)} / {formatTime(totalDuration)}
        </Badge>

        <input
          type="range"
          aria-label="Timeline position"
          min={0}
          max={Math.max(totalDuration, 0.01)}
          step={0.01}
          value={Math.min(time, Math.max(totalDuration, 0.01))}
          onChange={(event) => {
            system.setCurrentTime(Number(event.target.value));
            setTime(system.currentTime);
            refresh({ record: false });
          }}
          disabled={!hasAnimations}
          className="h-1.5 min-w-24 flex-1 cursor-pointer accent-primary disabled:cursor-not-allowed disabled:opacity-50"
        />

        <span className="ml-1 hidden text-[10px] text-muted-foreground sm:inline">
          {animations.length} animation{animations.length === 1 ? "" : "s"}
        </span>
      </div>

      <div className="min-h-0 flex-1 overflow-auto">
        {!hasAnimations ? (
          <div className="flex h-full items-center justify-center p-4">
            <Empty>
              <EmptyHeader>
                <EmptyMedia variant="icon">
                  <Film />
                </EmptyMedia>
                <EmptyTitle>Timeline is empty</EmptyTitle>
                <EmptyDescription>
                  Add an animation from the Animations panel, then arrange the
                  clips here.
                </EmptyDescription>
              </EmptyHeader>
            </Empty>
          </div>
        ) : (
          <div className="min-w-[480px] p-2">
            <div className="flex items-center gap-2 pb-1">
              <div className="w-48 shrink-0 text-[10px] font-semibold tracking-wider text-muted-foreground uppercase">
                Clips
              </div>
              <div className="relative h-5 flex-1">
                {[0, 0.25, 0.5, 0.75, 1].map((ratio) => (
                  <span
                    key={ratio}
                    className="absolute -translate-x-1/2 text-[10px] text-muted-foreground tabular-nums first:translate-x-0 last:-translate-x-full"
                    style={{ left: `${ratio * 100}%` }}
                  >
                    {formatTime(totalDuration * ratio)}
                  </span>
                ))}
              </div>
              <div className="w-7 shrink-0" />
            </div>

            <div className="space-y-1">
              {animations.map((animation) => {
                const Icon = animation.icon;
                const left =
                  totalDuration > 0
                    ? (animation.start / totalDuration) * 100
                    : 0;
                const width =
                  totalDuration > 0
                    ? Math.max((animation.duration / totalDuration) * 100, 1.5)
                    : 100;

                return (
                  <div
                    key={animation.id}
                    className="group/timeline-row flex items-center gap-2 rounded-md px-1 py-1 hover:bg-accent/30"
                  >
                    <div className="flex w-48 shrink-0 items-center gap-1.5 overflow-hidden">
                      <Icon className="size-3.5 shrink-0 text-muted-foreground" />
                      <div className="min-w-0 flex-1">
                        <div className="truncate text-[11px]">
                          {animation.target.name}
                        </div>
                        <div className="truncate text-[10px] text-muted-foreground">
                          {animation.targetType === "tracker"
                            ? `tracker · ${animation.name}`
                            : animation.name}
                        </div>
                      </div>
                    </div>

                    <div
                      className="relative h-7 flex-1 cursor-crosshair overflow-hidden rounded bg-muted/40"
                      onClick={(event) => {
                        if (event.target === event.currentTarget) {
                          seekTo(event.clientX, event.currentTarget);
                        }
                      }}
                    >
                      {[0.25, 0.5, 0.75].map((ratio) => (
                        <span
                          key={ratio}
                          className="pointer-events-none absolute inset-y-0 w-px bg-border/40"
                          style={{ left: `${ratio * 100}%` }}
                        />
                      ))}

                      <div
                        role="slider"
                        tabIndex={0}
                        aria-label={`${animation.name} start time`}
                        aria-valuemin={0}
                        aria-valuemax={totalDuration}
                        aria-valuenow={animation.start}
                        title={`${animation.name} · ${formatTime(
                          animation.start,
                        )} → ${formatTime(animation.end)}`}
                        className="absolute inset-y-1 flex min-w-1.5 cursor-grab items-center overflow-hidden rounded bg-primary/75 px-1 text-[9px] font-medium text-primary-foreground shadow-sm transition-colors hover:bg-primary active:cursor-grabbing"
                        style={{ left: `${left}%`, width: `${width}%` }}
                        onClick={(event) => event.stopPropagation()}
                        onPointerDown={(event) =>
                          startBarDrag(event, animation.moveStart)
                        }
                      >
                        <span className="truncate">{animation.name}</span>
                      </div>

                      <span
                        className="pointer-events-none absolute inset-y-0 z-10 w-px bg-foreground/70"
                        style={{ left: `${progress * 100}%` }}
                      />
                    </div>

                    <Button
                      variant="ghost"
                      size="icon-xs"
                      className="w-7 shrink-0 text-muted-foreground opacity-0 group-hover/timeline-row:opacity-100 hover:text-destructive"
                      onClick={() => {
                        try {
                          animation.remove();
                        } catch (error) {
                          log("error", String(error));
                        }
                        refresh();
                      }}
                    >
                      <Trash2 />
                    </Button>
                  </div>
                );
              })}
            </div>

            <div className="flex items-center gap-1.5 pt-2 text-[10px] text-muted-foreground">
              <Clock className="size-3" />
              Drag a clip to change its start time. Click the track to scrub.
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
