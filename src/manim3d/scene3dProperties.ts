import type { Vector3Data } from "./utils/types3d";

export interface Scene3DPropertiesData {
  backgroundColor: string;
  backgroundTransparent: boolean;
  gridVisible: boolean;
  gridSize: number;
  gridDivisions: number;
  gridColor: string;
  axesVisible: boolean;
  axesSize: number;
  ambientIntensity: number;
  ambientSkyColor: string;
  ambientGroundColor: string;
  keyLightIntensity: number;
  keyLightColor: string;
  keyLightPosition: Vector3Data;
  fillLightIntensity: number;
  fillLightColor: string;
  fillLightPosition: Vector3Data;
}

export const DEFAULT_SCENE3D_PROPERTIES: Scene3DPropertiesData = {
  backgroundColor: "#111318",
  backgroundTransparent: false,
  gridVisible: true,
  gridSize: 20,
  gridDivisions: 20,
  gridColor: "#2a2e39",
  axesVisible: true,
  axesSize: 5,
  ambientIntensity: 1.1,
  ambientSkyColor: "#c7d7ff",
  ambientGroundColor: "#2b2f3a",
  keyLightIntensity: 2.4,
  keyLightColor: "#ffffff",
  keyLightPosition: { x: 5, y: 8, z: 6 },
  fillLightIntensity: 0.7,
  fillLightColor: "#9db7ff",
  fillLightPosition: { x: -6, y: 3, z: 4 },
};

export class Scene3DProperties {
  private data: Scene3DPropertiesData;

  constructor(initial?: Partial<Scene3DPropertiesData>) {
    this.data = {
      ...DEFAULT_SCENE3D_PROPERTIES,
      ...initial,
      keyLightPosition: {
        ...DEFAULT_SCENE3D_PROPERTIES.keyLightPosition,
        ...initial?.keyLightPosition,
      },
      fillLightPosition: {
        ...DEFAULT_SCENE3D_PROPERTIES.fillLightPosition,
        ...initial?.fillLightPosition,
      },
    };
  }

  get(): Scene3DPropertiesData {
    return {
      ...this.data,
      keyLightPosition: { ...this.data.keyLightPosition },
      fillLightPosition: { ...this.data.fillLightPosition },
    };
  }

  set<K extends keyof Scene3DPropertiesData>(
    key: K,
    value: Scene3DPropertiesData[K],
  ): void {
    this.data[key] = value;
  }

  setMultiple(partial: Partial<Scene3DPropertiesData>): void {
    if (partial.keyLightPosition) {
      this.data.keyLightPosition = {
        ...this.data.keyLightPosition,
        ...partial.keyLightPosition,
      };
    }
    if (partial.fillLightPosition) {
      this.data.fillLightPosition = {
        ...this.data.fillLightPosition,
        ...partial.fillLightPosition,
      };
    }
    const { keyLightPosition, fillLightPosition, ...rest } = partial;
    Object.assign(this.data, rest);
  }

  reset(): void {
    this.data = {
      ...DEFAULT_SCENE3D_PROPERTIES,
      keyLightPosition: { ...DEFAULT_SCENE3D_PROPERTIES.keyLightPosition },
      fillLightPosition: { ...DEFAULT_SCENE3D_PROPERTIES.fillLightPosition },
    };
  }
}
