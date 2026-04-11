/**
 * FlashInsightBanner — one-shot ephemeral notification banner.
 *
 * Visually and behaviourally mirrors `TipBanner` (same container style, same
 * layered appear/dwell/collapse animation) but is driven imperatively by a
 * `message` prop instead of Convex tips. Used for transient outcome feedback
 * such as "Prices refreshed" results.
 *
 * Lifecycle when `message` transitions from null → a FlashMessage:
 *   1. measures its natural height off-screen,
 *   2. springs open with the same staggered content reveal as TipBanner,
 *   3. dwells (duration auto-scales with content volume — see
 *      `computeDwellDuration`),
 *   4. collapses back to zero height,
 *   5. fires `onFinish` so the parent can clear the message.
 *
 * Replacement while a flash is already showing:
 *   1. current card fades out (card + content + icon),
 *   2. internal `displayMessage` swaps to the new message and all
 *      "entered" shared values are reset to their initial state,
 *   3. the new content is measured and the re-entry animation plays —
 *      so the replacement *feels* like a fresh entry rather than a jank
 *      text swap mid-dwell.
 *
 * Designed to share the TipBanner slot: when a flash is active, render this
 * instead of the TipBanner so only one insight is visible at a time.
 */

import React, { useCallback, useEffect, useRef, useState } from "react";
import { View, Text, StyleSheet, LayoutChangeEvent } from "react-native";
import { MaterialCommunityIcons } from "@expo/vector-icons";
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
import {
  FLASH_INITIAL,
  FLASH_TIMING,
  computeDwellDuration,
  flashTrendColor,
  resolveFlashTone,
  type FlashMessage,
} from "@/components/ui/flashInsight";

export type { FlashDetail, FlashMessage, FlashTone } from "@/components/ui/flashInsight";
export { computeDwellDuration } from "@/components/ui/flashInsight";

const EASE_OUT_SMOOTH = Easing.bezier(0.22, 1, 0.36, 1);
const EASE_IN_SHARP = Easing.bezier(0.4, 0, 1, 1);

const VERTICAL_GAP = spacing.xs;

interface FlashInsightBannerProps {
  message: FlashMessage | null;
  onFinish: () => void;
}

export function FlashInsightBanner({ message, onFinish }: FlashInsightBannerProps) {
  // What is currently rendered in the visible card. Kept separate from the
  // `message` prop so replacements can fade out before the content swaps.
  const [displayMessage, setDisplayMessage] = useState<FlashMessage | null>(null);
  const [contentHeight, setContentHeight] = useState(0);

  // Mount guard — the exit animation's completion callback can fire after
  // the parent unmounts us (e.g. user navigates away mid-dwell). Without
  // this, `runOnJS(handleExit)` would call setState on an unmounted node.
  const mountedRef = useRef(true);
  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  // Animated values
  const heightSV = useSharedValue(0);
  const cardOpacity = useSharedValue(FLASH_INITIAL.cardOpacity);
  const cardTranslateY = useSharedValue(FLASH_INITIAL.cardTranslateY);
  const cardScale = useSharedValue(FLASH_INITIAL.cardScale);
  const contentOpacity = useSharedValue(FLASH_INITIAL.contentOpacity);
  const iconScale = useSharedValue(FLASH_INITIAL.iconScale);

  // ── Adopt incoming message prop ─────────────────────────────────────────
  useEffect(() => {
    // Nothing incoming — leave whatever is dwelling alone; it will exit on
    // its own timer and call onFinish.
    if (!message) return;

    // First flash, or a flash arriving after the previous one already
    // finished its exit. Adopt immediately.
    if (!displayMessage) {
      setContentHeight(0);
      setDisplayMessage(message);
      return;
    }

    // Same message id — nothing to do. (Avoids restarting the cycle if the
    // parent re-renders with the same object.)
    if (message.id === displayMessage.id) return;

    // Replacement: fade the current card out, then commit the new one.
    const fadeOpts = { duration: FLASH_TIMING.replaceFadeOut, easing: EASE_IN_SHARP };
    cardOpacity.value = withTiming(0, fadeOpts);
    contentOpacity.value = withTiming(0, fadeOpts);
    iconScale.value = withTiming(FLASH_INITIAL.iconScale, fadeOpts);
    cardScale.value = withTiming(FLASH_INITIAL.cardScale, fadeOpts);
    cardTranslateY.value = withTiming(FLASH_INITIAL.cardTranslateY, fadeOpts);

    const swapTimer = setTimeout(() => {
      if (!mountedRef.current) return;
      // Collapse the outer height synchronously with the content swap so
      // the re-entry animation springs from 0 instead of retweening from
      // the previous flash's expanded height (which would look like a
      // visible shrink-then-grow if the new content is shorter).
      heightSV.value = 0;
      setContentHeight(0);
      setDisplayMessage(message);
    }, FLASH_TIMING.replaceFadeOut);

    return () => clearTimeout(swapTimer);
    // Intentionally keyed off message.id only — displayMessage changes here
    // are driven by this effect itself and should not retrigger it.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [message?.id]);

  const handleLayout = (event: LayoutChangeEvent) => {
    const h = event.nativeEvent.layout.height;
    if (h > 0 && contentHeight === 0) {
      setContentHeight(h);
    }
  };

  const handleExit = useCallback(() => {
    if (!mountedRef.current) return;
    setDisplayMessage(null);
    setContentHeight(0);
    onFinish();
  }, [onFinish]);

  // ── Entry → dwell → exit for whichever message is currently displayed ───
  useEffect(() => {
    if (!displayMessage || contentHeight === 0) return;

    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});

    // Enter — layered to match TipBanner.
    heightSV.value = withTiming(contentHeight, {
      duration: FLASH_TIMING.enter,
      easing: EASE_OUT_SMOOTH,
    });
    cardOpacity.value = withTiming(1, {
      duration: FLASH_TIMING.enter * 0.7,
      easing: EASE_OUT_SMOOTH,
    });
    cardTranslateY.value = withSpring(0, { damping: 18, stiffness: 160, mass: 0.9 });
    cardScale.value = withSpring(1, { damping: 18, stiffness: 160, mass: 0.9 });
    contentOpacity.value = withDelay(
      FLASH_TIMING.contentFadeDelay,
      withTiming(1, { duration: FLASH_TIMING.contentFadeDuration, easing: EASE_OUT_SMOOTH }),
    );
    iconScale.value = withDelay(
      FLASH_TIMING.contentFadeDelay,
      withSpring(1, { damping: 9, stiffness: 220, mass: 0.6 }),
    );

    const dwellDuration = computeDwellDuration(displayMessage);

    // After dwell, collapse and fire onFinish at the end.
    const exitTimer = setTimeout(() => {
      contentOpacity.value = withTiming(0, {
        duration: FLASH_TIMING.exit * 0.55,
        easing: EASE_IN_SHARP,
      });
      iconScale.value = withTiming(0.6, {
        duration: FLASH_TIMING.exit * 0.55,
        easing: EASE_IN_SHARP,
      });
      heightSV.value = withTiming(0, {
        duration: FLASH_TIMING.exit,
        easing: EASE_IN_SHARP,
      });
      cardTranslateY.value = withTiming(FLASH_INITIAL.cardTranslateY, {
        duration: FLASH_TIMING.exit,
        easing: EASE_IN_SHARP,
      });
      cardScale.value = withTiming(0.97, {
        duration: FLASH_TIMING.exit,
        easing: EASE_IN_SHARP,
      });
      cardOpacity.value = withTiming(
        0,
        { duration: FLASH_TIMING.exit, easing: EASE_IN_SHARP },
        (finished) => {
          if (finished) runOnJS(handleExit)();
        },
      );
    }, FLASH_TIMING.enter + dwellDuration);

    return () => clearTimeout(exitTimer);
  }, [
    displayMessage,
    contentHeight,
    heightSV,
    cardOpacity,
    cardTranslateY,
    cardScale,
    contentOpacity,
    iconScale,
    handleExit,
  ]);

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

  if (!displayMessage) return null;

  const measuring = contentHeight === 0;
  const { color: toneColor, defaultIcon } = resolveFlashTone(displayMessage.tone ?? "success");
  const iconName = displayMessage.icon ?? defaultIcon;
  const details = displayMessage.details ?? [];

  return (
    <Animated.View style={outerStyle} pointerEvents={measuring ? "none" : "auto"}>
      <Animated.View
        style={[measuring && styles.measuring, !measuring && cardStyle]}
        onLayout={handleLayout}
      >
        <View style={styles.verticalGap} />
        <View
          style={[
            styles.container,
            { backgroundColor: `${toneColor}15`, borderColor: `${toneColor}30` },
          ]}
        >
          <Animated.View style={[styles.iconContainer, iconStyle]}>
            <MaterialCommunityIcons name={iconName} size={20} color={toneColor} />
          </Animated.View>

          <Animated.View style={[styles.content, contentStyle]}>
            <Text style={styles.title}>{displayMessage.title}</Text>
            <Text style={styles.body}>{displayMessage.body}</Text>

            {details.length > 0 && (
              <View
                testID="flash-insight-details"
                style={[styles.detailsList, { borderTopColor: `${toneColor}25` }]}
              >
                {details.map((detail, index) => (
                  <View key={`${detail.label}-${index}`} style={styles.detailRow}>
                    <Text style={styles.detailLabel} numberOfLines={1}>
                      {detail.label}
                    </Text>
                    <Text style={[styles.detailValue, { color: flashTrendColor(detail.trend) }]}>
                      {detail.value}
                    </Text>
                  </View>
                ))}
              </View>
            )}
          </Animated.View>
        </View>
        <View style={styles.verticalGap} />
      </Animated.View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    alignItems: "flex-start",
    borderRadius: borderRadius.md,
    padding: spacing.md,
    marginHorizontal: spacing.lg,
    borderWidth: 1,
  },
  verticalGap: {
    height: VERTICAL_GAP,
  },
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
  detailsList: {
    marginTop: spacing.sm,
    paddingTop: spacing.sm,
    borderTopWidth: StyleSheet.hairlineWidth,
    gap: 4,
  },
  detailRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: spacing.sm,
  },
  detailLabel: {
    ...typography.bodySmall,
    color: colors.text.secondary,
    flex: 1,
  },
  detailValue: {
    ...typography.bodySmall,
    fontWeight: "600",
    fontVariant: ["tabular-nums"],
  },
});
