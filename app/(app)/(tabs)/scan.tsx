import React, { useState, useCallback, useRef, useEffect } from "react";
import { View, StyleSheet, ScrollView } from "react-native";
import { useRouter, useLocalSearchParams } from "expo-router";
import { useFocusEffect } from "@react-navigation/native";
import * as Haptics from "expo-haptics";

import {
  GlassScreen,
  SimpleHeader,
  GlassCapsuleSwitcher,
  AnimatedSection,
  SkeletonCard,
  colors,
  spacing,
  useGlassAlert,
  AlertButton,
} from "@/components/ui/glass";
import { GlassToast } from "@/components/ui/glass/GlassToast";
import { useScanLogic } from "@/hooks";
import { ReceiptMode } from "@/components/scan/ReceiptMode";
import { ProductMode } from "@/components/scan/ProductMode";
import { ScanOnboardingTip } from "@/components/scan/ScanOnboardingTip";
import { EditScannedItemModal } from "@/components/scan/EditScannedItemModal";
import { useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";

import { useHint } from "@/hooks/useHint";
import { HintOverlay } from "@/components/tutorial/HintOverlay";
import { hasViewedHint as hasViewedHintLocal } from "@/lib/storage/hintStorage";

export default function ScanScreen() {
  const router = useRouter();
  const { returnTo } = useLocalSearchParams<{ listId?: string; returnTo?: string }>();

  // Hint targets
  const tabsRef = useRef<View>(null);
  const scanButtonRef = useRef<View>(null);

  // Hints
  const typeHint = useHint("scan_type", "delayed");
  const tierHint = useHint("scan_tier", "manual");
  
  // Custom Scan Logic Hook (Centralized business logic)
  const {
    scanMode,
    handleScanModeSwitch,
    isParsing,
    productScanner,
    receiptScanner,
    setViewingProduct,
    viewingProduct,
    dupToast,
    dismissDupToast,
    allReceipts,
    setViewingReceipt,
    viewingReceipt,
    showOnboardingTip,
    dismissOnboardingTip,
    shoppingLists,
  } = useScanLogic({ returnTo });

  // Trigger tier hint after first successful scan (when allReceipts or scannedProducts changes)
  useEffect(() => {
    const hasScannedBefore = (allReceipts && allReceipts.length > 0) || (productScanner.scannedProducts.length > 0);
    if (hasScannedBefore && !typeHint.shouldShow) {
      tierHint.showHint();
    }
  }, [allReceipts?.length, productScanner.scannedProducts.length, typeHint.shouldShow]);

  const [animationKey, setAnimationKey] = useState(0);
  const [pageAnimationKey, setPageAnimationKey] = useState(0);
  const { alert } = useGlassAlert();

  // Mutations
  const deleteReceipt = useMutation(api.receipts.remove);

  // Trigger animations every time this tab gains focus
  useFocusEffect(
    useCallback(() => {
      setAnimationKey((prev) => prev + 1);
      pageAnimationKey; // Keep dependency
      setPageAnimationKey((prev) => prev + 1);
    }, [])
  );

  const handleProductPress = useCallback((product: any, index: number) => {
    setViewingProduct({ product, index });
  }, [setViewingProduct]);

  const handleConfirmProductEdit = useCallback((edited: any) => {
    if (viewingProduct) {
      productScanner.updateProduct(viewingProduct.index, edited);
    }
  }, [viewingProduct, productScanner]);

  const handleClearAllProducts = useCallback(() => {
    alert("Clear All Items", "Are you sure you want to clear your current scan list?", [
      { text: "Cancel", style: "cancel" },
      { text: "Clear", style: "destructive", onPress: () => productScanner.clearAll() }
    ]);
  }, [alert, productScanner]);

  const addItemsToList = useMutation(api.listItems.addBatchFromScan);

  const handleAddAllToList = useCallback(async () => {
    if (!shoppingLists || shoppingLists.length === 0) {
      alert("No Active Lists", "Create a shopping list first before adding items.", [
        { text: "Cancel", style: "cancel" },
        { text: "Create List", onPress: () => router.push("/") }
      ]);
      return;
    }

    const executeAdd = async (listId: Id<"shoppingLists">) => {
      try {
        const itemsToAdd = productScanner.scannedProducts.map((p: any) => ({
          name: p.name,
          category: p.category || "Other",
          quantity: p.quantity || 1,
          size: p.size,
          brand: p.brand,
          estimatedPrice: p.estimatedPrice,
          confidence: p.confidence,
          imageStorageId: p.imageStorageId,
        }));
        
        await addItemsToList({ listId, items: itemsToAdd });
        productScanner.clearAll();
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        
        alert("Success", `Added ${itemsToAdd.length} items to your list!`, [
          { text: "Stay Here", style: "cancel" },
          { text: "View List", onPress: () => router.push(`/list/${listId}` as any) }
        ]);
      } catch (err) {
        console.error("Bulk add failed:", err);
        alert("Error", "Failed to add items to list. Please try again.");
      }
    };

    if (shoppingLists.length === 1) {
      executeAdd(shoppingLists[0]._id);
    } else {
      // Prompt user to pick a list
      const buttons: AlertButton[] = shoppingLists.map((list: any) => ({
        text: list.name,
        onPress: () => executeAdd(list._id)
      }));
      
      alert(
        "Choose List",
        "Which list should these items be added to?",
        [...buttons, { text: "Cancel", style: "cancel" }]
      );
    }
  }, [shoppingLists, productScanner, addItemsToList, alert, router]);

  async function handleScanAction() {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    
    const isReceipt = scanMode === "receipt";
    const title = isReceipt ? "Scan Receipt" : "Scan Product";
    const message = isReceipt 
      ? "Take a clear photo of your receipt or upload from your library."
      : "Ensure the product name and size/weight are clearly visible.";

    alert(
      title,
      message,
      [
        { 
          text: "Cancel", 
          style: "cancel" 
        },
        { 
          text: "Photo Library", 
          onPress: async () => {
            if (isReceipt) {
              await receiptScanner.pickReceipt();
            } else {
              const product = await productScanner.pickFromLibrary();
              if (product && (product.sizeSource === "estimated" || product.sizeSource === "unknown" || !product.size)) {
                // Auto-open modal for confirmation/correction
                const index = productScanner.scannedProducts.findIndex(p => 
                  p.imageStorageId === product.imageStorageId || p.localImageUri === product.localImageUri
                );
                setViewingProduct({ product, index: index !== -1 ? index : productScanner.scannedProducts.length - 1 });
              }
            }
          } 
        },
        { 
          text: "Use Camera", 
          onPress: async () => {
            if (isReceipt) {
              await receiptScanner.captureReceipt();
            } else {
              const product = await productScanner.captureProduct();
              if (product && (product.sizeSource === "estimated" || product.sizeSource === "unknown" || !product.size)) {
                // Auto-open modal for confirmation/correction
                const index = productScanner.scannedProducts.findIndex(p => 
                  p.imageStorageId === product.imageStorageId || p.localImageUri === product.localImageUri
                );
                setViewingProduct({ product, index: index !== -1 ? index : productScanner.scannedProducts.length - 1 });
              }
            }
          } 
        },
      ]
    );
  }

  // Loading state
  const isLoaded = allReceipts !== undefined && shoppingLists !== undefined;

  if (!isLoaded) {
    return (
      <GlassScreen>
        <SimpleHeader
          title="Scan"
          accentColor={colors.accent.primary}
          subtitle="Loading scanner..."
        />
        <View style={styles.skeletonContainer}>
          <SkeletonCard />
          <SkeletonCard />
          <SkeletonCard />
        </View>
      </GlassScreen>
    );
  }

  return (
    <GlassScreen>
      <SimpleHeader
        title="Scan"
        accentColor={colors.accent.primary}
        subtitle={scanMode === "receipt" ? "Receipt Mode" : "Product Mode"}
      />

      <View style={styles.content}>
        <AnimatedSection animation="fadeInDown" duration={400} delay={0}>
          <View ref={tabsRef}>
            <GlassCapsuleSwitcher
              tabs={[
                { label: "Receipt", icon: "receipt", activeColor: colors.accent.primary },
                { label: "Product", icon: "cube-scan", activeColor: colors.accent.primary },
              ]}
              activeIndex={scanMode === "receipt" ? 0 : 1}
              onTabChange={handleScanModeSwitch}
              style={styles.tabContainer}
            />
          </View>
        </AnimatedSection>

        <ScanOnboardingTip 
          visible={showOnboardingTip} 
          onDismiss={dismissOnboardingTip} 
        />

        {scanMode === "receipt" ? (
          <ReceiptMode 
            receipts={allReceipts} 
            isScanning={receiptScanner.isProcessing}
            onSelectReceipt={(receipt) => router.push(`/receipt/${receipt._id}/confirm` as any)}
            onScanPress={handleScanAction}
            scanButtonRef={scanButtonRef}
          />
        ) : (
          <ProductMode 
            scannedProducts={productScanner.scannedProducts}
            isScanning={productScanner.isProcessing}
            onScanPress={handleScanAction}
            onProductPress={handleProductPress}
            onClearAll={handleClearAllProducts}
            onAddAll={handleAddAllToList}
            scanButtonRef={scanButtonRef}
          />
        )}
      </View>

      {/* Tutorial Hints */}
      <HintOverlay
        visible={typeHint.shouldShow}
        targetRef={tabsRef}
        title="Scan Everything"
        content="Scan receipts to update your pantry instantly, or products to check current prices."
        onDismiss={typeHint.dismiss}
        position="below"
      />

      <HintOverlay
        visible={tierHint.shouldShow}
        targetRef={scanButtonRef}
        title="Earn Rewards"
        content="Scanning earns you points toward your next subscription tier. Level up for more AI features!"
        onDismiss={tierHint.dismiss}
        position="above"
      />

      {/* Modals */}
      <EditScannedItemModal
        product={viewingProduct?.product ?? null}
        onClose={() => setViewingProduct(null)}
        onConfirm={handleConfirmProductEdit}
      />

      {/* Persistence and Global Feedback */}
      <GlassToast 
        visible={dupToast.visible} 
        message={`${dupToast.name} already in scan list`}
        onDismiss={dismissDupToast}
      />

      {/* Error Feedback */}
      <GlassToast
        visible={!!(productScanner.lastError || receiptScanner.lastError)}
        message={productScanner.lastError || receiptScanner.lastError || ""}
        onDismiss={() => {
          productScanner.clearLastError();
          receiptScanner.setLastError(null);
        }}
      />

    </GlassScreen>
  );
}

const styles = StyleSheet.create({
  content: { flex: 1 },
  tabContainer: {
    marginHorizontal: spacing.lg,
    marginBottom: spacing.md,
  },
  skeletonContainer: {
    flex: 1,
    padding: spacing.lg,
    gap: spacing.md,
  },
});
