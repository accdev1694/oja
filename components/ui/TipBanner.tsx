/**
 * TipBanner — ephemeral contextual tip card.
 *
 * Renders a dismissible card surfaced from the Convex tips system. The card
 * drives its own appear / dwell / collapse cycle:
 *
 *   • starts fully collapsed (zero height, zero opacity) on mount,
 *   • measures its natural content height off-screen,
 *   • reveals itself with a layered animation — the container springs open
 *     while the inner content fades in on a short delay, plus the lightbulb
 *     icon bounces in for a bit of personality,
 *   • dwells long enough to read (~7s),
 *   • collapses itself back to zero height with a sharp ease-in,
 *   • and resurfaces once more after an idle window.
 *
 * Explicit ✕ dismiss still persists via `dismissTip` so the tip never returns
 * on later sessions.
 *
 * Layout note: the measured wrapper includes a dedicated bottom spacer so the
 * animated height accounts for the visual breathing room below the card
 * (previously relied on a `marginBottom` that was clipped by `overflow: hidden`
 * and invisible to the user).
 */

import React, { useEffect, useState } from "react";
import { View, Text, StyleSheet, Pressable, LayoutChangeEvent } from "react-native";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useMutation, useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import * as Haptics from "expo-haptics";
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withTiming,
  withSpring,
  withDelay,
  runOnJS,
  Easing,
} from "react-native-reanimated";

import { colors, spacing, borderRadius, typography } from "@/components/ui/glass";
import { useIdleResurface } from "@/hooks/useIdleResurface";

// ─────────────────────────────────────────────────────────────────────────────
// Constants
// ─────────────────────────────────────────────────────────────────────────────

const ICON_TOKEN_RE = /\{\{icon:([a-z0-9-]+)\}\}/g;

// Cycle timings
const INITIAL_DELAY = 800;
const ENTER_DURATION = 520; // container reveal
const CONTENT_FADE_DURATION = 360; // staggered content fade
const CONTENT_FADE_DELAY = 180; // wait for the box to be partly open before text appears
const DWELL_DURATION = 7500;
const EXIT_DURATION = 320;
const RESURFACE_DELAY = 25_000;
const MAX_CYCLES = 2;

// Easings
// Smooth ease-out-quart — used for expansion. Feels like physics without overshoot.
const EASE_OUT_SMOOTH = Easing.bezier(0.22, 1, 0.36, 1);
// Crisp ease-in for exit.
const EASE_IN_SHARP = Easing.bezier(0.4, 0, 1, 1);

// Symmetric breathing room above and below the card. Matches the search
// bar's vertical rhythm (spacing.xs). Both spacers are measured into
// contentHeight so the animated wrapper includes them (margin on the inner
// card gets clipped by overflow: hidden).
const VERTICAL_GAP = spacing.xs;

// ─────────────────────────────────────────────────────────────────────────────
// Body text with inline icon tokens
// ─────────────────────────────────────────────────────────────────────────────

/** Splits tip body text on {{icon:name}} tokens, rendering inline icons. */
function renderBodyWithIcons(body: string): React.ReactNode {
  const parts: React.ReactNode[] = [];
  let lastIndex = 0;
  let match: RegExpExecArray | null;

  ICON_TOKEN_RE.lastIndex = 0;
  while ((match = ICON_TOKEN_RE.exec(body)) !== null) {
    if (match.index > lastIndex) {
      parts.push(body.slice(lastIndex, match.index));
    }
    parts.push(
      <MaterialCommunityIcons
        key={match.index}
        name={match[1] as keyof typeof MaterialCommunityIcons.glyphMap}
        size={14}
        color={colors.accent.warm}
      />,
    );
    lastIndex = ICON_TOKEN_RE.lastIndex;
  }
  if (lastIndex < body.length) {
    parts.push(body.slice(lastIndex));
  }
  return parts.length > 1 ? parts : body;
}

// ─────────────────────────────────────────────────────────────────────────────
// Component
// ─────────────────────────────────────────────────────────────────────────────

interface TipBannerProps {
  context: "pantry" | "lists" | "list_detail" | "scan" | "profile" | "voice";
}

export function TipBanner({ context }: TipBannerProps) {
  const tip = useQuery(api.tips.getNextTip, { context });
  const dismissTip = useMutation(api.tips.dismissTip);

  const [contentHeight, setContentHeight] = useState(0);
  const [isDismissing, setIsDismissing] = useState(false);

  // Measure the measurement wrapper (card + bottom spacer) the first time it
  // lays out. While contentHeight is 0 the wrapper renders absolute-positioned
  // and invisible so it can size itself without forcing the outer container
  // open.
  const handleLayout = (event: LayoutChangeEvent) => {
    const h = event.nativeEvent.layout.height;
    if (h > 0 && contentHeight === 0) {
      setContentHeight(h);
    }
  };

  // When the tip changes (e.g. user dismisses one and the next arrives via
  // Convex), reset the local state so the new tip gets its own fresh cycle.
  useEffect(() => {
    setContentHeight(0);
    setIsDismissing(false);
  }, [tip?.key]);

  // Animated values
  const heightSV = useSharedValue(0);
  const cardOpacity = useSharedValue(0);
  const cardTranslateY = useSharedValue(-12);
  const cardScale = useSharedValue(0.96);
  const contentOpacity = useSharedValue(0);
  const iconScale = useSharedValue(0.4);

  const enabled = tip != null && contentHeight > 0 && !isDismissing;
  const { phase, cycle } = useIdleResurface({
    enabled,
    initialDelay: INITIAL_DELAY,
    enterDuration: ENTER_DURATION,
    dwellDuration: DWELL_DURATION,
    exitDuration: EXIT_DURATION,
    resurfaceDelay: RESURFACE_DELAY,
    maxCycles: MAX_CYCLES,
  });

  // Haptic ping on the very first appearance — quieter for resurfaces.
  useEffect(() => {
    if (phase === "entering" && cycle === 0) {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    }
  }, [phase, cycle]);

  // Drive the animation from phase transitions. Guarded by !isDismissing so
  // the manual dismiss handler below can own the exit animation uninterrupted.
  useEffect(() => {
    if (isDismissing) return;
    switch (phase) {
      case "entering": {
        // Container: smooth ease-out height + opacity, gentle settle via spring.
        heightSV.value = withTiming(contentHeight, {
          duration: ENTER_DURATION,
          easing: EASE_OUT_SMOOTH,
        });
        cardOpacity.value = withTiming(1, {
          duration: ENTER_DURATION * 0.7,
          easing: EASE_OUT_SMOOTH,
        });
        cardTranslateY.value = withSpring(0, {
          damping: 18,
          stiffness: 160,
          mass: 0.9,
        });
        cardScale.value = withSpring(1, {
          damping: 18,
          stiffness: 160,
          mass: 0.9,
        });
        // Content fades in *after* the box has already opened a bit.
        contentOpacity.value = withDelay(
          CONTENT_FADE_DELAY,
          withTiming(1, { duration: CONTENT_FADE_DURATION, easing: EASE_OUT_SMOOTH }),
        );
        // Icon pops in with a playful spring.
        iconScale.value = withDelay(
          CONTENT_FADE_DELAY,
          withSpring(1, { damping: 9, stiffness: 220, mass: 0.6 }),
        );
        break;
      }
      case "visible":
        // Steady state.
        break;
      case "exiting": {
        // Text fades first so it doesn't look like the content is being
        // squeezed, then the box collapses.
        contentOpacity.value = withTiming(0, {
          duration: EXIT_DURATION * 0.55,
          easing: EASE_IN_SHARP,
        });
        iconScale.value = withTiming(0.6, {
          duration: EXIT_DURATION * 0.55,
          easing: EASE_IN_SHARP,
        });
        heightSV.value = withTiming(0, {
          duration: EXIT_DURATION,
          easing: EASE_IN_SHARP,
        });
        cardOpacity.value = withTiming(0, {
          duration: EXIT_DURATION,
          easing: EASE_IN_SHARP,
        });
        cardTranslateY.value = withTiming(-12, {
          duration: EXIT_DURATION,
          easing: EASE_IN_SHARP,
        });
        cardScale.value = withTiming(0.97, {
          duration: EXIT_DURATION,
          easing: EASE_IN_SHARP,
        });
        break;
      }
      case "hidden": {
        heightSV.value = 0;
        cardOpacity.value = 0;
        cardTranslateY.value = -12;
        cardScale.value = 0.96;
        contentOpacity.value = 0;
        iconScale.value = 0.4;
        break;
      }
    }
  }, [
    phase,
    contentHeight,
    isDismissing,
    heightSV,
    cardOpacity,
    cardTranslateY,
    cardScale,
    contentOpacity,
    iconScale,
  ]);

  // Explicit ✕ dismiss — animate out, then persist via mutation.
  const handleDismiss = () => {
    if (!tip || isDismissing) return;
    setIsDismissing(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});

    contentOpacity.value = withTiming(0, {
      duration: EXIT_DURATION * 0.55,
      easing: EASE_IN_SHARP,
    });
    iconScale.value = withTiming(0.6, {
      duration: EXIT_DURATION * 0.55,
      easing: EASE_IN_SHARP,
    });
    heightSV.value = withTiming(0, { duration: EXIT_DURATION, easing: EASE_IN_SHARP });
    cardTranslateY.value = withTiming(-12, { duration: EXIT_DURATION, easing: EASE_IN_SHARP });
    cardScale.value = withTiming(0.97, { duration: EXIT_DURATION, easing: EASE_IN_SHARP });
    cardOpacity.value = withTiming(0, { duration: EXIT_DURATION, easing: EASE_IN_SHARP }, (finished) => {
      if (finished) runOnJS(completeDismiss)();
    });
  };

  const completeDismiss = async () => {
    if (tip) {
      await dismissTip({ tipKey: tip.key }).catch(console.warn);
    }
  };

  const outerStyle = useAnimatedStyle(() => ({
    height: heightSV.value,
    overflow: "hidden" as const,
  }));
  const cardStyle = useAnimatedStyle(() => ({
    opacity: cardOpacity.value,
    transform: [{ translateY: cardTranslateY.value }, { scale: cardScale.value }],
  }));
  const contentStyle = useAnimatedStyle(() => ({
    opacity: contentOpacity.value,
  }));
  const iconStyle = useAnimatedStyle(() => ({
    transform: [{ scale: iconScale.value }],
  }));

  if (!tip) return null;

  // While the natural height hasn't been captured yet, render the measurement
  // wrapper absolute-positioned and invisible so it can size itself without
  // reserving layout space in the parent.
  const measuring = contentHeight === 0;

  return (
    <Animated.View style={outerStyle} pointerEvents={measuring ? "none" : "auto"}>
      <Animated.View
        style={[measuring && styles.measuring, !measuring && cardStyle]}
        onLayout={handleLayout}
      >
        {/* Top breathing room — measured as part of contentHeight. */}
        <View style={styles.verticalGap} />
        <View style={styles.container}>
          <Animated.View style={[styles.iconContainer, iconStyle]}>
            <MaterialCommunityIcons
              name="lightbulb-on-outline"
              size={20}
              color={colors.accent.warm}
            />
          </Animated.View>

          <Animated.View style={[styles.content, contentStyle]}>
            <Text style={styles.title}>{tip.title}</Text>
            <Text style={styles.body}>{renderBodyWithIcons(tip.body)}</Text>
          </Animated.View>

          <Pressable onPress={handleDismiss} style={styles.dismissButton} hitSlop={12}>
            <MaterialCommunityIcons name="close" size={18} color={colors.text.tertiary} />
          </Pressable>
        </View>
        {/* Bottom breathing room — measured as part of contentHeight so the
            animated wrapper includes it. */}
        <View style={styles.verticalGap} />
      </Animated.View>
    </Animated.View>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Styles
// ─────────────────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    alignItems: "flex-start",
    backgroundColor: `${colors.accent.warm}15`,
    borderRadius: borderRadius.md,
    padding: spacing.md,
    marginHorizontal: spacing.lg,
    borderWidth: 1,
    borderColor: `${colors.accent.warm}30`,
  },
  verticalGap: {
    height: VERTICAL_GAP,
  },
  // Off-screen first-measurement state: invisible, absolute-positioned so the
  // card can lay out at its natural size without forcing the outer container
  // (which starts at height 0) to expand.
  measuring: {
    position: "absolute",
    left: 0,
    right: 0,
    opacity: 0,
  },
  iconContainer: {
    marginRight: spacing.sm,
    marginTop: 2,
  },
  content: {
    flex: 1,
  },
  title: {
    ...typography.bodySmall,
    fontWeight: "600",
    color: colors.text.primary,
    marginBottom: 2,
  },
  body: {
    ...typography.bodySmall,
    color: colors.text.secondary,
    lineHeight: 18,
  },
  dismissButton: {
    marginLeft: spacing.sm,
    padding: spacing.xs,
  },
});
