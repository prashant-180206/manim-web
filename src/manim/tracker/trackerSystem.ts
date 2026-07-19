// import { PropertyKey } from "../property/propertykey";
// import { Property } from "../property/property";
// import { Scene } from "../scene";
import { Expression, Parser } from "expr-eval";
import { Vector } from "../utils/types";
import { Value } from "../utils/value";
// import { Value } from "../utils/value";
import { Tracker, Trackers } from "./tracker";
import { DependencyGraph } from "./dependencyGraph";
import { Mobject } from "../mobject/mobect";

export class TrackerManager {
  // Trackers
  private readonly numberTrackers = new Map<string, Tracker<number>>();
  private readonly vectorTrackers = new Map<string, Tracker<Vector>>();

  // Connections
  private readonly bindings = new Map<string, TrackerBinding>();
  private bindingidGenerator = new BindingIdGenerator();

  // Dependency graph
  private readonly graph = new DependencyGraph();

  // Expression parser
  private readonly parser = new Parser();

  /*==================================================
   * Tracker Creation
   *==================================================*/

  addNumberTracker(id: string, value: number): Tracker<number> {
    const tracker = Trackers.number(value, id);
    this.numberTrackers.set(id, tracker);
    this.graph.addNode(id);
    return tracker;
  }

  addVectorTracker(id: string, value: Vector): Tracker<Vector> {
    const tracker = Trackers.vector(value, id);
    this.vectorTrackers.set(id, tracker);
    this.graph.addNode(id);
    return tracker;
  }

  removeTracker(id: string): void {
    this.numberTrackers.delete(id);
    this.vectorTrackers.delete(id);
    this.graph.removeNode(id);
  }

  renameTracker(oldId: string, newId: string): void {
    const tracker = this.getTracker(oldId);
    if (tracker) {
      this.removeTracker(oldId);
      this.graph.renameNode(oldId, newId);
      tracker.id = newId;
    }
  }

  hasTracker(id: string): boolean {
    return this.numberTrackers.has(id) || this.vectorTrackers.has(id);
  }

  getNumberTracker(id: string): Tracker<number> {
    return this.numberTrackers.get(id)!;
  }

  getVectorTracker(id: string): Tracker<Vector> {
    return this.vectorTrackers.get(id)!;
  }

  getTracker(id: string): Tracker<number> | Tracker<Vector> {
    return this.numberTrackers.get(id) || this.vectorTrackers.get(id)!;
  }

  getAllNumberTrackers(): Iterable<Tracker<number>> {
    return this.numberTrackers.values();
  }

  getAllVectorTrackers(): Iterable<Tracker<Vector>> {
    return this.vectorTrackers.values();
  }

  /*==================================================
   * Connections
   *==================================================*/

  connectNumberTracker(
    trackerId: string,
    target: Value<number>,
    expression: string = 't',
  ) {
    // const bindingId = this.bindingidGenerator.id(trackerId, target.get().toString());
    const tracker = this.getNumberTracker(trackerId);
    if (!tracker) {
      throw new Error(`Tracker with id ${trackerId} does not exist.`);
    }
    var expr = this.parser.parse(expression);
    tracker.changed.connect((newval)=>{
      const newValue = expr.evaluate({ t: newval.get() });
      target.set(newValue);

    })
  }

    connectVectorTracker(
    trackerId: string,
    target: Value<Vector>,
    expression: string = 't',
  ) {
    // const bindingId = this.bindingidGenerator.id(trackerId, target.get().toString());
    const tracker = this.getVectorTracker(trackerId);
    if (!tracker) {
      throw new Error(`Tracker with id ${trackerId} does not exist.`);
    }
    var expr = this.parser.parse(expression);
    tracker.changed.connect((newval)=>{
      const x = expr.evaluate({ t: newval.get().x });
      const y = expr.evaluate({ t: newval.get().y });
      target.set({x: x, y: y});
    })
  }

  connect2NumberTrackers(
    sourceTrackerId: string,
    targetTrackerId: string,
    expression: string = 't',
  ): string{
    const sourceTracker = this.getNumberTracker(sourceTrackerId);
    const targetTracker = this.getNumberTracker(targetTrackerId);
    if (!sourceTracker || !targetTracker) {
      throw new Error(`One or both trackers with ids ${sourceTrackerId} and ${targetTrackerId} do not exist.`);
    }
    const expr = this.parser.parse(expression);
    const binding = new TrackerBinding(
      this.bindingidGenerator.id(sourceTrackerId, targetTrackerId),
      sourceTracker,
      targetTracker,
      expr
    );
    this.bindings.set(binding.id, binding);
    return binding.id;
  }


  connectNumberToVector(
    trackerId: string,
    target: Value<Vector>,
    axis: "x" | "y",
    expression: string,
  ): string {}

  connectVectorToNumber(
    trackerId: string,
    target: Value<number>,
    expression: string,
  ): string {}

  connectVectorToVector(
    trackerId: string,
    target: Value<Vector>,
    expression: string,
  ): string {}

  disconnect(bindingId: string): void{};

  disconnectTracker(trackerId: string): void{};

  disconnectTarget(target: Value<any>): void{};

  /*==================================================
   * Dependency Graph
   *==================================================*/

  evaluate(){}: void;

  evaluateTracker(id: string): void{};

  detectCycle(): boolean{};

  rebuildIndependentFlags(): void{};

  /*==================================================
   * Deletion
   *==================================================*/

  removeMobject(mobject: Mobject): void;

  clear(): void;
}
class TrackerBinding {
  constructor(
    readonly id: string,
    readonly source: Tracker<number>| Tracker<Vector>,
    readonly target: Tracker<number>| Tracker<Vector>,
    readonly expression: Expression,
    readonly axis?: "x" | "y",
  ) {
    if (this.axis) {}
    this.source.changed.connect((newval)=>{
     const result = expression.evaluate({ t: newval.get() });
     this.target.set(result);
    });
  }
}

class BindingIdGenerator {
  private map: Map<string, number> = new Map();

  id(source: string, target: string): string {
    this.map.set(source, (this.map.get(source) ?? 0) + 1);
    return `${source}->${target}#${this.map.get(source)}`;
  }
}
