/**
 * VoiceFAB — Draggable Floating Action Button for the voice assistant.
 *
 * Renders a glass-styled mic icon that can be dragged anywhere on screen.
 * Tapping it opens the VoiceSheet bottom sheet.
 * Position is persisted so it remembers where the user left it.
 */

import React, { useEffect } from "react";
import { Pressable, StyleSheet, Dimensions, View } from "react-native";
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
import { colors, spacing } from "@/lib/design/glassTokens";
import { usePathname } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import type { Id } from "@/convex/_generated/dataModel";

const FAB_SIZE = 52;
const STORAGE_KEY = "@oja_voice_fab_position";
const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get("window");

interface Props {
  activeListId?: Id<"shoppingLists">;
  activeListName?: string;
}

export function VoiceFAB({ activeListId, activeListName }: Props) {
  const pathname = usePathname();
  const { firstName } = useCurrentUser();
  const insets = useSafeAreaInsets();

  // Default position: right side, just above tab bar
  const defaultX = SCREEN_WIDTH - FAB_SIZE - spacing.md;
  const defaultY = SCREEN_HEIGHT - TAB_BAR_HEIGHT - FAB_SIZE - spacing.lg - insets.bottom;

  // Position shared values
  const translateX = useSharedValue(defaultX);
  const translateY = useSharedValue(defaultY);
  const contextX = useSharedValue(0);
  const contextY = useSharedValue(0);
  const isPressed = useSharedValue(false);
  const isDragging = useSharedValue(false);

  // Load saved position on mount
  useEffect(() => {
    AsyncStorage.getItem(STORAGE_KEY).then((saved) => {
      if (saved) {
        try {
          const { x, y } = JSON.parse(saved);
          // Validate position is within screen bounds
          const clampedX = Math.max(0, Math.min(x, SCREEN_WIDTH - FAB_SIZE));
          const clampedY = Math.max(
            insets.top,
            Math.min(y, SCREEN_HEIGHT - TAB_BAR_HEIGHT - FAB_SIZE - insets.bottom)
          );
          translateX.value = clampedX;
          translateY.value = clampedY;
        } catch {
          // Invalid data, use defaults
        }
      }
    });
  }, []);

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
    .onStart(() => {
      contextX.value = translateX.value;
      contextY.value = translateY.value;
      isDragging.value = false;
    })
    .onUpdate((e) => {
      // Mark as dragging if moved more than 5px
      if (Math.abs(e.translationX) > 5 || Math.abs(e.translationY) > 5) {
        isDragging.value = true;
      }

      // Calculate new position with boundaries
      const newX = contextX.value + e.translationX;
      const newY = contextY.value + e.translationY;

      // Clamp to screen bounds
      translateX.value = Math.max(0, Math.min(newX, SCREEN_WIDTH - FAB_SIZE));
      translateY.value = Math.max(
        insets.top,
        Math.min(newY, SCREEN_HEIGHT - TAB_BAR_HEIGHT - FAB_SIZE - insets.bottom)
      );
    })
    .onEnd(() => {
      // Snap to edges with spring animation
      const midX = SCREEN_WIDTH / 2;
      const finalX = translateX.value < midX ? spacing.md : SCREEN_WIDTH - FAB_SIZE - spacing.md;

      translateX.value = withSpring(finalX, {
        damping: 15,
        stiffness: 150,
      });

      // Save final position
      runOnJS(savePosition)(finalX, translateY.value);
    });

  // Tap gesture for opening sheet
  const tapGesture = Gesture.Tap()
    .onStart(() => {
      isPressed.value = true;
    })
    .onEnd(() => {
      isPressed.value = false;
      // Only open if we weren't dragging
      if (!isDragging.value) {
        runOnJS(voice.openSheet)();
      }
    });

  // Combine gestures - pan has priority
  const composedGesture = Gesture.Race(panGesture, tapGesture);

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
    <>
      <GestureDetector gesture={composedGesture}>
        <Animated.View style={[styles.container, animatedContainerStyle]}>
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
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    position: "absolute",
    left: 0,
    top: 0,
    zIndex: 100,
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
