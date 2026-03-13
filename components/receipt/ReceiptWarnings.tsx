/**
 * ReceiptWarnings - Warning cards for receipt confirmation screen.
 * Shows partial scan warning and low confidence item warnings.
 */

import React from "react";
import { View, Text, StyleSheet } from "react-native";
import { MaterialCommunityIcons } from "@expo/vector-icons";

import {
  GlassCard,
  GlassButton,
  colors,
  typography,
  spacing,
} from "@/components/ui/glass";

interface ReceiptWarningsProps {
  isPartialScan: boolean;
  itemCount: number;
  receiptTotal: number;
  lowConfidenceCount: number;
  onRetakePhoto: () => void;
}

export function ReceiptWarnings({
  isPartialScan,
  itemCount,
  receiptTotal,
  lowConfidenceCount,
  onRetakePhoto,
}: ReceiptWarningsProps) {
  return (
    <>
      {/* Partial Scan Warning */}
      {isPartialScan && (
        <GlassCard
          variant="bordered"
          accentColor={colors.semantic.danger}
          style={styles.section}
        >
          <View style={styles.warningHeader}>
            <MaterialCommunityIcons
              name="image-broken-variant"
              size={20}
              color={colors.semantic.danger}
            />
            <Text style={styles.partialScanTitle}>Incomplete Scan</Text>
          </View>
          <Text style={styles.warningText}>
            We only found {itemCount} item{itemCount !== 1 ? "s" : ""} but
            the receipt total is £{receiptTotal.toFixed(2)}. Some items may not have
            been captured. Try retaking the photo with better lighting, or add
            missing items manually below.
          </Text>
          <GlassButton
            variant="secondary"
            size="sm"
            icon="camera-retake"
            onPress={onRetakePhoto}
            style={styles.retakeButton}
          >
            Retake Photo
          </GlassButton>
        </GlassCard>
      )}

      {/* Low Confidence Warning */}
      {lowConfidenceCount > 0 && (
        <GlassCard
          variant="bordered"
          accentColor={colors.semantic.warning}
          style={styles.section}
        >
          <View style={styles.warningHeader}>
            <MaterialCommunityIcons
              name="alert"
              size={20}
              color={colors.semantic.warning}
            />
            <Text style={styles.warningTitle}>Review Needed</Text>
          </View>
          <Text style={styles.warningText}>
            {lowConfidenceCount} item{lowConfidenceCount > 1 ? "s" : ""} marked
            with ⚠️ need your attention. Tap to edit.
          </Text>
        </GlassCard>
      )}
    </>
  );
}

const styles = StyleSheet.create({
  section: {
    marginBottom: spacing.md,
  },
  warningHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.xs,
    marginBottom: spacing.xs,
  },
  warningTitle: {
    ...typography.labelMedium,
    color: colors.semantic.warning,
    fontWeight: "600",
  },
  warningText: {
    ...typography.bodySmall,
    color: colors.text.secondary,
  },
  partialScanTitle: {
    ...typography.labelMedium,
    color: colors.semantic.danger,
    fontWeight: "600",
  },
  retakeButton: {
    marginTop: spacing.sm,
    alignSelf: "flex-start",
  },
});
