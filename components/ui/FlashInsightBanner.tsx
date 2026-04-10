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
 *   3. dwells for DWELL_DURATION,
 *   4. collapses back to zero height,
 *   5. fires `onFinish` so the parent can clear the message.
 *
 * Passing a new message (different `id`) while one is showing resets the
 * cycle and shows the new content.
 *
 * Designed to share the TipBanner slot: when a flash is active, render this
 * instead of the TipBanner so only one insight is visible at a time.
 */

import React, { useEffect, useState } from "react";
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

// ─────────────────────────────────────────────────────────────────────────────
// Constants — kept in sync with TipBanner so the visual rhythm matches.
// ─────────────────────────────────────────────────────────────────────────────

const ENTER_DURATION = 520;
const CONTENT_FADE_DURATION = 360;
const CONTENT_FADE_DELAY = 180;
const DWELL_DURATION = 3800;
const EXIT_DURATION = 320;

const EASE_OUT_SMOOTH = Easing.bezier(0.22, 1, 0.36, 1);
const EASE_IN_SHARP = Easing.bezier(0.4, 0, 1, 1);

const VERTICAL_GAP = spacing.xs;

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

export type FlashTone = "success" | "info" | "error";

export interface FlashMessage {
  /** Stable identifier — changing the id resets the animation cycle. */
  id: string;
  title: string;
  body: string;
  /** MaterialCommunityIcons glyph. Defaults to tone-appropriate icon. */
  icon?: keyof typeof MaterialCommunityIcons.glyphMap;
  /** Visual tone. Defaults to "success". */
  tone?: FlashTone;
}

interface FlashInsightBannerProps {
  message: FlashMessage | null;
  onFinish: () => void;
}

// ─────────────────────────────────────────────────────────────────────────────
// Tone lookup
// ─────────────────────────────────────────────────────────────────────────────

function resolveTone(tone: FlashTone): { color: string; defaultIcon: keyof typeof MaterialCommunityIcons.glyphMap } {
  switch (tone) {
    case "error":
      return { color: colors.accent.warning, defaultIcon: "alert-circle-outline" };
    case "info":
      return { color: colors.accent.warm, defaultIcon: "information-outline" };
    case "success":
    default:
      return { color: colors.accent.success, defaultIcon: "check-circle-outline" };
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Component
// ─────────────────────────────────────────────────────────────────────────────

export function FlashInsightBanner({ message, onFinish }: FlashInsightBannerProps) {
  const [contentHeight, setContentHeight] = useState(0);

  // Animated values
  const heightSV = useSharedValue(0);
  const cardOpacity = useSharedValue(0);
  const cardTranslateY = useSharedValue(-12);
  const cardScale = useSharedValue(0.96);
  const contentOpacity = useSharedValue(0);
  const iconScale = useSharedValue(0.4);

  // When the message identity changes, reset so we remeasure and re-enter.
  useEffect(() => {
    setContentHeight(0);
  }, [message?.id]);

  const handleLayout = (event: LayoutChangeEvent) => {
    const h = event.nativeEvent.layout.height;
    if (h > 0 && contentHeight === 0) {
      setContentHeight(h);
    }
  };

  // Drive the one-shot enter → dwell → exit → finish cycle.
  useEffect(() => {
    if (!message || contentHeight === 0) return;

    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});

    // Enter — layered to match TipBanner.
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
    contentOpacity.value = withDelay(
      CONTENT_FADE_DELAY,
      withTiming(1, { duration: CONTENT_FADE_DURATION, easing: EASE_OUT_SMOOTH }),
    );
    iconScale.value = withDelay(
      CONTENT_FADE_DELAY,
      withSpring(1, { damping: 9, stiffness: 220, mass: 0.6 }),
    );

    // After dwell, collapse and fire onFinish at the end.
    const exitTimer = setTimeout(() => {
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
      cardTranslateY.value = withTiming(-12, {
        duration: EXIT_DURATION,
        easing: EASE_IN_SHARP,
      });
      cardScale.value = withTiming(0.97, {
        duration: EXIT_DURATION,
        easing: EASE_IN_SHARP,
      });
      cardOpacity.value = withTiming(
        0,
        { duration: EXIT_DURATION, easing: EASE_IN_SHARP },
        (finished) => {
          if (finished) runOnJS(onFinish)();
        },
      );
    }, ENTER_DURATION + DWELL_DURATION);

    return () => clearTimeout(exitTimer);
  }, [
    message,
    contentHeight,
    heightSV,
    cardOpacity,
    cardTranslateY,
    cardScale,
    contentOpacity,
    iconScale,
    onFinish,
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

  if (!message) return null;

  const measuring = contentHeight === 0;
  const { color: toneColor, defaultIcon } = resolveTone(message.tone ?? "success");
  const iconName = message.icon ?? defaultIcon;

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
            <Text style={styles.title}>{message.title}</Text>
            <Text style={styles.body}>{message.body}</Text>
          </Animated.View>
        </View>
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
});
