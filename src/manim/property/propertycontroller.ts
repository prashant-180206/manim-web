/*
|--------------------------------------------------------------------------
| PropertyController.ts
|--------------------------------------------------------------------------
*/

import { Property } from "./property";
import { PropertyKey } from "./propertykey";

export class PropertyController {
  private readonly properties = new Map<PropertyKey, Property<any>>();

  add<T>(property: Property<T>): void {
    this.properties.set(property.key, property);
  }

  remove(key: PropertyKey): void {
    this.properties.delete(key);
  }

  get<T>(key: PropertyKey): Property<T> | undefined {
    return this.properties.get(key) as Property<T> | undefined;
  }

  has(key: PropertyKey): boolean {
    return this.properties.has(key);
  }

  all(): IterableIterator<Property<any>> {
    return this.properties.values();
  }

  clear(): void {
    this.properties.clear();
  }
}
