import React from "react";
import { View, Text } from "react-native";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { GlassButton, colors, spacing } from "@/components/ui/glass";
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
}: ListFooterProps) => {
  return (
    <View style={[styles.footer, { paddingBottom: insetsBottom + spacing.md }]}>
      {activeShopper && !isInProgress && (
        <View style={styles.activeShopperBanner}>
          <MaterialCommunityIcons name="account-search" size={18} color={colors.accent.primary} />
          <Text style={styles.activeShopperText}>
            {activeShopper.name} is currently shopping this list
          </Text>
        </View>
      )}

      <View style={styles.tripControls}>
        {!isInProgress ? (
          <GlassButton
            variant="primary"
            size="lg"
            icon="cart-arrow-right"
            onPress={onStartTrip}
            style={{ flex: 1 }}
          >
            Start Shopping
          </GlassButton>
        ) : (
          <GlassButton
            variant="primary"
            size="lg"
            icon="check-all"
            onPress={onFinishTrip}
            loading={isFinishing}
            style={{ flex: 1 }}
          >
            {checkedCount === totalCount ? "Finish & Log" : `Finish (${checkedCount}/${totalCount})`}
          </GlassButton>
        )}
      </View>
    </View>
  );
};
