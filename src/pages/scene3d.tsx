import { Editor3DShell } from "../components/editor3d/Editor3DShell";
import { useScene3D } from "../context/scene3dContext";

export default function Scene3D() {
  const { scene } = useScene3D();

  if (!scene) {
    return (
      <div className="dark flex h-screen w-screen items-center justify-center bg-background text-foreground">
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <span className="size-2 animate-pulse rounded-full bg-primary" />
          Starting the 3D scene engine…
        </div>
      </div>
    );
  }

  return <Editor3DShell scene={scene} />;
}
