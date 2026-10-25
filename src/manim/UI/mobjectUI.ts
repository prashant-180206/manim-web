import {
  FaCircle,
  FaDrawPolygon,
  FaVectorSquare,
  FaShapes,
  FaFont,
  FaFileLines,
  FaSuperscript,
  FaLayerGroup,
} from "react-icons/fa6";

import { PiWaveSineBold } from "react-icons/pi";
import { MobjectName } from "../mobject/helpers/mobjectName";
import { Scene } from "../scene";
import { IconType } from "react-icons";
import { MobjectNode } from "../mobject/helpers/MobjectTree";
import { Vector } from "../utils/types";
import { Mobject } from "../mobject/mobect";

export interface MobjectCreationUIData {
  name: MobjectName;
  create: (position?: Vector) => Mobject;
  icon: IconType;
}

export interface MobjectTreeControlData {
  id: string;
  name: string;
  zIndex: number;
  icon: IconType;
  visible: boolean;
  locked: boolean;
  isGroup: boolean;
  hasChildren: boolean;
  children: MobjectTreeControlData[];
  delete: () => void;
  select: () => void;
  multiselect: () => void;
  rename: (name: string) => void;
  toggleVisibility: () => void;
  toggleLocked: () => void;
  bringToFront: () => void;
  sendToBack: () => void;
  bringForward: () => void;
  sendBackward: () => void;
  addtoGroup: (groupId: string) => void;
  removefromGroup: (groupId: string) => void;
}

const MobjectIcons: Record<MobjectName, IconType> = {
  [MobjectName.Circle]: FaCircle,
  [MobjectName.RegularPolygon]: FaDrawPolygon,
  [MobjectName.Polygon]: FaVectorSquare,
  [MobjectName.Text]: FaFont,
  [MobjectName.ParametricPath]: PiWaveSineBold,
  [MobjectName.ParametricShape]: FaShapes,
  [MobjectName.PolarShape]: FaFileLines,
  [MobjectName.LatexText]: FaSuperscript,
  [MobjectName.Group]: FaLayerGroup,
};

export class MobjectUI {
  static getMobjectCreationUIData(scene: Scene): MobjectCreationUIData[] {
    return Object.values(MobjectName)
      .filter((name) => name !== MobjectName.Group)
      .map((name) => ({
        name,
        icon: MobjectIcons[name],
        create: (position?: Vector) => {
          const mobject = scene.mobjectManager.add(name);

          if (position) {
            mobject.properties.position.set(position);
          }

          scene.selection.selectMobject(mobject);

          return mobject;
        },
      }));
  }

  static getMobjectTreeUIData(scene: Scene): MobjectTreeControlData[] {
    const tree = scene.mobjectManager.tree;
    const notifyTreeChanged = () => scene.mobjectManager.onTreeChanged.emit();

    const createTreeData = (node: MobjectNode): MobjectTreeControlData => ({
      id: node.id,
      name: node.mobject.name,
      zIndex: 0,
      icon: MobjectIcons[node.mobject.name as MobjectName] ?? FaCircle,
      visible: node.visible,
      locked: node.locked,
      isGroup: node.mobject.name === MobjectName.Group,
      hasChildren: node.children.length > 0,
      children: node.children.map(createTreeData),
      delete: () => scene.mobjectManager.delete(node.mobject),
      select: () => scene.selection.selectMobject(node.mobject),
      multiselect: () => scene.selection.multiselectMobject(node.mobject),
      rename: (name: string) => {
        scene.mobjectManager.renameMobject(node.id, name);
        notifyTreeChanged();
      },
      toggleVisibility: () => {
        node.visible = !node.visible;
        notifyTreeChanged();
      },
      toggleLocked: () => {
        node.locked = !node.locked;
        notifyTreeChanged();
      },
      bringToFront: () => {
        tree.bringToFront(node);
        notifyTreeChanged();
      },
      sendToBack: () => {
        tree.sendToBack(node);
        notifyTreeChanged();
      },
      bringForward: () => {
        tree.bringForward(node);
        notifyTreeChanged();
      },
      sendBackward: () => {
        tree.sendBackward(node);
        notifyTreeChanged();
      },
      addtoGroup: (groupId: string) =>
        scene.mobjectManager.addToGroup(groupId, node.mobject),
      removefromGroup: (groupId: string) =>
        scene.mobjectManager.removeFromGroup(groupId, node.mobject),
    });

    return scene.mobjectManager.tree.roots.map(createTreeData);
  }
}
