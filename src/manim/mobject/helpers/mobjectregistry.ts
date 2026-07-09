import { Circle } from "../circle";
import { Mobject } from "../mobect";
import { MobjectName } from "../helpers/mobjectName";
import { Rectangle } from "../rect";
import { LatexText } from "../latexText";

export class MobjectRegistry {
  static makeMobject(name: MobjectName, id: string): Mobject {
    switch (name) {
      case MobjectName.Rectangle:
        return new Rectangle(id, MobjectName.Rectangle.toString());
      case MobjectName.Circle:
        return new Circle(id, MobjectName.Circle.toString());
      case MobjectName.LatexText:
        return new LatexText(id, MobjectName.LatexText.toString());
      default:
        throw new Error(`Unknown MobjectName: ${name}`);
    }
  }
}
