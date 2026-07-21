import { Mobject } from "../mobject/mobect";

import { TrackerConnectionName } from "./trackerconnectorNames";

export class TrackerConnectorRegistry {
  static registerBaseConnectors(mobject: Mobject) {
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
}
