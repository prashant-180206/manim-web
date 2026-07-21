import { Mobject } from "../mobject/mobect";
// import { EasingFunction } from "../utils/easing";
import { Vector } from "../utils/types";
import { Value, ValueType } from "../utils/value";
import { TrackerConnectorName } from "./trackerconnectorNames";

// interface TrackerConnectorData {
//   name: TrackerConnectorName;
//   getValue: () => Value<boolean | number | Vector>;
//   requiredParams: { relation: ValueType.string; [key: string]: ValueType };
// }

interface TrackerConnectionFactory {
  getValue: (
    mobj: Mobject,
    params: { [key: string]: Value<boolean | number | Vector> },
  ) => Value<boolean | number | Vector>;
  requiredParams: { relation: ValueType.string; [key: string]: ValueType };
}

export class TrackerProvider {
  readonly mobject: Mobject;
  private readonly connectors = new Map<
    TrackerConnectorName,
    TrackerConnectionFactory
  >();

  constructor(mobject: Mobject) {
    this.mobject = mobject;
  }

  registerConnectorFactory(
    connector: TrackerConnectorName,
    factory: TrackerConnectionFactory,
  ): void {
    this.connectors.set(connector, factory);
  }

  deleteWithName(name: TrackerConnectorName): void {
    this.connectors.delete(name);
  }

  // createConnection(
  //   name: TrackerConnectorName,
  //   params: { [key: string]: Value<boolean | number | Vector> },
  // ): void {
  //   const connector = this.connectors.get(name);
  //   if (!connector) {
  //     throw new Error(`Connector with name ${name} does not exist.`);
  //   }
  // }

  supportedConnectors(): {
    name: TrackerConnectorName;
    requiredParameters: { [key: string]: ValueType };
  }[] {
    return [...this.connectors.values()].map((c) => ({
      name: c.name,
      requiredParameters: c.requiredParams,
    }));
  }
}
