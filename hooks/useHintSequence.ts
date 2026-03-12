import { useEffect } from "react";
import { hasViewedHint as hasViewedHintLocal } from "@/lib/storage/hintStorage";

type HintResult = {
  shouldShow: boolean;
  dismiss: () => void;
  showHint: () => void;
};

export type HintSequenceStep = {
  hint: HintResult;
  hintId: string;
  condition?: boolean;
};

/**
 * useHintSequence
 * 
 * Manages a sequence of tutorial hints, ensuring only one is visible at a time
 * and automatically triggering the next one when conditions are met.
 * 
 * @param steps Array of { hint, hintId, condition }
 * @param enabled Global enable flag for this sequence
 */
export function useHintSequence(steps: HintSequenceStep[], enabled: boolean = true) {
  useEffect(() => {
    if (!enabled) return;

    // 1. Check if ANY hint in the sequence is currently visible
    const anyVisible = steps.some(step => step.hint.shouldShow);
    if (anyVisible) return;

    // 2. Find the first hint in the sequence that:
    //    - Has not been viewed yet (local storage check)
    //    - Meets its specific activation condition
    for (const step of steps) {
      // If we find a hint that hasn't been viewed
      if (!hasViewedHintLocal(step.hintId)) {
        // If it meets its condition (defaults to true), show it and stop
        if (step.condition !== false) {
          step.hint.showHint();
        }
        // Even if condition is false, we stop here because we want STRICT sequence.
        // We don't want to skip to hint 3 if hint 2's condition isn't met yet.
        return;
      }
    }
  }, [
    enabled,
    // De-structure hints and conditions to ensure effect re-runs correctly
    ...steps.flatMap(s => [s.hint.shouldShow, s.condition, s.hintId])
  ]);
}
