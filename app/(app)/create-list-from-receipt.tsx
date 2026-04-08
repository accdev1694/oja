import {
  View,
  Text,
  ScrollView,
  TextInput,
  ActivityIndicator,
} from "react-native";
import { useState, useMemo, useCallback } from "react";
import { FlashList } from "@shopify/flash-list";
import { useRouter, useLocalSearchParams } from "expo-router";
import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import * as Haptics from "expo-haptics";

import {
  GlassScreen,
  GlassCard,
  GlassButton,
  SimpleHeader,
  GlassToast,
  colors,
  useGlassAlert,
} from "@/components/ui/glass";
import { useDelightToast } from "@/hooks/useDelightToast";
import { formatReceiptDate, getStoreColor } from "@/lib/receiptFormatters";
import {
  Receipt,
  usePickerHeader,
  usePickerRenderItem,
  PickerEmpty,
  PickerFooter,
} from "@/components/receipt/ReceiptPickerComponents";
import { styles } from "./createListFromReceipt.styles";

const MAX_LIST_NAME_LENGTH = 30;

export default function CreateListFromReceiptScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ receiptId?: string }>();
  const { alert } = useGlassAlert();
  const { toast, dismiss, showToast } = useDelightToast();

  const receipts = useQuery(api.receipts.getByUser, {});
  const createListFromReceipt = useMutation(api.shoppingLists.createFromReceipt);

  const [selectedReceiptId, setSelectedReceiptId] = useState<Id<"receipts"> | null>(
    params.receiptId ? (params.receiptId as Id<"receipts">) : null
  );
  const [listName, setListName] = useState("");
  const [isCreating, setIsCreating] = useState(false);

  const validReceipts = useMemo(() => {
    if (!receipts) return [];
    return receipts.filter(
      (r: { processingStatus: string; items?: unknown[] }) => r.processingStatus === "completed" && r.items && r.items.length > 0
    ) as Receipt[];
  }, [receipts]);

  const selectedReceipt = useMemo(() => {
    if (!selectedReceiptId) return null;
    return validReceipts.find((r) => r._id === selectedReceiptId) ?? null;
  }, [selectedReceiptId, validReceipts]);

  const effectiveListName = listName || (selectedReceipt ? `${selectedReceipt.storeName} Re-shop` : "");
  const effectiveBudget = selectedReceipt
    ? Math.ceil(selectedReceipt.total / 5) * 5
    : 0;

  function handleSelectReceipt(receiptId: Id<"receipts">) {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setSelectedReceiptId(receiptId);
    setListName("");
  }

  const handleBackToPicker = useCallback(() => {
    if (isCreating) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setSelectedReceiptId(null);
    setListName("");
  }, [isCreating]);

  const handleCreateList = useCallback(async () => {
    if (!selectedReceiptId || !selectedReceipt || isCreating) return;

    setIsCreating(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

    try {
      const listId = await createListFromReceipt({
        receiptId: selectedReceiptId,
        name: effectiveListName.trim() || undefined,
        budget: effectiveBudget,
      });

      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      const itemCount = selectedReceipt.items.length;
      showToast(
        `List created with ${itemCount} item${itemCount !== 1 ? "s" : ""}!`,
        "clipboard-check",
        colors.accent.primary
      );

      setTimeout(() => {
        router.replace(`/list/${listId}` as never);
      }, 800);
    } catch (error: unknown) {
      setIsCreating(false);
      const msg = error instanceof Error ? error.message : "";
      if (msg.includes("limit") || msg.includes("Upgrade") || msg.includes("Premium")) {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
        alert(
          "List Limit Reached",
          "Free plan allows up to 2 active lists. Upgrade to Premium for unlimited lists.",
          [
            { text: "Maybe Later", style: "cancel" },
            { text: "Upgrade", onPress: () => router.push("/(app)/subscription" as never) },
          ]
        );
      } else {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
        alert("Error", "Failed to create list. Please try again.");
      }
    }
  }, [selectedReceiptId, selectedReceipt, isCreating, effectiveListName, effectiveBudget, createListFromReceipt, showToast, alert, router]);

  const PickerHeader = usePickerHeader(validReceipts.length, router);
  const pickerRenderItem = usePickerRenderItem(handleSelectReceipt);
  const pickerKeyExtractor = useCallback((item: { _id: string }) => item._id, []);

  if (receipts === undefined) {
    return (
      <GlassScreen>
        <SimpleHeader title="Create from Receipt" showBack onBack={() => router.back()} />
        <View style={styles.centered}>
          <ActivityIndicator color={colors.accent.primary} size="large" />
        </View>
      </GlassScreen>
    );
  }

  if (selectedReceipt) {
    const storeColor = getStoreColor(selectedReceipt.normalizedStoreId);

    return (
      <GlassScreen>
        <SimpleHeader
          title="Review Receipt"
          showBack
          onBack={handleBackToPicker}
        />

        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          <GlassCard style={styles.receiptHeader}>
            <View style={styles.receiptHeaderRow}>
              <View style={[styles.storeDot, { backgroundColor: storeColor }]} />
              <View style={styles.receiptHeaderText}>
                <Text style={styles.receiptStoreName}>{selectedReceipt.storeName}</Text>
                <Text style={styles.receiptDate}>
                  {formatReceiptDate(selectedReceipt.purchaseDate)}
                </Text>
              </View>
              <Text style={styles.receiptTotal}>
                £{selectedReceipt.total.toFixed(2)}
              </Text>
            </View>
          </GlassCard>

          <View style={styles.section}>
            <Text style={styles.sectionLabel}>
              Items ({selectedReceipt.items.length})
            </Text>

            <GlassCard style={styles.itemListCard}>
              {selectedReceipt.items.map((item, index) => (
                <View
                  key={`${item.name}-${index}`}
                  style={[
                    styles.itemRow,
                    index < selectedReceipt.items.length - 1 && styles.itemRowBorder,
                  ]}
                >
                  <View style={styles.itemInfo}>
                    <Text style={styles.itemName} numberOfLines={1}>
                      {item.name}
                    </Text>
                    {(item.size || item.quantity > 1) && (
                      <Text style={styles.itemMeta}>
                        {[
                          item.quantity > 1 ? `x${item.quantity}` : null,
                          item.size,
                        ]
                          .filter(Boolean)
                          .join(" · ")}
                      </Text>
                    )}
                  </View>
                  <Text style={styles.itemPrice}>
                    £{item.unitPrice.toFixed(2)}
                  </Text>
                </View>
              ))}
            </GlassCard>
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionLabel}>List Settings</Text>

            <GlassCard style={styles.settingsCard}>
              <View style={styles.settingRow}>
                <Text style={styles.settingLabel}>Name</Text>
                <View style={styles.nameInputWrap}>
                  <TextInput
                    style={styles.nameInput}
                    value={effectiveListName}
                    onChangeText={(text) => setListName(text.slice(0, MAX_LIST_NAME_LENGTH))}
                    placeholder="List name"
                    placeholderTextColor={colors.text.tertiary}
                    maxLength={MAX_LIST_NAME_LENGTH}
                    editable={!isCreating}
                  />
                  <Text
                    style={[
                      styles.charCount,
                      effectiveListName.length > MAX_LIST_NAME_LENGTH - 5 && styles.charCountWarning,
                    ]}
                  >
                    {MAX_LIST_NAME_LENGTH - effectiveListName.length}
                  </Text>
                </View>
              </View>

              <View style={[styles.settingRow, styles.settingRowLast]}>
                <Text style={styles.settingLabel}>Budget</Text>
                <Text style={styles.budgetValue}>£{effectiveBudget}</Text>
              </View>
            </GlassCard>
          </View>

          <GlassButton
            variant="primary"
            size="lg"
            icon="plus"
            onPress={handleCreateList}
            loading={isCreating}
            disabled={isCreating}
            style={styles.createCta}
          >
            {`Create List (${selectedReceipt.items.length} items)`}
          </GlassButton>

          <View style={styles.bottomSpacer} />
        </ScrollView>

        <GlassToast
          message={toast.message}
          icon={toast.icon}
          iconColor={toast.iconColor}
          visible={toast.visible}
          onDismiss={dismiss}
        />
      </GlassScreen>
    );
  }

  return (
    <GlassScreen>
      <SimpleHeader title="Create from Receipt" showBack onBack={() => router.back()} />

      <FlashList
        data={validReceipts}
        renderItem={pickerRenderItem}
        keyExtractor={pickerKeyExtractor}
        ListHeaderComponent={PickerHeader}
        ListEmptyComponent={PickerEmpty}
        ListFooterComponent={PickerFooter}
        contentContainerStyle={styles.scrollContent}
      />
    </GlassScreen>
  );
}
