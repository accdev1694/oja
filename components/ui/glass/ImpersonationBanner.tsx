import React from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { colors, spacing, typography } from "@/lib/design/glassTokens";
import { useImpersonation } from "@/hooks/useImpersonation";

/**
 * High-visibility banner shown when an admin is impersonating a user.
 * Cannot be dismissed while impersonation is active.
 */
export function ImpersonationBanner() {
  const insets = useSafeAreaInsets();
  const { isImpersonated, adminName, tokenValue } = useImpersonation();
  const stopImpersonation = useMutation(api.admin.stopImpersonation);

  if (!isImpersonated) return null;

  const handleStop = async () => {
    if (!tokenValue) return;
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    await stopImpersonation({ tokenValue });
  };

  return (
    <View style={[styles.banner, { paddingTop: Math.max(insets.top, spacing.xs) }]}>
      <View style={styles.content}>
        <MaterialCommunityIcons name="shield-account" size={20} color={colors.semantic.warning} />
        <View style={styles.textContainer}>
          <Text style={styles.title}>Impersonation Active</Text>
          <Text style={styles.subtitle}>Viewing as user (Admin: {adminName})</Text>
        </View>
      </View>
      <Pressable
        style={styles.stopButton}
        onPress={handleStop}
      >
        <Text style={styles.stopButtonText}>STOP</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  banner: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: `${colors.semantic.warning}20`,
    borderBottomWidth: 1,
    borderBottomColor: `${colors.semantic.warning}40`,
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.lg,
    zIndex: 9999,
  },
  content: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    flex: 1,
  },
  textContainer: {
    flex: 1,
  },
  title: {
    ...typography.labelSmall,
    color: colors.semantic.warning,
    fontWeight: "800",
    letterSpacing: 0.5,
  },
  subtitle: {
    fontSize: 10,
    color: colors.text.secondary,
    fontWeight: "500",
  },
  stopButton: {
    backgroundColor: colors.semantic.warning,
    paddingHorizontal: spacing.md,
    paddingVertical: 4,
    borderRadius: 4,
  },
  stopButtonText: {
    fontSize: 10,
    fontWeight: "900",
    color: "#000",
  },
});
