/**
 * ScanReceiptNudgeModal - Celebratory bottom-sheet modal that nudges users
 * to scan their receipt after completing a shopping trip.
 *
 * Displays personalised benefits based on subscription tier, streak data,
 * and scan credit information. Uses glass UI design tokens with spring
 * entrance/exit animations and decorative floating bubbles.
 */

import React, { useEffect, useMemo, useCallback, useState } from "react";
import {
  View,
  Text,
  Modal,
  Pressable,
  StyleSheet,
} from "react-native";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { ReceiptSparklesIllustration } from "./ReceiptSparklesIllustration";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withTiming,
  withRepeat,
  withDelay,
  FadeIn,
} from "react-native-reanimated";

import {
  GlassButton,
  colors,
  typography,
  spacing,
  borderRadius,
} from "@/components/ui/glass";
import { haptic, hapticPattern } from "@/lib/haptics/safeHaptics";

// ─── Types ──────────────────────────────────────────────────────────────────

export interface ScanReceiptNudgeModalProps {
  visible: boolean;
  onScanReceipt: () => void;
  onDismiss: () => void;
  storeName?: string;
  /** Scan credit data (from api.points.getPointsBalance) */
  pointsBalance: {
    tier: string;
    nextTierInfo: {
      nextTier: string | null;
      scansToNextTier: number;
    };
    tierProgress: number;
    availablePoints: number;
    isPremium: boolean;
  } | null;
  /** Current scanning streak count */
  streakCount?: number;
}

// ─── Bubble Configuration ───────────────────────────────────────────────────

interface BubbleConfig {
  size: number;
  left: number;
  opacity: number;
  duration: number;
  delay: number;
  color: string;
  startY: number;
}

const BUBBLE_COUNT = 12;
const BUBBLE_COLORS = [colors.accent.primary, colors.accent.warm, "#FFFFFF"];

function generateBubbleConfigs(): BubbleConfig[] {
  const configs: BubbleConfig[] = [];
  for (let i = 0; i < BUBBLE_COUNT; i++) {
    configs.push({
      size: 4 + Math.random() * 6,
      left: Math.random() * 100,
      opacity: 0.1 + Math.random() * 0.2,
      duration: 3000 + Math.random() * 4000,
      delay: Math.random() * 2000,
      color: BUBBLE_COLORS[i % BUBBLE_COLORS.length],
      startY: Math.random() * 300,
    });
  }
  return configs;
}

// ─── Bubble Component ───────────────────────────────────────────────────────

function Bubble({ config }: { config: BubbleConfig }) {
  const translateY = useSharedValue(config.startY);

  useEffect(() => {
    translateY.value = withDelay(
      config.delay,
      withRepeat(
        withTiming(-200, { duration: config.duration }),
        -1,
        false,
      ),
    );
  }, [config.delay, config.duration, translateY]);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: translateY.value }],
  }));

  return (
    <Animated.View
      style={[
        {
          position: "absolute",
          width: config.size,
          height: config.size,
          borderRadius: config.size / 2,
          backgroundColor: config.color,
          opacity: config.opacity,
          left: `${config.left}%`,
          bottom: 0,
        },
        animatedStyle,
      ]}
      pointerEvents="none"
    />
  );
}

// ─── Benefit Bullet ─────────────────────────────────────────────────────────

interface BenefitBulletProps {
  icon: keyof typeof MaterialCommunityIcons.glyphMap;
  iconColor: string;
  text: string;
}

function BenefitBullet({ icon, iconColor, text }: BenefitBulletProps) {
  return (
    <View style={styles.bulletRow}>
      <MaterialCommunityIcons name={icon} size={20} color={iconColor} />
      <Text style={styles.bulletText}>{text}</Text>
    </View>
  );
}

// ─── Component ──────────────────────────────────────────────────────────────

export function ScanReceiptNudgeModal({
  visible,
  onScanReceipt,
  onDismiss,
  storeName,
  pointsBalance,
  streakCount,
}: ScanReceiptNudgeModalProps) {
  // Internal render state — keeps component mounted during exit animation
  const [shouldRender, setShouldRender] = useState(false);

  useEffect(() => {
    if (visible) {
      setShouldRender(true);
    } else if (shouldRender) {
      // Delay unmount so exit animation can play
      const timer = setTimeout(() => setShouldRender(false), 350);
      return () => clearTimeout(timer);
    }
  }, [visible, shouldRender]);

  // Bubble configs (stable across renders)
  const bubbleConfigs = useMemo(() => generateBubbleConfigs(), []);

  // Animation shared values
  const overlayOpacity = useSharedValue(0);
  const contentTranslateY = useSharedValue(400);

  // Receipt icon animations
  const iconScale = useSharedValue(1);
  const iconRotation = useSharedValue(0);

  // Drive entrance/exit based on visibility
  useEffect(() => {
    if (visible) {
      overlayOpacity.value = withTiming(1, { duration: 300 });
      contentTranslateY.value = withSpring(0, {
        damping: 14,
        stiffness: 150,
      });

      // Celebratory haptic: success buzz → tap tap tap
      hapticPattern("celebration");

      // Start icon pulse
      iconScale.value = withRepeat(
        withTiming(1.06, { duration: 1200 }),
        -1,
        true,
      );

      // Start icon wobble
      iconRotation.value = withRepeat(
        withTiming(3, { duration: 1500 }),
        -1,
        true,
      );
    } else {
      overlayOpacity.value = withTiming(0, { duration: 250 });
      contentTranslateY.value = withTiming(400, { duration: 300 });

      // Reset icon animations
      iconScale.value = 1;
      iconRotation.value = 0;
    }
  }, [visible, overlayOpacity, contentTranslateY, iconScale, iconRotation]);

  // Animated styles
  const overlayAnimatedStyle = useAnimatedStyle(() => ({
    opacity: overlayOpacity.value,
  }));

  const contentAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: contentTranslateY.value }],
  }));

  const iconAnimatedStyle = useAnimatedStyle(() => ({
    transform: [
      { scale: iconScale.value },
      { rotate: `${iconRotation.value}deg` },
    ],
  }));

  // Dismiss handler with exit animation
  const handleDismiss = useCallback(() => {
    haptic("light");
    overlayOpacity.value = withTiming(0, { duration: 250 });
    contentTranslateY.value = withTiming(400, { duration: 300 });
    // Let animation play out, then notify parent
    setTimeout(() => {
      onDismiss();
    }, 300);
  }, [onDismiss, overlayOpacity, contentTranslateY]);

  // Build benefit bullets dynamically
  const benefits = useMemo(() => {
    const items: BenefitBulletProps[] = [];

    // 1. Price tracking / scan credits
    if (pointsBalance?.isPremium) {
      items.push({
        icon: "cash-plus",
        iconColor: colors.accent.primary,
        text: `Earn points on this scan`,
      });
    } else {
      items.push({
        icon: "tag-outline",
        iconColor: colors.accent.primary,
        text: "Track real prices & find savings",
      });
    }

    // 2. Streak
    if (streakCount !== undefined && streakCount > 0) {
      items.push({
        icon: "fire",
        iconColor: "#FF6B35",
        text: `Keep your ${streakCount}-day streak going!`,
      });
    } else {
      items.push({
        icon: "fire",
        iconColor: "#FF6B35",
        text: "Start a scanning streak!",
      });
    }

    // 3. Tier progression
    if (pointsBalance) {
      if (pointsBalance.nextTierInfo?.nextTier != null) {
        items.push({
          icon: "arrow-up-circle",
          iconColor: colors.accent.secondary,
          text: `${pointsBalance.nextTierInfo.scansToNextTier} scans to ${pointsBalance.nextTierInfo.nextTier} tier!`,
        });
      } else {
        items.push({
          icon: "crown",
          iconColor: colors.accent.warm,
          text: "Platinum scanner \u2014 max rewards!",
        });
      }
    }

    // 4. Store price contribution
    if (storeName) {
      items.push({
        icon: "store",
        iconColor: colors.text.secondary,
        text: `Help track prices at ${storeName}`,
      });
    }

    return items.slice(0, 4);
  }, [pointsBalance, streakCount, storeName]);

  // Capitalise tier name
  const tierDisplay = useMemo(() => {
    if (!pointsBalance?.tier) return "";
    return pointsBalance.tier.charAt(0).toUpperCase() + pointsBalance.tier.slice(1);
  }, [pointsBalance?.tier]);

  if (!shouldRender) return null;

  return (
    <Modal
      visible={shouldRender}
      transparent
      animationType="none"
      onRequestClose={handleDismiss}
      statusBarTranslucent
    >
      {/* Overlay */}
      <Animated.View style={[styles.overlay, overlayAnimatedStyle]}>
        <Pressable style={styles.overlayTouchable} onPress={handleDismiss} />
      </Animated.View>

      {/* Content */}
      <Animated.View style={[styles.contentWrapper, contentAnimatedStyle]}>
        <View style={styles.contentContainer}>
          {/* Floating bubbles background */}
          <View style={styles.bubblesContainer} pointerEvents="none">
            {bubbleConfigs.map((config, index) => (
              <Bubble key={index} config={config} />
            ))}
          </View>

          {/* Drag indicator */}
          <View style={styles.dragIndicator} />

          {/* Animated Receipt Illustration */}
          <Animated.View
            entering={FadeIn.delay(200).springify()}
            style={styles.iconSection}
          >
            <Animated.View style={iconAnimatedStyle}>
              <ReceiptSparklesIllustration size={120} />
            </Animated.View>
          </Animated.View>

          {/* Title */}
          <Animated.View
            entering={FadeIn.delay(350)}
            style={styles.titleSection}
          >
            <Text style={styles.title}>Nice shopping trip!</Text>
            {storeName ? (
              <Text style={styles.subtitle}>at {storeName}</Text>
            ) : null}
          </Animated.View>

          {/* Benefits Card */}
          <Animated.View
            entering={FadeIn.delay(450)}
            style={styles.glassCard}
          >
            <Text style={styles.cardHeader}>Scan your receipt to...</Text>
            {benefits.map((benefit, index) => (
              <BenefitBullet
                key={index}
                icon={benefit.icon}
                iconColor={benefit.iconColor}
                text={benefit.text}
              />
            ))}
          </Animated.View>

          {/* Stats Card (only if pointsBalance exists) */}
          {pointsBalance !== null && (
            <Animated.View
              entering={FadeIn.delay(550)}
              style={styles.glassCard}
            >
              <Text style={styles.cardHeader}>Your scanning stats</Text>
              <View style={styles.statsRow}>
                <View style={styles.tierBadge}>
                  <Text style={styles.tierBadgeText}>{tierDisplay}</Text>
                </View>
                <Text style={styles.statsText}>
                  {"\u2022"} {pointsBalance.tierProgress} lifetime scans
                </Text>
              </View>
              {pointsBalance.isPremium && pointsBalance.availablePoints > 0 && (
                <Text style={styles.creditsEarnedText}>
                  {pointsBalance.availablePoints} points available
                </Text>
              )}
            </Animated.View>
          )}

          {/* CTA Buttons */}
          <Animated.View entering={FadeIn.delay(650)} style={styles.ctaSection}>
            <GlassButton
              variant="primary"
              icon="camera"
              onPress={onScanReceipt}
              accessibilityLabel="Scan your receipt"
            >
              Scan Receipt Now
            </GlassButton>
          </Animated.View>

          <Animated.View
            entering={FadeIn.delay(700)}
            style={styles.dismissSection}
          >
            <Pressable
              onPress={handleDismiss}
              style={styles.dismissButton}
              accessibilityLabel="Skip receipt scanning"
              accessibilityRole="button"
            >
              <Text style={styles.dismissText}>Maybe Later</Text>
            </Pressable>
          </Animated.View>
        </View>
      </Animated.View>
    </Modal>
  );
}

// ─── Styles ─────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  // Overlay
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0, 0, 0, 0.6)",
  },
  overlayTouchable: {
    flex: 1,
  },

  // Content wrapper (positions at bottom)
  contentWrapper: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
  },
  contentContainer: {
    backgroundColor: colors.background.primary,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingHorizontal: spacing.xl,
    paddingTop: spacing["3xl"],
    paddingBottom: 48,
    overflow: "hidden",
  },

  // Bubbles
  bubblesContainer: {
    ...StyleSheet.absoluteFillObject,
    overflow: "hidden",
  },

  // Drag indicator
  dragIndicator: {
    width: 36,
    height: 4,
    borderRadius: 2,
    backgroundColor: "rgba(255, 255, 255, 0.2)",
    alignSelf: "center",
    marginBottom: spacing.xl,
  },

  // Icon
  iconSection: {
    alignItems: "center",
    marginBottom: spacing.lg,
  },
  // iconContainer removed — ReceiptSparklesIllustration provides its own layout

  // Title
  titleSection: {
    alignItems: "center",
    marginBottom: spacing.xl,
  },
  title: {
    ...typography.headlineMedium,
    color: colors.text.primary,
    textAlign: "center",
  },
  subtitle: {
    ...typography.bodyMedium,
    color: colors.text.secondary,
    textAlign: "center",
    marginTop: spacing.xs,
  },

  // Glass Card
  glassCard: {
    backgroundColor: colors.glass.background,
    borderWidth: 1,
    borderColor: colors.glass.border,
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
    marginBottom: spacing.lg,
  },
  cardHeader: {
    ...typography.labelMedium,
    color: colors.text.secondary,
    marginBottom: spacing.md,
  },

  // Benefit bullets
  bulletRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
    paddingVertical: spacing.xs,
  },
  bulletText: {
    ...typography.bodyMedium,
    color: colors.text.primary,
    flex: 1,
  },

  // Stats
  statsRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
  },
  tierBadge: {
    backgroundColor: `${colors.accent.primary}20`,
    borderRadius: borderRadius.full,
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
  },
  tierBadgeText: {
    ...typography.labelSmall,
    color: colors.accent.primary,
  },
  statsText: {
    ...typography.bodySmall,
    color: colors.text.tertiary,
  },
  creditsEarnedText: {
    ...typography.bodySmall,
    color: colors.accent.primary,
    marginTop: spacing.xs,
  },

  // CTA
  ctaSection: {
    marginTop: spacing.sm,
  },

  // Dismiss
  dismissSection: {
    alignItems: "center",
  },
  dismissButton: {
    paddingVertical: spacing.md,
  },
  dismissText: {
    ...typography.labelMedium,
    color: colors.text.tertiary,
    textAlign: "center",
  },
});
