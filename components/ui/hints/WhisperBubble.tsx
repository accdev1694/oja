/**
 * WhisperBubble — an ephemeral, floating hint tooltip.
 *
 * Replaces inline `TypewriterHint` call sites. Unlike the old static hint,
 * WhisperBubble:
 *  • consumes **zero layout space** (absolute-positioned inside its parent),
 *  • springs in with a typewriter text reveal + soft glow,
 *  • auto-dismisses after a short dwell, and
 *  • resurfaces after an idle window so users who missed it get a second look.
 *
 * After `maxCycles` appearances without the predicate flipping false, the hint
 * is "muted" (persisted via hintStorage) so it won't nag on future sessions.
 *
 * Usage:
 *   <View style={{ position: 'relative' }}>
 *     <WhisperBubble
 *       hintId="list/pick-store"
 *       text="Pick a store"
 *       visible={!hasStore}
 *       placement="above"
 *     />
 *     <Pressable>…</Pressable>
 *   </View>
 */

import React, { useEffect, useMemo, useRef, useState } from "react";
import { StyleSheet, Text, View } from "react-native";
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
  Easing,
} from "react-native-reanimated";
import { colors, spacing, borderRadius, typography } from "@/components/ui/glass";
import { safeHaptics } from "@/lib/haptics/safeHaptics";
import {
  bumpHintMuteCount,
  getHintMuteCount,
  resetHintMute,
} from "@/lib/storage/hintStorage";
import { useIdleResurface } from "@/hooks/useIdleResurface";

// ─────────────────────────────────────────────────────────────────────────────
// Tunables
// ─────────────────────────────────────────────────────────────────────────────

const TYPEWRITER_SPEED = 38; // ms per character
const BUBBLE_MAX_WIDTH = 240;
const MUTE_THRESHOLD = 2; // after this many completed cycles, stop showing forever
const ARROW_SIZE = 7;

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

export interface WhisperBubbleProps {
  /** Stable id used for persisting the "two-strike quiet" counter. */
  hintId: string;
  /** The hint text. Keep it short — one short phrase. */
  text: string;
  /** While true the bubble cycles appear → dwell → disappear → wait → … */
  visible: boolean;
  /** Where the bubble sits relative to the target. Default: above. */
  placement?: "above" | "below";
  /** Horizontal alignment of the arrow tail relative to the bubble. */
  arrowAlign?: "left" | "center" | "right";
  /** Extra vertical offset from the target edge (px). Default 6. */
  offset?: number;
  /** Override the idle delay between appearances (ms). Default 12_000. */
  resurfaceDelay?: number;
  /** Maximum appearances per mount before muting. Default 3. */
  maxCycles?: number;
}

// ─────────────────────────────────────────────────────────────────────────────
// Component
// ─────────────────────────────────────────────────────────────────────────────

export const WhisperBubble = React.memo(function WhisperBubble({
  hintId,
  text,
  visible,
  placement = "above",
  arrowAlign = "center",
  offset = 6,
  resurfaceDelay = 12_000,
  maxCycles = 3,
}: WhisperBubbleProps) {
  // Mute check: read once on mount.
  const initiallyMuted = useMemo(() => getHintMuteCount(hintId) >= MUTE_THRESHOLD, [hintId]);

  // Track whether the user has "succeeded" (visible flipped to false at least
  // once during this mount). If they did, we never want to bump the mute count.
  const successRef = useRef(false);
  // Track whether all cycles completed without success, so we bump exactly once.
  const bumpedRef = useRef(false);

  const enabled = visible && !initiallyMuted;
  const { phase, cycle } = useIdleResurface({
    enabled,
    resurfaceDelay,
    maxCycles,
  });

  // User "succeeded" → predicate flipped to false while the bubble was alive.
  // Clear any prior mute so the hint is available next time the condition
  // recurs (e.g. a fresh list with no store picked yet).
  useEffect(() => {
    if (!visible && cycle > 0) {
      successRef.current = true;
      resetHintMute(hintId);
    }
  }, [visible, cycle, hintId]);

  // When all cycles have elapsed without user action, bump the mute counter
  // exactly once. Two consecutive "ignored" mounts silence this hint for good.
  useEffect(() => {
    if (
      !bumpedRef.current &&
      !successRef.current &&
      cycle >= maxCycles &&
      phase === "hidden"
    ) {
      bumpHintMuteCount(hintId);
      bumpedRef.current = true;
    }
  }, [cycle, maxCycles, phase, hintId]);

  // Haptic on the first appearance only.
  useEffect(() => {
    if (phase === "entering" && cycle === 0) {
      safeHaptics.light();
    }
  }, [phase, cycle]);

  // Reanimated: entrance/exit.
  const opacity = useSharedValue(0);
  const translate = useSharedValue(6);
  const scale = useSharedValue(0.9);

  useEffect(() => {
    const travel = placement === "above" ? 6 : -6;
    switch (phase) {
      case "entering":
        opacity.value = withTiming(1, { duration: 220, easing: Easing.out(Easing.cubic) });
        translate.value = withSpring(0, { damping: 14, stiffness: 180, mass: 0.6 });
        scale.value = withSpring(1, { damping: 14, stiffness: 180, mass: 0.6 });
        break;
      case "visible":
        // Steady state — nothing to animate.
        break;
      case "exiting":
        opacity.value = withTiming(0, { duration: 240, easing: Easing.in(Easing.cubic) });
        translate.value = withTiming(-travel, { duration: 240, easing: Easing.in(Easing.cubic) });
        scale.value = withTiming(0.96, { duration: 240 });
        break;
      case "hidden":
        opacity.value = 0;
        translate.value = travel;
        scale.value = 0.9;
        break;
    }
  }, [phase, placement, opacity, translate, scale]);

  const animatedStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
    transform: [{ translateY: translate.value }, { scale: scale.value }],
  }));

  // Typewriter reveal — resets every entrance.
  const [charIndex, setCharIndex] = useState(0);
  useEffect(() => {
    if (phase === "entering" || phase === "visible") {
      if (phase === "entering") setCharIndex(0);
      if (charIndex >= text.length) return;
      const t = setTimeout(() => setCharIndex((i) => i + 1), TYPEWRITER_SPEED);
      return () => clearTimeout(t);
    }
    if (phase === "hidden") {
      setCharIndex(0);
    }
  }, [phase, charIndex, text.length]);

  // Don't render at all when fully hidden — cheaper and avoids stray pointer
  // events on inactive rows.
  if (phase === "hidden") return null;

  const placementStyle =
    placement === "above"
      ? ({ bottom: "100%" as const, marginBottom: offset } as const)
      : ({ top: "100%" as const, marginTop: offset } as const);

  return (
    <View pointerEvents="none" style={[styles.anchor, placementStyle]}>
      <Animated.View style={[styles.bubble, animatedStyle]}>
        <Text style={styles.text} numberOfLines={1}>
          {text.split("").map((char, i) => {
            const isActive = i === charIndex - 1;
            const isVisible = i < charIndex;
            return (
              <Text
                key={i}
                style={{
                  color: isVisible ? colors.accent.primary : "transparent",
                  fontWeight: isActive ? "700" : "500",
                  textShadowColor: isActive ? colors.accent.primary : "transparent",
                  textShadowOffset: { width: 0, height: 0 },
                  textShadowRadius: isActive ? 6 : 0,
                }}
              >
                {char}
              </Text>
            );
          })}
        </Text>
        <View
          style={[
            styles.arrowBase,
            placement === "above" ? styles.arrowDown : styles.arrowUp,
            arrowAlign === "left" && styles.arrowLeft,
            arrowAlign === "center" && styles.arrowCenter,
            arrowAlign === "right" && styles.arrowRight,
          ]}
        />
      </Animated.View>
    </View>
  );
});

// ─────────────────────────────────────────────────────────────────────────────
// Styles
// ─────────────────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  anchor: {
    position: "absolute",
    left: 0,
    right: 0,
    alignItems: "center",
    zIndex: 50,
    elevation: 12,
  },
  bubble: {
    maxWidth: BUBBLE_MAX_WIDTH,
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.md,
    borderRadius: borderRadius.full,
    backgroundColor: "rgba(13, 21, 40, 0.92)",
    borderWidth: 1,
    borderColor: "rgba(0, 212, 170, 0.35)",
    // Soft accent glow
    shadowColor: colors.accent.primary,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.5,
    shadowRadius: 10,
  },
  text: {
    ...typography.labelSmall,
    color: colors.accent.primary,
    textAlign: "center",
    fontSize: 11,
    letterSpacing: 0.2,
  },
  arrowBase: {
    position: "absolute",
    width: 0,
    height: 0,
    borderStyle: "solid",
  },
  arrowDown: {
    bottom: -ARROW_SIZE,
    borderLeftWidth: ARROW_SIZE,
    borderRightWidth: ARROW_SIZE,
    borderTopWidth: ARROW_SIZE,
    borderLeftColor: "transparent",
    borderRightColor: "transparent",
    borderTopColor: "rgba(0, 212, 170, 0.35)",
  },
  arrowUp: {
    top: -ARROW_SIZE,
    borderLeftWidth: ARROW_SIZE,
    borderRightWidth: ARROW_SIZE,
    borderBottomWidth: ARROW_SIZE,
    borderLeftColor: "transparent",
    borderRightColor: "transparent",
    borderBottomColor: "rgba(0, 212, 170, 0.35)",
  },
  arrowLeft: {
    left: spacing.lg,
  },
  arrowCenter: {
    alignSelf: "center",
  },
  arrowRight: {
    right: spacing.lg,
  },
});
