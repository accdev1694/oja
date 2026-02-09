import {
  View,
  Text,
  StyleSheet,
  ActivityIndicator,
  Image,
  TouchableOpacity,
  ScrollView,
} from "react-native";
import { useState, useEffect } from "react";
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
  colors,
  typography,
  spacing,
  borderRadius,
  useGlassAlert,
} from "@/components/ui/glass";
import { useCurrentUser } from "@/hooks/useCurrentUser";

export default function ScanScreen() {
  const router = useRouter();
  const { listId: listIdParam } = useLocalSearchParams<{ listId?: string }>();
  const { alert } = useGlassAlert();
  const { firstName } = useCurrentUser();
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [isParsing, setIsParsing] = useState(false);
  const [selectedListId, setSelectedListId] = useState<Id<"shoppingLists"> | null>(null);
  const [showListPicker, setShowListPicker] = useState(false);

  // Auto-select list when navigated from complete shopping flow
  useEffect(() => {
    if (listIdParam) {
      setSelectedListId(listIdParam as Id<"shoppingLists">);
    }
  }, [listIdParam]);

  const shoppingLists = useQuery(api.shoppingLists.getByUser, {});
  const generateUploadUrl = useMutation(api.receipts.generateUploadUrl);
  const createReceipt = useMutation(api.receipts.create);
  const parseReceipt = useAction(api.ai.parseReceipt);
  const updateReceipt = useMutation(api.receipts.update);
  const deleteReceipt = useMutation(api.receipts.remove);
  const [parseReceiptId, setParseReceiptId] = useState<Id<"receipts"> | null>(null);

  const selectedList = shoppingLists?.find((l) => l._id === selectedListId);

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
          items: parsedData.items.map((item: any) => ({
            name: item.name,
            quantity: item.quantity,
            unitPrice: item.unitPrice,
            totalPrice: item.totalPrice,
            category: item.category,
          })),
        });

        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

        // Navigate to confirmation screen
        router.push(`/receipt/${receiptId}/confirm` as any);
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
          >
            Cancel
          </GlassButton>
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
            >
              Retake
            </GlassButton>

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
        title="Scan Receipt"
        accentColor={colors.semantic.scan}
        subtitle={firstName ? `${firstName}, track your spending` : "Track spending & build price history"}
      />

      <View style={styles.content}>
        {/* Camera Icon */}
        <View style={styles.iconSection}>
          <View style={styles.iconContainer}>
            <MaterialCommunityIcons
              name="camera"
              size={64}
              color={colors.semantic.scan}
            />
          </View>
        </View>

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

              {shoppingLists.map((list) => (
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
                    <Text
                      style={[
                        styles.listOptionText,
                        selectedListId === list._id && styles.listOptionTextActive,
                      ]}
                      numberOfLines={1}
                    >
                      {list.name}
                    </Text>
                    {(list.budget ?? 0) > 0 && (
                      <Text style={styles.listOptionBudget}>
                        £{(list.budget ?? 0).toFixed(2)} budget
                      </Text>
                    )}
                  </View>
                  {selectedListId === list._id && (
                    <MaterialCommunityIcons
                      name="check"
                      size={18}
                      color={colors.accent.primary}
                    />
                  )}
                </TouchableOpacity>
              ))}
            </ScrollView>
          </GlassCard>
        )}

        {/* Action Buttons */}
        <View style={styles.buttons}>
          <GlassButton
            variant="primary"
            size="lg"
            icon="camera"
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

        {/* Bottom spacing */}
        <View style={styles.bottomSpacer} />
      </View>
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

  // Icon Section
  iconSection: {
    alignItems: "center",
    paddingVertical: spacing.xl,
  },
  iconContainer: {
    width: 120,
    height: 120,
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
});
