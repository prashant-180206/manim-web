import { Mobject } from "../mobject/mobect";
import { MobjectName } from "../mobject/helpers/mobjectName";
import { Value } from "../utils/value";
import type { Range, Vector } from "../utils/types";

import { TrackerConnectionName } from "./trackerconnectorNames";

type ConnectorValue = Value<boolean | number | Vector>;

/**
 * Exposes one bound of a `Range` property as a scalar tracker target.
 *
 * `ParametricShape` and `PolarShape` store their parameter ranges as `Range`
 * values, but trackers can only drive numbers or vectors. This adapter reads
 * and writes the requested endpoint without duplicating the range in the
 * property object.
 */
class RangeBoundValue extends Value<number> {
  constructor(
    private readonly source: () => Value<Range>,
    private readonly bound: "min" | "max",
  ) {
    super(0);
  }

  override get(): number {
    return this.source().get()[this.bound];
  }

  override set(value: number): void {
    const source = this.source();
    const range = source.get();

    source.set({ ...range, [this.bound]: value });
  }
}

export class TrackerConnectorRegistry {
  static registerBaseConnectors(mobject: Mobject) {
    mobject.trackerConnector.registerConnectorFactory(
      TrackerConnectionName.opacity,
      {
        mobjectid: mobject.id,
        getValue: () => mobject.properties.opacity,
      },
    );
    mobject.trackerConnector.registerConnectorFactory(
      TrackerConnectionName.position,
      {
        mobjectid: mobject.id,
        getValue: () => mobject.properties.position,
      },
    );
    mobject.trackerConnector.registerConnectorFactory(
      TrackerConnectionName.scale,
      {
        mobjectid: mobject.id,
        getValue: () => mobject.properties.scale,
      },
    );
  }

  /**
   * Register the geometry properties that make sense as tracker targets for a
   * specific mobject kind. Subclass properties are initialised after the base
   * constructor, so the getters resolve them lazily.
   */
  static registerMobjectConnectors(mobject: Mobject) {
    const properties = () =>
      mobject.properties as unknown as Record<string, ConnectorValue>;
    const rangeProperties = () =>
      mobject.properties as unknown as Record<string, Value<Range>>;

    const property =
      (key: string): (() => ConnectorValue) =>
      () =>
        properties()[key];
    const rangeBound =
      (key: string, bound: "min" | "max"): (() => ConnectorValue) =>
      () =>
        new RangeBoundValue(() => rangeProperties()[key], bound);

    const register = (
      connector: TrackerConnectionName,
      getValue: () => ConnectorValue,
    ) => {
      mobject.trackerConnector.registerConnectorFactory(connector, {
        mobjectid: mobject.id,
        getValue,
      });
    };

    switch (mobject.kind) {
      case MobjectName.Circle:
        register(TrackerConnectionName.radius, property("radius"));
        break;

      case MobjectName.Point:
        register(TrackerConnectionName.radius, property("radius"));
        register(TrackerConnectionName.labelOffset, property("labelOffset"));
        break;

      case MobjectName.Line:
        register(TrackerConnectionName.start, property("start"));
        register(TrackerConnectionName.end, property("end"));
        break;

      case MobjectName.DottedLine:
        register(TrackerConnectionName.start, property("start"));
        register(TrackerConnectionName.end, property("end"));
        register(TrackerConnectionName.dashLength, property("dashLength"));
        register(TrackerConnectionName.gapLength, property("gapLength"));
        break;

      case MobjectName.ArrowVector:
        register(TrackerConnectionName.start, property("start"));
        register(TrackerConnectionName.end, property("end"));
        register(TrackerConnectionName.headLength, property("headLength"));
        register(TrackerConnectionName.headWidth, property("headWidth"));
        break;

      case MobjectName.RegularPolygon:
        register(TrackerConnectionName.width, property("width"));
        register(TrackerConnectionName.height, property("height"));
        register(TrackerConnectionName.sides, property("sides"));
        break;

      case MobjectName.Plane:
        register(TrackerConnectionName.width, property("width"));
        register(TrackerConnectionName.height, property("height"));
        register(TrackerConnectionName.gridStep, property("gridStep"));
        register(TrackerConnectionName.labelStep, property("labelStep"));
        break;

      case MobjectName.PolarPlane:
        register(TrackerConnectionName.radius, property("radius"));
        register(TrackerConnectionName.radialStep, property("radialStep"));
        register(TrackerConnectionName.angleStep, property("angleStep"));
        break;

      case MobjectName.ParametricPath:
        register(TrackerConnectionName.tMin, property("tMin"));
        register(TrackerConnectionName.tMax, property("tMax"));
        break;

      case MobjectName.ParametricShape:
        register(TrackerConnectionName.xMin, rangeBound("xRange", "min"));
        register(TrackerConnectionName.xMax, rangeBound("xRange", "max"));
        register(TrackerConnectionName.yMin, rangeBound("yRange", "min"));
        register(TrackerConnectionName.yMax, rangeBound("yRange", "max"));
        break;

      case MobjectName.PolarShape:
        register(
          TrackerConnectionName.thetaMin,
          rangeBound("thetaRange", "min"),
        );
        register(
          TrackerConnectionName.thetaMax,
          rangeBound("thetaRange", "max"),
        );
        break;

      // Polygon vertices are a vector array and text content is a string, so
      // neither has a numeric/vector property a tracker can drive directly.
      case MobjectName.Polygon:
      case MobjectName.Text:
      case MobjectName.LatexText:
      case MobjectName.Group:
        break;
    }
  }
}
