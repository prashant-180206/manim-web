import { Tracker } from "./tracker";
import { Expression, Parser } from "expr-eval";
import { Scene } from "../scene";
import { TrackerConnectionName } from "./trackerconnectorNames";
import { Connection, Signal } from "../events/signal";
import { Value, ValueType } from "../utils/value";
import { DependencyGraph } from "./dependencyGraph";
import type { Mobject } from "../mobject/mobect";
import type { Vector } from "../utils/types";

interface PropertyConnectionData {
  id: string;
  trackerId: string;
  mobjectId: string;
  property: TrackerConnectionName;
  expression: Expression;
  /** Second expression used when the target property is a vector. */
  yExpression: Expression | null;
  connections: Connection<[Value<number>]>[];
}

interface TrackerConnectionData {
  id: string;
  from: string;
  target: string;
  expression: Expression;
  connection: Connection<any>;
}

interface TrackerMeta {
  tracker: Tracker;

  trackerConnections: Map<string, TrackerConnectionData>;
  propertyConnections: Map<string, PropertyConnectionData>;
}

export class TrackerSystem {
  // Trackers
  private readonly trackers = new Map<string, TrackerMeta>();

  readonly onTrackerAdded = new Signal<[Tracker]>();
  readonly onTrackerRemoved = new Signal<[string]>();
  readonly onTrackerChanged = new Signal<[Tracker]>();
  readonly onConnectionsChanged = new Signal();

  constructor(
    private readonly scene: Scene,
    private readonly ids = new IdGenerator(),
    private readonly graph = new DependencyGraph(),
  ) {}

  private readonly parser = new Parser();

  addTracker(name: string, value: number): Tracker {
    return this.registerTracker(this.ids.next("tracker_"), name, value);
  }

  /** Create a vector tracker backed by two scalar component trackers. */
  addVectorTracker(name: string, value: Vector): Tracker {
    return this.registerVectorTracker(
      this.ids.next("tracker_"),
      name,
      value,
    );
  }

  /**
   * Recreate a tracker from a saved scene while keeping its id, so property
   * bindings can be restored afterwards.
   */
  restoreTracker(id: string, name: string, value: number): Tracker {
    this.ids.reserve(id);
    return this.registerTracker(id, name, value);
  }

  /**
   * Recreate a vector tracker from a saved scene. Component ids are restored
   * too so any saved reference to a component keeps resolving.
   */
  restoreVectorTracker(
    id: string,
    name: string,
    value: Vector,
    componentIds?: { x: string; y: string },
  ): Tracker {
    this.ids.reserve(id);

    if (componentIds) {
      this.ids.reserve(componentIds.x);
      this.ids.reserve(componentIds.y);
    }

    return this.registerVectorTracker(id, name, value, componentIds);
  }

  private registerTracker(
    id: string,
    name: string,
    value: number,
    announce = true,
  ): Tracker {
    const tracker = new Tracker(value, id);

    tracker.rename(name);

    this.createMeta(tracker, announce);

    return tracker;
  }

  private registerVectorTracker(
    id: string,
    name: string,
    value: Vector,
    componentIds?: { x: string; y: string },
  ): Tracker {
    this.ids.reserve(id);

    const xId = componentIds?.x ?? this.ids.next("tracker_");
    const yId = componentIds?.y ?? this.ids.next("tracker_");

    this.ids.reserve(xId);
    this.ids.reserve(yId);

    const tracker = Tracker.createVector(id, value, { x: xId, y: yId });

    tracker.rename(name);

    const components = tracker.components!;

    // Components are internal: they participate in dependency tracking and
    // serialization, but the editor only shows the parent tracker.
    this.createMeta(components.x, false);
    this.createMeta(components.y, false);
    this.createMeta(tracker, true);

    return tracker;
  }

  private createMeta(tracker: Tracker, announce: boolean): TrackerMeta {
    const meta: TrackerMeta = {
      tracker,
      trackerConnections: new Map(),
      propertyConnections: new Map(),
    };

    this.trackers.set(tracker.id, meta);

    tracker.changed.connect(() => {
      this.onTrackerChanged.emit(tracker);
    });

    this.graph.addNode(tracker.id);

    if (announce) {
      this.onTrackerAdded.emit(tracker);
    }

    return meta;
  }

  clear(): void {
    for (const id of [...this.trackers.keys()]) {
      this.removeTracker(id);
    }
  }

  private getTrackerMeta(id: string): TrackerMeta {
    const meta = this.trackers.get(id);
    if (!meta) {
      throw new Error(`Tracker with id ${id} not found.`);
    }
    return meta;
  }

  removeTracker(id: string): void {
    const meta = this.trackers.get(id);

    // Trackers are also removed for deleted mobjects, which usually have no
    // tracker associated with their id.
    if (!meta) return;

    const components = meta.tracker.components;

    this.removeTrackerInternal(id);

    if (components) {
      this.removeTrackerInternal(components.x.id);
      this.removeTrackerInternal(components.y.id);
    }

    this.onTrackerRemoved.emit(id);
  }

  private removeTrackerInternal(id: string): void {
    const meta = this.trackers.get(id);

    if (!meta) return;

    // tracker -> property
    for (const connection of [...meta.propertyConnections.values()]) {
      this.deleteConnection(connection.id);
    }

    // tracker -> tracker
    for (const connection of [...meta.trackerConnections.values()]) {
      this.disconnectTrackers(connection.id);
    }

    this.graph.removeNode(id);
    this.trackers.delete(id);
  }

  addConnection(
    property: TrackerConnectionName,
    trackerId: string,
    expression: string,
    yExpression?: string,
  ): string {
    const mobject = this.scene.selection.selectedMobject;
    if (!mobject) {
      throw new Error("No selected mobject.");
    }

    return this.createPropertyConnection(
      trackerId,
      mobject,
      property,
      expression,
      yExpression,
    );
  }

  restorePropertyConnection(
    trackerId: string,
    mobjectId: string,
    property: TrackerConnectionName,
    expression: string,
    yExpression?: string,
  ): string {
    const mobject = this.scene.mobjectManager.getNode(mobjectId).mobject;

    return this.createPropertyConnection(
      trackerId,
      mobject,
      property,
      expression,
      yExpression,
    );
  }

  private createPropertyConnection(
    trackerId: string,
    mobject: Mobject,
    property: TrackerConnectionName,
    expression: string,
    yExpression?: string,
  ): string {
    const meta = this.getTrackerMeta(trackerId);

    if (meta.tracker.isComponent) {
      throw new Error(
        `Tracker '${meta.tracker.name}' is a component; bind its vector tracker instead.`,
      );
    }

    const targetValue = mobject.getPropertyByName(property);

    if (!targetValue) {
      throw new Error(
        `Mobject '${mobject.id}' has no '${property}' property.`,
      );
    }

    const id = this.ids.next("binding_");

    if (targetValue.type() === ValueType.number) {
      if (meta.tracker.isVector) {
        throw new Error(
          `Tracker '${meta.tracker.name}' is a vector; bind it to a vector property.`,
        );
      }

      const parsed = this.parser.parse(expression);
      const target = targetValue as Value<number>;

      const connection = meta.tracker.changed.connect((value) => {
        target.set(parsed.evaluate({ t: value.get() }));
      });

      meta.propertyConnections.set(id, {
        id,
        trackerId,
        mobjectId: mobject.id,
        property,
        expression: parsed,
        yExpression: null,
        connections: [connection],
      });
    } else if (targetValue.type() === ValueType.vector) {
      const parsedX = this.parser.parse(expression);
      const parsedY = this.parser.parse(yExpression ?? expression);
      const target = targetValue as Value<Vector>;

      // A vector tracker drives each axis with its own component. A numeric
      // tracker drives both axes with the same value.
      const sourceX = meta.tracker.components?.x ?? meta.tracker;
      const sourceY = meta.tracker.components?.y ?? meta.tracker;

      const connections: Connection<[Value<number>]>[] = [
        sourceX.changed.connect((value) => {
          target.set({
            ...target.get(),
            x: parsedX.evaluate({ t: value.get() }),
          });
        }),
        sourceY.changed.connect((value) => {
          target.set({
            ...target.get(),
            y: parsedY.evaluate({ t: value.get() }),
          });
        }),
      ];

      meta.propertyConnections.set(id, {
        id,
        trackerId,
        mobjectId: mobject.id,
        property,
        expression: parsedX,
        yExpression: parsedY,
        connections,
      });
    } else {
      throw new Error(
        `Property '${property}' is not a numeric or vector property.`,
      );
    }

    this.onConnectionsChanged.emit();

    return id;
  }

  deleteConnection(id: string): void {
    for (const meta of this.trackers.values()) {
      const connection = meta.propertyConnections.get(id);

      if (!connection) continue;

      for (const handle of connection.connections) {
        handle.disconnect();
      }

      meta.propertyConnections.delete(id);
      this.onConnectionsChanged.emit();

      return;
    }

    throw new Error(`Connection '${id}' not found.`);
  }

  deleteConnectionsForMobject(mobjectId: string): void {
    for (const meta of this.trackers.values()) {
      for (const connection of [...meta.propertyConnections.values()]) {
        if (connection.mobjectId !== mobjectId) continue;

        this.deleteConnection(connection.id);
      }
    }
  }

  connectTrackers(from: string, target: string, expression: string): string {
    return this.createTrackerConnection(from, target, expression);
  }

  restoreTrackerConnection(
    from: string,
    target: string,
    expression: string,
  ): string {
    return this.createTrackerConnection(from, target, expression);
  }

  private createTrackerConnection(
    from: string,
    target: string,
    expression: string,
  ): string {
    if (this.graph.createsCycle(from, target)) {
      throw new Error("Tracker dependency cycle detected.");
    }

    const source = this.getTrackerMeta(from);
    const destination = this.getTrackerMeta(target);

    if (source.tracker.isVector || destination.tracker.isVector) {
      throw new Error(
        "Tracker links support numeric trackers. Bind vector trackers to vector properties instead.",
      );
    }

    if (source.tracker.isComponent || destination.tracker.isComponent) {
      throw new Error(
        "Tracker links must target the vector tracker, not one of its components.",
      );
    }

    const parsed = this.parser.parse(expression);
    const id = this.ids.next("tconn_");

    const connection = source.tracker.changed.connect((value) => {
      destination.tracker.set(parsed.evaluate({ t: value.get() }));
    });

    this.graph.addEdge(from, target);

    source.trackerConnections.set(id, {
      id,
      from,
      target,
      expression: parsed,
      connection,
    });

    this.onConnectionsChanged.emit();

    return id;
  }

  disconnectTrackers(id: string): void {
    for (const meta of this.trackers.values()) {
      const connection = meta.trackerConnections.get(id);

      if (!connection) continue;

      connection.connection.disconnect();

      this.graph.removeEdge(connection.from, connection.target);

      meta.trackerConnections.delete(id);
      this.onConnectionsChanged.emit();

      return;
    }

    throw new Error(`Tracker connection '${id}' not found.`);
  }
  // exposing to UI
  getTrackerInfo() {
    return [...this.trackers.values()].filter(
      (meta) => meta.tracker.parent === null,
    );
  }
}

class IdGenerator {
  private counter = 0;

  next(prefix = ""): string {
    this.counter++;
    return prefix + this.counter.toString();
  }

  /** Ensure generated ids never collide with ids restored from a scene file. */
  reserve(id: string): void {
    const suffix = Number(id.match(/(\d+)$/)?.[1] ?? 0);

    if (Number.isFinite(suffix)) {
      this.counter = Math.max(this.counter, suffix);
    }
  }
}
