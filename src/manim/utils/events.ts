/*
|--------------------------------------------------------------------------
| SceneEvents.ts
|--------------------------------------------------------------------------
|
| Global event hub for the editor.
|
|--------------------------------------------------------------------------
*/

type SceneEventMap = {
  selectionChanged: void;

  mobjectAdded: string;

  mobjectRemoved: string;

  animationAdded: string;

  animationRemoved: string;

  trackerAdded: string;

  trackerRemoved: string;

  propertyChanged: string;
};

type Listener<T> = (payload: T) => void;

export class SceneEvents {
  private listeners = new Map<keyof SceneEventMap, Set<Listener<any>>>();

  on<K extends keyof SceneEventMap>(
    event: K,
    listener: Listener<SceneEventMap[K]>,
  ): void {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, new Set());
    }

    this.listeners.get(event)!.add(listener);
  }

  off<K extends keyof SceneEventMap>(
    event: K,
    listener: Listener<SceneEventMap[K]>,
  ): void {
    this.listeners.get(event)?.delete(listener);
  }

  emit<K extends keyof SceneEventMap>(
    event: K,
    payload: SceneEventMap[K],
  ): void {
    this.listeners.get(event)?.forEach((listener) => listener(payload));
  }
}
