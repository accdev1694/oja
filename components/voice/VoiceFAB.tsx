/**
 * VoiceFAB — Draggable Floating Action Button for the voice assistant.
 *
 * Renders a glass-styled mic icon that can be dragged anywhere on screen.
 * Tapping it opens the VoiceSheet bottom sheet.
 * Position is persisted so it remembers where the user left it.
 *
 * Bounds are derived from the actual measured container via onLayout —
 * not from useWindowDimensions() which can return wrong values on Android.
 */

import React, { useCallback, useEffect, useState } from "react";
import { StyleSheet, View } from "react-native";
import Animated, {
  useAnimatedStyle,
  withRepeat,
  withTiming,
  useSharedValue,
  withSequence,
  withSpring,
  runOnJS,
} from "react-native-reanimated";
import { Gesture, GestureDetector } from "react-native-gesture-handler";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { TAB_BAR_HEIGHT } from "@/components/ui/glass/GlassTabBar";
import { useVoiceAssistant } from "@/hooks/useVoiceAssistant";
import { useCurrentUser } from "@/hooks/useCurrentUser";
import { VoiceSheet } from "./VoiceSheet";
import { colors, spacing, layout } from "@/lib/design/glassTokens";
import { usePathname } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import type { Id } from "@/convex/_generated/dataModel";
import type { LayoutChangeEvent } from "react-native";

const FAB_SIZE = 52;
const STORAGE_KEY = "@oja_voice_fab_position";

interface Props {
  activeListId?: Id<"shoppingLists">;
  activeListName?: string;
}

export function VoiceFAB({ activeListId, activeListName }: Props) {
  const pathname = usePathname();
  const { firstName } = useCurrentUser();
  const insets = useSafeAreaInsets();

  // Measured container dimensions — the single source of truth for bounds.
  const [layoutReady, setLayoutReady] = useState(false);

  // Shared values for bounds (updated from onLayout, read in worklets)
  const boundsMaxX = useSharedValue(0);
  const boundsMaxY = useSharedValue(0);
  const boundsMinY = useSharedValue(insets.top);
  const boundsSnapRight = useSharedValue(0);
  const boundsMidX = useSharedValue(0);

  // Position shared values
  const translateX = useSharedValue(0);
  const translateY = useSharedValue(0);
  const contextX = useSharedValue(0);
  const contextY = useSharedValue(0);
  const isPressed = useSharedValue(false);
  const isDragging = useSharedValue(false);

  // Called when the full-screen overlay measures itself
  const handleLayout = useCallback(
    (e: LayoutChangeEvent) => {
      const { width, height } = e.nativeEvent.layout;

      const maxX = width - FAB_SIZE;
      const maxY = height - TAB_BAR_HEIGHT - FAB_SIZE - insets.bottom;
      const minY = insets.top + layout.headerHeight;

      boundsMaxX.value = maxX;
      boundsMaxY.value = maxY;
      boundsMinY.value = minY;
      boundsSnapRight.value = maxX - spacing.md;
      boundsMidX.value = width / 2;

      if (!layoutReady) {
        // First layout: set default position (bottom-right, above tab bar)
        const defaultX = maxX - spacing.md;
        const defaultY = maxY - spacing.md;

        // Check for saved position
        AsyncStorage.getItem(STORAGE_KEY)
          .then((saved) => {
            if (saved) {
              try {
                const { x, y } = JSON.parse(saved);
                translateX.value = Math.max(0, Math.min(x, maxX));
                translateY.value = Math.max(minY, Math.min(y, maxY));
              } catch {
                translateX.value = defaultX;
                translateY.value = defaultY;
              }
            } else {
              translateX.value = defaultX;
              translateY.value = defaultY;
            }
            setLayoutReady(true);
          })
          .catch(() => {
            translateX.value = defaultX;
            translateY.value = defaultY;
            setLayoutReady(true);
          });
      }
    },
    [layoutReady, insets.top, insets.bottom]
  );

  // Keep minY in sync if insets change (e.g. status bar toggling)
  useEffect(() => {
    boundsMinY.value = insets.top + layout.headerHeight;
  }, [insets.top]);

  // Save position helper
  const savePosition = (x: number, y: number) => {
    AsyncStorage.setItem(STORAGE_KEY, JSON.stringify({ x, y })).catch(() => {});
  };

  // Determine current screen from pathname
  const currentScreen = pathname || "unknown";

  const voice = useVoiceAssistant({
    currentScreen,
    activeListId,
    activeListName,
    userName: firstName,
  });

  // Pulse animation when listening
  const pulseScale = useSharedValue(1);

  useEffect(() => {
    if (voice.isListening) {
      pulseScale.value = withRepeat(
        withSequence(
          withTiming(1.15, { duration: 600 }),
          withTiming(1, { duration: 600 })
        ),
        -1,
        true
      );
    } else {
      pulseScale.value = withTiming(1, { duration: 200 });
    }
  }, [voice.isListening, pulseScale]);

  // Pan gesture for dragging
  const panGesture = Gesture.Pan()
    .activeOffsetX([-8, 8])
    .activeOffsetY([-8, 8])
    .onStart(() => {
      contextX.value = translateX.value;
      contextY.value = translateY.value;
      isDragging.value = true;
    })
    .onUpdate((e) => {
      const newX = contextX.value + e.translationX;
      const newY = contextY.value + e.translationY;

      translateX.value = Math.max(0, Math.min(newX, boundsMaxX.value));
      translateY.value = Math.max(
        boundsMinY.value,
        Math.min(newY, boundsMaxY.value)
      );
    })
    .onEnd(() => {
      const finalX =
        translateX.value < boundsMidX.value
          ? spacing.md
          : boundsSnapRight.value;

      translateX.value = withSpring(finalX, {
        damping: 15,
        stiffness: 150,
      });

      runOnJS(savePosition)(finalX, translateY.value);
    });

  // Tap gesture for opening sheet
  const tapGesture = Gesture.Tap()
    .maxDuration(250)
    .onStart(() => {
      isPressed.value = true;
    })
    .onEnd(() => {
      isPressed.value = false;
      runOnJS(voice.openSheet)();
    });

  // Combine gestures — pan takes priority, tap only fires if pan doesn't activate
  const composedGesture = Gesture.Exclusive(panGesture, tapGesture);

  // Animated styles
  const animatedContainerStyle = useAnimatedStyle(() => ({
    transform: [
      { translateX: translateX.value },
      { translateY: translateY.value },
      { scale: pulseScale.value * (isPressed.value ? 0.95 : 1) },
    ],
  }));

  // Hide on certain routes (receipt confirm, trip summary, etc.)
  const hiddenRoutes = [
    "/receipt-confirm",
    "/trip-summary",
    "/pantry-pick",
    "/join-list",
    "/onboarding",
  ];
  const shouldHide = hiddenRoutes.some((r) => currentScreen.includes(r));
  if (shouldHide || !voice.isAvailable) return null;

  return (
    <View
      style={styles.overlay}
      pointerEvents="box-none"
      onLayout={handleLayout}
    >
      {layoutReady && (
        <GestureDetector gesture={composedGesture}>
          <Animated.View style={[styles.fabWrapper, animatedContainerStyle]}>
            <View
              style={[
                styles.fab,
                voice.isListening && styles.fabActive,
              ]}
              accessibilityRole="button"
              accessibilityLabel="Ask Oja voice assistant"
            >
              <MaterialCommunityIcons
                name="microphone"
                size={26}
                color={colors.text.primary}
              />
            </View>
          </Animated.View>
        </GestureDetector>
      )}

      <VoiceSheet
        visible={voice.isSheetOpen}
        onClose={voice.closeSheet}
        isListening={voice.isListening}
        isProcessing={voice.isProcessing}
        transcript={voice.transcript}
        partialTranscript={voice.partialTranscript}
        response={voice.response}
        pendingAction={voice.pendingAction}
        error={voice.error}
        conversationHistory={voice.conversationHistory}
        onStartListening={voice.startListening}
        onStopListening={voice.stopListening}
        onConfirmAction={voice.confirmAction}
        onCancelAction={voice.cancelAction}
        onResetConversation={voice.resetConversation}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  overlay: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 100,
  },
  fabWrapper: {
    position: "absolute",
    left: 0,
    top: 0,
  },
  fab: {
    width: FAB_SIZE,
    height: FAB_SIZE,
    borderRadius: FAB_SIZE / 2,
    backgroundColor: colors.accent.primary,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: colors.accent.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 10,
    elevation: 8,
  },
  fabActive: {
    backgroundColor: colors.accent.error,
    shadowColor: colors.accent.error,
  },
});
