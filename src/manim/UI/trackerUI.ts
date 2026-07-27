import { Scene } from "../scene";
import { TrackerConnectionName } from "../tracker/trackerconnectorNames";

export interface TrackerUIData {
  id: string;
  name: string;
  value: number;

  propertyConnections: PropertyConnectionUIData[];
  trackerConnections: TrackerConnectionUIData[];

  setValue(value: number): void;
  rename(name: string): void;
  remove(): void;
}

export interface PropertyConnectionUIData {
  id: string;

  trackerId: string;
  mobjectId: string;

  property: TrackerConnectionName;
  expression: string;

  remove(): void;
}

export interface TrackerConnectionUIData {
  id: string;

  from: string;
  target: string;

  expression: string;

  remove(): void;
}

export class TrackerUI {
  static getTrackerNames(scene: Scene): string[] {
    return this.getTrackers(scene).map((t) => t.name);
  }

  static getTrackers(scene: Scene): TrackerUIData[] {
    const system = scene.trackerSystem;

    return [...system.getTrackerInfo()].map((meta) => ({
      id: meta.tracker.id,
      name: meta.tracker.name,
      value: meta.tracker.get(),

      propertyConnections: [...meta.propertyConnections.values()].map(
        (conn) => ({
          id: conn.id,

          trackerId: conn.trackerId,
          mobjectId: conn.mobjectId,
          property: conn.property,
          expression: conn.expression.toString(),
          remove: () => system.deleteConnection(conn.id),
        }),
      ),

      trackerConnections: [...meta.trackerConnections.values()].map((conn) => ({
        id: conn.id,

        from: conn.from,
        target: conn.target,

        expression: conn.expression.toString(),

        remove: () => system.disconnectTrackers(conn.id),
      })),

      setValue: (value) => meta.tracker.set(value),
      rename: (name) => (meta.tracker.name = name),
      remove: () => system.removeTracker(meta.tracker.id),
    }));
  }

  static createTracker(scene: Scene, name: string, value = 0): void {
    scene.trackerSystem.addTracker(name, value);
  }

  static connectToProperty(
    scene: Scene,
    trackerId: string,
    property: TrackerConnectionName,
    expression: string,
  ): void {
    scene.trackerSystem.addConnection(property, trackerId, expression);
  }

  static connectTrackers(
    scene: Scene,
    from: string,
    target: string,
    expression: string,
  ): void {
    scene.trackerSystem.connectTrackers(from, target, expression);
  }
}
