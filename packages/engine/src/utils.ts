/**
 * MFD Engine Utilities
 *
 * Shared pure functions used across engine systems.
 */

/** Clamp a value between min and max. */
export function cl(val: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, val));
}

/** Sum an array of numbers. */
export function sum(arr: readonly number[]): number {
  let s = 0;
  for (const v of arr) s += v;
  return s;
}

/** Average an array of numbers. Returns 0 for empty arrays. */
export function avg(arr: readonly number[]): number {
  return arr.length === 0 ? 0 : sum(arr) / arr.length;
}
