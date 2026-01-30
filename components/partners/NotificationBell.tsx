import React from "react";
import { View, Pressable, Text, StyleSheet } from "react-native";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { useNotifications } from "@/hooks/useNotifications";
import { colors, spacing, typography } from "@/lib/design/glassTokens";

interface NotificationBellProps {
  onPress: () => void;
}

export function NotificationBell({ onPress }: NotificationBellProps) {
  const { unreadCount } = useNotifications();

  const handlePress = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onPress();
  };

  return (
    <Pressable onPress={handlePress} hitSlop={12} style={styles.container}>
      <MaterialCommunityIcons
        name="bell-outline"
        size={24}
        color={colors.text.secondary}
      />
      {unreadCount > 0 && (
        <View style={styles.badge}>
          <Text style={styles.badgeText}>
            {unreadCount > 99 ? "99+" : unreadCount}
          </Text>
        </View>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: {
    position: "relative",
    width: 36,
    height: 36,
    alignItems: "center",
    justifyContent: "center",
  },
  badge: {
    position: "absolute",
    top: 0,
    right: 0,
    minWidth: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: colors.accent.error,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 4,
  },
  badgeText: {
    color: colors.text.primary,
    fontSize: 10,
    fontWeight: "800",
  },
});
