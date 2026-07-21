import { Mobject } from "../mobject/mobect";
import { ValueType } from "../utils/value";
import { TrackerConnectorName } from "./trackerconnectorNames";

export class TrackerConnectorRegistry {
  static registerBaseConnectors(mobject: Mobject) {
    mobject.trackerConnector.registerConnector({
      name: TrackerConnectorName.position,
      getValue: () => mobject.properties.position,
      requiredParams: { relation: ValueType.string },
    });
    mobject.trackerConnector.registerConnector({
      name: TrackerConnectorName.scale,
      getValue: () => mobject.properties.scale,
      requiredParams: { relation: ValueType.string },
    });
  }
}
