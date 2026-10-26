import { Tracker, type TrackerComponent } from "./tracker";
import { Expression, Parser, type Values as ExpressionScope } from "expr-eval";
import { Scene } from "../scene";
import { TrackerConnectionName } from "./trackerconnectorNames";
import { Connection, Signal } from "../events/signal";
import { Value, ValueType } from "../utils/value";
import { DependencyGraph } from "./dependencyGraph";
import { TrackerAnimationRegistry } from "./trackerAnimationRegistry";
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

/**
 * One expression rule: `target[.x|.y] = expression`.
 *
 * Expressions may reference tracker names directly (`tr2 + tr3`) and vector
 * components through member access (`tr2.x`). Rules are stored globally because
 * a single rule can depend on several source trackers.
 */
interface TrackerExpressionData {
  id: string;
  target: string;
  targetComponent: TrackerComponent | null;

  parsed: Expression;
  expressionText: string;

  /** Legacy `from` source exposed as `t` inside the expression. */
  primarySource: string | null;

  /** Alias used in the expression -> parent tracker id. */
  variableMap: Map<string, string>;

  /** Top-level tracker ids referenced by the expression. */
  sourceIds: string[];

  /** Scalar/component tracker ids whose signals re-evaluate the rule. */
  dependencies: string[];

  /** Scalar/component tracker ids written by the rule. */
  targetDependencies: string[];

  connections: Connection<[Value<number>]>[];
}

export interface TrackerExpressionDefinition {
  target: string;
  expression: string;
  /** Legacy primary source, made available as `t`. */
  from?: string;
  targetComponent?: TrackerComponent | null;
  /** Saved alias -> tracker id map, used when restoring a scene. */
  variables?: Record<string, string>;
}

export interface TrackerExpressionInfo {
  id: string;
  target: string;
  targetComponent: TrackerComponent | null;
  expression: string;
  sources: string[];
  variables: Record<string, string>;
  /** Legacy primary source exposed as `t`, if the rule was created that way. */
  from?: string;
}

export interface TrackerExpressionVariable {
  name: string;
  trackerId: string;
  isVector: boolean;
}

interface TrackerMeta {
  tracker: Tracker;

  propertyConnections: Map<string, PropertyConnectionData>;
}

interface ResolvedReferences {
  variableMap: Map<string, string>;
  sourceIds: Set<string>;
  dependencies: Set<string>;
  bareVectorAliases: Set<string>;
}

function sanitizeExpressionIdentifier(name: string): string {
  const base = name.trim().replace(/[^A-Za-z0-9_]/g, "_") || "tracker";

  return /^[0-9]/.test(base) ? `t_${base}` : base;
}

function graphEdgeKey(from: string, to: string): string {
  return `${from}->${to}`;
}

export class TrackerSystem {
  // Trackers
  private readonly trackers = new Map<string, TrackerMeta>();

  // Expression rules, keyed by connection id.
  private readonly expressions = new Map<string, TrackerExpressionData>();

  // Multiple rules may share a dependency edge; only remove it at zero.
  private readonly graphEdgeUses = new Map<string, number>();

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
    TrackerAnimationRegistry.registerBaseAnimations(tracker);

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
    TrackerAnimationRegistry.registerBaseAnimations(tracker);

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

    this.expressions.clear();
    this.graphEdgeUses.clear();
    this.graph.clear();
  }

  private getTrackerMeta(id: string): TrackerMeta {
    const meta = this.trackers.get(id);
    if (!meta) {
      throw new Error(`Tracker with id ${id} not found.`);
    }
    return meta;
  }

  /** Look up a tracker by id (including vector components). */
  findTracker(id: string): Tracker | undefined {
    return this.trackers.get(id)?.tracker;
  }

  removeTracker(id: string): void {
    const meta = this.trackers.get(id);

    // Trackers are also removed for deleted mobjects, which usually have no
    // tracker associated with their id.
    if (!meta) return;

    const components = meta.tracker.components;

    this.scene.animationSystem?.removeTarget(id);

    if (components) {
      this.scene.animationSystem?.removeTarget(components.x.id);
      this.scene.animationSystem?.removeTarget(components.y.id);
    }

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

    // Any expression rule that references or targets this tracker is removed
    // with it. Components and their parent are both matched.
    for (const rule of [...this.expressions.values()]) {
      if (this.expressionInvolvesTracker(rule, id)) {
        this.disconnectTrackers(rule.id);
      }
    }

    this.graph.removeNode(id);
    this.trackers.delete(id);
  }

  private expressionInvolvesTracker(
    rule: TrackerExpressionData,
    trackerId: string,
  ): boolean {
    return (
      rule.target === trackerId ||
      rule.primarySource === trackerId ||
      rule.dependencies.includes(trackerId) ||
      rule.targetDependencies.includes(trackerId) ||
      [...rule.variableMap.values()].includes(trackerId)
    );
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

    const targetValue = mobject.trackerConnector
      .getConnectorFactory(property)
      .getValue();

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

  /**
   * Legacy single-source link: `destination = expression(t)`.
   *
   * New code can use `setTrackerExpression()` for multi-source expressions.
   */
  connectTrackers(from: string, target: string, expression: string): string {
    return this.createTrackerExpression({ from, target, expression });
  }

  /** Create `target[.component] = expression` from tracker names. */
  setTrackerExpression(
    target: string,
    expression: string,
    targetComponent?: TrackerComponent | null,
  ): string {
    return this.createTrackerExpression({
      target,
      expression,
      targetComponent,
    });
  }

  restoreTrackerConnection(
    definition: TrackerExpressionDefinition,
  ): string {
    return this.createTrackerExpression(definition);
  }

  private createTrackerExpression(
    definition: TrackerExpressionDefinition,
  ): string {
    const targetMeta = this.getTrackerMeta(definition.target);
    const targetTracker = targetMeta.tracker;

    if (targetTracker.isComponent) {
      throw new Error(
        "Target the parent vector tracker and choose an x/y channel instead.",
      );
    }

    const targetComponent = definition.targetComponent ?? null;

    if (targetComponent && !targetTracker.isVector) {
      throw new Error(
        `Tracker '${targetTracker.name}' is numeric; it has no '${targetComponent}' component.`,
      );
    }

    const aliases = definition.variables
      ? this.aliasesFromVariableMap(definition.variables)
      : this.buildExpressionAliases();

    if (definition.from) {
      const primary = this.getTrackerMeta(definition.from).tracker;

      if (!aliases.has("t")) {
        aliases.set("t", primary);
      }
    }

    const expressionText = this.stripTargetAssignment(
      definition.expression,
      targetTracker,
      targetComponent,
      aliases,
    );

    let parsed: Expression;

    try {
      parsed = this.parser.parse(expressionText);
    } catch (error) {
      throw new Error(
        `Invalid tracker expression '${expressionText}': ${
          error instanceof Error ? error.message : String(error)
        }`,
      );
    }

    const references = this.resolveExpressionReferences(parsed, aliases);

    if (
      (!targetTracker.isVector || targetComponent) &&
      references.bareVectorAliases.size > 0
    ) {
      const names = [...references.bareVectorAliases].join(", ");

      throw new Error(
        `Vector tracker ${names} must be referenced as ${names}.x or ${names}.y in a numeric expression.`,
      );
    }

    const targetDependencies = this.targetDependencies(
      targetTracker,
      targetComponent,
    );

    for (const dependency of references.dependencies) {
      for (const targetDependency of targetDependencies) {
        if (this.graph.createsCycle(dependency, targetDependency)) {
          throw new Error("Tracker dependency cycle detected.");
        }
      }
    }

    const evaluate = (axis: TrackerComponent) =>
      this.evaluateExpression(
        parsed,
        references.variableMap,
        expressionText,
        axis,
      );

    const initial =
      targetTracker.isVector && !targetComponent
        ? { x: evaluate("x"), y: evaluate("y") }
        : { x: evaluate("x"), y: evaluate("x") };

    const id = this.ids.next("tconn_");
    const rule: TrackerExpressionData = {
      id,
      target: targetTracker.id,
      targetComponent,

      parsed,
      expressionText,

      primarySource: definition.from ?? null,
      variableMap: references.variableMap,
      sourceIds: [...references.sourceIds],
      dependencies: [...references.dependencies],
      targetDependencies,

      connections: [],
    };

    for (const dependency of references.dependencies) {
      const dependencyTracker = this.getTrackerMeta(dependency).tracker;

      rule.connections.push(
        dependencyTracker.changed.connect(() => {
          try {
            this.writeExpressionValue(rule, this.evaluateRule(rule));
          } catch (error) {
            console.error(
              `Tracker expression '${rule.expressionText}' failed:`,
              error,
            );
          }
        }),
      );
    }

    for (const dependency of references.dependencies) {
      for (const targetDependency of targetDependencies) {
        this.addGraphEdge(dependency, targetDependency);
      }
    }

    this.expressions.set(id, rule);
    this.writeExpressionValue(rule, initial);
    this.onConnectionsChanged.emit();

    return id;
  }

  private aliasesFromVariableMap(
    variables: Record<string, string>,
  ): Map<string, Tracker> {
    const aliases = new Map<string, Tracker>();

    for (const [alias, id] of Object.entries(variables)) {
      const tracker = this.getTrackerMeta(id).tracker;

      if (tracker.isComponent) {
        throw new Error(
          `Saved expression alias '${alias}' points at a component tracker.`,
        );
      }

      aliases.set(alias, tracker);
    }

    return aliases;
  }

  /**
   * Sanitised tracker names are the expression identifiers. Duplicate names get
   * a `_2`, `_3`, … suffix, and vector components are reached with `.x`/`.y`.
   */
  private buildExpressionAliases(): Map<string, Tracker> {
    const aliases = new Map<string, Tracker>();
    const used = new Set<string>();

    for (const meta of this.getTrackerInfo()) {
      const tracker = meta.tracker;
      const base = sanitizeExpressionIdentifier(tracker.name);

      let alias = base;
      let suffix = 2;

      while (used.has(alias)) {
        alias = `${base}_${suffix}`;
        suffix++;
      }

      used.add(alias);
      aliases.set(alias, tracker);
    }

    return aliases;
  }

  private stripTargetAssignment(
    expression: string,
    target: Tracker,
    targetComponent: TrackerComponent | null,
    aliases: Map<string, Tracker>,
  ): string {
    const trimmed = expression.trim();
    const match = trimmed.match(
      /^([A-Za-z_][A-Za-z0-9_]*)(?:\.([A-Za-z_][A-Za-z0-9_]*))?\s*=(?!=)\s*([\s\S]+)$/,
    );

    if (!match) return trimmed;

    const [, alias, member, right] = match;
    const tracker = aliases.get(alias);

    if (!tracker || tracker.id !== target.id) {
      throw new Error(
        `The left side of '${trimmed}' must be the target tracker '${target.name}'.`,
      );
    }

    if (member !== undefined && member !== "x" && member !== "y") {
      throw new Error("Only .x and .y component assignments are supported.");
    }

    if (targetComponent && member !== targetComponent) {
      throw new Error(
        `This rule targets ${target.name}.${targetComponent}; write that on the left side.`,
      );
    }

    if (!targetComponent && member !== undefined) {
      throw new Error(
        `Choose the '${member}' target channel instead of assigning to ${target.name}.${member}.`,
      );
    }

    return right.trim();
  }

  private resolveExpressionReferences(
    parsed: Expression,
    aliases: Map<string, Tracker>,
  ): ResolvedReferences {
    const references: ResolvedReferences = {
      variableMap: new Map(),
      sourceIds: new Set(),
      dependencies: new Set(),
      bareVectorAliases: new Set(),
    };

    for (const symbol of parsed.variables({ withMembers: true })) {
      const [alias, member, ...rest] = symbol.split(".");

      if (rest.length > 0) {
        throw new Error(`Unsupported tracker reference '${symbol}'.`);
      }

      const tracker = aliases.get(alias);

      if (!tracker) {
        throw new Error(
          `Unknown tracker '${alias}' in expression. Available trackers: ${[
            ...aliases.keys(),
          ].join(", ")}.`,
        );
      }

      if (member !== undefined) {
        if (member !== "x" && member !== "y") {
          throw new Error(
            `Tracker '${alias}' only exposes .x and .y components.`,
          );
        }

        if (!tracker.isVector) {
          throw new Error(
            `Tracker '${alias}' is numeric and has no .${member} component.`,
          );
        }

        references.dependencies.add(tracker.components![member].id);
      } else if (tracker.isVector) {
        references.bareVectorAliases.add(alias);
        references.dependencies.add(tracker.components!.x.id);
        references.dependencies.add(tracker.components!.y.id);
      } else {
        references.dependencies.add(tracker.id);
      }

      references.variableMap.set(alias, tracker.id);
      references.sourceIds.add(tracker.id);
    }

    return references;
  }

  private targetDependencies(
    tracker: Tracker,
    targetComponent: TrackerComponent | null,
  ): string[] {
    if (targetComponent) {
      return [tracker.components![targetComponent].id];
    }

    if (tracker.isVector) {
      return [tracker.components!.x.id, tracker.components!.y.id];
    }

    return [tracker.id];
  }

  private evaluateRule(rule: TrackerExpressionData): {
    x: number;
    y: number;
  } {
    const target = this.getTrackerMeta(rule.target).tracker;

    if (target.isVector && !rule.targetComponent) {
      return {
        x: this.evaluateExpression(
          rule.parsed,
          rule.variableMap,
          rule.expressionText,
          "x",
        ),
        y: this.evaluateExpression(
          rule.parsed,
          rule.variableMap,
          rule.expressionText,
          "y",
        ),
      };
    }

    const x = this.evaluateExpression(
      rule.parsed,
      rule.variableMap,
      rule.expressionText,
      "x",
    );

    return { x, y: x };
  }

  /**
   * Bare vector variables use the current axis, so `tr1 = tr2 + tr3` performs
   * component-wise vector arithmetic. Member access (`tr2.x`) always reads that
   * specific component.
   */
  private evaluateExpression(
    parsed: Expression,
    variableMap: Map<string, string>,
    expressionText: string,
    axis: TrackerComponent,
  ): number {
    const scope: ExpressionScope = {};

    for (const [alias, id] of variableMap) {
      const tracker = this.getTrackerMeta(id).tracker;

      if (tracker.isVector) {
        const components = tracker.components!;

        scope[alias] = {
          x: components.x.get(),
          y: components.y.get(),
          valueOf: () =>
            axis === "y" ? components.y.get() : components.x.get(),
        };
      } else {
        scope[alias] = tracker.get();
      }
    }

    const result = parsed.evaluate(scope);

    if (typeof result !== "number" || !Number.isFinite(result)) {
      throw new Error(
        `Tracker expression '${expressionText}' did not produce a finite number.`,
      );
    }

    return result;
  }

  private writeExpressionValue(
    rule: TrackerExpressionData,
    value: { x: number; y: number },
  ): void {
    const target = this.getTrackerMeta(rule.target).tracker;

    if (rule.targetComponent) {
      target.components![rule.targetComponent].set(value.x);
      return;
    }

    if (target.isVector) {
      target.setVector({ x: value.x, y: value.y });
      return;
    }

    target.set(value.x);
  }

  private addGraphEdge(from: string, to: string): void {
    const key = graphEdgeKey(from, to);
    const uses = this.graphEdgeUses.get(key) ?? 0;

    if (uses === 0) {
      this.graph.addEdge(from, to);
    }

    this.graphEdgeUses.set(key, uses + 1);
  }

  private removeGraphEdge(from: string, to: string): void {
    const key = graphEdgeKey(from, to);
    const uses = this.graphEdgeUses.get(key) ?? 0;

    if (uses <= 1) {
      this.graphEdgeUses.delete(key);
      this.graph.removeEdge(from, to);
      return;
    }

    this.graphEdgeUses.set(key, uses - 1);
  }

  disconnectTrackers(id: string): void {
    const rule = this.expressions.get(id);

    if (!rule) {
      throw new Error(`Tracker connection '${id}' not found.`);
    }

    for (const connection of rule.connections) {
      connection.disconnect();
    }

    for (const dependency of rule.dependencies) {
      for (const targetDependency of rule.targetDependencies) {
        this.removeGraphEdge(dependency, targetDependency);
      }
    }

    this.expressions.delete(id);
    this.onConnectionsChanged.emit();
  }

  /** Incoming expression rules, optionally filtered to one tracker. */
  getTrackerExpressions(targetId?: string): TrackerExpressionInfo[] {
    return [...this.expressions.values()]
      .filter((rule) => targetId === undefined || rule.target === targetId)
      .map((rule) => ({
        id: rule.id,
        target: rule.target,
        targetComponent: rule.targetComponent,
        expression: rule.expressionText,
        sources: [...rule.sourceIds],
        variables: Object.fromEntries(rule.variableMap),
        ...(rule.primarySource ? { from: rule.primarySource } : {}),
      }));
  }

  /** Tracker names usable in expressions, after identifier sanitising. */
  getExpressionVariables(): TrackerExpressionVariable[] {
    return [...this.buildExpressionAliases().entries()].map(
      ([name, tracker]) => ({
        name,
        trackerId: tracker.id,
        isVector: tracker.isVector,
      }),
    );
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
