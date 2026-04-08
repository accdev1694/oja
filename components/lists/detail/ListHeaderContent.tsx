import React from "react";
import { View, Text, Pressable } from "react-native";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import {
  AnimatedSection,
  CircularBudgetDial,
  colors,
} from "@/components/ui/glass";
import { getStoreInfoSafe } from "@/convex/lib/stores/normalization";
import { ListActionRow } from "@/components/list/ListActionRow";
import { styles } from "./styles";

export function ListHeaderContent({
  budget,
  estimatedTotal,
  spent,
  canEdit,
  onBudgetPress,
  storeName,
  normalizedStoreId,
  userFavorites,
  itemCount,
  onStoreSelect,
  onAddItemsPress,
  isRefreshingPrices,
  onRefreshPrices,
}: {
  budget: number;
  estimatedTotal: number;
  spent: number;
  canEdit: boolean;
  onBudgetPress: (() => void) | undefined;
  storeName: string | undefined;
  normalizedStoreId: string | undefined;
  userFavorites: string[];
  itemCount: number;
  onStoreSelect: (storeId: string) => Promise<void>;
  onAddItemsPress: () => void;
  isRefreshingPrices: boolean;
  onRefreshPrices: () => void;
}) {
  const storeColor = normalizedStoreId ? getStoreInfoSafe(normalizedStoreId)?.color : undefined;

  return (
    <View>
      <AnimatedSection animation="fadeInDown" duration={400}>
        <CircularBudgetDial
          budget={budget}
          planned={estimatedTotal}
          spent={spent}
          onPress={canEdit ? onBudgetPress : undefined}
          storeName={storeName}
          storeColor={storeColor}
        />
      </AnimatedSection>

      {canEdit && (
        <ListActionRow
          storeName={storeName}
          storeColor={storeColor}
          hasStore={!!normalizedStoreId}
          currentStoreId={normalizedStoreId}
          userFavorites={userFavorites}
          itemCount={itemCount}
          onStoreSelect={onStoreSelect}
          onAddItemsPress={onAddItemsPress}
        />
      )}

      {canEdit && itemCount > 0 && (
        <View style={styles.refreshPricesRow}>
          <Pressable
            style={styles.refreshPricesButton}
            onPress={onRefreshPrices}
            disabled={isRefreshingPrices}
          >
            <MaterialCommunityIcons
              name="cash-sync"
              size={16}
              color={isRefreshingPrices ? colors.text.disabled : colors.accent.primary}
            />
            <Text
              style={[
                styles.refreshPricesText,
                isRefreshingPrices && { color: colors.text.disabled },
              ]}
            >
              {isRefreshingPrices ? "Refreshing..." : "Refresh Prices"}
            </Text>
          </Pressable>
        </View>
      )}
    </View>
  );
}
