import React from "react";
import { View, Text, StyleSheet, Pressable, ScrollView, ActivityIndicator } from "react-native";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import {
  GlassCard,
  AnimatedSection,
  colors,
  typography,
  spacing,
  borderRadius,
  SkeletonCard,
  TAB_BAR_HEIGHT
} from "@/components/ui/glass";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { ScannedProduct } from "@/hooks/useProductScanner";

interface ProductModeProps {
  scannedProducts: ScannedProduct[];
  isScanning: boolean;
  onScanPress: () => void;
  onProductPress: (product: ScannedProduct, index: number) => void;
  onClearAll: () => void;
  onAddAll: () => void;
  scanButtonRef?: React.RefObject<View | null>;
}

export function ProductMode({ 
  scannedProducts, 
  isScanning, 
  onScanPress, 
  onProductPress,
  onClearAll,
  onAddAll,
  scanButtonRef
}: ProductModeProps) {
  const insets = useSafeAreaInsets();
  const hasProducts = scannedProducts && scannedProducts.length > 0;

  return (
    <View style={styles.container}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
        <View style={styles.header}>
          <View style={styles.titleRow}>
            <View style={{ flex: 1 }}>
              <Text style={styles.title}>Scanned Products</Text>
              <Text style={styles.subtitle}>Scan items to quickly add to list or pantry</Text>
            </View>
            {hasProducts && !isScanning && (
              <Pressable onPress={onClearAll} style={styles.clearButton}>
                <Text style={styles.clearButtonText}>Clear</Text>
              </Pressable>
            )}
          </View>
        </View>

        {!hasProducts && !isScanning ? (
          <View style={styles.emptyContainer}>
            <MaterialCommunityIcons name="package-variant-closed" size={64} color={colors.text.tertiary} />
            <Text style={styles.emptyTitle}>Ready to scan</Text>
            <Text style={styles.emptySubtitle}>
              Tap the button below to scan. For best results, ensure the product name and size/weight (e.g. 500g, 2L) are clearly visible.
            </Text>
          </View>
        ) : (
          <View style={styles.list}>
            {isScanning && (
              <GlassCard variant="standard" style={styles.loadingCard}>
                <ActivityIndicator color={colors.accent.primary} />
                <Text style={styles.loadingText}>Identifying product...</Text>
              </GlassCard>
            )}

            {hasProducts && !isScanning && (
              <Pressable onPress={onAddAll} style={styles.addAllButton}>
                <MaterialCommunityIcons name="plus-box-multiple" size={20} color={colors.accent.primary} />
                <Text style={styles.addAllText}>Add All ({scannedProducts.length}) to Shopping List</Text>
              </Pressable>
            )}

            {scannedProducts.map((item, index) => (
              <AnimatedSection 
                key={index} 
                animation="fadeInUp" 
                delay={index * 50}
              >
                <Pressable onPress={() => onProductPress(item, index)}>
                  <GlassCard variant="standard" style={styles.productCard}>
                    <View style={styles.productIcon}>
                      <MaterialCommunityIcons name="package-variant" size={20} color={colors.accent.primary} />
                    </View>
                    <View style={styles.productInfo}>
                      <Text style={styles.productName} numberOfLines={1}>{item.name}</Text>
                      <Text style={styles.productCategory}>{item.category || "Uncategorized"}</Text>
                    </View>
                    <View style={styles.actions}>
                      <Text style={styles.priceText}>£{item.estimatedPrice?.toFixed(2) || "0.00"}</Text>
                      <MaterialCommunityIcons name="chevron-right" size={18} color={colors.text.tertiary} />
                    </View>
                  </GlassCard>
                </Pressable>
              </AnimatedSection>
            ))}
          </View>
        )}
        <View style={styles.bottomSpacer} />
      </ScrollView>

      <View 
        ref={scanButtonRef}
        style={[
          styles.scanButtonContainer,
          { bottom: 110 + insets.bottom }
        ]}
      >
        <Pressable 
          style={styles.scanButton} 
          onPress={onScanPress}
          disabled={isScanning}
        >
          <MaterialCommunityIcons name="camera" size={24} color={colors.text.inverse} />
          <Text style={styles.scanButtonText}>Scan Product</Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  scrollContent: { flexGrow: 1 },
  header: { padding: spacing.lg },
  titleRow: { flexDirection: "row", alignItems: "flex-start", gap: spacing.md },
  title: { ...typography.headlineSmall, color: colors.text.primary, fontWeight: "700" },
  subtitle: { ...typography.bodySmall, color: colors.text.tertiary, marginTop: 4 },
  clearButton: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    backgroundColor: `${colors.accent.error}15`,
    borderRadius: borderRadius.sm,
  },
  clearButtonText: { ...typography.labelSmall, color: colors.accent.error, fontWeight: "600" },
  addAllButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: `${colors.accent.primary}10`,
    borderWidth: 1,
    borderStyle: "dashed",
    borderColor: colors.accent.primary,
    borderRadius: borderRadius.md,
    padding: spacing.md,
    gap: spacing.sm,
    marginBottom: spacing.sm,
  },
  addAllText: { ...typography.labelLarge, color: colors.accent.primary, fontWeight: "700" },
  emptyContainer: { 
    flex: 1, 
    justifyContent: "center", 
    alignItems: "center", 
    padding: spacing.xl,
    marginTop: spacing.xl,
    gap: spacing.md,
  },
  emptyTitle: { ...typography.headlineSmall, color: colors.text.secondary },
  emptySubtitle: { ...typography.bodyMedium, color: colors.text.tertiary, textAlign: "center", lineHeight: 22 },
  list: { paddingHorizontal: spacing.lg, gap: spacing.md },
  loadingCard: { flexDirection: "row", alignItems: "center", padding: spacing.md, gap: spacing.md },
  loadingText: { ...typography.bodyMedium, color: colors.text.secondary },
  productCard: {
    flexDirection: "row",
    alignItems: "center",
    padding: spacing.md,
    gap: spacing.md,
  },
  productIcon: {
    width: 40,
    height: 40,
    borderRadius: borderRadius.md,
    backgroundColor: `${colors.accent.primary}15`,
    justifyContent: "center",
    alignItems: "center",
  },
  productInfo: { flex: 1 },
  productName: { ...typography.bodyLarge, color: colors.text.primary, fontWeight: "600" },
  productCategory: { ...typography.labelSmall, color: colors.text.tertiary, marginTop: 2 },
  actions: { flexDirection: "row", alignItems: "center", gap: spacing.xs },
  priceText: { ...typography.bodyLarge, color: colors.accent.primary, fontWeight: "700" },
  bottomSpacer: { height: TAB_BAR_HEIGHT + 180 },
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
