/*
|--------------------------------------------------------------------------
| sceneSerializer.ts
|--------------------------------------------------------------------------
|
| Converts a live scene into a plain JSON document and back. Everything that
| is part of the authored scene is covered: the mobject tree (including
| groups, visibility and locked state), every property value, timeline
| animations, trackers and their connections.
|
*/

import type { Scene } from "../scene";
import type { Mobject } from "../mobject/mobect";
import { MobjectName } from "../mobject/helpers/mobjectName";
import type { MobjectNode } from "../mobject/helpers/MobjectTree";
import { AnimationName } from "../animation/animationName";
import type { Animation } from "../animation/animation";
import type { AnimationInput } from "../animation/animationProvider";
import { Easing, type EasingFunction } from "../utils/easing";
import { Value, Values, ValueType } from "../utils/value";
import type { Range, Vector } from "../utils/types";
import { TrackerConnectionName } from "../tracker/trackerconnectorNames";

export const SCENE_FILE_FORMAT = "manim-web-scene";
export const SCENE_FILE_VERSION = 2;

/** Older files stored coordinates in pixels instead of world units. */
const LEGACY_PIXELS_PER_UNIT = 50;

export interface SerializedValue {
  type: ValueType;
  value: unknown;
}

export interface SerializedMobject {
  id: string;
  kind: MobjectName;
  name: string;
  visible: boolean;
  locked: boolean;
  properties: Record<string, SerializedValue>;
  children: SerializedMobject[];
}

export interface SerializedAnimation {
  targetId: string;
  name: AnimationName;
  start: number;
  duration: number;
  easing: string;
  params: Record<string, SerializedValue>;
}

export interface SerializedTracker {
  id: string;
  name: string;
  value: number;
}

export interface SerializedPropertyBinding {
  trackerId: string;
  mobjectId: string;
  property: TrackerConnectionName;
  expression: string;
}

export interface SerializedTrackerConnection {
  from: string;
  target: string;
  expression: string;
}

export interface SceneDocument {
  format: typeof SCENE_FILE_FORMAT;
  version: typeof SCENE_FILE_VERSION;
  name: string;
  savedAt: string;
  width: number;
  height: number;
  mobjects: SerializedMobject[];
  animations: SerializedAnimation[];
  trackers: SerializedTracker[];
  bindings: SerializedPropertyBinding[];
  trackerConnections: SerializedTrackerConnection[];
  timeline: {
    currentTime: number;
  };
}

export interface SceneRestoreSummary {
  mobjects: number;
  animations: number;
  trackers: number;
  bindings: number;
  trackerConnections: number;
}

/* -------------------------------------------------------------------------- */
/* Serialization                                                              */
/* -------------------------------------------------------------------------- */

function easingKeyOf(easing?: EasingFunction): string {
  if (!easing) return "linear";

  const fn = easing.get();
  const entry = Object.entries(Easing).find(
    ([, candidate]) => candidate.get() === fn,
  );

  return entry?.[0] ?? "linear";
}

function hasKey(object: object, key: string): boolean {
  return Object.prototype.hasOwnProperty.call(object, key);
}

function cloneValue(value: unknown): unknown {
  if (typeof value === "function") return value;

  return structuredClone(value);
}

function serializeValue(value: Value<unknown>): SerializedValue {
  if (value.type() === ValueType.easing) {
    return {
      type: ValueType.easing,
      value: easingKeyOf(value as EasingFunction),
    };
  }

  return { type: value.type(), value: cloneValue(value.get()) };
}

function serializeProperties(
  mobject: Mobject,
): Record<string, SerializedValue> {
  const properties = mobject.properties as unknown as Record<
    string,
    Value<unknown>
  >;
  const serialized: Record<string, SerializedValue> = {};

  for (const [key, value] of Object.entries(properties)) {
    serialized[key] = serializeValue(value);
  }

  return serialized;
}

function serializeNode(node: MobjectNode): SerializedMobject {
  return {
    id: node.mobject.id,
    kind: node.mobject.kind,
    name: node.mobject.name,
    visible: node.visible,
    locked: node.locked,
    properties: serializeProperties(node.mobject),
    children: node.children.map(serializeNode),
  };
}

function serializeAnimation(
  scene: Scene,
  animation: Animation,
): SerializedAnimation {
  const input = animation.input;
  const params: Record<string, SerializedValue> = {};

  if (input) {
    for (const [key, value] of Object.entries(input)) {
      if (key === "duration" || key === "easing") continue;
      if (!(value instanceof Value)) continue;

      params[key] = serializeValue(value as Value<unknown>);
    }
  }

  return {
    targetId: animation.target.id,
    name: animation.name,
    start: scene.animationSystem.getStart(animation.id),
    duration: animation.duration,
    easing: easingKeyOf(input?.easing),
    params,
  };
}

export function serializeScene(
  scene: Scene,
  name = "untitled.scene",
): SceneDocument {
  const trackers = [...scene.trackerSystem.getTrackerInfo()];

  return {
    format: SCENE_FILE_FORMAT,
    version: SCENE_FILE_VERSION,
    name,
    savedAt: new Date().toISOString(),
    width: scene.width,
    height: scene.height,
    mobjects: scene.mobjectManager.tree.roots.map(serializeNode),
    animations: [...scene.animationSystem.all()]
      .map((animation) => serializeAnimation(scene, animation))
      .sort((a, b) => a.start - b.start),
    trackers: trackers.map((meta) => ({
      id: meta.tracker.id,
      name: meta.tracker.name,
      value: meta.tracker.get(),
    })),
    bindings: trackers.flatMap((meta) =>
      [...meta.propertyConnections.values()].map((connection) => ({
        trackerId: connection.trackerId,
        mobjectId: connection.mobjectId,
        property: connection.property,
        expression: connection.expression.toString(),
      })),
    ),
    trackerConnections: trackers.flatMap((meta) =>
      [...meta.trackerConnections.values()].map((connection) => ({
        from: connection.from,
        target: connection.target,
        expression: connection.expression.toString(),
      })),
    ),
    timeline: {
      currentTime: scene.animationSystem.currentTime,
    },
  };
}

/* -------------------------------------------------------------------------- */
/* Validation                                                                 */
/* -------------------------------------------------------------------------- */

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function fail(message: string): never {
  throw new Error(`Invalid scene file: ${message}`);
}

function expectString(value: unknown, label: string): string {
  if (typeof value !== "string") fail(`${label} must be a string.`);
  return value;
}

function expectNumber(value: unknown, label: string): number {
  if (typeof value !== "number" || !Number.isFinite(value)) {
    fail(`${label} must be a finite number.`);
  }
  return value;
}

function expectBoolean(value: unknown, label: string): boolean {
  if (typeof value !== "boolean") fail(`${label} must be a boolean.`);
  return value;
}

function expectArray(value: unknown, label: string): unknown[] {
  if (!Array.isArray(value)) fail(`${label} must be an array.`);
  return value;
}

function isVector(value: unknown): value is Vector {
  return (
    isRecord(value) &&
    typeof value.x === "number" &&
    typeof value.y === "number"
  );
}

function isRange(value: unknown): value is Range {
  return (
    isRecord(value) &&
    typeof value.min === "number" &&
    typeof value.max === "number"
  );
}

function validateValue(value: unknown, label: string): SerializedValue {
  if (!isRecord(value)) fail(`${label} must be an object.`);

  const type = value.type;
  const payload = value.value;

  if (!Object.values(ValueType).includes(type as ValueType)) {
    fail(`${label}.type is not a known value type.`);
  }

  switch (type as ValueType) {
    case ValueType.number:
      expectNumber(payload, `${label}.value`);
      break;
    case ValueType.string:
    case ValueType.color:
      expectString(payload, `${label}.value`);
      break;
    case ValueType.boolean:
      expectBoolean(payload, `${label}.value`);
      break;
    case ValueType.vector:
      if (!isVector(payload)) fail(`${label}.value must be a vector.`);
      break;
    case ValueType.range:
      if (!isRange(payload)) fail(`${label}.value must be a range.`);
      break;
    case ValueType.vectorArray:
      if (!expectArray(payload, `${label}.value`).every(isVector)) {
        fail(`${label}.value must be an array of vectors.`);
      }
      break;
    case ValueType.easing: {
      const key = expectString(payload, `${label}.value`);
      if (!hasKey(Easing, key)) fail(`${label}.value is not a known easing.`);
      break;
    }
  }

  return { type: type as ValueType, value: payload };
}

const mobjectKinds = new Set<string>(Object.values(MobjectName));
const animationNames = new Set<string>(Object.values(AnimationName));
const connectorNames = new Set<string>(
  Object.values(TrackerConnectionName),
);

function validateMobject(
  value: unknown,
  label: string,
  ids: Set<string>,
): SerializedMobject {
  if (!isRecord(value)) fail(`${label} must be an object.`);

  const id = expectString(value.id, `${label}.id`);

  if (ids.has(id)) fail(`duplicate mobject id '${id}'.`);
  ids.add(id);

  if (!mobjectKinds.has(expectString(value.kind, `${label}.kind`))) {
    fail(`${label}.kind '${String(value.kind)}' is not a known mobject.`);
  }

  const name = expectString(value.name, `${label}.name`);

  if (!isRecord(value.properties)) {
    fail(`${label}.properties must be an object.`);
  }

  const properties: Record<string, SerializedValue> = {};

  for (const [key, property] of Object.entries(value.properties)) {
    properties[key] = validateValue(property, `${label}.properties.${key}`);
  }

  const children = expectArray(value.children, `${label}.children`).map(
    (child, index) => validateMobject(child, `${label}.children[${index}]`, ids),
  );

  if (value.kind !== MobjectName.Group && children.length > 0) {
    fail(`${label} is not a Group and cannot have children.`);
  }

  return {
    id,
    kind: value.kind as MobjectName,
    name,
    visible: expectBoolean(value.visible, `${label}.visible`),
    locked: expectBoolean(value.locked, `${label}.locked`),
    properties,
    children,
  };
}

/**
 * Validate an unknown JSON payload and return a typed scene document.
 * Throws a descriptive error when the file is not a supported scene.
 */
export function parseSceneDocument(input: unknown): SceneDocument {
  let data = input;

  if (typeof data === "string") {
    try {
      data = JSON.parse(data);
    } catch {
      fail("the file is not valid JSON.");
    }
  }

  if (!isRecord(data)) fail("the root must be an object.");
  if (data.format !== SCENE_FILE_FORMAT) {
    fail(`expected a '${SCENE_FILE_FORMAT}' document.`);
  }
  const version = data.version;

  if (
    typeof version !== "number" ||
    !Number.isInteger(version) ||
    version < 1 ||
    version > SCENE_FILE_VERSION
  ) {
    fail(
      `unsupported version '${String(data.version)}' (expected 1–${SCENE_FILE_VERSION}).`,
    );
  }

  const ids = new Set<string>();
  const mobjects = expectArray(data.mobjects, "mobjects").map(
    (mobject, index) => validateMobject(mobject, `mobjects[${index}]`, ids),
  );

  const animations = expectArray(data.animations, "animations").map(
    (value, index) => {
      const label = `animations[${index}]`;

      if (!isRecord(value)) fail(`${label} must be an object.`);

      const name = expectString(value.name, `${label}.name`);
      if (!animationNames.has(name)) {
        fail(`${label}.name '${name}' is not a known animation.`);
      }

      const targetId = expectString(value.targetId, `${label}.targetId`);
      if (!ids.has(targetId)) {
        fail(`${label}.targetId '${targetId}' does not exist.`);
      }

      if (!isRecord(value.params)) {
        fail(`${label}.params must be an object.`);
      }

      const easing = expectString(value.easing, `${label}.easing`);
      if (!hasKey(Easing, easing)) {
        fail(`${label}.easing '${easing}' is not a known easing.`);
      }

      const params: Record<string, SerializedValue> = {};

      for (const [key, param] of Object.entries(value.params)) {
        params[key] = validateValue(param, `${label}.params.${key}`);
      }

      return {
        targetId,
        name: name as AnimationName,
        start: Math.max(0, expectNumber(value.start, `${label}.start`)),
        duration: Math.max(0.0001, expectNumber(value.duration, `${label}.duration`)),
        easing,
        params,
      };
    },
  );

  const trackerIds = new Set<string>();
  const trackers = expectArray(data.trackers, "trackers").map(
    (value, index) => {
      const label = `trackers[${index}]`;

      if (!isRecord(value)) fail(`${label} must be an object.`);

      const id = expectString(value.id, `${label}.id`);

      if (trackerIds.has(id)) fail(`duplicate tracker id '${id}'.`);
      trackerIds.add(id);

      return {
        id,
        name: expectString(value.name, `${label}.name`),
        value: expectNumber(value.value, `${label}.value`),
      };
    },
  );

  const bindings = expectArray(data.bindings, "bindings").map(
    (value, index) => {
      const label = `bindings[${index}]`;

      if (!isRecord(value)) fail(`${label} must be an object.`);

      const trackerId = expectString(value.trackerId, `${label}.trackerId`);
      if (!trackerIds.has(trackerId)) {
        fail(`${label}.trackerId '${trackerId}' does not exist.`);
      }

      const mobjectId = expectString(value.mobjectId, `${label}.mobjectId`);
      if (!ids.has(mobjectId)) {
        fail(`${label}.mobjectId '${mobjectId}' does not exist.`);
      }

      const property = expectString(value.property, `${label}.property`);
      if (!connectorNames.has(property)) {
        fail(`${label}.property '${property}' is not a known connector.`);
      }

      return {
        trackerId,
        mobjectId,
        property: property as TrackerConnectionName,
        expression: expectString(value.expression, `${label}.expression`),
      };
    },
  );

  const trackerConnections = expectArray(
    data.trackerConnections,
    "trackerConnections",
  ).map((value, index) => {
    const label = `trackerConnections[${index}]`;

    if (!isRecord(value)) fail(`${label} must be an object.`);

    const from = expectString(value.from, `${label}.from`);
    const target = expectString(value.target, `${label}.target`);

    if (!trackerIds.has(from)) {
      fail(`${label}.from '${from}' does not exist.`);
    }
    if (!trackerIds.has(target)) {
      fail(`${label}.target '${target}' does not exist.`);
    }

    return {
      from,
      target,
      expression: expectString(value.expression, `${label}.expression`),
    };
  });

  const timeline = isRecord(data.timeline) ? data.timeline : {};
  const currentTime = timeline.currentTime;

  const document: SceneDocument = {
    format: SCENE_FILE_FORMAT,
    version: SCENE_FILE_VERSION,
    name:
      typeof data.name === "string" && data.name.trim()
        ? data.name
        : "untitled.scene",
    savedAt:
      typeof data.savedAt === "string" ? data.savedAt : new Date(0).toISOString(),
    width: typeof data.width === "number" ? data.width : 0,
    height: typeof data.height === "number" ? data.height : 0,
    mobjects,
    animations,
    trackers,
    bindings,
    trackerConnections,
    timeline: {
      currentTime:
        typeof currentTime === "number" && Number.isFinite(currentTime)
          ? Math.max(0, currentTime)
          : 0,
    },
  };

  return version === 1 ? migrateSceneDocumentV1(document) : document;
}

/* -------------------------------------------------------------------------- */
/* Version migration                                                          */
/* -------------------------------------------------------------------------- */

function legacyPointToWorld(
  point: Vector,
  width: number,
  height: number,
): Vector {
  return {
    x: (point.x - width / 2) / LEGACY_PIXELS_PER_UNIT,
    y: (height / 2 - point.y) / LEGACY_PIXELS_PER_UNIT,
  };
}

function migrateMobjectV1(
  mobject: SerializedMobject,
  width: number,
  height: number,
): SerializedMobject {
  const properties: Record<string, SerializedValue> = {};

  for (const [key, property] of Object.entries(mobject.properties)) {
    let next = property;

    if (
      key === "position" &&
      property.type === ValueType.vector &&
      isVector(property.value)
    ) {
      next = {
        ...property,
        value: legacyPointToWorld(property.value, width, height),
      };
    } else if (
      (key === "color" || key === "strokeColor") &&
      property.type === ValueType.string
    ) {
      next = { ...property, type: ValueType.color };
    } else if (
      key === "vertices" &&
      property.type === ValueType.vectorArray &&
      Array.isArray(property.value)
    ) {
      next = {
        ...property,
        value: property.value.map((point) =>
          isVector(point)
            ? {
                x: point.x / LEGACY_PIXELS_PER_UNIT,
                y: -point.y / LEGACY_PIXELS_PER_UNIT,
              }
            : point,
        ),
      };
    } else if (
      (key === "radius" || key === "width" || key === "height") &&
      typeof property.value === "number"
    ) {
      next = {
        ...property,
        value: property.value / LEGACY_PIXELS_PER_UNIT,
      };
    }

    // strokeWidth is a screen style and stays in CSS pixels.
    properties[key] = next;
  }

  return {
    ...mobject,
    properties,
    children: mobject.children.map((child) =>
      migrateMobjectV1(child, width, height),
    ),
  };
}

function migrateSceneDocumentV1(document: SceneDocument): SceneDocument {
  return {
    ...document,
    mobjects: document.mobjects.map((mobject) =>
      migrateMobjectV1(mobject, document.width, document.height),
    ),
    animations: document.animations.map((animation) => ({
      ...animation,
      params: Object.fromEntries(
        Object.entries(animation.params).map(([key, param]) => {
          if (
            key === "position" &&
            param.type === ValueType.vector &&
            isVector(param.value)
          ) {
            return [
              key,
              {
                ...param,
                value: legacyPointToWorld(
                  param.value,
                  document.width,
                  document.height,
                ),
              } satisfies SerializedValue,
            ];
          }

          return [key, param];
        }),
      ),
    })),
  };
}

/* -------------------------------------------------------------------------- */
/* Deserialization                                                            */
/* -------------------------------------------------------------------------- */

function deserializeValue(data: SerializedValue, label: string): Value<unknown> {
  switch (data.type) {
    case ValueType.number:
      return Values.number(data.value as number);
    case ValueType.string:
      return Values.string(data.value as string);
    case ValueType.boolean:
      return Values.boolean(data.value as boolean);
    case ValueType.vector:
      return Values.vector(data.value as Vector);
    case ValueType.range:
      return Values.range(data.value as Range);
    case ValueType.vectorArray:
      return Values.vectorArray(data.value as Vector[]);
    case ValueType.color:
      return new Value<string>(data.value as string, ValueType.color);
    case ValueType.easing:
      return Easing[data.value as keyof typeof Easing];
    default:
      fail(`${label} has an unsupported value type.`);
  }
}

function applyProperties(
  mobject: Mobject,
  properties: Record<string, SerializedValue>,
): void {
  const target = mobject.properties as unknown as Record<
    string,
    Value<unknown>
  >;

  for (const [key, data] of Object.entries(properties)) {
    const property = target[key];

    if (!property) {
      fail(`mobject '${mobject.id}' has no '${key}' property.`);
    }

    if (property.type() !== data.type) {
      fail(
        `mobject '${mobject.id}' property '${key}' expects '${property.type()}', got '${data.type}'.`,
      );
    }

    property.set(deserializeValue(data, `mobject.${key}`).get());
  }
}

function deserializeAnimationInput(
  animation: SerializedAnimation,
): AnimationInput {
  const input: AnimationInput = {
    duration: Values.number(animation.duration),
    easing: Easing[animation.easing as keyof typeof Easing] ?? Easing.linear,
  };

  for (const [key, data] of Object.entries(animation.params)) {
    input[key] = deserializeValue(
      data,
      `animation.${animation.name}.${key}`,
    ) as AnimationInput[string];
  }

  return input;
}

/** Remove every mobject, animation and tracker from the scene. */
export function clearScene(scene: Scene): void {
  scene.animationSystem.clear();
  scene.trackerSystem.clear();

  for (const root of [...scene.mobjectManager.tree.roots]) {
    scene.mobjectManager.delete(root.mobject);
  }

  scene.selection.editingSelection.clear();
  scene.selection.selectMobject(null);
  scene.mobjectManager.onTreeChanged.emit();
}

/**
 * Replace the scene's contents with a saved document. On failure the scene is
 * left empty instead of containing a half-restored document.
 */
export function applyScene(
  scene: Scene,
  document: SceneDocument,
): SceneRestoreSummary {
  clearScene(scene);

  const mobjects = new Map<string, Mobject>();

  try {
    const restoreNodes = (
      nodes: SerializedMobject[],
      parentId: string | null,
    ) => {
      for (const data of nodes) {
        const mobject = scene.mobjectManager.restore(
          data.kind,
          data.id,
          data.name,
        );

        if (parentId) {
          scene.mobjectManager.addToGroup(parentId, mobject);
        }

        const node = scene.mobjectManager.getNode(data.id);

        node.visible = data.visible;
        node.locked = data.locked;

        applyProperties(mobject, data.properties);
        mobjects.set(data.id, mobject);

        restoreNodes(data.children, data.id);
      }
    };

    restoreNodes(document.mobjects, null);

    for (const data of document.animations) {
      const target = mobjects.get(data.targetId);

      if (!target) {
        fail(`animation target '${data.targetId}' was not restored.`);
      }

      const animation = target.animations.create(
        data.name,
        deserializeAnimationInput(data),
      );

      scene.animationSystem.restore(animation, data.start);
    }

    for (const tracker of document.trackers) {
      scene.trackerSystem.restoreTracker(
        tracker.id,
        tracker.name,
        tracker.value,
      );
    }

    for (const binding of document.bindings) {
      scene.trackerSystem.restorePropertyConnection(
        binding.trackerId,
        binding.mobjectId,
        binding.property,
        binding.expression,
      );
    }

    for (const connection of document.trackerConnections) {
      scene.trackerSystem.restoreTrackerConnection(
        connection.from,
        connection.target,
        connection.expression,
      );
    }

    scene.animationSystem.setCurrentTime(document.timeline.currentTime);
    scene.mobjectManager.onTreeChanged.emit();

    return {
      mobjects: mobjects.size,
      animations: document.animations.length,
      trackers: document.trackers.length,
      bindings: document.bindings.length,
      trackerConnections: document.trackerConnections.length,
    };
  } catch (error) {
    clearScene(scene);
    throw error;
  }
}
