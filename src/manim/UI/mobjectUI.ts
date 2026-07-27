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

interface MobjectUIData {
  name: string;
  create: () => void;
  icon: IconType;
}

interface MobjectTreeControlData {
  id: string;
  name: string;
  zIndex: number;
  children: MobjectTreeControlData[];
  delete: () => void;
  select: () => void;
  multiselect: () => void;
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
  static getUIButtonData(scene: Scene): MobjectUIData[] {
    return Object.values(MobjectName).map((name) => ({
      name,
      create: () => scene.mobjectManager.add(name),
      icon: MobjectIcons[name],
    }));
  }

  static getMobjectTreeUIData(scene: Scene): MobjectTreeControlData[] {
    const createTreeData = (node: MobjectNode): MobjectTreeControlData => ({
      id: node.id,
      name: node.mobject.name,
      zIndex: 0,
      children: node.children.map(createTreeData),
      delete: () => scene.mobjectManager.delete(node.mobject),
      select: () => scene.selection.selectMobject(node.mobject),
      multiselect: () => scene.selection.multiselectMobject(node.mobject),
      addtoGroup: (groupId: string) =>
        scene.mobjectManager.addToGroup(groupId, node.mobject),
      removefromGroup: (groupId: string) =>
        scene.mobjectManager.removeFromGroup(groupId, node.mobject),
    });

    return scene.mobjectManager.tree.roots.map(createTreeData);
  }
}
