/*
|--------------------------------------------------------------------------
| Selection.ts
|--------------------------------------------------------------------------
|
| Responsible for maintaining the editor selection.
|
| The selection is NOT responsible for notifying the UI.
| Scene listens to selection changes and emits events.
|
|--------------------------------------------------------------------------
*/

/*
|--------------------------------------------------------------------------
| Files Required
|--------------------------------------------------------------------------
|
| ../mobjects/Mobject.ts
| ../animation/Animation.ts
| ../trackers/Tracker.ts
| ../properties/Property.ts
|
|--------------------------------------------------------------------------
*/

import { Animation } from "../animation/Animation";
import { Mobject } from "../mobjects/Mobject";
import { Property } from "../properties/Property";
import { Tracker } from "../trackers/Tracker";

export class Selection {
  activeMobject?: Mobject;

  activeAnimation?: Animation;

  activeTracker?: Tracker;

  activeProperty?: Property;

  selectMobject(mobject?: Mobject): void {
    this.clear();

    this.activeMobject = mobject;
  }

  selectAnimation(animation?: Animation): void {
    this.clear();

    this.activeAnimation = animation;
  }

  selectTracker(tracker?: Tracker): void {
    this.clear();

    this.activeTracker = tracker;
  }

  selectProperty(property?: Property): void {
    this.activeProperty = property;
  }

  clear(): void {
    this.activeMobject = undefined;
    this.activeAnimation = undefined;
    this.activeTracker = undefined;
    this.activeProperty = undefined;
  }
}
