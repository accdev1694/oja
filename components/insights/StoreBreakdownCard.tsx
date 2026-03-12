import React from "react";
import { View, Text } from "react-native";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { GlassCollapsible, colors } from "@/components/ui/glass";
import { styles } from "./styles";

interface StoreBreakdownCardProps {
  storeBreakdownData: {
    stores: any[];
    totalSpending: number;
    totalVisits: number;
  } | null;
  storeRecommendation: any;
}

export const StoreBreakdownCard = ({ 
  storeBreakdownData, 
  storeRecommendation 
}: StoreBreakdownCardProps) => {
  if (!storeBreakdownData || storeBreakdownData.stores.length === 0) return null;

  return (
    <View style={styles.section}>
      <GlassCollapsible
        title="Store Breakdown"
        icon="store"
        iconColor={colors.accent.info}
        badge={storeBreakdownData.stores.length}
      >
        {/* Spending by Store */}
        <View style={styles.storeSpendingSection}>
          <Text style={styles.storeSubheading}>Spending by Store</Text>
          <View style={styles.storeSpendingList}>
            {storeBreakdownData.stores.slice(0, 6).map((store) => (
              <View key={store.storeId} style={styles.storeSpendingRow}>
                <View style={styles.storeSpendingLabelRow}>
                  <View
                    style={[
                      styles.storeDot,
                      { backgroundColor: store.color },
                    ]}
                  />
                  <Text style={styles.storeName} numberOfLines={1}>
                    {store.displayName}
                  </Text>
                  <Text style={styles.storeAmount}>
                    £{store.spending.toFixed(2)}
                  </Text>
                  <Text style={styles.storePercent}>
                    ({store.spendingPercent.toFixed(0)}%)
                  </Text>
                </View>
                <View style={styles.storeBarTrack}>
                  <View
                    style={[
                      styles.storeBarFill,
                      {
                        width: `${Math.max(store.spendingPercent, 2)}%`,
                        backgroundColor: store.color,
                      },
                    ]}
                  />
                </View>
              </View>
            ))}
          </View>
        </View>

        {/* Store Visits */}
        <View style={styles.storeVisitsSection}>
          <Text style={styles.storeSubheading}>Store Visits</Text>
          <View style={styles.storeVisitsGrid}>
            {storeBreakdownData.stores.slice(0, 6).map((store) => (
              <View key={store.storeId} style={styles.storeVisitItem}>
                <View
                  style={[
                    styles.storeVisitIcon,
                    { backgroundColor: `${store.color}20` },
                  ]}
                >
                  <MaterialCommunityIcons
                    name="cart-outline"
                    size={16}
                    color={store.color}
                  />
                </View>
                <Text style={styles.storeVisitCount}>{store.visits}</Text>
                <Text style={styles.storeVisitName} numberOfLines={1}>
                  {store.displayName}
                </Text>
              </View>
            ))}
          </View>
          <Text style={styles.storeTotalVisits}>
            {storeBreakdownData.totalVisits} total trip
            {storeBreakdownData.totalVisits !== 1 ? "s" : ""}
          </Text>
        </View>

        {/* Savings Recommendation */}
        {storeRecommendation && (
          <View style={styles.savingsRecommendation}>
            <View style={styles.savingsRecommendationHeader}>
              <MaterialCommunityIcons
                name="lightbulb-on"
                size={20}
                color={colors.accent.warning}
              />
              <Text style={styles.savingsRecommendationTitle}>
                Smart Suggestion
              </Text>
            </View>
            <Text style={styles.savingsRecommendationText}>
              {storeRecommendation.message}
            </Text>
            {storeRecommendation.alternativeStores &&
              storeRecommendation.alternativeStores.length > 0 && (
                <View style={styles.alternativeStoresRow}>
                  <Text style={styles.alternativeStoresLabel}>
                    Other options:
                  </Text>
                  {storeRecommendation.alternativeStores.map((alt: any) => (
                    <View
                      key={alt.storeId}
                      style={[
                        styles.alternativeStoreChip,
                        { borderColor: alt.storeColor },
                      ]}
                    >
                      <Text
                        style={[
                          styles.alternativeStoreText,
                          { color: alt.storeColor },
                        ]}
                      >
                        {alt.storeName} (£{alt.potentialSavings.toFixed(0)})
                      </Text>
                    </View>
                  ))}
                </View>
              )}
          </View>
        )}
      </GlassCollapsible>
    </View>
  );
};
