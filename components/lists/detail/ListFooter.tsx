import React from "react";
import { View, Text, Pressable } from "react-native";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { GlassButton, colors, spacing, typography } from "@/components/ui/glass";
import { styles } from "./styles";

interface ListFooterProps {
  isInProgress: boolean;
  isFinishing: boolean;
  onStartTrip: () => void;
  onFinishTrip: () => void;
  activeShopper?: { name: string } | null;
  checkedCount: number;
  totalCount: number;
  insetsBottom: number;
  showCheckedItems: boolean;
  onToggleCheckedItems: () => void;
}

export const ListFooter = ({
  isInProgress,
  isFinishing,
  onStartTrip,
  onFinishTrip,
  activeShopper,
  checkedCount,
  totalCount,
  insetsBottom,
  showCheckedItems,
  onToggleCheckedItems,
}: ListFooterProps) => {
  return (
    <View style={[styles.footer, { bottom: insetsBottom, paddingBottom: spacing.md }]}>
      {activeShopper && !isInProgress && (
        <View style={styles.activeShopperBanner}>
          <MaterialCommunityIcons name="account-search" size={18} color={colors.accent.primary} />
          <Text style={styles.activeShopperText}>
            {activeShopper.name} is currently shopping this list
          </Text>
        </View>
      )}

      <View style={styles.tripControls}>
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

        {!isInProgress ? (
          <GlassButton
            variant="primary"
            size="md"
            icon="cart-arrow-right"
            onPress={onStartTrip}
            style={{ flex: 1, shadowColor: "#000", shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.5, shadowRadius: 12, elevation: 10 }}
          >
            Start Shopping
          </GlassButton>
        ) : (
          <GlassButton
            variant="primary"
            size="md"
            icon="check-all"
            onPress={onFinishTrip}
            loading={isFinishing}
            style={{ flex: 1, shadowColor: "#000", shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.5, shadowRadius: 12, elevation: 10 }}
          >
            {checkedCount === totalCount ? "Finish & Log" : `Finish (${checkedCount}/${totalCount})`}
          </GlassButton>
        )}
      </View>
    </View>
  );
};
