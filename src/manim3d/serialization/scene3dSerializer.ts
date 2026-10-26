import { ValueType } from "@/manim/utils/value";
import type { Value } from "@/manim/utils/value";
import type { Scene3D } from "../scene3d";
import type { Mobject3D } from "../mobject/mobject3d";
import { Mobject3DName } from "../mobject/helpers/mobject3dName";
import { clone3, type Vector3Data } from "../utils/types3d";

/*
|--------------------------------------------------------------------------
| scene3dSerializer.ts
|--------------------------------------------------------------------------
|
| The 3D scene file format and its document types. The 2D `manim-web-scene`
| v3 document is not extended with 3D fields: a file is either a 2D scene or
| a 3D scene, and each has its own version stream.
|
| Grouping and animation are not implemented for 3D yet, so `children` is
| always empty and `animations` must be empty. The shapes reserve room for
| both without changing the version later.
|
*/

export const SCENE3D_FILE_FORMAT = "manim-web-scene3d";
export const SCENE3D_FILE_VERSION = 1;

export interface SerializedValue3D {
  type: ValueType;
  value: unknown;
}

export interface SerializedMobject3D {
  id: string;
  kind: Mobject3DName;
  name: string;
  visible: boolean;
  locked: boolean;
  properties: Record<string, SerializedValue3D>;
  /**
   * Nested children. Grouping is not implemented for 3D scenes yet, so this is
   * always empty today; the recursive shape reserves the format for it.
   */
  children: SerializedMobject3D[];
}

export interface SerializedAnimation3D {
  targetId: string;
  name: string;
  start: number;
  duration: number;
  easing: string;
  params: Record<string, SerializedValue3D>;
}

export interface SerializedCamera3D {
  fov: number;
  target: Vector3Data;
}

export interface Scene3DDocument {
  format: typeof SCENE3D_FILE_FORMAT;
  version: typeof SCENE3D_FILE_VERSION;
  name: string;
  savedAt: string;
  width: number;
  height: number;
  camera: SerializedCamera3D;
  mobjects: SerializedMobject3D[];
  animations: SerializedAnimation3D[];
  timeline: {
    currentTime: number;
  };
}

export interface Scene3DApplySummary {
  mobjects: number;
}

/** Property schema used to validate known properties before mutating a scene. */
const BASE_PROPERTY_TYPES: Record<string, ValueType> = {
  opacity: ValueType.number,
  position: ValueType.vector,
  scale: ValueType.vector,
  rotation: ValueType.vector,
};

const KIND_PROPERTY_TYPES: Record<Mobject3DName, Record<string, ValueType>> = {
  [Mobject3DName.Sphere]: {
    radius: ValueType.number,
    color: ValueType.color,
  },
  [Mobject3DName.Box]: {
    width: ValueType.number,
    height: ValueType.number,
    depth: ValueType.number,
    color: ValueType.color,
  },
};

const SUPPORTED_VALUE_TYPES = new Set<ValueType>([
  ValueType.number,
  ValueType.string,
  ValueType.boolean,
  ValueType.color,
  ValueType.vector,
]);

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isFiniteNumber(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value);
}

function isVector3Data(value: unknown): value is Vector3Data {
  return (
    isRecord(value) &&
    isFiniteNumber(value.x) &&
    isFiniteNumber(value.y) &&
    isFiniteNumber(value.z)
  );
}

function cloneSerializableValue(value: unknown): unknown {
  if (Array.isArray(value)) {
    return value.map(cloneSerializableValue);
  }

  if (isRecord(value)) {
    const clone: Record<string, unknown> = {};

    for (const [key, entry] of Object.entries(value)) {
      clone[key] = cloneSerializableValue(entry);
    }

    return clone;
  }

  return value;
}

function serializeValue(value: Value<unknown>): SerializedValue3D {
  return {
    type: value.type(),
    value: cloneSerializableValue(value.get()),
  };
}

function serializeMobject3D(mobject: Mobject3D): SerializedMobject3D {
  const properties: Record<string, SerializedValue3D> = {};

  for (const [key, value] of Object.entries(mobject.properties)) {
    properties[key] = serializeValue(value as Value<unknown>);
  }

  return {
    id: mobject.id,
    kind: mobject.kind,
    name: mobject.name,
    visible: mobject.visible,
    locked: mobject.locked,
    properties,
    children: [],
  };
}

export function serializeScene3D(
  scene: Scene3D,
  name = "untitled.scene3d",
): Scene3DDocument {
  return {
    format: SCENE3D_FILE_FORMAT,
    version: SCENE3D_FILE_VERSION,
    name,
    savedAt: new Date().toISOString(),
    width: scene.width,
    height: scene.height,
    camera: {
      fov: scene.camera.camera.fov,
      target: clone3(scene.camera.target),
    },
    mobjects: scene.mobjectManager.all().map(serializeMobject3D),
    animations: [],
    timeline: { currentTime: 0 },
  };
}

function validateSerializedValue(
  path: string,
  input: unknown,
): SerializedValue3D {
  if (!isRecord(input)) {
    throw new Error(`${path} must be an object.`);
  }

  const type = input.type;

  if (
    typeof type !== "string" ||
    !SUPPORTED_VALUE_TYPES.has(type as ValueType)
  ) {
    throw new Error(`${path}.type is not a supported 3D value type.`);
  }

  const value = input.value;

  switch (type) {
    case ValueType.number:
      if (!isFiniteNumber(value)) {
        throw new Error(`${path}.value must be a finite number.`);
      }
      break;
    case ValueType.string:
    case ValueType.color:
      if (typeof value !== "string") {
        throw new Error(`${path}.value must be a string.`);
      }
      break;
    case ValueType.boolean:
      if (typeof value !== "boolean") {
        throw new Error(`${path}.value must be a boolean.`);
      }
      break;
    case ValueType.vector:
      if (!isVector3Data(value)) {
        throw new Error(`${path}.value must be an { x, y, z } vector.`);
      }
      break;
    default:
      throw new Error(`${path}.type is not supported in 3D scenes.`);
  }

  return { type: type as ValueType, value: cloneSerializableValue(value) };
}

function validateMobject3D(
  path: string,
  input: unknown,
  ids: Set<string>,
): SerializedMobject3D {
  if (!isRecord(input)) {
    throw new Error(`${path} must be an object.`);
  }

  const { id, kind, name, visible, locked, properties, children } = input;

  if (typeof id !== "string" || id.trim() === "") {
    throw new Error(`${path}.id must be a non-empty string.`);
  }

  if (ids.has(id)) {
    throw new Error(`${path}.id '${id}' is duplicated.`);
  }

  ids.add(id);

  if (
    typeof kind !== "string" ||
    !Object.values(Mobject3DName).includes(kind as Mobject3DName)
  ) {
    throw new Error(`${path}.kind '${String(kind)}' is not a known 3D mobject.`);
  }

  if (typeof name !== "string" || name.trim() === "") {
    throw new Error(`${path}.name must be a non-empty string.`);
  }

  if (typeof visible !== "boolean" || typeof locked !== "boolean") {
    throw new Error(`${path}.visible and ${path}.locked must be booleans.`);
  }

  if (children !== undefined) {
    if (!Array.isArray(children)) {
      throw new Error(`${path}.children must be an array.`);
    }

    if (children.length > 0) {
      throw new Error(
        `${path}.children is not empty, but 3D grouping is not supported yet.`,
      );
    }
  }

  if (!isRecord(properties)) {
    throw new Error(`${path}.properties must be an object.`);
  }

  const kindName = kind as Mobject3DName;
  const schema = {
    ...BASE_PROPERTY_TYPES,
    ...KIND_PROPERTY_TYPES[kindName],
  };
  const validatedProperties: Record<string, SerializedValue3D> = {};

  for (const requiredKey of [
    "opacity",
    "position",
    "scale",
    "rotation",
  ]) {
    if (!(requiredKey in properties)) {
      throw new Error(`${path}.properties.${requiredKey} is required.`);
    }
  }

  for (const [key, entry] of Object.entries(properties)) {
    const value = validateSerializedValue(
      `${path}.properties.${key}`,
      entry,
    );
    const expectedType = schema[key];

    if (expectedType && value.type !== expectedType) {
      throw new Error(
        `${path}.properties.${key} must be type '${expectedType}', got '${value.type}'.`,
      );
    }

    validatedProperties[key] = value;
  }

  const opacity = validatedProperties.opacity?.value;

  if (isFiniteNumber(opacity) && (opacity < 0 || opacity > 1)) {
    throw new Error(`${path}.properties.opacity must be between 0 and 1.`);
  }

  return {
    id,
    kind: kindName,
    name,
    visible,
    locked,
    properties: validatedProperties,
    children: [],
  };
}

/**
 * Validate and normalise an unknown input (object or JSON string). Nothing is
 * mutated here; `applyScene3D` calls this before clearing the live scene.
 */
export function parseScene3DDocument(input: unknown): Scene3DDocument {
  let data = input;

  if (typeof data === "string") {
    try {
      data = JSON.parse(data);
    } catch {
      throw new Error("The scene file is not valid JSON.");
    }
  }

  if (!isRecord(data)) {
    throw new Error("The scene document must be a JSON object.");
  }

  if (data.format !== SCENE3D_FILE_FORMAT) {
    throw new Error(
      `Unsupported scene format '${String(data.format)}'. Expected '${SCENE3D_FILE_FORMAT}'.`,
    );
  }

  if (data.version !== SCENE3D_FILE_VERSION) {
    throw new Error(
      `Unsupported 3D scene version '${String(data.version)}'. Expected ${SCENE3D_FILE_VERSION}.`,
    );
  }

  if (typeof data.name !== "string" || data.name.trim() === "") {
    throw new Error("The scene document must have a non-empty name.");
  }

  if (typeof data.savedAt !== "string") {
    throw new Error("The scene document must have a savedAt timestamp.");
  }

  if (!isFiniteNumber(data.width) || data.width <= 0) {
    throw new Error("The scene document width must be a positive number.");
  }

  if (!isFiniteNumber(data.height) || data.height <= 0) {
    throw new Error("The scene document height must be a positive number.");
  }

  if (!isRecord(data.camera)) {
    throw new Error("The scene document must have a camera object.");
  }

  if (
    !isFiniteNumber(data.camera.fov) ||
    data.camera.fov <= 0 ||
    data.camera.fov >= 180
  ) {
    throw new Error("camera.fov must be between 0 and 180 degrees.");
  }

  if (!isVector3Data(data.camera.target)) {
    throw new Error("camera.target must be an { x, y, z } vector.");
  }

  if (!Array.isArray(data.mobjects)) {
    throw new Error("The scene document must have a mobjects array.");
  }

  const ids = new Set<string>();
  const mobjects = data.mobjects.map((entry, index) =>
    validateMobject3D(`mobjects[${index}]`, entry, ids),
  );

  if (!Array.isArray(data.animations)) {
    throw new Error("The scene document must have an animations array.");
  }

  if (data.animations.length > 0) {
    throw new Error("3D animations are not supported yet.");
  }

  if (!isRecord(data.timeline) || !isFiniteNumber(data.timeline.currentTime)) {
    throw new Error("timeline.currentTime must be a finite number.");
  }

  return {
    format: SCENE3D_FILE_FORMAT,
    version: SCENE3D_FILE_VERSION,
    name: data.name,
    savedAt: data.savedAt,
    width: data.width,
    height: data.height,
    camera: {
      fov: data.camera.fov,
      target: clone3(data.camera.target),
    },
    mobjects,
    animations: [],
    timeline: { currentTime: Math.max(0, data.timeline.currentTime) },
  };
}

/**
 * Clear and restore a 3D scene. The document is validated before the scene is
 * touched; if restore fails part-way the scene is cleared so it is never left
 * half-built.
 */
export function applyScene3D(
  scene: Scene3D,
  input: unknown,
): Scene3DApplySummary {
  const document = parseScene3DDocument(input);

  scene.clear();

  try {
    for (const serialized of document.mobjects) {
      const mobject = scene.mobjectManager.restore(
        serialized.kind,
        serialized.id,
        serialized.name,
      );

      mobject.visible = serialized.visible;
      mobject.locked = serialized.locked;

      const properties = mobject.properties as unknown as Record<
        string,
        Value<unknown>
      >;

      for (const [key, serializedValue] of Object.entries(
        serialized.properties,
      )) {
        const property = properties[key];

        // Ignore properties this build does not know about. The document was
        // already validated, so every known property has a compatible type.
        if (!property) continue;

        property.set(cloneSerializableValue(serializedValue.value));
      }

      mobject.sync();
    }

    scene.camera.camera.fov = document.camera.fov;
    scene.camera.setTarget(document.camera.target);
    scene.render();

    return { mobjects: document.mobjects.length };
  } catch (error) {
    scene.clear();
    throw error;
  }
}

/** Remove every 3D mobject and clear the selection. */
export function clearScene3D(scene: Scene3D): void {
  scene.clear();
}

export function hasScene3DContent(scene: Scene3D): boolean {
  return scene.mobjectManager.all().length > 0;
}
