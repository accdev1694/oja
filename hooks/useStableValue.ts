import { useRef } from "react";

/**
 * Returns a referentially stable version of a value.
 * Only updates the returned reference when the comparator says the value has changed.
 * Useful for Convex useQuery results that return new object references on every tick.
 */
export function useStableValue<T>(
  value: T,
  isEqual: (a: T, b: T) => boolean
): T {
  const ref = useRef(value);
  if (value !== ref.current && !isEqual(ref.current, value)) {
    ref.current = value;
  }
  return ref.current;
}

/**
 * Shallow equality check for Record<string, number> objects.
 * Handles undefined/null values (Convex queries return undefined while loading).
 */
export function shallowRecordEqual(
  a: Record<string, number> | undefined | null,
  b: Record<string, number> | undefined | null
): boolean {
  if (a === b) return true;
  if (!a || !b) return false;
  const keysA = Object.keys(a);
  const keysB = Object.keys(b);
  if (keysA.length !== keysB.length) return false;
  return keysA.every((key) => a[key] === b[key]);
}
