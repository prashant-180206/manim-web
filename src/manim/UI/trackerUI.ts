import { Scene } from "../scene";
import { TrackerConnectionName } from "../tracker/trackerconnectorNames";
import { Mobject } from "../mobject/mobect";
import { BaseProperty } from "../mobject/helpers/proprertytypes";
import { ValueType } from "../utils/value";
import type { Vector } from "../utils/types";

export interface TrackerPropertyOptionUIData {
  name: TrackerConnectionName;
  valueType: ValueType;
}

export interface TrackerComponentUIData {
  component: "x" | "y";
  id: string;
  name: string;
  value: number;

  setValue(value: number): void;
}

export interface TrackerUIData {
  id: string;
  name: string;
  value: number;

  /** True when the tracker is a vector backed by x and y components. */
  isVector: boolean;
  vector: Vector | null;
  components: TrackerComponentUIData[];

  propertyConnections: PropertyConnectionUIData[];
  trackerConnections: TrackerConnectionUIData[];

  setValue(value: number): void;
  setVector(value: Vector): void;
  rename(name: string): void;
  remove(): void;
}

export interface PropertyConnectionUIData {
  id: string;

  trackerId: string;
  mobjectId: string;

  property: TrackerConnectionName;
  expression: string;
  /** Present when the binding drives a vector property. */
  yExpression?: string;

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

  static getPropertyOptions(
    mobject: Mobject | null,
  ): TrackerPropertyOptionUIData[] {
    if (!mobject) return [];

    return mobject.trackerConnector.getConnectorNames().map((name) => ({
      name,
      valueType: mobject.getPropertyByName(name as keyof BaseProperty).type(),
    }));
  }

  static getTrackers(scene: Scene): TrackerUIData[] {
    const system = scene.trackerSystem;

    return [...system.getTrackerInfo()].map((meta) => {
      const tracker = meta.tracker;
      const components = tracker.components;

      return {
        id: tracker.id,
        name: tracker.name,
        value: tracker.get(),

        isVector: tracker.isVector,
        vector: components ? tracker.getVector() : null,
        components: components
          ? (["x", "y"] as const).map((component) => {
              const child = components[component];

              return {
                component,
                id: child.id,
                name: child.name,
                value: child.get(),
                setValue: (value: number) => child.set(value),
              };
            })
          : [],

        propertyConnections: [...meta.propertyConnections.values()].map(
          (conn) => ({
            id: conn.id,

            trackerId: conn.trackerId,
            mobjectId: conn.mobjectId,
            property: conn.property,
            expression: conn.expression.toString(),
            ...(conn.yExpression
              ? { yExpression: conn.yExpression.toString() }
              : {}),
            remove: () => system.deleteConnection(conn.id),
          }),
        ),

        trackerConnections: [...meta.trackerConnections.values()].map(
          (conn) => ({
            id: conn.id,

            from: conn.from,
            target: conn.target,

            expression: conn.expression.toString(),

            remove: () => system.disconnectTrackers(conn.id),
          }),
        ),

        setValue: (value) => {
          if (tracker.isVector) {
            tracker.setVector({ x: value, y: value });
            return;
          }

          tracker.set(value);
        },
        setVector: (value) => tracker.setVector(value),
        rename: (name) => tracker.rename(name),
        remove: () => system.removeTracker(tracker.id),
      };
    });
  }

  static createTracker(scene: Scene, name: string, value = 0): void {
    scene.trackerSystem.addTracker(name, value);
  }

  static createVectorTracker(
    scene: Scene,
    name: string,
    value: Vector = { x: 0, y: 0 },
  ): void {
    scene.trackerSystem.addVectorTracker(name, value);
  }

  static connectToProperty(
    scene: Scene,
    trackerId: string,
    property: TrackerConnectionName,
    expression: string,
    yExpression?: string,
  ): void {
    scene.trackerSystem.addConnection(
      property,
      trackerId,
      expression,
      yExpression,
    );
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
