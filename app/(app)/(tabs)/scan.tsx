import {
  View,
  Text,
  StyleSheet,
  ActivityIndicator,
  Image,
  TouchableOpacity,
  ScrollView,
  Pressable,
} from "react-native";
import { useState, useEffect, useMemo, useCallback } from "react";
import * as ImagePicker from "expo-image-picker";
import * as Haptics from "expo-haptics";
import { useMutation, useAction, useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import { useRouter, useLocalSearchParams } from "expo-router";
import { MaterialCommunityIcons } from "@expo/vector-icons";

import {
  GlassScreen,
  GlassCard,
  GlassButton,
  SimpleHeader,
  GlassCapsuleSwitcher,
  colors,
  typography,
  spacing,
  borderRadius,
  useGlassAlert,
} from "@/components/ui/glass";
import { GlassToast } from "@/components/ui/glass/GlassToast";
import { useCurrentUser } from "@/hooks/useCurrentUser";
import { getStoreInfoSafe } from "@/convex/lib/storeNormalizer";
import { useProductScanner } from "@/hooks/useProductScanner";
import type { ScannedProduct } from "@/hooks/useProductScanner";

type ScanMode = "receipt" | "product";

export default function ScanScreen() {
  const router = useRouter();
  const { listId: listIdParam, returnTo } = useLocalSearchParams<{ listId?: string; returnTo?: string }>();
  const { alert } = useGlassAlert();
  const { firstName } = useCurrentUser();
  const [scanMode, setScanMode] = useState<ScanMode>("receipt");
  const handleScanModeSwitch = useCallback((index: number) => {
    setScanMode(index === 0 ? "receipt" : "product");
  }, []);
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [isParsing, setIsParsing] = useState(false);
  const [selectedListId, setSelectedListId] = useState<Id<"shoppingLists"> | null>(null);
  const [showListPicker, setShowListPicker] = useState(false);
  const [showProductListPicker, setShowProductListPicker] = useState(false);
  const [addedToPantry, setAddedToPantry] = useState(false);
  const [addedToList, setAddedToList] = useState(false);

  // Duplicate toast state
  const [dupToast, setDupToast] = useState({ visible: false, name: "" });
  const dismissDupToast = useCallback(() => setDupToast((prev) => ({ ...prev, visible: false })), []);

  // Product scanner with client-side dedup
  const productScanner = useProductScanner({
    onDuplicate: (existing) => {
      setDupToast({ visible: true, name: existing.name });
    },
  });

  // Auto-select list when navigated from complete shopping flow
  useEffect(() => {
    if (listIdParam) {
      setSelectedListId(listIdParam as Id<"shoppingLists">);
    }
  }, [listIdParam]);

  const shoppingLists = useQuery(api.shoppingLists.getCompletedWithStores, {});
  const allReceipts = useQuery(api.receipts.getByUser, {});
  const generateUploadUrl = useMutation(api.receipts.generateUploadUrl);
  const createReceipt = useMutation(api.receipts.create);
  const parseReceipt = useAction(api.ai.parseReceipt);
  const updateReceipt = useMutation(api.receipts.update);
  const deleteReceipt = useMutation(api.receipts.remove);
  const addBatchToList = useMutation(api.listItems.addBatchFromScan);
  const addBatchToPantry = useMutation(api.pantryItems.addBatchFromScan);

  // Replace pantry item with scanned data
  const replacePantryMutation = useMutation(api.pantryItems.replaceWithScan);
  const [parseReceiptId, setParseReceiptId] = useState<Id<"receipts"> | null>(null);

  const selectedList = shoppingLists?.find((l) => l._id === selectedListId);

  // Filter to completed receipts with items for the history section
  const completedReceipts = useMemo(() => {
    if (!allReceipts) return [];
    return allReceipts.filter(
      (r) => r.processingStatus === "completed" && r.items && r.items.length > 0
    );
  }, [allReceipts]);

  async function handleTakePhoto() {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    try {
      const { status } = await ImagePicker.requestCameraPermissionsAsync();

      if (status !== "granted") {
        alert("Permission Required", "Camera access is needed to scan receipts");
        return;
      }

      const result = await ImagePicker.launchCameraAsync({
        mediaTypes: "images" as any,
        allowsEditing: true,
        quality: 0.8,
        aspect: [3, 4],
      });

      if (!result.canceled && result.assets[0]) {
        setSelectedImage(result.assets[0].uri);
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      }
    } catch (error) {
      console.error("Camera error:", error);
      alert("Error", "Failed to open camera");
    }
  }

  async function handlePickImage() {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    try {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();

      if (status !== "granted") {
        alert("Permission Required", "Photo library access is needed to select receipts");
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: "images" as any,
        allowsEditing: true,
        quality: 0.8,
        aspect: [3, 4],
      });

      if (!result.canceled && result.assets[0]) {
        setSelectedImage(result.assets[0].uri);
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      }
    } catch (error) {
      console.error("Image picker error:", error);
      alert("Error", "Failed to select image");
    }
  }

  async function handleUploadReceipt() {
    if (!selectedImage) {
      alert("Error", "No image selected");
      return;
    }

    setIsUploading(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

    try {
      // Step 1: Upload image to Convex storage
      const uploadUrl = await generateUploadUrl();

      const response = await fetch(selectedImage);
      const blob = await response.blob();

      const uploadResponse = await fetch(uploadUrl, {
        method: "POST",
        headers: {
          "Content-Type": blob.type,
        },
        body: blob,
      });

      if (!uploadResponse.ok) {
        throw new Error("Upload failed");
      }

      const { storageId } = await uploadResponse.json();

      // Step 2: Create receipt record (with optional list link)
      const receiptId = await createReceipt({
        imageStorageId: storageId,
        listId: selectedListId ?? undefined,
      });

      setIsUploading(false);
      setIsParsing(true);
      setParseReceiptId(receiptId);

      // Step 3: Parse receipt with AI
      try {
        const parsedData = await parseReceipt({ storageId });

        // Check if AI rejected the image due to low quality
        if (parsedData.rejection || (parsedData.imageQuality != null && parsedData.imageQuality < 50)) {
          // Clean up the pending receipt
          try {
            await deleteReceipt({ id: receiptId });
          } catch (deleteErr) {
            console.warn("Failed to clean up receipt:", deleteErr);
          }

          setIsParsing(false);
          setParseReceiptId(null);
          setSelectedImage(null);

          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
          alert(
            "Image Too Blurry",
            "We couldn't read this receipt clearly enough. Please retake the photo with better lighting and hold the camera steady.",
          );
          return;
        }

        // Step 4: Update receipt with parsed data
        await updateReceipt({
          id: receiptId,
          storeName: parsedData.storeName,
          storeAddress: parsedData.storeAddress,
          purchaseDate: new Date(parsedData.purchaseDate).getTime(),
          subtotal: parsedData.subtotal,
          tax: parsedData.tax,
          total: parsedData.total,
          processingStatus: "completed",
          imageQuality: parsedData.imageQuality,
          items: parsedData.items.map((item: Record<string, unknown>) => ({
            name: item.name as string,
            quantity: item.quantity as number,
            unitPrice: item.unitPrice as number,
            totalPrice: item.totalPrice as number,
            category: item.category as string | undefined,
            confidence: typeof item.confidence === "number" ? item.confidence : undefined,
          })),
        });

        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

        // Navigate to confirmation screen (forward returnTo if present)
        const confirmUrl = returnTo
          ? `/receipt/${receiptId}/confirm?returnTo=${returnTo}`
          : `/receipt/${receiptId}/confirm`;
        router.push(confirmUrl as never);
      } catch (parseError) {
        console.error("Parse error:", parseError);
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);

        // Delete the failed receipt so it doesn't pollute stats/milestones
        try {
          await deleteReceipt({ id: receiptId });
        } catch (deleteErr) {
          console.warn("Failed to clean up receipt:", deleteErr);
        }

        // Reset state immediately — don't wait for alert callback
        setIsParsing(false);
        setParseReceiptId(null);
        setSelectedImage(null);

        alert(
          "Couldn't Read Receipt",
          "We couldn't read this receipt. Please try again with better lighting.",
        );
      }
    } catch (error) {
      console.error("Upload error:", error);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      alert("Error", "Failed to upload receipt");
      setIsUploading(false);
      setIsParsing(false);
    }
  }

  function handleRetake() {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setSelectedImage(null);
  }

  // ── Product mode handlers ──────────────────────────────────────────────────

  async function handleAddProductsToList(listId: Id<"shoppingLists">) {
    if (productScanner.scannedProducts.length === 0) return;
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      const result = await addBatchToList({
        listId,
        items: productScanner.scannedProducts.map((p) => ({
          name: p.name,
          category: p.category,
          size: p.size,
          unit: p.unit,
          estimatedPrice: p.estimatedPrice,
          brand: p.brand,
          confidence: p.confidence,
          imageStorageId: p.imageStorageId,
        })),
      });
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      setShowProductListPicker(false);

      // Build feedback message including skipped duplicates
      const skipped = result.skippedDuplicates ?? [];
      const listMsg =
        result.count > 0 && skipped.length === 0
          ? `${result.count} item${result.count !== 1 ? "s" : ""} added to your list.`
          : result.count > 0 && skipped.length > 0
            ? `${result.count} added. ${skipped.length} already on list (skipped).`
            : skipped.length > 0
              ? "All scanned items are already on your list."
              : null;

      if (addedToPantry) {
        // Both done — clear everything
        productScanner.clearAll();
        setAddedToPantry(false);
        setAddedToList(false);
        if (listMsg) alert("Added to List", listMsg);
      } else {
        // List done first — stay open for pantry
        setAddedToList(true);
        if (listMsg) alert("Added to List", listMsg);
      }
    } catch (error) {
      console.error("Failed to add products to list:", error);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      alert("Error", "Failed to add items to list");
    }
  }

  async function handleAddProductsToPantry() {
    if (productScanner.scannedProducts.length === 0) return;
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      const products = productScanner.scannedProducts;
      const result = await addBatchToPantry({
        items: products.map((p) => ({
          name: p.name,
          category: p.category,
          size: p.size,
          unit: p.unit,
          estimatedPrice: p.estimatedPrice,
          brand: p.brand,
          confidence: p.confidence,
          imageStorageId: p.imageStorageId,
        })),
      });
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

      const skipped = result.skippedDuplicates ?? [];

      if (skipped.length > 0) {
        // Server only returns items where scanned data is genuinely different
        const match = skipped[0];
        const scannedProduct = products.find((p) => p.name === match.scannedName);
        alert(
          "Similar Item Found",
          `"${match.existingName}" in your pantry is similar to "${match.scannedName}". Update it?`,
          [
            { text: "Skip", style: "cancel" },
            {
              text: "Update",
              onPress: async () => {
                if (!scannedProduct) return;
                try {
                  await replacePantryMutation({
                    pantryItemId: match.existingId as Id<"pantryItems">,
                    scannedData: {
                      name: scannedProduct.name,
                      category: scannedProduct.category,
                      size: scannedProduct.size,
                      unit: scannedProduct.unit,
                      estimatedPrice: scannedProduct.estimatedPrice,
                      confidence: scannedProduct.confidence,
                      imageStorageId: scannedProduct.imageStorageId,
                    },
                  });
                  Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
                } catch (error) {
                  console.error("Failed to update item:", error);
                  Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
                  alert("Error", "Failed to update item.");
                }
              },
            },
          ],
        );
      }

      if (result.added > 0) {
        if (addedToList) {
          // Both done — clear everything
          productScanner.clearAll();
          setAddedToPantry(false);
          setAddedToList(false);
        } else {
          // Pantry done first — stay open for list
          setAddedToPantry(true);
        }
      } else {
        // All duplicates — nothing new added
        if (addedToList) {
          // List was already done, just clear
          productScanner.clearAll();
          setAddedToPantry(false);
          setAddedToList(false);
        }
        alert("Already in Pantry", "This item is already in your pantry.");
      }
    } catch (error) {
      console.error("Failed to add products to pantry:", error);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      alert("Error", "Failed to add items to pantry");
    }
  }

  function handleDismissScan() {
    productScanner.clearAll();
    setAddedToPantry(false);
    setAddedToList(false);
    setShowProductListPicker(false);
  }

  // Parsing mode - AI processing receipt
  if (isParsing) {
    return (
      <GlassScreen>
        <SimpleHeader title="Processing Receipt" subtitle="Please wait" />

        <View style={styles.parsingContainer}>
          <View style={styles.parsingIcon}>
            <ActivityIndicator size="large" color={colors.accent.primary} />
          </View>

          <Text style={styles.parsingTitle}>Reading your receipt...</Text>
          <Text style={styles.parsingSubtitle}>
            This may take 10-15 seconds
          </Text>

          <GlassCard variant="standard" style={styles.parsingInfo}>
            <Text style={styles.parsingInfoText}>
              Our AI is extracting items, prices, and totals from your receipt.
              You'll be able to review and correct any mistakes in the next step.
            </Text>
          </GlassCard>

          <GlassButton
            variant="secondary"
            size="md"
            icon="close"
            onPress={async () => {
              // Clean up the pending receipt
              if (parseReceiptId) {
                try {
                  await deleteReceipt({ id: parseReceiptId });
                } catch (e) {
                  console.warn("Failed to clean up receipt:", e);
                }
              }
              setIsParsing(false);
              setParseReceiptId(null);
              setSelectedImage(null);
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            }}
            style={{ marginTop: spacing.xl }}
          />
        </View>
      </GlassScreen>
    );
  }

  // Preview mode - showing selected image
  if (selectedImage) {
    return (
      <GlassScreen>
        <SimpleHeader title="Review Receipt" subtitle="Make sure the receipt is clear" />

        <View style={styles.previewContent}>
          <GlassCard variant="bordered" accentColor={colors.semantic.scan} style={styles.imageCard}>
            <Image
              source={{ uri: selectedImage }}
              style={styles.previewImage}
              resizeMode="contain"
            />
          </GlassCard>

          <View style={styles.previewActions}>
            <GlassButton
              variant="secondary"
              size="lg"
              icon="camera-retake"
              onPress={handleRetake}
              disabled={isUploading}
              style={styles.actionButton}
            />

            <GlassButton
              variant="primary"
              size="lg"
              icon="check"
              onPress={handleUploadReceipt}
              loading={isUploading}
              disabled={isUploading}
              style={styles.actionButton}
            >
              Use Photo
            </GlassButton>
          </View>
        </View>
      </GlassScreen>
    );
  }

  // Main scan screen
  return (
    <GlassScreen>
      <SimpleHeader
        title={scanMode === "receipt" ? "Scan Receipt" : "Scan Product"}
        accentColor={colors.semantic.scan}
        subtitle={firstName ? `${firstName}, track your spending` : "Track spending & build price history"}
      />

      <ScrollView
        style={styles.content}
        contentContainerStyle={styles.contentScroll}
        showsVerticalScrollIndicator={false}
      >
        {/* Mode Toggle */}
        <GlassCapsuleSwitcher
          tabs={[
            {
              label: "Receipt",
              activeColor: colors.accent.primary,
              icon: "receipt",
            },
            {
              label: "Product",
              activeColor: colors.accent.primary,
              icon: "barcode-scan",
            },
          ]}
          activeIndex={scanMode === "receipt" ? 0 : 1}
          onTabChange={handleScanModeSwitch}
          style={styles.modeToggle}
        />

        {scanMode === "receipt" ? (
          <>
            {/* Instructions Card */}
            <GlassCard variant="standard" style={styles.instructionsCard}>
              <View style={styles.instructionsHeader}>
                <MaterialCommunityIcons
                  name="lightbulb-outline"
                  size={20}
                  color={colors.accent.primary}
                />
                <Text style={styles.instructionsTitle}>Tips for best results</Text>
              </View>

              <View style={styles.instructionsList}>
                <InstructionItem number={1} text="Lay receipt on a flat surface" />
                <InstructionItem number={2} text="Ensure good lighting" />
                <InstructionItem number={3} text="Capture the entire receipt" />
                <InstructionItem number={4} text="Keep the image sharp and clear" />
              </View>
            </GlassCard>

            {/* Link to List (optional) */}
            {shoppingLists && shoppingLists.length > 0 && (
              <TouchableOpacity
                style={styles.listSelector}
                onPress={() => {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  setShowListPicker(!showListPicker);
                }}
                activeOpacity={0.7}
              >
                <MaterialCommunityIcons
                  name={selectedList ? "clipboard-check" : "clipboard-text-outline"}
                  size={20}
                  color={selectedList ? colors.accent.primary : colors.text.secondary}
                />
                <Text
                  style={[
                    styles.listSelectorText,
                    selectedList && styles.listSelectorTextActive,
                  ]}
                  numberOfLines={1}
                >
                  {selectedList
                    ? `Linked to: ${selectedList.name}`
                    : "Link to shopping list (optional)"}
                </Text>
                <MaterialCommunityIcons
                  name={showListPicker ? "chevron-up" : "chevron-down"}
                  size={20}
                  color={colors.text.secondary}
                />
              </TouchableOpacity>
            )}

            {showListPicker && shoppingLists && (
              <GlassCard variant="standard" style={styles.listPickerCard}>
                <ScrollView style={styles.listPickerScroll} nestedScrollEnabled>
                  {/* None option */}
                  <TouchableOpacity
                    style={[
                      styles.listOption,
                      !selectedListId && styles.listOptionActive,
                    ]}
                    onPress={() => {
                      setSelectedListId(null);
                      setShowListPicker(false);
                      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                    }}
                  >
                    <MaterialCommunityIcons
                      name="close-circle-outline"
                      size={18}
                      color={colors.text.secondary}
                    />
                    <Text style={styles.listOptionText}>No list (standalone receipt)</Text>
                  </TouchableOpacity>

                  {shoppingLists.map((list) => {
                    const created = new Date(list._creationTime);
                    const date = created.toLocaleDateString([], { day: "numeric", month: "short" });
                    const time = created.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
                    const storesText = list.storeNames?.join(" \u2022 ") || "";
                    return (
                    <TouchableOpacity
                      key={list._id}
                      style={[
                        styles.listOption,
                        selectedListId === list._id && styles.listOptionActive,
                      ]}
                      onPress={() => {
                        setSelectedListId(list._id);
                        setShowListPicker(false);
                        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                      }}
                    >
                      <MaterialCommunityIcons
                        name="clipboard-text"
                        size={18}
                        color={
                          selectedListId === list._id
                            ? colors.accent.primary
                            : colors.text.secondary
                        }
                      />
                      <View style={styles.listOptionInfo}>
                        <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
                          <Text
                            style={[
                              styles.listOptionText,
                              selectedListId === list._id && styles.listOptionTextActive,
                              { flex: 1 },
                            ]}
                            numberOfLines={1}
                          >
                            {list.name}
                          </Text>
                          {list.listNumber != null && (
                            <Text style={[styles.listOptionBudget, { marginLeft: spacing.sm }]}>
                              #{list.listNumber}
                            </Text>
                          )}
                        </View>
                        <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
                          <Text style={styles.listOptionBudget}>
                            {date} · {time}
                          </Text>
                          {storesText ? (
                            <Text style={[styles.listOptionBudget, { marginLeft: spacing.sm }]} numberOfLines={1}>
                              {storesText}
                            </Text>
                          ) : null}
                        </View>
                      </View>
                      {selectedListId === list._id && (
                        <MaterialCommunityIcons
                          name="check"
                          size={18}
                          color={colors.accent.primary}
                        />
                      )}
                    </TouchableOpacity>
                    );
                  })}
                </ScrollView>
              </GlassCard>
            )}

            {/* Action Buttons */}
            <View style={styles.buttons}>
              <GlassButton
                variant="primary"
                size="lg"
                icon="receipt"
                onPress={handleTakePhoto}
              >
                Take Photo
              </GlassButton>

              <GlassButton
                variant="secondary"
                size="lg"
                icon="image-multiple"
                onPress={handlePickImage}
              >
                Choose from Library
              </GlassButton>
            </View>
          </>
        ) : (
          /* ────────────── Product Scanning Mode ────────────── */
          <>
            {/* Instructions Card */}
            <GlassCard variant="standard" style={styles.instructionsCard}>
              <View style={styles.instructionsHeader}>
                <MaterialCommunityIcons name="lightbulb-outline" size={20} color={colors.accent.primary} />
                <Text style={styles.instructionsTitle}>How it works</Text>
              </View>
              <View style={styles.instructionsList}>
                <InstructionItem number={1} text="Point camera at a product" />
                <InstructionItem number={2} text="AI reads the label text" />
                <InstructionItem number={3} text="Scan multiple products in a row" />
                <InstructionItem number={4} text="Add all to a list or your pantry" />
              </View>
            </GlassCard>

            {/* CTA */}
            <View style={styles.buttons}>
              <GlassButton
                variant="primary"
                size="lg"
                icon="shopping-outline"
                onPress={productScanner.captureProduct}
                loading={productScanner.isProcessing}
                disabled={productScanner.isProcessing}
              >
                {productScanner.isProcessing ? "Identifying..." : "Scan Product"}
              </GlassButton>
            </View>

            {/* Error message */}
            {productScanner.lastError && (
              <GlassCard variant="standard" style={styles.productErrorCard}>
                <View style={styles.productErrorRow}>
                  <MaterialCommunityIcons name="alert-circle-outline" size={18} color={colors.semantic.danger} />
                  <Text style={styles.productErrorText}>{productScanner.lastError}</Text>
                </View>
              </GlassCard>
            )}

            {/* Scanned Products List */}
            {productScanner.scannedProducts.length > 0 && (
              <View style={styles.scannedSection}>
                <View style={styles.scannedHeader}>
                  <Text style={styles.scannedTitle}>
                    Scanned ({productScanner.scannedProducts.length})
                  </Text>
                  <Pressable onPress={productScanner.clearAll}>
                    <Text style={styles.scannedClear}>Clear All</Text>
                  </Pressable>
                </View>

                {productScanner.scannedProducts.map((product, index) => (
                  <ScannedProductCard
                    key={`${product.name}-${index}`}
                    product={product}
                    onRemove={() => productScanner.removeProduct(index)}
                  />
                ))}

                {/* Action buttons — completed actions get disabled, second action clears all */}
                <View style={styles.productActions}>
                  {shoppingLists && shoppingLists.length > 0 && (
                    <GlassButton
                      variant="primary"
                      size="md"
                      icon={addedToList ? "check-circle" : "clipboard-plus"}
                      disabled={addedToList}
                      onPress={() => {
                        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                        setShowProductListPicker(true);
                      }}
                    >
                      {addedToList ? "Added to List" : "Add to List"}
                    </GlassButton>
                  )}
                  <GlassButton
                    variant="secondary"
                    size="md"
                    icon={addedToPantry ? "check-circle" : "fridge-outline"}
                    disabled={addedToPantry}
                    onPress={handleAddProductsToPantry}
                  >
                    {addedToPantry ? "In Pantry" : "Add to Pantry"}
                  </GlassButton>
                </View>
                {(addedToPantry || addedToList) && (
                  <GlassButton
                    variant="secondary"
                    size="sm"
                    icon="check"
                    onPress={handleDismissScan}
                  >
                    Done
                  </GlassButton>
                )}

                {/* Product list picker */}
                {showProductListPicker && shoppingLists && (
                  <GlassCard variant="standard" style={styles.listPickerCard}>
                    <ScrollView style={styles.listPickerScroll} nestedScrollEnabled>
                      {shoppingLists.map((list) => {
                        const created = new Date(list._creationTime);
                        const date = created.toLocaleDateString([], { day: "numeric", month: "short" });
                        const time = created.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
                        const storesText = list.storeNames?.join(" \u2022 ") || "";
                        return (
                        <TouchableOpacity
                          key={list._id}
                          style={styles.listOption}
                          onPress={() => handleAddProductsToList(list._id)}
                        >
                          <MaterialCommunityIcons
                            name="clipboard-text"
                            size={18}
                            color={colors.text.secondary}
                          />
                          <View style={styles.listOptionInfo}>
                            <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
                              <Text style={[styles.listOptionText, { flex: 1 }]} numberOfLines={1}>
                                {list.name}
                              </Text>
                              {list.listNumber != null && (
                                <Text style={[styles.listOptionBudget, { marginLeft: spacing.sm }]}>
                                  #{list.listNumber}
                                </Text>
                              )}
                            </View>
                            <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
                              <Text style={styles.listOptionBudget}>
                                {date} · {time}
                              </Text>
                              {storesText ? (
                                <Text style={[styles.listOptionBudget, { marginLeft: spacing.sm }]} numberOfLines={1}>
                                  {storesText}
                                </Text>
                              ) : null}
                            </View>
                          </View>
                        </TouchableOpacity>
                        );
                      })}
                    </ScrollView>
                  </GlassCard>
                )}
              </View>
            )}
          </>
        )}

        {/* Receipt History (visible in both modes) */}
        <View style={styles.historySection}>
          <View style={styles.historySectionHeader}>
            <View style={styles.historySectionLeft}>
              <MaterialCommunityIcons
                name="receipt"
                size={18}
                color={colors.text.secondary}
              />
              <Text style={styles.historySectionTitle}>Your Receipts</Text>
            </View>
            {completedReceipts.length > 0 && (
              <View style={styles.historyBadge}>
                <Text style={styles.historyBadgeText}>
                  {completedReceipts.length}
                </Text>
              </View>
            )}
          </View>

          {completedReceipts.length === 0 ? (
            <View style={styles.historyEmpty}>
              <MaterialCommunityIcons
                name="receipt"
                size={36}
                color={colors.text.tertiary}
              />
              <Text style={styles.historyEmptyText}>
                Scan your first receipt to start building your history
              </Text>
            </View>
          ) : (
            <View style={styles.historyList}>
              {completedReceipts.map((receipt) => (
                <ReceiptHistoryCard
                  key={receipt._id}
                  receipt={receipt}
                  onPress={() => {
                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                    router.push(
                      `/(app)/create-list-from-receipt?receiptId=${receipt._id}` as never
                    );
                  }}
                  onDelete={() => {
                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                    alert(
                      "Remove Receipt",
                      `Remove this ${receipt.storeName} receipt from your history? Price data will be kept.`,
                      [
                        { text: "Cancel", style: "cancel" },
                        {
                          text: "Remove",
                          style: "destructive",
                          onPress: async () => {
                            try {
                              await deleteReceipt({ id: receipt._id });
                              Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
                            } catch (e) {
                              console.error("Failed to remove receipt:", e);
                              alert("Error", "Failed to remove receipt");
                            }
                          },
                        },
                      ]
                    );
                  }}
                />
              ))}
            </View>
          )}
        </View>

        {/* Bottom spacing */}
        <View style={styles.bottomSpacer} />
      </ScrollView>

      {/* Duplicate product toast */}
      <GlassToast
        message={`${dupToast.name} already scanned`}
        icon="content-duplicate"
        iconColor={colors.accent.warm}
        visible={dupToast.visible}
        duration={2500}
        onDismiss={dismissDupToast}
      />

    </GlassScreen>
  );
}

// =============================================================================
// INSTRUCTION ITEM COMPONENT
// =============================================================================

interface InstructionItemProps {
  number: number;
  text: string;
}

function InstructionItem({ number, text }: InstructionItemProps) {
  return (
    <View style={styles.instructionItem}>
      <View style={styles.instructionNumber}>
        <Text style={styles.instructionNumberText}>{number}</Text>
      </View>
      <Text style={styles.instructionText}>{text}</Text>
    </View>
  );
}

// =============================================================================
// RECEIPT HISTORY CARD COMPONENT
// =============================================================================

interface ReceiptHistoryCardProps {
  receipt: {
    _id: Id<"receipts">;
    storeName: string;
    normalizedStoreId?: string;
    total: number;
    purchaseDate: number;
    items: { name: string; quantity: number; unitPrice: number; totalPrice: number }[];
  };
  onPress: () => void;
  onDelete: () => void;
}

function ReceiptHistoryCard({ receipt, onPress, onDelete }: ReceiptHistoryCardProps) {
  const storeColor = receipt.normalizedStoreId
    ? getStoreInfoSafe(receipt.normalizedStoreId)?.color ?? colors.text.tertiary
    : colors.text.tertiary;

  const d = new Date(receipt.purchaseDate);
  const day = String(d.getDate()).padStart(2, "0");
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const year = String(d.getFullYear()).slice(-2);
  const dateStr = `${day}/${month}/${year}`;

  return (
    <Pressable style={styles.receiptCard} onPress={onPress}>
      <View style={[styles.receiptStoreDot, { backgroundColor: storeColor }]} />
      <View style={styles.receiptCardInfo}>
        <Text style={styles.receiptCardStore} numberOfLines={1}>
          {receipt.storeName}
        </Text>
        <Text style={styles.receiptCardMeta}>
          {dateStr} · {receipt.items.length} item
          {receipt.items.length !== 1 ? "s" : ""}
        </Text>
      </View>
      <Text style={styles.receiptCardTotal}>
        £{receipt.total.toFixed(2)}
      </Text>
      <Pressable
        onPress={(e) => {
          e.stopPropagation();
          onDelete();
        }}
        hitSlop={8}
        style={styles.receiptDeleteBtn}
      >
        <MaterialCommunityIcons
          name="close-circle-outline"
          size={18}
          color={colors.text.tertiary}
        />
      </Pressable>
      <MaterialCommunityIcons
        name="clipboard-plus-outline"
        size={20}
        color={colors.accent.primary}
      />
    </Pressable>
  );
}

// =============================================================================
// SCANNED PRODUCT CARD COMPONENT
// =============================================================================

interface ScannedProductCardProps {
  product: ScannedProduct;
  onRemove: () => void;
}

function ScannedProductCard({ product, onRemove }: ScannedProductCardProps) {
  return (
    <View style={styles.productCard}>
      <View style={styles.productCardInfo}>
        <Text style={styles.productCardName} numberOfLines={1}>
          {product.name}
        </Text>
        <Text style={styles.productCardMeta}>
          {product.category}
          {product.size ? ` · ${product.size}` : ""}
          {product.brand ? ` · ${product.brand}` : ""}
        </Text>
      </View>
      {product.estimatedPrice != null && (
        <Text style={styles.productCardPrice}>
          ~£{product.estimatedPrice.toFixed(2)}
        </Text>
      )}
      <Pressable
        onPress={onRemove}
        hitSlop={8}
        style={styles.productCardRemove}
      >
        <MaterialCommunityIcons
          name="close-circle-outline"
          size={18}
          color={colors.text.tertiary}
        />
      </Pressable>
    </View>
  );
}

// =============================================================================
// STYLES
// =============================================================================

const styles = StyleSheet.create({
  content: {
    flex: 1,
    paddingHorizontal: spacing.lg,
  },
  contentScroll: {
    paddingBottom: spacing.md,
  },

  // Icon Section
  iconSection: {
    alignItems: "center",
    paddingVertical: spacing.md,
  },
  iconContainer: {
    width: 84,
    height: 84,
    borderRadius: borderRadius.full,
    backgroundColor: `${colors.semantic.scan}20`,
    justifyContent: "center",
    alignItems: "center",
  },

  // Instructions Card
  instructionsCard: {
    marginBottom: spacing.xl,
  },
  instructionsHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.xs,
    marginBottom: spacing.md,
  },
  instructionsTitle: {
    ...typography.labelLarge,
    color: colors.text.primary,
  },
  instructionsList: {
    gap: spacing.sm,
  },
  instructionItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
  },
  instructionNumber: {
    width: 24,
    height: 24,
    borderRadius: borderRadius.full,
    backgroundColor: colors.glass.backgroundStrong,
    justifyContent: "center",
    alignItems: "center",
  },
  instructionNumberText: {
    ...typography.labelSmall,
    color: colors.text.secondary,
    fontWeight: "600",
  },
  instructionText: {
    ...typography.bodyMedium,
    color: colors.text.secondary,
    flex: 1,
  },

  // List Selector
  listSelector: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    backgroundColor: colors.glass.background,
    borderWidth: 1,
    borderColor: colors.glass.border,
    borderRadius: borderRadius.lg,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    marginBottom: spacing.md,
  },
  listSelectorText: {
    ...typography.bodyMedium,
    color: colors.text.secondary,
    flex: 1,
  },
  listSelectorTextActive: {
    color: colors.accent.primary,
    fontWeight: "600",
  },
  listPickerCard: {
    marginTop: spacing.md,
    marginBottom: spacing.md,
    padding: 0,
  },
  listPickerScroll: {
    maxHeight: 200,
  },
  listOption: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.glass.border,
  },
  listOptionActive: {
    backgroundColor: `${colors.accent.primary}10`,
  },
  listOptionInfo: {
    flex: 1,
  },
  listOptionText: {
    ...typography.bodyMedium,
    color: colors.text.primary,
  },
  listOptionTextActive: {
    color: colors.accent.primary,
    fontWeight: "600",
  },
  listOptionBudget: {
    ...typography.bodySmall,
    color: colors.text.tertiary,
  },

  // Buttons
  buttons: {
    gap: spacing.md,
    marginBottom: spacing.xl,
  },

  // Preview Mode
  previewContent: {
    flex: 1,
    paddingHorizontal: spacing.lg,
  },
  imageCard: {
    flex: 1,
    marginVertical: spacing.md,
    overflow: "hidden",
  },
  previewImage: {
    width: "100%",
    height: "100%",
    borderRadius: borderRadius.md,
  },
  previewActions: {
    flexDirection: "row",
    gap: spacing.md,
    marginBottom: 140,
  },
  actionButton: {
    flex: 1,
  },

  // Bottom spacing
  bottomSpacer: {
    height: 140,
  },

  // Parsing Mode
  parsingContainer: {
    flex: 1,
    paddingHorizontal: spacing.lg,
    justifyContent: "center",
    alignItems: "center",
  },
  parsingIcon: {
    width: 100,
    height: 100,
    borderRadius: borderRadius.full,
    backgroundColor: `${colors.accent.primary}20`,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: spacing.xl,
  },
  parsingTitle: {
    ...typography.headlineSmall,
    color: colors.text.primary,
    marginBottom: spacing.xs,
    textAlign: "center",
  },
  parsingSubtitle: {
    ...typography.bodyMedium,
    color: colors.text.secondary,
    marginBottom: spacing.xl,
    textAlign: "center",
  },
  parsingInfo: {
    marginTop: spacing.lg,
  },
  parsingInfoText: {
    ...typography.bodyMedium,
    color: colors.text.secondary,
    textAlign: "center",
    lineHeight: 22,
  },

  // Receipt History Section
  historySection: {
    marginTop: spacing["2xl"],
    borderTopWidth: 1,
    borderTopColor: colors.glass.border,
    paddingTop: spacing.lg,
  },
  historySectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: spacing.md,
  },
  historySectionLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
  },
  historySectionTitle: {
    ...typography.labelLarge,
    color: colors.text.primary,
    fontWeight: "600",
  },
  historyBadge: {
    backgroundColor: colors.glass.backgroundStrong,
    borderRadius: borderRadius.sm,
    minWidth: 24,
    height: 24,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: spacing.sm,
  },
  historyBadgeText: {
    ...typography.labelSmall,
    color: colors.text.secondary,
    fontWeight: "700",
    fontSize: 12,
  },
  historyEmpty: {
    alignItems: "center",
    paddingVertical: spacing["2xl"],
    gap: spacing.sm,
  },
  historyEmptyText: {
    ...typography.bodyMedium,
    color: colors.text.tertiary,
    textAlign: "center",
    maxWidth: 240,
  },
  historyList: {
    gap: spacing.sm,
  },

  // Receipt Card
  receiptCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.glass.background,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: colors.glass.border,
    padding: spacing.md,
    gap: spacing.md,
  },
  receiptStoreDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
  },
  receiptCardInfo: {
    flex: 1,
    gap: 2,
  },
  receiptCardStore: {
    ...typography.bodyMedium,
    color: colors.text.primary,
    fontWeight: "600",
  },
  receiptCardMeta: {
    ...typography.bodySmall,
    color: colors.text.tertiary,
  },
  receiptCardTotal: {
    ...typography.bodyMedium,
    color: colors.text.primary,
    fontWeight: "700",
  },
  receiptDeleteBtn: {
    padding: spacing.xs,
  },

  // Mode Toggle
  modeToggle: {
    marginBottom: spacing.md,
  },

  // Product Scanning
  productErrorCard: {
    marginTop: spacing.md,
  },
  productErrorRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
  },
  productErrorText: {
    ...typography.bodySmall,
    color: colors.semantic.danger,
    flex: 1,
  },
  scannedSection: {
    marginTop: spacing.xl,
  },
  scannedHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: spacing.sm,
  },
  scannedTitle: {
    ...typography.labelLarge,
    color: colors.text.primary,
    fontWeight: "600",
  },
  scannedClear: {
    ...typography.labelSmall,
    color: colors.semantic.danger,
  },
  productCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.glass.background,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: colors.glass.border,
    padding: spacing.md,
    gap: spacing.md,
    marginBottom: spacing.sm,
  },
  productCardInfo: {
    flex: 1,
    gap: 2,
  },
  productCardName: {
    ...typography.bodyMedium,
    color: colors.text.primary,
    fontWeight: "600",
  },
  productCardMeta: {
    ...typography.bodySmall,
    color: colors.text.tertiary,
  },
  productCardPrice: {
    ...typography.bodyMedium,
    color: colors.text.secondary,
    fontWeight: "600",
  },
  productCardRemove: {
    padding: spacing.xs,
  },
  productActions: {
    flexDirection: "row",
    gap: spacing.md,
    marginTop: spacing.sm,
  },
});
