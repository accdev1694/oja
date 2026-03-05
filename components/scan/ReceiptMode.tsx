import React from "react";
import { View, Text, StyleSheet, Pressable, ScrollView , ActivityIndicator } from "react-native";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { 
  GlassCard, 
  AnimatedSection, 
  NoReceipts, 
  colors, 
  typography, 
  spacing, 
  borderRadius,
  TAB_BAR_HEIGHT 
} from "@/components/ui/glass";

import { useSafeAreaInsets } from "react-native-safe-area-context";

interface ReceiptModeProps {
  receipts: any[] | undefined;
  isScanning?: boolean;
  onSelectReceipt: (receipt: any) => void;
  onScanPress: () => void;
}

export function ReceiptMode({ receipts, isScanning, onSelectReceipt, onScanPress }: ReceiptModeProps) {
  const insets = useSafeAreaInsets();
  const hasReceipts = receipts && receipts.length > 0;

  if (!hasReceipts && receipts !== undefined && !isScanning) {
    return (
      <View style={styles.emptyContainer}>
        <NoReceipts onAction={onScanPress} />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <Text style={styles.title}>Recent Receipts</Text>
          <Text style={styles.subtitle}>Track your spending and earn points</Text>
        </View>

        <View style={styles.list}>
          {isScanning && (
            <GlassCard variant="standard" style={styles.loadingCard}>
              <ActivityIndicator color={colors.accent.primary} />
              <Text style={styles.loadingText}>Processing receipt...</Text>
            </GlassCard>
          )}

          {receipts?.map((receipt, index) => (
            <AnimatedSection 
              key={receipt._id} 
              animation="fadeInUp" 
              delay={index * 50}
            >
              <Pressable onPress={() => onSelectReceipt(receipt)}>
                <GlassCard variant="standard" style={styles.receiptCard}>
                  <View style={styles.receiptIcon}>
                    <MaterialCommunityIcons name="receipt" size={20} color={colors.accent.primary} />
                  </View>
                  <View style={styles.receiptInfo}>
                    <Text style={styles.storeName}>{receipt.storeName}</Text>
                    <Text style={styles.receiptDate}>
                      {new Date(receipt.purchaseDate).toLocaleDateString()}
                    </Text>
                  </View>
                  <View style={styles.receiptAmount}>
                    <Text style={styles.amountText}>£{receipt.total.toFixed(2)}</Text>
                    <MaterialCommunityIcons name="chevron-right" size={18} color={colors.text.tertiary} />
                  </View>
                </GlassCard>
              </Pressable>
            </AnimatedSection>
          ))}
        </View>
        <View style={styles.bottomSpacer} />
      </ScrollView>

      <View style={[
        styles.scanButtonContainer, 
        { bottom: 110 + insets.bottom }
      ]}>
        <Pressable 
          style={styles.scanButton} 
          onPress={onScanPress}
          disabled={isScanning}
        >
          <MaterialCommunityIcons name="camera" size={24} color={colors.text.inverse} />
          <Text style={styles.scanButtonText}>Scan Receipt</Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  scrollView: { flex: 1 },
  emptyContainer: { flex: 1, justifyContent: "center", padding: spacing.xl },
  header: { padding: spacing.lg },
  title: { ...typography.headlineSmall, color: colors.text.primary, fontWeight: "700" },
  subtitle: { ...typography.bodySmall, color: colors.text.tertiary, marginTop: 4 },
  list: { paddingHorizontal: spacing.lg, gap: spacing.md },
  loadingCard: { flexDirection: "row", alignItems: "center", padding: spacing.md, gap: spacing.md },
  loadingText: { ...typography.bodyMedium, color: colors.text.secondary },
  receiptCard: {
    flexDirection: "row",
    alignItems: "center",
    padding: spacing.md,
    gap: spacing.md,
  },
  receiptIcon: {
    width: 40,
    height: 40,
    borderRadius: borderRadius.md,
    backgroundColor: `${colors.accent.primary}15`,
    justifyContent: "center",
    alignItems: "center",
  },
  receiptInfo: { flex: 1 },
  storeName: { ...typography.bodyLarge, color: colors.text.primary, fontWeight: "600" },
  receiptDate: { ...typography.labelSmall, color: colors.text.tertiary, marginTop: 2 },
  receiptAmount: { flexDirection: "row", alignItems: "center", gap: spacing.xs },
  amountText: { ...typography.bodyLarge, color: colors.accent.primary, fontWeight: "700" },
  bottomSpacer: { height: TAB_BAR_HEIGHT + 120 },
  scanButtonContainer: {
    position: "absolute",
    left: spacing.lg,
    right: spacing.lg,
  },
  scanButton: {
    backgroundColor: colors.accent.primary,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: spacing.md,
    borderRadius: borderRadius.full,
    gap: spacing.sm,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 5,
  },
  scanButtonText: { ...typography.labelLarge, color: colors.text.inverse, fontWeight: "600" },
});
