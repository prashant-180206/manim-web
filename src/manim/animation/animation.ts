/*
|--------------------------------------------------------------------------
| Animation.ts
|--------------------------------------------------------------------------
|
| Base class for every animation.
|
| Each animation controls ONE property.
|
|--------------------------------------------------------------------------
*/

/*
|--------------------------------------------------------------------------
| Files Required
|--------------------------------------------------------------------------
|
| ../mobjects/Mobject.ts
| ../properties/Property.ts
| ../values/Value.ts
|
|--------------------------------------------------------------------------
*/

// import { Mobject } from "../mobjects/Mobject";
import { Mobject } from "../mobject/mobect";
import { Property } from "../property/property";
import { Value } from "../utils/value";
// import { Property } from "../properties/Property";
// import { Value } from "../values/Value";

export abstract class Animation {
  readonly id: string;

  name: string;

  readonly target: Mobject;

  readonly property: Property<any>;

  duration: number;

  progress = 0;

  playing = false;

  constructor(
    id: string,
    name: string,
    target: Mobject,
    property: Property<any>,
    duration: number,
  ) {
    this.id = id;

    this.name = name;

    this.target = target;

    this.property = property;

    this.duration = duration;
  }

  /*
    |--------------------------------------------------------------------------
    | Playback
    |--------------------------------------------------------------------------
    */

  play(): void {
    this.playing = true;
  }

  pause(): void {
    this.playing = false;
  }

  stop(): void {
    this.playing = false;

    this.progress = 0;
  }

  seek(progress: number): void {
    this.progress = Math.max(0, Math.min(1, progress));

    this.apply(this.progress);
  }

  update(dt: number): void {
    if (!this.playing) {
      return;
    }

    this.progress += dt / this.duration;

    if (this.progress >= 1) {
      this.progress = 1;

      this.playing = false;
    }

    this.apply(this.progress);
  }

  /*
    |--------------------------------------------------------------------------
    | Interpolation
    |--------------------------------------------------------------------------
    */

  protected abstract interpolate(t: number): Value<any>;

  protected apply(t: number): void {
    this.property.setValue(this.interpolate(t));
  }
}
