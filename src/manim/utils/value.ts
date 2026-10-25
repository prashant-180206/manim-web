import { Range, Vector } from "./types";

export enum ValueType {
  number = "number",
  string = "string",
  boolean = "boolean",
  vector = "vector",
  vectorArray = "vectorArray",
  range = "range",
  color = "color",
  easing = "easing",
}

export class Value<T> {
  constructor(
    public value: T,
    private _type: ValueType = ValueType.number,
  ) {
    this.value = value;
  }
  get() {
    return this.value;
  }
  set(newValue: T) {
    this.value = newValue;
  }
  type() {
    return this._type;
  }
}

export class Values {
  static number(value: number) {
    return new Value<number>(value, ValueType.number);
  }

  static string(value: string) {
    return new Value<string>(value, ValueType.string);
  }

  static color(value: string) {
    return new Value<string>(value, ValueType.color);
  }

  static boolean(value: boolean) {
    return new Value<boolean>(value, ValueType.boolean);
  }

  static vector(value: Vector) {
    return new Value<Vector>(value, ValueType.vector);
  }

  static range(value: Range) {
    return new Value<Range>(value, ValueType.range);
  }

  static easing(value: (t: number) => number) {
    return new Value<(t: number) => number>(value, ValueType.easing);
  }

  static vectorArray(value: Vector[]) {
    return new Value<Vector[]>(value, ValueType.vectorArray);
  }
}
