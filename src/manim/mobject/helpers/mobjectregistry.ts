import { Circle } from "../circle";
import { Mobject } from "../mobect";
import { MobjectName } from "../helpers/mobjectName";
import { LatexText } from "../latexText";
import { RegularPolygon } from "../regularPolygon";
import { Polygon } from "../polygon";
import { TextMobject } from "../text";
import { ParametricPath } from "../parametricPath";
import { ParametricShape } from "../parametricShape";
import { PolarShape } from "../polarShape";
import { Group } from "../group";

export class MobjectRegistry {
  static makeMobject(name: MobjectName, id: string): Mobject {
    switch (name) {
      case MobjectName.Circle:
        return new Circle(id, MobjectName.Circle.toString());
      case MobjectName.RegularPolygon:
        return new RegularPolygon(id, MobjectName.RegularPolygon.toString());
      case MobjectName.PolarShape:
        return new PolarShape(id, MobjectName.PolarShape.toString());
      case MobjectName.Polygon:
        return new Polygon(id, MobjectName.Polygon.toString());
      case MobjectName.Text:
        return new TextMobject(id, MobjectName.Text.toString());
      case MobjectName.ParametricPath:
        return new ParametricPath(id, MobjectName.ParametricPath.toString());
      case MobjectName.ParametricShape:
        return new ParametricShape(id, MobjectName.ParametricShape.toString());
      case MobjectName.LatexText:
        return new LatexText(id, MobjectName.LatexText.toString());
      case MobjectName.Group:
        return new Group(id, MobjectName.Group.toString());
      default:
        throw new Error(`Unknown MobjectName: ${name}`);
    }
  }
}
