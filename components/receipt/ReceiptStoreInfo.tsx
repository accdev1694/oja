/**
 * ReceiptStoreInfo - Store information card for receipt confirmation screen.
 * Shows store name, address, date, and multi-store trip segments.
 */

import React from "react";
import { View, Text, StyleSheet } from "react-native";
import { MaterialCommunityIcons } from "@expo/vector-icons";

import {
  GlassCard,
  colors,
  typography,
  spacing,
} from "@/components/ui/glass";

interface StoreSegment {
  storeName: string;
  switchedAt: number;
}

interface ReceiptStoreInfoProps {
  storeName: string;
  storeAddress?: string;
  purchaseDate: number;
  storeSegments?: StoreSegment[];
  currentStoreName?: string;
}

export function ReceiptStoreInfo({
  storeName,
  storeAddress,
  purchaseDate,
  storeSegments,
  currentStoreName,
}: ReceiptStoreInfoProps) {
  return (
    <GlassCard variant="standard" style={styles.section}>
      <View style={styles.sectionHeader}>
        <MaterialCommunityIcons
          name="store"
          size={20}
          color={colors.accent.primary}
        />
        <Text style={styles.sectionTitle}>Store Information</Text>
      </View>

      <View style={styles.infoRow}>
        <Text style={styles.infoLabel}>Store:</Text>
        <Text style={styles.infoValue}>{storeName}</Text>
      </View>

      {storeAddress && (
        <View style={styles.infoRow}>
          <Text style={styles.infoLabel}>Address:</Text>
          <Text style={styles.infoValue}>{storeAddress}</Text>
        </View>
      )}

      {/* Multi-store trip info */}
      {storeSegments && storeSegments.length > 1 && (
        <View style={styles.multiStoreContainer}>
          <Text style={styles.multiStoreTitle}>Multi-Store Shopping Trip:</Text>
          {storeSegments.map((segment, idx) => (
            <View key={idx} style={styles.segmentRow}>
              <View style={[
                styles.segmentDot,
                segment.storeName === currentStoreName && styles.activeSegmentDot
              ]} />
              <Text style={[
                styles.segmentText,
                segment.storeName === currentStoreName && styles.activeSegmentText
              ]}>
                {segment.storeName}
              </Text>
              <Text style={styles.segmentTime}>
                {new Date(segment.switchedAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
              </Text>
            </View>
          ))}
        </View>
      )}

      <View style={styles.infoRow}>
        <Text style={styles.infoLabel}>Date:</Text>
        <Text style={styles.infoValue}>
          {new Date(purchaseDate).toLocaleDateString()}
        </Text>
      </View>
    </GlassCard>
  );
}

const styles = StyleSheet.create({
  section: {
    marginBottom: spacing.md,
  },
  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.xs,
    marginBottom: spacing.md,
  },
  sectionTitle: {
    ...typography.labelLarge,
    color: colors.text.primary,
  },
  infoRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingVertical: spacing.xs,
  },
  infoLabel: {
    ...typography.bodyMedium,
    color: colors.text.secondary,
  },
  infoValue: {
    ...typography.bodyMedium,
    color: colors.text.primary,
    fontWeight: "600",
  },
  multiStoreContainer: {
    marginTop: spacing.md,
    marginBottom: spacing.md,
    padding: spacing.md,
    backgroundColor: `${colors.accent.primary}08`,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: `${colors.accent.primary}20`,
  },
  multiStoreTitle: {
    ...typography.labelSmall,
    color: colors.text.secondary,
    marginBottom: spacing.sm,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  segmentRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: spacing.xs,
    gap: spacing.sm,
  },
  segmentDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: colors.glass.borderStrong,
  },
  activeSegmentDot: {
    backgroundColor: colors.accent.primary,
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  segmentText: {
    ...typography.bodyMedium,
    color: colors.text.secondary,
    flex: 1,
  },
  activeSegmentText: {
    color: colors.text.primary,
    fontWeight: "700",
  },
  segmentTime: {
    ...typography.bodySmall,
    color: colors.text.tertiary,
    fontSize: 10,
  },
});
