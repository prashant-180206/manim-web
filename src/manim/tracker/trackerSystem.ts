import { Tracker } from "./tracker";
import { Expression, Parser } from "expr-eval";
import { Scene } from "../scene";
import { TrackerConnectionName } from "./trackerconnectorNames";
import { Connection } from "../events/signal";
import { ValueType } from "../utils/value";
import { DependencyGraph } from "./dependencyGraph";
// import { Value } from "../utils/value";

interface PropertyConnectionData {
  id: string;
  trackerId: string;
  mobjectId: string;
  property: TrackerConnectionName;
  expression:
    | Expression
    | {
        x: Expression;
        y: Expression;
      };
  connection: Connection<any>;
}

interface TrackerConnectionData {
  id: string;
  from: string;
  target: string;
  expression: Expression;
  connection: Connection<any>;
}

export class TrackerSystem {
  // Trackers
  private readonly trackers = new Map<string, Tracker>();

  private readonly propertyConnections = new Map<
    string,
    PropertyConnectionData
  >();

  private readonly trackerConnections = new Map<
    string,
    TrackerConnectionData
  >();

  constructor(
    private readonly scene: Scene,
    private readonly ids = new IdGenerator(),
    private readonly graph = new DependencyGraph(),
  ) {}

  private readonly parser = new Parser();

  addTracker(name: string, value: number): Tracker {
    const id = this.ids.next("tracker_");

    const tracker = new Tracker(value, id);

    tracker.name = name;

    this.trackers.set(id, tracker);

    this.graph.addNode(id);

    return tracker;
  }

  private getTracker(id: string): Tracker {
    const tracker = this.trackers.get(id);
    if (!tracker) {
      throw new Error(`Tracker with id ${id} not found.`);
    }
    return tracker;
  }

  removeTracker(id: string): void {
    if (!this.trackers.has(id)) return;

    //
    // remove tracker->property bindings
    //

    for (const conn of [...this.propertyConnections.values()]) {
      if (conn.trackerId !== id) continue;

      conn.connection.disconnect();

      this.propertyConnections.delete(conn.id);
    }

    //
    // remove tracker->tracker bindings
    //

    for (const conn of [...this.trackerConnections.values()]) {
      if (conn.from !== id && conn.target !== id) continue;

      conn.connection.disconnect();

      this.trackerConnections.delete(conn.id);
    }

    this.graph.removeNode(id);

    this.trackers.delete(id);
  }

  addConnection(
    property: TrackerConnectionName,
    trackerId: string,
    expression: string | { x: string; y: string },
  ): string {
    const tracker = this.getTracker(trackerId);

    const mobject = this.scene.selection.selectedMobject;
    if (!mobject) {
      throw new Error("No selected mobject.");
    }

    const targetValue = mobject.getPropertyByName(property);

    const id = this.ids.next("binding_");

    if (typeof expression === "string") {
      if (targetValue.type() !== ValueType.number) {
        throw new Error(`Property '${property}' is not a number.`);
      }

      const parsed = this.parser.parse(expression);

      const connection = tracker.changed.connect((val) => {
        targetValue.set(parsed.evaluate({ t: val.get() }));
      });

      this.propertyConnections.set(id, {
        id,
        trackerId,
        mobjectId: mobject.id,
        property,
        expression: parsed,
        connection,
      });
    } else {
      if (targetValue.type() !== ValueType.vector) {
        throw new Error(`Property '${property}' is not a vector.`);
      }

      const parsedX = this.parser.parse(expression.x);
      const parsedY = this.parser.parse(expression.y);

      const connection = tracker.changed.connect((val) => {
        targetValue.set({
          x: parsedX.evaluate({ t: val.get() }),
          y: parsedY.evaluate({ t: val.get() }),
        } as any);
      });

      this.propertyConnections.set(id, {
        id,
        trackerId,
        mobjectId: mobject.id,
        property,
        expression: {
          x: parsedX,
          y: parsedY,
        },
        connection,
      });
    }

    return id;
  }

  deleteConnection(id: string): void {
    const connection = this.propertyConnections.get(id);

    if (!connection) {
      throw new Error(`Connection '${id}' not found.`);
    }

    connection.connection.disconnect();

    this.propertyConnections.delete(id);
  }

  deleteConnectionsForMobject(mobjectId: string): void {
    for (const [id, connection] of this.propertyConnections) {
      if (connection.mobjectId !== mobjectId) {
        continue;
      }

      connection.connection.disconnect();

      this.propertyConnections.delete(id);
    }
  }

  connectTrackers(from: string, target: string, expression: string): string {
    if (this.graph.createsCycle(from, target)) {
      throw new Error("Tracker dependency cycle detected.");
    }

    const source = this.getTracker(from);
    const destination = this.getTracker(target);

    const parsed = this.parser.parse(expression);

    const id = this.ids.next("tconn_");

    const connection = source.changed.connect((val) => {
      destination.set(parsed.evaluate({ t: val.get() }));
    });

    this.graph.addEdge(from, target);

    this.trackerConnections.set(id, {
      id,
      from,
      target,
      expression: parsed,
      connection,
    });

    return id;
  }

  disconnectTrackers(id: string): void {
    const connection = this.trackerConnections.get(id);

    if (!connection) {
      throw new Error(`Tracker connection '${id}' not found.`);
    }

    connection.connection.disconnect();

    this.graph.removeEdge(connection.from, connection.target);

    this.trackerConnections.delete(id);
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
}
