import { View, Text, StyleSheet } from "react-native";
import { MaterialCommunityIcons } from "@expo/vector-icons";

import {
  GlassCard,
  colors,
  typography,
  spacing,
} from "@/components/ui/glass";

/**
 * Receipt scan statistics card.
 * Shows scans this month, lifetime scans, and credits earned.
 */
interface ReceiptStats {
  scansThisPeriod: number;
  lifetimeScans: number;
  creditsEarned: number;
}

interface ReceiptScansCardProps {
  receipts: ReceiptStats;
  isAdmin: boolean;
}

export function ReceiptScansCard({ receipts, isAdmin }: ReceiptScansCardProps) {
  return (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>Receipt Scans</Text>
      <GlassCard variant="standard">
        <View style={styles.receiptRow}>
          <View style={styles.receiptStat}>
            <MaterialCommunityIcons
              name="camera"
              size={20}
              color={colors.accent.primary}
            />
            <View style={styles.receiptStatInfo}>
              <Text style={styles.receiptStatValue}>{receipts.scansThisPeriod}</Text>
              <Text style={styles.receiptStatLabel}>this month</Text>
            </View>
          </View>

          <View style={styles.receiptDivider} />

          <View style={styles.receiptStat}>
            <MaterialCommunityIcons
              name="star"
              size={20}
              color={colors.accent.warm}
            />
            <View style={styles.receiptStatInfo}>
              <Text style={styles.receiptStatValue}>{receipts.lifetimeScans}</Text>
              <Text style={styles.receiptStatLabel}>lifetime</Text>
            </View>
          </View>

          <View style={styles.receiptDivider} />

          <View style={styles.receiptStat}>
            <MaterialCommunityIcons
              name="cash"
              size={20}
              color={colors.semantic.success}
            />
            <View style={styles.receiptStatInfo}>
              <Text style={[styles.receiptStatValue, { color: colors.semantic.success }]}>
                £{receipts.creditsEarned.toFixed(2)}
              </Text>
              <Text style={styles.receiptStatLabel}>{isAdmin ? "earned" : "saved"}</Text>
            </View>
          </View>
        </View>

        <View style={styles.receiptNote}>
          <MaterialCommunityIcons
            name="information-outline"
            size={14}
            color={colors.text.tertiary}
          />
          <Text style={styles.receiptNoteText}>
            {isAdmin
              ? "Scan receipts to earn cashback rewards. Maximum rewards enabled for Admin."
              : "Scan receipts to earn credits off your subscription. Unlimited for Premium."}
          </Text>
        </View>
      </GlassCard>
    </View>
  );
}

const styles = StyleSheet.create({
  section: {
    marginBottom: spacing.lg,
  },
  sectionTitle: {
    ...typography.labelLarge,
    color: colors.text.secondary,
    marginBottom: spacing.sm,
    marginLeft: spacing.xs,
  },
  receiptRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-around",
  },
  receiptStat: {
    alignItems: "center",
    gap: spacing.xs,
    flex: 1,
  },
  receiptStatInfo: {
    alignItems: "center",
  },
  receiptStatValue: {
    ...typography.headlineSmall,
    color: colors.text.primary,
    fontWeight: "700",
  },
  receiptStatLabel: {
    ...typography.labelSmall,
    color: colors.text.tertiary,
  },
  receiptDivider: {
    width: 1,
    height: 40,
    backgroundColor: colors.glass.border,
  },
  receiptNote: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.xs,
    marginTop: spacing.md,
    paddingTop: spacing.sm,
    borderTopWidth: 1,
    borderTopColor: colors.glass.border,
  },
  receiptNoteText: {
    ...typography.bodySmall,
    color: colors.text.tertiary,
    flex: 1,
  },
});
