import React, { useRef, useEffect, useState } from 'react';
import { View, Text, Pressable, StyleSheet, Dimensions, Animated, LayoutRectangle } from 'react-native';
import { GlassCard } from '@/components/ui/glass/GlassCard';
import { GlassButton } from '@/components/ui/glass/GlassButton';
import { glassTokens } from '@/lib/design/glassTokens';
import { safeHaptics } from '@/lib/haptics/safeHaptics';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

interface HintOverlayProps {
  visible: boolean;
  targetRef: React.RefObject<any>;
  position?: 'above' | 'below' | 'left' | 'right';
  title: string;
  content: string;
  onDismiss: () => void;
}

export function HintOverlay({
  visible,
  targetRef,
  position = 'below',
  title,
  content,
  onDismiss,
}: HintOverlayProps) {
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const [targetLayout, setTargetLayout] = useState<LayoutRectangle | null>(null);

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

      // Haptic feedback
      safeHaptics.light();
    } else {
      Animated.timing(fadeAnim, {
        toValue: 0,
        duration: 200,
        useNativeDriver: true,
      }).start();
    }
  }, [visible]);

  if (!visible || !targetLayout) return null;

  // Calculate hint card position
  const hintPosition = calculatePosition(targetLayout, position);

  return (
    <Animated.View style={[styles.overlay, { opacity: fadeAnim }]} pointerEvents="box-none">
      {/* Dimmed background - 50% opacity */}
      <Pressable style={styles.backdrop} onPress={onDismiss} />

      {/* Spotlight glow around target */}
      <View
        style={[
          styles.spotlight,
          {
            left: targetLayout.x - 8,
            top: targetLayout.y - 8,
            width: targetLayout.width + 16,
            height: targetLayout.height + 16,
          },
        ]}
      />

      {/* Hint card */}
      <View style={[styles.hintCard, hintPosition]}>
        <GlassCard style={styles.card}>
          <Text style={styles.title}>{title}</Text>
          <Text style={styles.content}>{content}</Text>
          <GlassButton
            variant="primary"
            size="sm"
            onPress={onDismiss}
            style={styles.button}
          >
            Got it
          </GlassButton>
        </GlassCard>
      </View>
    </Animated.View>
  );
}

function calculatePosition(target: LayoutRectangle, position: string) {
  const cardWidth = 280;
  const cardHeight = 120; // Approximate
  const spacing = 16;

  switch (position) {
    case 'above':
      return {
        left: Math.max(16, Math.min(SCREEN_WIDTH - cardWidth - 16, target.x + target.width / 2 - cardWidth / 2)),
        top: target.y - cardHeight - spacing,
      };
    case 'below':
      return {
        left: Math.max(16, Math.min(SCREEN_WIDTH - cardWidth - 16, target.x + target.width / 2 - cardWidth / 2)),
        top: target.y + target.height + spacing,
      };
    case 'left':
      return {
        left: target.x - cardWidth - spacing,
        top: Math.max(16, target.y + target.height / 2 - cardHeight / 2),
      };
    case 'right':
      return {
        left: target.x + target.width + spacing,
        top: Math.max(16, target.y + target.height / 2 - cardHeight / 2),
      };
    default:
      return { left: 16, top: target.y + target.height + spacing };
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
    backgroundColor: 'rgba(13, 21, 40, 0.50)', // 50% dimming
  },
  spotlight: {
    position: 'absolute',
    borderRadius: 12,
    borderWidth: 2,
    borderColor: glassTokens.colors.accent.primary,
    backgroundColor: 'transparent',
    shadowColor: glassTokens.colors.accent.primary,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.4,
    shadowRadius: 8,
    elevation: 5,
  },
  hintCard: {
    position: 'absolute',
    width: 280,
  },
  card: {
    padding: glassTokens.spacing.lg,
  },
  title: {
    fontSize: 16,
    fontWeight: '500',
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
  button: {
    alignSelf: 'flex-start',
  },
});
