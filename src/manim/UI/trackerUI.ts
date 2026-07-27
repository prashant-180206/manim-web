import { Scene } from "../scene";
import { TrackerConnectionName } from "../tracker/trackerconnectorNames";

export interface TrackerUIData {
  id: string;
  name: string;
  value: number;

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
  static getTrackers(scene: Scene): TrackerUIData[] {
    const system = scene.trackerSystem;

    return [...system.getTrackerInfo()].map((tracker) => ({
      id: tracker.id,
      name: tracker.name,
      value: tracker.get(),

      setValue: (value) => tracker.set(value),
      rename: (name) => (tracker.name = name),
      remove: () => system.removeTracker(tracker.id),
    }));
  }

  static getPropertyConnections(scene: Scene): PropertyConnectionUIData[] {
    const system = scene.trackerSystem;

    return [...system.allPropertyConnections()].map((conn) => ({
      id: conn.id,

      trackerId: conn.trackerId,
      mobjectId: conn.mobjectId,

      property: conn.property,
      expression: conn.expression.toString(),

      remove: () => system.deleteConnection(conn.id),
    }));
  }

  static getTrackerConnections(scene: Scene): TrackerConnectionUIData[] {
    const system = scene.trackerSystem;

    return [...system.allTrackerConnections()].map((conn) => ({
      id: conn.id,

      from: conn.from,
      target: conn.target,

      expression: conn.expression.toString(),

      remove: () => system.disconnectTrackers(conn.id),
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
