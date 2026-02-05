/**
 * VoiceFAB — Floating Action Button for the voice assistant.
 *
 * Renders a glass-styled mic icon above the tab bar on all screens.
 * Tapping it opens the VoiceSheet bottom sheet.
 * Manages the full voice assistant state via useVoiceAssistant.
 */

import React from "react";
import { Pressable, StyleSheet } from "react-native";
import Animated, {
  useAnimatedStyle,
  withRepeat,
  withTiming,
  useSharedValue,
  withSequence,
} from "react-native-reanimated";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { TAB_BAR_HEIGHT } from "@/components/ui/glass/GlassTabBar";
import { useVoiceAssistant } from "@/hooks/useVoiceAssistant";
import { useCurrentUser } from "@/hooks/useCurrentUser";
import { VoiceSheet } from "./VoiceSheet";
import { colors, spacing } from "@/lib/design/glassTokens";
import { usePathname } from "expo-router";
import type { Id } from "@/convex/_generated/dataModel";

interface Props {
  activeListId?: Id<"shoppingLists">;
  activeListName?: string;
}

export function VoiceFAB({ activeListId, activeListName }: Props) {
  const pathname = usePathname();
  const { firstName } = useCurrentUser();

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

  React.useEffect(() => {
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

  const pulseStyle = useAnimatedStyle(() => ({
    transform: [{ scale: pulseScale.value }],
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
      <Animated.View style={[styles.container, pulseStyle]}>
        <Pressable
          style={[
            styles.fab,
            voice.isListening && styles.fabActive,
          ]}
          onPress={voice.openSheet}
          accessibilityRole="button"
          accessibilityLabel="Ask Oja voice assistant"
        >
          <MaterialCommunityIcons
            name="microphone"
            size={26}
            color={colors.text.primary}
          />
        </Pressable>
      </Animated.View>

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

const FAB_SIZE = 52;

const styles = StyleSheet.create({
  container: {
    position: "absolute",
    right: spacing.md,
    bottom: TAB_BAR_HEIGHT + spacing.md,
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
