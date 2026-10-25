import { EditorShell } from "../components/editor/EditorShell";
import { useManim } from "../context/manimContext";

export default function Scene() {
  const { scene } = useManim();

  if (!scene) {
    return (
      <div className="dark flex h-screen w-screen items-center justify-center bg-background text-foreground">
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <span className="size-2 animate-pulse rounded-full bg-primary" />
          Starting the scene engine…
        </div>
      </div>
    );
  }

  return <EditorShell scene={scene} />;
}
