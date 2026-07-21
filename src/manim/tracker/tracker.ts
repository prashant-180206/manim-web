import { Signal } from "../events/signal";
import { Value } from "../utils/value";

export class Tracker {
  readonly value: Value<number>;
  editable = true;
  name = "";

  private _id: string;
  public get id() {
    return this._id;
  }
  public set id(value) {
    this._id = value;
  }

  readonly changed = new Signal<[Value<number>]>();

  constructor(value: number, id: string) {
    this._id = id;
    this.value = new Value<number>(value);
  }

  set(newValue: number) {
    this.value.set(newValue);
    this.changed.emit(this.value);
  }

  get(): number {
    return this.value.get();
  }
}
