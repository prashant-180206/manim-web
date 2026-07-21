import { Mobject } from "../mobject/mobect";
// import { EasingFunction } from "../utils/easing";
import { Vector } from "../utils/types";
import { Value, ValueType } from "../utils/value";
import { TrackerConnectorName } from "./trackerconnectorNames";

interface TrackerConnectionFactory {
  getValue: (
    mobj: Mobject,
    params: { [key: string]: Value<boolean> | Value<number> | Value<string> },
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

  supportedConnectors(): {
    name: TrackerConnectorName;
    requiredParameters: { [key: string]: ValueType };
  }[] {
    return [...this.connectors.entries()].map(([name, factory]) => ({
      name,
      requiredParameters: factory.requiredParams,
    }));
  }
}
