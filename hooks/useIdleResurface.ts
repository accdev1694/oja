import { useEffect, useRef, useState } from "react";

/**
 * Drives an appear / dwell / disappear / wait cycle for ephemeral hints.
 *
 * Phases:
 *   hidden   → entering → visible → exiting → hidden → (wait) → entering …
 *
 * The cycle only runs while `enabled` is true. When `enabled` flips to false
 * (e.g. the user performed the hinted action), the phase immediately snaps
 * back to `hidden` so the caller can run its exit animation.
 *
 * The cycle also stops after `maxCycles` appearances so the hint does not nag
 * indefinitely.
 */

export type WhisperPhase = "hidden" | "entering" | "visible" | "exiting";

export interface UseIdleResurfaceOptions {
  enabled: boolean;
  /** Delay before the first appearance (ms). */
  initialDelay?: number;
  /** Duration of the entrance animation (ms). */
  enterDuration?: number;
  /** How long to stay visible once fully entered (ms). */
  dwellDuration?: number;
  /** Duration of the exit animation (ms). */
  exitDuration?: number;
  /** Idle window before resurfacing (ms). */
  resurfaceDelay?: number;
  /** Maximum number of appearances per mount. */
  maxCycles?: number;
}

const DEFAULTS: Required<Omit<UseIdleResurfaceOptions, "enabled">> = {
  initialDelay: 400,
  enterDuration: 260,
  dwellDuration: 3500,
  exitDuration: 260,
  resurfaceDelay: 12000,
  maxCycles: 3,
};

export function useIdleResurface({
  enabled,
  initialDelay = DEFAULTS.initialDelay,
  enterDuration = DEFAULTS.enterDuration,
  dwellDuration = DEFAULTS.dwellDuration,
  exitDuration = DEFAULTS.exitDuration,
  resurfaceDelay = DEFAULTS.resurfaceDelay,
  maxCycles = DEFAULTS.maxCycles,
}: UseIdleResurfaceOptions): { phase: WhisperPhase; cycle: number } {
  const [phase, setPhase] = useState<WhisperPhase>("hidden");
  const cycleRef = useRef(0);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (!enabled) {
      if (timerRef.current) clearTimeout(timerRef.current);
      timerRef.current = null;
      cycleRef.current = 0;
      setPhase("hidden");
      return;
    }

    let cancelled = false;
    const clear = () => {
      if (timerRef.current) clearTimeout(timerRef.current);
      timerRef.current = null;
    };

    const schedule = (next: WhisperPhase, delay: number) => {
      clear();
      timerRef.current = setTimeout(() => {
        if (cancelled) return;
        setPhase(next);
      }, delay);
    };

    // Drive the state machine in response to the current phase.
    switch (phase) {
      case "hidden": {
        if (cycleRef.current >= maxCycles) break;
        const delay = cycleRef.current === 0 ? initialDelay : resurfaceDelay;
        schedule("entering", delay);
        break;
      }
      case "entering": {
        cycleRef.current += 1;
        schedule("visible", enterDuration);
        break;
      }
      case "visible": {
        schedule("exiting", dwellDuration);
        break;
      }
      case "exiting": {
        schedule("hidden", exitDuration);
        break;
      }
    }

    return () => {
      cancelled = true;
      clear();
    };
  }, [phase, enabled, initialDelay, enterDuration, dwellDuration, exitDuration, resurfaceDelay, maxCycles]);

  return { phase, cycle: cycleRef.current };
}
