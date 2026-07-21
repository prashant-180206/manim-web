import { Mobject } from "../mobject/mobect";
import { ValueType } from "../utils/value";
import { TrackerConnectorName } from "./trackerconnectorNames";

export class TrackerConnectorRegistry {
  static registerBaseConnectors(mobject: Mobject) {
    mobject.trackerConnector.registerConnectorFactory(
      TrackerConnectorName.position,
      {
        getValue: () => mobject.properties.position,
        requiredParams: { relation: ValueType.string },
      },
    );
    mobject.trackerConnector.registerConnectorFactory(
      TrackerConnectorName.scale,
      {
        getValue: () => mobject.properties.scale,
        requiredParams: { relation: ValueType.string },
      },
    );
  }
}
