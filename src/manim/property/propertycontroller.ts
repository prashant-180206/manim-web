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

  getKeys(): (keyof T)[] {
    return Object.keys(this.properties) as (keyof T)[];
  }
}
