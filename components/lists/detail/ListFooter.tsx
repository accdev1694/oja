import React from "react";
import { View, Text, Pressable } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { GlassButton, colors, spacing } from "@/components/ui/glass";
import { styles } from "./styles";

interface ListFooterProps {
  isFinishing: boolean;
  onFinishTrip: () => void;
  activeShopper?: { name: string } | null;
  checkedCount: number;
  totalCount: number;
  insetsBottom: number;
  showCheckedItems: boolean;
  onToggleCheckedItems: () => void;
}

export const ListFooter = ({
  isFinishing,
  onFinishTrip,
  activeShopper,
  checkedCount,
  totalCount,
  insetsBottom,
  showCheckedItems,
  onToggleCheckedItems,
}: ListFooterProps) => {
  return (
    <LinearGradient
      colors={["rgba(13, 21, 40, 0)", "rgba(13, 21, 40, 0.6)", colors.background.primary]}
      locations={[0, 0.3, 0.55]}
      pointerEvents="box-none"
      style={[styles.footer, { bottom: insetsBottom, paddingBottom: spacing.md }]}
    >
      <View style={styles.tripControls} pointerEvents="auto">
        {totalCount > 0 && (
          <Pressable
            style={[styles.checkedToggleBtn, showCheckedItems && styles.checkedToggleBtnActive]}
            onPress={onToggleCheckedItems}
          >
            <MaterialCommunityIcons
              name={showCheckedItems ? "eye-outline" : "eye-off-outline"}
              size={18}
              color={showCheckedItems ? colors.accent.primary : colors.text.tertiary}
            />
            <Text
              style={[
                styles.checkedToggleText,
                showCheckedItems && styles.checkedToggleTextActive,
              ]}
              numberOfLines={1}
            >
              {showCheckedItems ? "Hide Checked" : "Show Checked"}
            </Text>
          </Pressable>
        )}

        <GlassButton
          variant="primary"
          size="md"
          icon={totalCount > 0 && checkedCount === totalCount ? "party-popper" : "check-all"}
          onPress={onFinishTrip}
          loading={isFinishing}
          style={{
            flex: 1,
            shadowColor: "#000",
            shadowOffset: { width: 0, height: 6 },
            shadowOpacity: 0.5,
            shadowRadius: 12,
            elevation: 10,
            ...(totalCount > 0 && checkedCount === totalCount && { backgroundColor: colors.accent.warm }),
          }}
        >
          {totalCount > 0 && checkedCount === totalCount
            ? `All Done! (${checkedCount}/${totalCount})`
            : `Finish (${checkedCount}/${totalCount})`}
        </GlassButton>
      </View>
    </LinearGradient>
  );
};
