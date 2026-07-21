import { Mobject } from "../mobject/mobect";
// import { EasingFunction } from "../utils/easing";
import { Vector } from "../utils/types";
import { Value } from "../utils/value";
import { TrackerConnectionName } from "./trackerconnectorNames";

interface TrackerConnectionFactory {
  mobjectid: string;
  getValue: () => Value<boolean | number | Vector>;
}

export class TrackerProvider {
  readonly mobject: Mobject;
  private readonly connectors = new Map<
    TrackerConnectionName,
    TrackerConnectionFactory
  >();

  constructor(mobject: Mobject) {
    this.mobject = mobject;
  }

  getConnectorFactory(
    connector: TrackerConnectionName,
  ): TrackerConnectionFactory {
    const factory = this.connectors.get(connector);
    if (!factory) {
      throw new Error(`Connector factory for ${connector} not found.`);
    }
    return factory;
  }

  registerConnectorFactory(
    connector: TrackerConnectionName,
    factory: TrackerConnectionFactory,
  ): void {
    this.connectors.set(connector, factory);
  }

  deleteWithName(name: TrackerConnectionName): void {
    this.connectors.delete(name);
  }
}
