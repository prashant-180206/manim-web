import { Value, Values } from "./value";

/**
 * An easing function receives a normalized time (0 → 1)
 * and returns an eased progress (0 → 1).
 */
export type EasingFunction = Value<(t: number) => number>;

export class Easing {
  /** No easing */
  static readonly linear: EasingFunction = Values.easing((t) => t);

  /** Starts slow, ends fast */
  static readonly easeIn: EasingFunction = Values.easing((t) => t * t);

  /** Starts fast, ends slow */
  static readonly easeOut: EasingFunction = Values.easing(
    (t) => 1 - (1 - t) * (1 - t),
  );

  /** Slow → Fast → Slow */
  static readonly easeInOut: EasingFunction = Values.easing((t) =>
    t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2,
  );

  /** Slight overshoot at the end */
  static readonly backOut: EasingFunction = Values.easing((t) => {
    const c1 = 1.70158;
    const c3 = c1 + 1;

    return 1 + c3 * Math.pow(t - 1, 3) + c1 * Math.pow(t - 1, 2);
  });

  /** Bouncy finish */
  static readonly bounceOut: EasingFunction = Values.easing((t) => {
    const n1 = 7.5625;
    const d1 = 2.75;

    if (t < 1 / d1) {
      return n1 * t * t;
    } else if (t < 2 / d1) {
      t -= 1.5 / d1;
      return n1 * t * t + 0.75;
    } else if (t < 2.5 / d1) {
      t -= 2.25 / d1;
      return n1 * t * t + 0.9375;
    } else {
      t -= 2.625 / d1;
      return n1 * t * t + 0.984375;
    }
  });
}
