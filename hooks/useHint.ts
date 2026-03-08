import { useState, useEffect, useCallback } from 'react';
import { useMutation } from 'convex/react';
import { api } from '@/convex/_generated/api';
import { hintStorage, hasViewedHint as hasViewedHintLocal, markHintAsViewed, isHintsEnabled } from '@/lib/storage/hintStorage';
import { safeHaptics } from '@/lib/haptics/safeHaptics';

export function useHint(hintId: string, trigger: 'immediate' | 'delayed' | 'manual' = 'delayed') {
  const [shouldShow, setShouldShow] = useState(false);
  const recordHint = useMutation(api.tutorialHints.recordView);

  useEffect(() => {
    // Check if hints are globally disabled
    if (!isHintsEnabled()) {
      return;
    }

    // Check local storage first (instant, offline-friendly)
    if (hasViewedHintLocal(hintId)) {
      return;
    }

    // Trigger logic
    if (trigger === 'immediate') {
      setShouldShow(true);
    } else if (trigger === 'delayed') {
      const timer = setTimeout(() => setShouldShow(true), 2000);
      return () => clearTimeout(timer);
    }
    // 'manual' triggers require explicit showHint() call
  }, [hintId, trigger]);

  const dismiss = useCallback(() => {
    setShouldShow(false);

    // Write to local storage immediately
    markHintAsViewed(hintId);

    // Sync to Convex in background (fails gracefully if offline)
    recordHint({ hintId }).catch(console.warn);
  }, [hintId, recordHint]);

  const showHint = useCallback(() => {
    if (!isHintsEnabled() || hasViewedHintLocal(hintId)) {
      return;
    }
    setShouldShow(true);
  }, [hintId]);

  return {
    shouldShow,
    dismiss,
    showHint, // For manual triggers
  };
}
