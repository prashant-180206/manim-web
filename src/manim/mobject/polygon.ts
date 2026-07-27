import { PropertyController } from "./helpers/propertycontroller";
import { ShapeProperty } from "./helpers/proprertytypes";
import { Value, Values, ValueType } from "../utils/value";
import { Vector } from "../utils/types";
import { Mobject } from "./mobect";

interface PolygonProperty extends ShapeProperty {
  vertices: Value<Vector[]>;
}

export class Polygon extends Mobject {
  constructor(id: string, name: string, vertices: Vector[] = []) {
    super(id, name);
    this.propertyController = new PropertyController<PolygonProperty>({
      ...this.propertyController.properties,
      vertices: new Value<Vector[]>(
        vertices.length > 0
          ? vertices
          : [
              { x: -50, y: -50 },
              { x: 50, y: -20 },
              { x: 20, y: 50 },
            ],
        ValueType.vectorArray,
      ),
      strokeColor: Values.string("black"),
      strokeWidth: Values.number(1),
      color: Values.string("mediumseagreen"),
    }) as any;
  }

  override render(ctx: CanvasRenderingContext2D): void {
    const p = this.propertyController.properties as PolygonProperty;
    const vertices = p.vertices.get();

    this.beginRender(ctx);

    if (vertices.length === 0) {
      this.endRender(ctx);
      return;
    }

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
    const points = (
      this.propertyController.properties as PolygonProperty
    ).vertices.get();
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
}
