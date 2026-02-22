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
  GlassModal,
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
import { useProductScanner, type ScannedProduct } from "@/hooks/useProductScanner";

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
  const [showProductListPicker, setShowProductListPicker] = useState(false);
  const [showScanActionsModal, setShowScanActionsModal] = useState(false);
  const [addedToPantry, setAddedToPantry] = useState(false);
  const [addedToList, setAddedToList] = useState(false);
  // The product that triggered the current actions modal
  const [activeProduct, setActiveProduct] = useState<ScannedProduct | null>(null);
  // Product preview state
  const [viewingProduct, setViewingProduct] = useState<{ product: ScannedProduct; index: number } | null>(null);
  // Duplicate toast state
  const [dupToast, setDupToast] = useState({ visible: false, name: "" });
  const dismissDupToast = useCallback(() => setDupToast((prev) => ({ ...prev, visible: false })), []);

  // ── Receipt state ─────────────────────────────────────────────────────
  type ReceiptItem = { _id: Id<"receipts">; storeName: string; normalizedStoreId?: string; total: number; purchaseDate: number; imageStorageId?: string; items: { name: string; quantity: number; unitPrice: number; totalPrice: number; category?: string; size?: string; unit?: string; confidence?: number }[] };
  const [viewingReceipt, setViewingReceipt] = useState<ReceiptItem | null>(null);
  const [activeReceipt, setActiveReceipt] = useState<ReceiptItem | null>(null);
  const [showReceiptActionsModal, setShowReceiptActionsModal] = useState(false);
  const [receiptAddedToPantry, setReceiptAddedToPantry] = useState(false);

  // Product scanner with client-side dedup
  const productScanner = useProductScanner({
    onDuplicate: (existing) => {
      setDupToast({ visible: true, name: existing.name });
    },
  });

  const shoppingLists = useQuery(api.shoppingLists.getActive);
  const allReceipts = useQuery(api.receipts.getByUser, {});

  // Resolve all image URLs (products + receipts) in a single query
  const allStorageIds = useMemo(() => {
    const productIds = productScanner.scannedProducts
      .map((p) => p.imageStorageId)
      .filter((id) => id.length > 0);
    const receiptIds = (allReceipts ?? [])
      .filter((r) => r.processingStatus === "completed" && r.imageStorageId)
      .map((r) => r.imageStorageId as string);
    return [...new Set([...productIds, ...receiptIds])];
  }, [productScanner.scannedProducts, allReceipts]);
  const storageUrls = useQuery(
    api.receipts.getStorageUrls,
    allStorageIds.length > 0 ? { storageIds: allStorageIds } : "skip"
  );
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

      // Step 2: Create receipt record
      const receiptId = await createReceipt({
        imageStorageId: storageId,
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

        // Reset scan state so the tab is clean when user returns
        setIsParsing(false);
        setParseReceiptId(null);
        setSelectedImage(null);

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
      setSelectedImage(null);
    }
  }

  function handleRetake() {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setSelectedImage(null);
  }

  // ── Receipt mode handlers ─────────────────────────────────────────────────

  function handleCreateListFromReceipt() {
    if (!activeReceipt) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    const receiptId = activeReceipt._id;
    // Close modals before navigating
    setShowReceiptActionsModal(false);
    setReceiptAddedToPantry(false);
    setActiveReceipt(null);
    router.push(`/(app)/create-list-from-receipt?receiptId=${receiptId}` as never);
  }

  async function handleAddReceiptToPantry() {
    if (!activeReceipt) return;
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      const result = await addBatchToPantry({
        items: activeReceipt.items.map((item) => ({
          name: item.name,
          category: item.category ?? "Other",
          size: item.size,
          unit: item.unit,
          estimatedPrice: item.totalPrice,
          confidence: item.confidence,
        })),
      });
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

      const skipped = result.skippedDuplicates ?? [];

      if (skipped.length > 0 && skipped.length < activeReceipt.items.length) {
        alert(
          "Some Items Already in Pantry",
          `${result.added} new item${result.added !== 1 ? "s" : ""} added. ${skipped.length} already in your pantry.`,
        );
      }

      if (result.added > 0) {
        setReceiptAddedToPantry(true);
      } else {
        alert("Already in Pantry", "All receipt items are already in your pantry.");
      }
    } catch (error) {
      console.error("Failed to add receipt items to pantry:", error);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      alert("Error", "Failed to add items to pantry");
    }
  }

  function handleDismissReceiptActions() {
    setReceiptAddedToPantry(false);
    setActiveReceipt(null);
    setShowReceiptActionsModal(false);
  }

  // ── Product mode handlers ──────────────────────────────────────────────────

  async function handleAddProductsToList(listId: Id<"shoppingLists">) {
    if (!activeProduct) return;
    const item = activeProduct;
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      const result = await addBatchToList({
        listId,
        items: [{
          name: item.name,
          category: item.category,
          size: item.size,
          unit: item.unit,
          estimatedPrice: item.estimatedPrice,
          brand: item.brand,
          confidence: item.confidence,
          imageStorageId: item.imageStorageId,
        }],
      });
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      setShowProductListPicker(false);

      const skipped = result.skippedDuplicates ?? [];
      const listMsg =
        result.count > 0
          ? "Added to your list."
          : skipped.length > 0
            ? "Already on your list."
            : null;

      if (addedToPantry) {
        // Both done — close modal
        setAddedToPantry(false);
        setAddedToList(false);
        setActiveProduct(null);
        setShowScanActionsModal(false);
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
    if (!activeProduct) return;
    const item = activeProduct;
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      const result = await addBatchToPantry({
        items: [{
          name: item.name,
          category: item.category,
          size: item.size,
          unit: item.unit,
          estimatedPrice: item.estimatedPrice,
          brand: item.brand,
          confidence: item.confidence,
          imageStorageId: item.imageStorageId,
        }],
      });
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

      const skipped = result.skippedDuplicates ?? [];

      if (skipped.length > 0) {
        const match = skipped[0];
        alert(
          "Similar Item Found",
          `"${match.existingName}" in your pantry is similar to "${item.name}". Update it?`,
          [
            { text: "Skip", style: "cancel" },
            {
              text: "Update",
              onPress: async () => {
                try {
                  await replacePantryMutation({
                    pantryItemId: match.existingId as Id<"pantryItems">,
                    scannedData: {
                      name: item.name,
                      category: item.category,
                      size: item.size,
                      unit: item.unit,
                      estimatedPrice: item.estimatedPrice,
                      confidence: item.confidence,
                      imageStorageId: item.imageStorageId,
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
          // Both done — close modal
          setAddedToPantry(false);
          setAddedToList(false);
          setActiveProduct(null);
          setShowScanActionsModal(false);
        } else {
          // Pantry done first — stay open for list
          setAddedToPantry(true);
        }
      } else {
        // All duplicates — nothing new added to pantry
        if (addedToList) {
          // Both tried — close modal
          setAddedToPantry(false);
          setAddedToList(false);
          setActiveProduct(null);
          setShowScanActionsModal(false);
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
    setAddedToPantry(false);
    setAddedToList(false);
    setActiveProduct(null);
    setShowProductListPicker(false);
    setShowScanActionsModal(false);
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

            {/* Your Scanned Receipts — grid */}
            <View style={styles.scannedSection}>
              <View style={styles.scannedSectionHeader}>
                <Text style={styles.scannedSectionTitle}>
                  Your Scanned Receipts, <Text style={{ color: colors.accent.primary }}>tap to view</Text>
                </Text>
                {completedReceipts.length > 0 && (
                  <Pressable
                    onPress={() => {
                      alert(
                        "Clear All Receipts",
                        "Remove all receipts from your history? Price data will be kept.",
                        [
                          { text: "Cancel", style: "cancel" },
                          {
                            text: "Clear All",
                            style: "destructive",
                            onPress: async () => {
                              try {
                                await Promise.all(completedReceipts.map((r) => deleteReceipt({ id: r._id })));
                                Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
                              } catch (e) {
                                console.error("Failed to clear receipts:", e);
                                alert("Error", "Failed to clear receipts");
                              }
                            },
                          },
                        ]
                      );
                    }}
                    hitSlop={8}
                  >
                    <MaterialCommunityIcons
                      name="delete-outline"
                      size={24}
                      color={colors.semantic.danger}
                    />
                  </Pressable>
                )}
              </View>

              {completedReceipts.length === 0 ? (
                <View style={styles.scannedEmpty}>
                  <MaterialCommunityIcons
                    name="receipt"
                    size={36}
                    color={colors.text.tertiary}
                  />
                  <Text style={styles.scannedEmptyText}>
                    Scan your first receipt to start building your history
                  </Text>
                </View>
              ) : (
                <View style={styles.scannedGrid}>
                  {completedReceipts.map((receipt) => {
                    const imageUri = receipt.imageStorageId
                      ? storageUrls?.[receipt.imageStorageId]
                      : null;
                    const storeInfo = receipt.normalizedStoreId
                      ? getStoreInfoSafe(receipt.normalizedStoreId)
                      : null;
                    return (
                      <Pressable
                        key={receipt._id}
                        style={styles.gridTile}
                        onPress={() => {
                          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                          setViewingReceipt(receipt as ReceiptItem);
                        }}
                      >
                        {imageUri ? (
                          <Image source={{ uri: imageUri }} style={styles.gridImage} />
                        ) : (
                          <View style={[styles.gridPlaceholder, storeInfo?.color ? { backgroundColor: `${storeInfo.color}30` } : undefined]}>
                            <MaterialCommunityIcons
                              name="receipt"
                              size={16}
                              color={storeInfo?.color ?? colors.text.tertiary}
                            />
                          </View>
                        )}
                        <Pressable
                          style={styles.gridRemove}
                          onPress={(e) => {
                            e.stopPropagation();
                            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                            alert(
                              "Remove Receipt",
                              `Remove this ${receipt.storeName} receipt?`,
                              [
                                { text: "Cancel", style: "cancel" },
                                {
                                  text: "Remove",
                                  style: "destructive",
                                  onPress: async () => {
                                    try {
                                      await deleteReceipt({ id: receipt._id });
                                      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
                                    } catch (err) {
                                      console.error("Failed to remove receipt:", err);
                                    }
                                  },
                                },
                              ]
                            );
                          }}
                          hitSlop={4}
                        >
                          <MaterialCommunityIcons
                            name="close-circle"
                            size={14}
                            color={colors.semantic.danger}
                          />
                        </Pressable>
                      </Pressable>
                    );
                  })}
                </View>
              )}
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
                onPress={async () => {
                  const result = await productScanner.captureProduct();
                  if (result) { setActiveProduct(result); setShowScanActionsModal(true); }
                }}
                loading={productScanner.isProcessing}
                disabled={productScanner.isProcessing}
              >
                {productScanner.isProcessing ? "Identifying..." : "Scan Product"}
              </GlassButton>

              <GlassButton
                variant="secondary"
                size="lg"
                icon="image-multiple"
                onPress={async () => {
                  const result = await productScanner.pickFromLibrary();
                  if (result) { setActiveProduct(result); setShowScanActionsModal(true); }
                }}
                loading={productScanner.isProcessing}
                disabled={productScanner.isProcessing}
              >
                Choose from Library
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

            {/* Your Scanned Products — always visible */}
            <View style={styles.scannedSection}>
              <View style={styles.scannedSectionHeader}>
                <Text style={styles.scannedSectionTitle}>
                  Your Scanned Products, <Text style={{ color: colors.accent.primary }}>tap to view</Text>
                </Text>
                {productScanner.scannedProducts.length > 0 && (
                  <Pressable onPress={productScanner.clearAll} hitSlop={8}>
                    <MaterialCommunityIcons
                      name="delete-outline"
                      size={24}
                      color={colors.semantic.danger}
                    />
                  </Pressable>
                )}
              </View>

              {productScanner.scannedProducts.length === 0 ? (
                <View style={styles.scannedEmpty}>
                  <MaterialCommunityIcons
                    name="barcode-scan"
                    size={36}
                    color={colors.text.tertiary}
                  />
                  <Text style={styles.scannedEmptyText}>
                    Scan your first product to start building your list
                  </Text>
                </View>
              ) : (
                <>
                <View style={styles.scannedGrid}>
                  {productScanner.scannedProducts.map((product, index) => {
                    const isPending = product.status === "pending";
                    const imageUri = isPending
                      ? product.localImageUri
                      : storageUrls?.[product.imageStorageId];
                    return (
                      <Pressable
                        key={`${product.localImageUri ?? product.name}-${index}`}
                        style={styles.gridTile}
                        onPress={() => {
                          if (!isPending) {
                            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                            setViewingProduct({ product, index });
                          }
                        }}
                      >
                        {imageUri ? (
                          <Image source={{ uri: imageUri }} style={styles.gridImage} />
                        ) : (
                          <View style={styles.gridPlaceholder}>
                            <MaterialCommunityIcons
                              name="package-variant-closed"
                              size={16}
                              color={colors.text.tertiary}
                            />
                          </View>
                        )}
                        {isPending && (
                          <View style={styles.gridPendingOverlay}>
                            <ActivityIndicator size="small" color="#fff" />
                          </View>
                        )}
                        {!isPending && (
                          <Pressable
                            style={styles.gridRemove}
                            onPress={(e) => {
                              e.stopPropagation();
                              productScanner.removeProduct(index);
                            }}
                            hitSlop={4}
                          >
                            <MaterialCommunityIcons
                              name="close-circle"
                              size={14}
                              color={colors.semantic.danger}
                            />
                          </Pressable>
                        )}
                      </Pressable>
                    );
                  })}
                </View>

                </>
              )}
            </View>
          </>
        )}


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

      {/* Scan actions modal — Add to List / Add to Pantry */}
      <GlassModal
        visible={showScanActionsModal}
        onClose={() => {
          setShowScanActionsModal(false);
          setShowProductListPicker(false);
          setAddedToPantry(false);
          setAddedToList(false);
          setActiveProduct(null);
        }}
        position="bottom"
      >
        <View style={styles.modalHeader}>
          <Text style={styles.modalTitle}>
            {activeProduct?.name ?? "Scanned Item"}
          </Text>
          <Text style={styles.modalSubtitle}>
            Where would you like to add it?
          </Text>
        </View>

        <View style={styles.modalActions}>
          {shoppingLists && shoppingLists.length > 0 && (
            <GlassButton
              variant="primary"
              size="lg"
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
            size="lg"
            icon={addedToPantry ? "check-circle" : "fridge-outline"}
            disabled={addedToPantry}
            onPress={handleAddProductsToPantry}
          >
            {addedToPantry ? "In Pantry" : "Add to Pantry"}
          </GlassButton>
        </View>

        {/* Inline list picker */}
        {showProductListPicker && shoppingLists && (
          <GlassCard variant="standard" style={styles.modalListPicker}>
            <ScrollView style={styles.listPickerScroll} nestedScrollEnabled>
              {shoppingLists.map((list) => {
                const created = new Date(list._creationTime);
                const date = created.toLocaleDateString([], { day: "numeric", month: "short" });
                const time = created.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
                const storesText = list.storeName ?? "";
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

        {/* Done button — appears after at least one action */}
        {(addedToPantry || addedToList) && (
          <GlassButton
            variant="secondary"
            size="md"
            icon="check"
            onPress={handleDismissScan}
            style={{ marginTop: spacing.sm }}
          >
            Done
          </GlassButton>
        )}
      </GlassModal>

      {/* Product preview modal — tap a grid tile to view */}
      <GlassModal
        visible={!!viewingProduct}
        onClose={() => setViewingProduct(null)}
        position="bottom"
      >
        {viewingProduct && (() => {
          const { product, index } = viewingProduct;
          const imageUri =
            product.status === "pending"
              ? product.localImageUri
              : storageUrls?.[product.imageStorageId];
          return (
            <>
              {imageUri ? (
                <Image
                  source={{ uri: imageUri }}
                  style={styles.previewModalImage}
                  resizeMode="cover"
                />
              ) : (
                <View style={styles.previewModalPlaceholder}>
                  <MaterialCommunityIcons
                    name="package-variant-closed"
                    size={48}
                    color={colors.text.tertiary}
                  />
                </View>
              )}

              <Text style={styles.previewModalName}>{product.name}</Text>

              {(product.brand || product.category) && (
                <Text style={styles.previewModalMeta}>
                  {[product.brand, product.category].filter(Boolean).join(" · ")}
                </Text>
              )}

              {product.size && (
                <Text style={styles.previewModalSize}>
                  {product.size}{product.unit ? ` ${product.unit}` : ""}
                </Text>
              )}

              {product.estimatedPrice != null && (
                <Text style={styles.previewModalPrice}>
                  £{product.estimatedPrice.toFixed(2)}
                </Text>
              )}

              <GlassButton
                variant="secondary"
                size="md"
                icon="delete-outline"
                onPress={() => {
                  productScanner.removeProduct(index);
                  setViewingProduct(null);
                }}
              >
                Remove from Queue
              </GlassButton>
            </>
          );
        })()}
      </GlassModal>

      {/* Receipt preview modal — tap a grid tile to view */}
      <GlassModal
        visible={!!viewingReceipt}
        onClose={() => setViewingReceipt(null)}
        position="bottom"
      >
        {viewingReceipt && (() => {
          const receipt = viewingReceipt;
          const imageUri = receipt.imageStorageId
            ? storageUrls?.[receipt.imageStorageId]
            : null;
          const storeInfo = receipt.normalizedStoreId
            ? getStoreInfoSafe(receipt.normalizedStoreId)
            : null;
          const d = new Date(receipt.purchaseDate);
          const dateStr = `${String(d.getDate()).padStart(2, "0")}/${String(d.getMonth() + 1).padStart(2, "0")}/${String(d.getFullYear()).slice(-2)}`;
          return (
            <>
              {imageUri ? (
                <Image
                  source={{ uri: imageUri }}
                  style={styles.previewModalImage}
                  resizeMode="cover"
                />
              ) : (
                <View style={[styles.previewModalPlaceholder, storeInfo?.color ? { backgroundColor: `${storeInfo.color}20` } : undefined]}>
                  <MaterialCommunityIcons
                    name="receipt"
                    size={48}
                    color={storeInfo?.color ?? colors.text.tertiary}
                  />
                </View>
              )}

              <Text style={styles.previewModalName}>{receipt.storeName}</Text>

              <Text style={styles.previewModalMeta}>
                {dateStr} · {receipt.items.length} item{receipt.items.length !== 1 ? "s" : ""}
              </Text>

              <Text style={styles.previewModalPrice}>
                £{receipt.total.toFixed(2)}
              </Text>

              <View style={{ gap: spacing.sm }}>
                <GlassButton
                  variant="secondary"
                  size="md"
                  icon="delete-outline"
                  onPress={() => {
                    setViewingReceipt(null);
                    alert(
                      "Remove Receipt",
                      `Remove this ${receipt.storeName} receipt? Price data will be kept.`,
                      [
                        { text: "Cancel", style: "cancel" },
                        {
                          text: "Remove",
                          style: "destructive",
                          onPress: async () => {
                            try {
                              await deleteReceipt({ id: receipt._id });
                              Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
                            } catch (err) {
                              console.error("Failed to remove receipt:", err);
                            }
                          },
                        },
                      ]
                    );
                  }}
                >
                  Remove Receipt
                </GlassButton>
              </View>
            </>
          );
        })()}
      </GlassModal>

      {/* Receipt actions modal — Add to List / Update Pantry */}
      <GlassModal
        visible={showReceiptActionsModal}
        onClose={() => {
          setShowReceiptActionsModal(false);
          setReceiptAddedToPantry(false);
          setActiveReceipt(null);
        }}
        position="bottom"
      >
        <View style={styles.modalHeader}>
          <Text style={styles.modalTitle}>
            {activeReceipt?.storeName ?? "Receipt Items"}
          </Text>
          <Text style={styles.modalSubtitle}>
            {activeReceipt ? `${activeReceipt.items.length} item${activeReceipt.items.length !== 1 ? "s" : ""} · £${activeReceipt.total.toFixed(2)}` : "Where would you like to add them?"}
          </Text>
        </View>

        <View style={styles.modalActions}>
          <GlassButton
            variant="primary"
            size="lg"
            icon="clipboard-plus"
            onPress={handleCreateListFromReceipt}
          >
            Create List
          </GlassButton>

          <GlassButton
            variant="secondary"
            size="lg"
            icon={receiptAddedToPantry ? "check-circle" : "fridge-outline"}
            disabled={receiptAddedToPantry}
            onPress={handleAddReceiptToPantry}
          >
            {receiptAddedToPantry ? "In Pantry" : "Update Pantry"}
          </GlassButton>
        </View>

        {/* Done button — appears after pantry update */}
        {receiptAddedToPantry && (
          <GlassButton
            variant="secondary"
            size="md"
            icon="check"
            onPress={handleDismissReceiptActions}
            style={{ marginTop: spacing.sm }}
          >
            Done
          </GlassButton>
        )}
      </GlassModal>

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
  listOptionInfo: {
    flex: 1,
  },
  listOptionText: {
    ...typography.bodyMedium,
    color: colors.text.primary,
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
    marginTop: spacing["2xl"],
    borderTopWidth: 1,
    borderTopColor: colors.glass.border,
    paddingTop: spacing.lg,
  },
  scannedSectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: spacing.md,
  },
  scannedSectionTitle: {
    ...typography.bodyMedium,
    color: colors.text.secondary,
  },
  scannedEmpty: {
    alignItems: "center",
    paddingVertical: spacing["2xl"],
    gap: spacing.sm,
  },
  scannedEmptyText: {
    ...typography.bodyMedium,
    color: colors.text.tertiary,
    textAlign: "center",
    maxWidth: 240,
  },
  scannedGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.xs,
    marginBottom: spacing.md,
  },
  gridTile: {
    width: "18.5%",
    aspectRatio: 1,
    borderRadius: borderRadius.sm,
    overflow: "hidden",
    backgroundColor: colors.glass.background,
    borderWidth: 1,
    borderColor: colors.glass.border,
  },
  gridImage: {
    width: "100%",
    height: "100%",
  },
  gridPlaceholder: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: colors.glass.backgroundStrong,
  },
  gridPendingOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0,0,0,0.45)",
    justifyContent: "center",
    alignItems: "center",
  },
  gridRemove: {
    position: "absolute",
    top: -2,
    right: -2,
    backgroundColor: colors.glass.background,
    borderRadius: borderRadius.full,
  },
  // Scan actions modal
  modalHeader: {
    alignItems: "center",
    marginBottom: spacing.lg,
    gap: spacing.xs,
  },
  modalTitle: {
    ...typography.headlineSmall,
    color: colors.text.primary,
  },
  modalSubtitle: {
    ...typography.bodyMedium,
    color: colors.text.secondary,
  },
  modalActions: {
    gap: spacing.md,
  },
  modalListPicker: {
    marginTop: spacing.md,
    padding: 0,
  },

  // Product preview modal
  previewModalImage: {
    width: "100%",
    height: 220,
    borderRadius: borderRadius.md,
    marginBottom: spacing.md,
    backgroundColor: colors.glass.backgroundStrong,
  },
  previewModalPlaceholder: {
    width: "100%",
    height: 220,
    borderRadius: borderRadius.md,
    marginBottom: spacing.md,
    backgroundColor: colors.glass.backgroundStrong,
    justifyContent: "center",
    alignItems: "center",
  },
  previewModalName: {
    ...typography.headlineSmall,
    color: colors.text.primary,
    textAlign: "center",
    marginBottom: spacing.xs,
  },
  previewModalMeta: {
    ...typography.bodyMedium,
    color: colors.text.secondary,
    textAlign: "center",
    marginBottom: spacing.xs,
  },
  previewModalSize: {
    ...typography.bodySmall,
    color: colors.text.tertiary,
    textAlign: "center",
    marginBottom: spacing.xs,
  },
  previewModalPrice: {
    ...typography.headlineSmall,
    color: colors.accent.primary,
    textAlign: "center",
    fontWeight: "700",
    marginBottom: spacing.md,
  },
});
