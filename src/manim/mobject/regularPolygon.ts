import { PropertyController } from "./helpers/propertycontroller";
import { ShapeProperty } from "./helpers/proprertytypes";
import { Value, Values } from "../utils/value";
import { Vector } from "../utils/types";
import { Mobject } from "./mobect";

interface RegularPolygonProperty extends ShapeProperty {
  width: Value<number>;
  height: Value<number>;
  sides: Value<number>;
}

export class RegularPolygon extends Mobject {
  constructor(id: string, name: string) {
    super(id, name);
    this.propertyController = new PropertyController<RegularPolygonProperty>({
      ...this.propertyController.properties,
      width: Values.number(120),
      height: Values.number(120),
      sides: Values.number(5),
      strokeColor: Values.string("black"),
      strokeWidth: Values.number(1),
      color: Values.string("royalblue"),
    }) as any;
  }

  override render(ctx: CanvasRenderingContext2D): void {
    const p = this.propertyController.properties as RegularPolygonProperty;
    const vertices = this.getVertices(p);

    this.beginRender(ctx);

    ctx.beginPath();
    ctx.moveTo(vertices[0].x, vertices[0].y);

    for (let i = 1; i < vertices.length; i += 1) {
      ctx.lineTo(vertices[i].x, vertices[i].y);
    }

    ctx.closePath();

    ctx.fillStyle = p.color.get();
    ctx.fill();

    if (p.strokeWidth.get() > 0) {
      ctx.strokeStyle = p.strokeColor.get();
      ctx.lineWidth = p.strokeWidth.get();
      ctx.stroke();
    }

    this.endRender(ctx);
  }

  contains(x: number, y: number): boolean {
    const points = this.getVertices(
      this.propertyController.properties as RegularPolygonProperty,
    );
    let inside = false;

    for (let i = 0, j = points.length - 1; i < points.length; j = i++) {
      const xi = points[i].x;
      const yi = points[i].y;
      const xj = points[j].x;
      const yj = points[j].y;

      const intersects =
        yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi;

      if (intersects) {
        inside = !inside;
      }
    }

    return inside;
  }

  private getVertices(p: RegularPolygonProperty): Vector[] {
    const sides = Math.max(3, Math.round(p.sides.get()));
    const width = Math.abs(p.width.get());
    const height = Math.abs(p.height.get());

    const vertices: Vector[] = [];
    const radiusX = width / 2;
    const radiusY = height / 2;

    for (let i = 0; i < sides; i += 1) {
      const angle = -Math.PI / 2 + (i * (Math.PI * 2)) / sides;
      vertices.push({
        x: radiusX * Math.cos(angle),
        y: radiusY * Math.sin(angle),
      });
    }

    return vertices;
  }
}
