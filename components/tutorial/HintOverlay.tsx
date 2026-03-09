import React, { useRef, useEffect, useState } from 'react';
import { View, Text, Pressable, StyleSheet, Dimensions, Animated, LayoutRectangle } from 'react-native';
import { GlassCard } from '@/components/ui/glass/GlassCard';
import { GlassButton } from '@/components/ui/glass/GlassButton';
import glassTokens from '@/lib/design/glassTokens';
import { safeHaptics } from '@/lib/haptics/safeHaptics';
import { setHintsEnabled } from '@/lib/storage/hintStorage';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

interface HintOverlayProps {
  visible: boolean;
  targetRef: React.RefObject<any>;
  position?: 'above' | 'below' | 'left' | 'right';
  title: string;
  content: string;
  onDismiss: () => void;
  currentStep?: number;
  totalSteps?: number;
  onDisableHints?: () => void;
}

export function HintOverlay({
  visible,
  targetRef,
  position = 'below',
  title,
  content,
  onDismiss,
  currentStep,
  totalSteps,
  onDisableHints,
}: HintOverlayProps) {
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const [targetLayout, setTargetLayout] = useState<LayoutRectangle | null>(null);
  const [cardHeight, setCardHeight] = useState(0);

  useEffect(() => {
    if (visible) {
      // Measure target element
      targetRef?.current?.measureInWindow((x: number, y: number, width: number, height: number) => {
        setTargetLayout({ x, y, width, height });
      });

      // Fade in
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 300,
        useNativeDriver: true,
      }).start();

      // Pulsing spotlight animation
      Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, {
            toValue: 1.08,
            duration: 1200,
            useNativeDriver: true,
          }),
          Animated.timing(pulseAnim, {
            toValue: 1,
            duration: 1200,
            useNativeDriver: true,
          }),
        ])
      ).start();

      // Haptic feedback
      safeHaptics.light();
    } else {
      Animated.timing(fadeAnim, {
        toValue: 0,
        duration: 200,
        useNativeDriver: true,
      }).start();
      pulseAnim.stopAnimation();
      pulseAnim.setValue(1);
    }
  }, [visible]);

  const handleDisableHints = () => {
    setHintsEnabled(false);
    safeHaptics.medium();
    onDismiss();
    onDisableHints?.();
  };

  if (!visible || !targetLayout) return null;

  // Calculate hint card position with measured height
  const hintPosition = calculatePosition(targetLayout, position, cardHeight);
  const arrowStyle = getArrowStyle(position);

  return (
    <Animated.View style={[styles.overlay, { opacity: fadeAnim }]} pointerEvents="box-none">
      {/* Dimmed background - 30% opacity */}
      <Pressable style={styles.backdrop} onPress={onDismiss} />

      {/* Pulsing spotlight glow around target */}
      <Animated.View
        style={[
          styles.spotlight,
          {
            left: targetLayout.x - 8,
            top: targetLayout.y - 8,
            width: targetLayout.width + 16,
            height: targetLayout.height + 16,
            transform: [{ scale: pulseAnim }],
          },
        ]}
      />

      {/* Hint card */}
      <View
        style={[styles.hintCard, hintPosition]}
        onLayout={(e) => setCardHeight(e.nativeEvent.layout.height)}
      >
        {/* Arrow pointer */}
        <View style={[styles.arrow, arrowStyle]} />

        <GlassCard style={styles.card}>
          {/* Progress indicator */}
          {currentStep && totalSteps && (
            <Text style={styles.progress}>
              {currentStep} of {totalSteps}
            </Text>
          )}

          <Text style={styles.title}>{title}</Text>
          <Text style={styles.content}>{content}</Text>

          <View style={styles.buttonRow}>
            <GlassButton
              variant="primary"
              size="sm"
              onPress={onDismiss}
              style={styles.button}
            >
              {currentStep && currentStep < (totalSteps ?? 0) ? 'Next' : 'Got it'}
            </GlassButton>

            {/* Don't show hints again link */}
            <Pressable onPress={handleDisableHints} style={styles.skipLink}>
              <Text style={styles.skipText}>Don't show hints</Text>
            </Pressable>
          </View>
        </GlassCard>
      </View>
    </Animated.View>
  );
}

function calculatePosition(target: LayoutRectangle, position: string, cardHeight: number) {
  const cardWidth = 280;
  const spacing = 16;
  const arrowSize = 12;

  // Use measured height if available, otherwise estimate
  const effectiveHeight = cardHeight || 140;

  switch (position) {
    case 'above':
      return {
        left: Math.max(16, Math.min(SCREEN_WIDTH - cardWidth - 16, target.x + target.width / 2 - cardWidth / 2)),
        top: Math.max(16, target.y - effectiveHeight - spacing - arrowSize),
      };
    case 'below':
      return {
        left: Math.max(16, Math.min(SCREEN_WIDTH - cardWidth - 16, target.x + target.width / 2 - cardWidth / 2)),
        top: target.y + target.height + spacing + arrowSize,
      };
    case 'left':
      return {
        left: Math.max(16, target.x - cardWidth - spacing - arrowSize),
        top: Math.max(16, Math.min(SCREEN_HEIGHT - effectiveHeight - 16, target.y + target.height / 2 - effectiveHeight / 2)),
      };
    case 'right':
      return {
        left: Math.min(SCREEN_WIDTH - cardWidth - 16, target.x + target.width + spacing + arrowSize),
        top: Math.max(16, Math.min(SCREEN_HEIGHT - effectiveHeight - 16, target.y + target.height / 2 - effectiveHeight / 2)),
      };
    default:
      return { left: 16, top: target.y + target.height + spacing + arrowSize };
  }
}

function getArrowStyle(position: string) {
  const arrowSize = 12;

  switch (position) {
    case 'above':
      return {
        bottom: -arrowSize,
        left: '50%',
        marginLeft: -arrowSize / 2,
        borderLeftWidth: arrowSize / 2,
        borderRightWidth: arrowSize / 2,
        borderTopWidth: arrowSize,
        borderLeftColor: 'transparent',
        borderRightColor: 'transparent',
        borderTopColor: glassTokens.colors.glass.border,
      };
    case 'below':
      return {
        top: -arrowSize,
        left: '50%',
        marginLeft: -arrowSize / 2,
        borderLeftWidth: arrowSize / 2,
        borderRightWidth: arrowSize / 2,
        borderBottomWidth: arrowSize,
        borderLeftColor: 'transparent',
        borderRightColor: 'transparent',
        borderBottomColor: glassTokens.colors.glass.border,
      };
    case 'left':
      return {
        right: -arrowSize,
        top: '50%',
        marginTop: -arrowSize / 2,
        borderTopWidth: arrowSize / 2,
        borderBottomWidth: arrowSize / 2,
        borderLeftWidth: arrowSize,
        borderTopColor: 'transparent',
        borderBottomColor: 'transparent',
        borderLeftColor: glassTokens.colors.glass.border,
      };
    case 'right':
      return {
        left: -arrowSize,
        top: '50%',
        marginTop: -arrowSize / 2,
        borderTopWidth: arrowSize / 2,
        borderBottomWidth: arrowSize / 2,
        borderRightWidth: arrowSize,
        borderTopColor: 'transparent',
        borderBottomColor: 'transparent',
        borderRightColor: glassTokens.colors.glass.border,
      };
    default:
      return {};
  }
}

const styles = StyleSheet.create({
  overlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 9999,
  },
  backdrop: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(13, 21, 40, 0.30)', // 30% dimming (reduced from 50%)
  },
  spotlight: {
    position: 'absolute',
    borderRadius: 12,
    borderWidth: 2,
    borderColor: glassTokens.colors.accent.primary,
    backgroundColor: 'transparent',
    shadowColor: glassTokens.colors.accent.primary,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.6,
    shadowRadius: 12,
    elevation: 8,
  },
  hintCard: {
    position: 'absolute',
    width: 280,
  },
  arrow: {
    position: 'absolute',
    width: 0,
    height: 0,
    backgroundColor: 'transparent',
    borderStyle: 'solid',
  },
  card: {
    padding: glassTokens.spacing.lg,
  },
  progress: {
    fontSize: 12,
    fontWeight: '600',
    color: glassTokens.colors.accent.primary,
    marginBottom: glassTokens.spacing.xs,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  title: {
    fontSize: 16,
    fontWeight: '600',
    color: glassTokens.colors.text.primary,
    marginBottom: glassTokens.spacing.xs,
  },
  content: {
    fontSize: 14,
    fontWeight: '400',
    color: glassTokens.colors.text.secondary,
    lineHeight: 20,
    marginBottom: glassTokens.spacing.md,
  },
  buttonRow: {
    flexDirection: 'column',
    gap: glassTokens.spacing.sm,
  },
  button: {
    alignSelf: 'flex-start',
  },
  skipLink: {
    paddingVertical: glassTokens.spacing.xs,
  },
  skipText: {
    fontSize: 12,
    fontWeight: '400',
    color: glassTokens.colors.text.tertiary,
    textDecorationLine: 'underline',
  },
});
