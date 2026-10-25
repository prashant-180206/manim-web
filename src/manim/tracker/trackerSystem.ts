import { Tracker } from "./tracker";
import { Expression, Parser } from "expr-eval";
import { Scene } from "../scene";
import { TrackerConnectionName } from "./trackerconnectorNames";
import { Connection, Signal } from "../events/signal";
import { ValueType } from "../utils/value";
import { DependencyGraph } from "./dependencyGraph";
import type { Mobject } from "../mobject/mobect";
// import { Value } from "../utils/value";

interface PropertyConnectionData {
  id: string;
  trackerId: string;
  mobjectId: string;
  property: TrackerConnectionName;
  expression: Expression;
  connection: Connection<any>;
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

  /**
   * Recreate a tracker from a saved scene while keeping its id, so property
   * bindings can be restored afterwards.
   */
  restoreTracker(id: string, name: string, value: number): Tracker {
    this.ids.reserve(id);
    return this.registerTracker(id, name, value);
  }

  private registerTracker(id: string, name: string, value: number): Tracker {
    const tracker = new Tracker(value, id);

    tracker.name = name;

    this.trackers.set(id, {
      tracker,
      trackerConnections: new Map(),
      propertyConnections: new Map(),
    });

    tracker.changed.connect(() => {
      this.onTrackerChanged.emit(tracker);
    });

    this.graph.addNode(id);
    this.onTrackerAdded.emit(tracker);

    return tracker;
  }

  clear(): void {
    for (const meta of [...this.trackers.values()]) {
      this.removeTracker(meta.tracker.id);
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

    // tracker -> property
    for (const connection of meta.propertyConnections.values()) {
      this.deleteConnection(connection.id);
    }

    // tracker -> tracker
    for (const connection of meta.trackerConnections.values()) {
      this.disconnectTrackers(connection.id);
    }

    this.graph.removeNode(id);
    this.trackers.delete(id);
    this.onTrackerRemoved.emit(id);
  }

  addConnection(
    property: TrackerConnectionName,
    trackerId: string,
    expression: string,
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
    );
  }

  restorePropertyConnection(
    trackerId: string,
    mobjectId: string,
    property: TrackerConnectionName,
    expression: string,
  ): string {
    const mobject = this.scene.mobjectManager.getNode(mobjectId).mobject;

    return this.createPropertyConnection(
      trackerId,
      mobject,
      property,
      expression,
    );
  }

  private createPropertyConnection(
    trackerId: string,
    mobject: Mobject,
    property: TrackerConnectionName,
    expression: string,
  ): string {
    const meta = this.getTrackerMeta(trackerId);

    const targetValue = mobject.getPropertyByName(property);

    if (!targetValue) {
      throw new Error(
        `Mobject '${mobject.id}' has no '${property}' property.`,
      );
    }

    if (targetValue.type() !== ValueType.number) {
      throw new Error(`Property '${property}' is not a number.`);
    }

    const parsed = this.parser.parse(expression);
    const id = this.ids.next("binding_");

    const connection = meta.tracker.changed.connect((value) => {
      targetValue.set(parsed.evaluate({ t: value.get() }));
    });

    meta.propertyConnections.set(id, {
      id,
      trackerId,
      mobjectId: mobject.id,
      property,
      expression: parsed,
      connection,
    });

    this.onConnectionsChanged.emit();

    return id;
  }

  deleteConnection(id: string): void {
    for (const meta of this.trackers.values()) {
      const connection = meta.propertyConnections.get(id);

      if (!connection) continue;

      connection.connection.disconnect();
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
    return this.trackers.values();
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
