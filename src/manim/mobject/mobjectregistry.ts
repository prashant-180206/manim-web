import { Circle } from "./circle";
import { Mobject } from "./mobect";
import { MobjectName } from "./mobjectName";
import { Rectangle } from "./rect";

export class MobjectRegistry {
  static makeMobject(name: MobjectName, id: string): Mobject {
    switch (name) {
      case MobjectName.Rectangle:
        return new Rectangle(id, MobjectName.Rectangle.toString());
      case MobjectName.Circle:
        return new Circle(id, MobjectName.Circle.toString());
      default:
        throw new Error(`Unknown MobjectName: ${name}`);
    }
  }
}
