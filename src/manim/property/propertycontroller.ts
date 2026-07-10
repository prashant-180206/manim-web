/*
|--------------------------------------------------------------------------
| PropertyController.ts
|--------------------------------------------------------------------------
*/

import { BaseProperty } from "./proprertytypes";

export class PropertyController<T extends BaseProperty = BaseProperty> {
  public properties: T;
  constructor(properties: T) {
    this.properties = properties;
  }

  getEntries(): [keyof T, T[keyof T]][] {
    return Object.entries(this.properties) as [keyof T, T[keyof T]][];
  }
}
