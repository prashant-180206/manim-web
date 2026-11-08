import {
  FaArrowUp,
  FaCircle,
  FaCircleDot,
  FaCube,
  FaCubes,
  FaDatabase,
  FaMinus,
  FaMountain,
  FaRing,
  FaWaveSquare,
} from "react-icons/fa6";
import type { IconType } from "react-icons";

import type { Scene3D } from "../scene3d";
import type { Mobject3D } from "../mobject/mobject3d";
import { Mobject3DName } from "../mobject/helpers/mobject3dName";

/*
|--------------------------------------------------------------------------
| mobject3dUI.ts
|--------------------------------------------------------------------------
|
| Editor-facing data for the 3D scene panel, mirroring `src/manim/UI/mobjectUI.ts`.
| The 3D manager keeps a flat root list, so the tree data is a single level.
|
*/

export const MOBJECT3D_ICONS: Record<Mobject3DName, IconType> = {
  [Mobject3DName.Cube]: FaCube,
  [Mobject3DName.Sphere]: FaCircle,
  [Mobject3DName.Cylinder]: FaDatabase,
  [Mobject3DName.Cone]: FaMountain,
  [Mobject3DName.Box]: FaCubes,
  [Mobject3DName.Torus]: FaRing,
  [Mobject3DName.Arrow]: FaArrowUp,
  [Mobject3DName.Line]: FaMinus,
  [Mobject3DName.Dot]: FaCircleDot,
  [Mobject3DName.Surface]: FaWaveSquare,
};

export const MOBJECT3D_LABELS: Record<Mobject3DName, string> = {
  [Mobject3DName.Cube]: "Cube",
  [Mobject3DName.Sphere]: "Sphere",
  [Mobject3DName.Cylinder]: "Cylinder",
  [Mobject3DName.Cone]: "Cone",
  [Mobject3DName.Box]: "Prism",
  [Mobject3DName.Torus]: "Torus",
  [Mobject3DName.Arrow]: "Arrow3D",
  [Mobject3DName.Line]: "Line3D",
  [Mobject3DName.Dot]: "Dot3D",
  [Mobject3DName.Surface]: "Surface",
};

export const MOBJECT3D_DESCRIPTIONS: Record<Mobject3DName, string> = {
  [Mobject3DName.Cube]: "Add a cube with 1-unit edges.",
  [Mobject3DName.Sphere]: "Add a UV sphere with a 1-unit radius.",
  [Mobject3DName.Cylinder]: "Add a cylinder with a 1-unit radius and 2-unit height.",
  [Mobject3DName.Cone]: "Add a cone with a 1-unit base radius and 2-unit height.",
  [Mobject3DName.Box]:
    "Add a rectangular prism with 1-unit width, height and depth.",
  [Mobject3DName.Torus]: "Add a torus with a 1-unit radius and 0.3-unit tube.",
  [Mobject3DName.Arrow]: "Add an arrow pointing along +y, 2 units long.",
  [Mobject3DName.Line]: "Add a line segment along +y, 2 units long.",
  [Mobject3DName.Dot]: "Add a small dot marker at the origin.",
  [Mobject3DName.Surface]:
    "Add a wavy parametric surface over u, v ∈ [-1, 1].",
};

export interface Mobject3DCreationUIData {
  name: Mobject3DName;
  label: string;
  description: string;
  icon: IconType;
  create: () => Mobject3D;
}

export interface Mobject3DTreeControlData {
  id: string;
  name: string;
  kind: Mobject3DName;
  icon: IconType;
  visible: boolean;
  locked: boolean;
  delete: () => void;
  select: () => void;
  multiselect: () => void;
  rename: (name: string) => void;
  toggleVisibility: () => void;
  toggleLocked: () => void;
}

export class Mobject3DUI {
  static getCreationUIData(scene: Scene3D): Mobject3DCreationUIData[] {
    return Object.values(Mobject3DName).map((name) => ({
      name,
      label: MOBJECT3D_LABELS[name],
      description: MOBJECT3D_DESCRIPTIONS[name],
      icon: MOBJECT3D_ICONS[name],
      create: () => {
        const mobject = scene.mobjectManager.add(name);

        scene.selection.selectMobject(mobject);

        return mobject;
      },
    }));
  }

  static getMobjectTreeUIData(scene: Scene3D): Mobject3DTreeControlData[] {
    return scene.mobjectManager.all().map((mobject) => ({
      id: mobject.id,
      name: mobject.name,
      kind: mobject.kind,
      icon: MOBJECT3D_ICONS[mobject.kind] ?? FaCircle,
      visible: mobject.visible,
      locked: mobject.locked,
      delete: () => scene.mobjectManager.delete(mobject),
      select: () => scene.selection.selectMobject(mobject),
      multiselect: () => scene.selection.multiselectMobject(mobject),
      rename: (name: string) => scene.mobjectManager.rename(mobject, name),
      toggleVisibility: () => {
        mobject.visible = !mobject.visible;
        scene.mobjectManager.onTreeChanged.emit();
      },
      toggleLocked: () => {
        mobject.locked = !mobject.locked;
        scene.mobjectManager.onTreeChanged.emit();
      },
    }));
  }
}
