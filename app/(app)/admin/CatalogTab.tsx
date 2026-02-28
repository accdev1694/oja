import React, { useCallback } from "react";
import {
  View,
  Text,
  ScrollView,
  Pressable,
} from "react-native";
import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import * as Haptics from "expo-haptics";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import {
  GlassCard,
  AnimatedSection,
  colors,
  useGlassAlert,
} from "@/components/ui/glass";
import { adminStyles as styles } from "./styles";
import { CategoryCount, DuplicateStoreGroup } from "./types";
import { useAdminToast } from "./hooks";

interface CatalogTabProps {
  /** Permission check function */
  hasPermission: (p: string) => boolean;
}

/**
 * CatalogTab Component
 * Manages the product catalog, including store deduplication and category stats.
 */
export function CatalogTab({ hasPermission }: CatalogTabProps) {
  const { alert: showAlert } = useGlassAlert();
  const { showToast } = useAdminToast();
  
  const categories = useQuery(api.admin.getCategories, {}) as CategoryCount[] | undefined;
  const duplicateStores = useQuery(api.admin.getDuplicateStores, {}) as DuplicateStoreGroup[] | undefined;
  const mergeStores = useMutation(api.admin.mergeStoreNames);

  const canMerge = hasPermission("manage_catalog");

  const handleMerge = useCallback(async (variants: string[], suggested: string) => {
    showAlert("Merge Stores", `Merge all variants to "${suggested}"? This action affects all existing price records.`, [
      { text: "Cancel", style: "cancel" },
      {
        text: "Merge",
        onPress: async () => {
          try {
            const result = await mergeStores({ fromNames: variants, toName: suggested });
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
            showToast(`Merged ${result.updatedCount} records`, "success");
          } catch (error) {
            showToast((error as Error).message || "Failed to merge stores", "error");
          }
        },
      },
    ]);
  }, [mergeStores, showAlert, showToast]);

  return (
    <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent}>
      {/* Duplicate Stores */}
      {Array.isArray(duplicateStores) && duplicateStores.length > 0 && (
        <AnimatedSection animation="fadeInDown" duration={400} delay={0}>
          <GlassCard style={styles.section}>
            <View style={styles.sectionHeader}>
              <MaterialCommunityIcons name="store-alert" size={24} color={colors.semantic.warning} />
              <Text style={styles.sectionTitle}>Duplicate Stores ({duplicateStores.length})</Text>
            </View>
            {duplicateStores.map((d, i) => (
              <View key={i} style={styles.storeRow}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.userName}>{(d.variants || []).join(" / ")}</Text>
                  <Text style={styles.userEmail}>Suggested: {d.suggested}</Text>
                </View>
                {canMerge && (
                  <Pressable
                    style={styles.mergeBtn}
                    onPress={() => handleMerge(d.variants, d.suggested)}
                  >
                    <Text style={styles.mergeBtnText}>Merge</Text>
                  </Pressable>
                )}
              </View>
            ))}
          </GlassCard>
        </AnimatedSection>
      )}

      {/* Categories */}
      {Array.isArray(categories) && categories.length > 0 && (
        <AnimatedSection animation="fadeInDown" duration={400} delay={100}>
          <GlassCard style={styles.section}>
            <Text style={styles.sectionTitle}>Categories ({categories.length})</Text>
            <View style={styles.categoryGrid}>
              {categories.map((c) => (
                <View key={c.category} style={styles.categoryChip}>
                  <Text style={styles.categoryName}>{c.category}</Text>
                  <Text style={styles.categoryCount}>{c.count}</Text>
                </View>
              ))}
            </View>
          </GlassCard>
        </AnimatedSection>
      )}

      <View style={{ height: 140 }} />
    </ScrollView>
  );
}
