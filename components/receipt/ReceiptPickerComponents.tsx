import { View, Text, Pressable } from "react-native";
import { useMemo, useCallback } from "react";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { Router } from "expo-router";
import { Id } from "@/convex/_generated/dataModel";
import { colors } from "@/components/ui/glass";
import { styles } from "@/app/(app)/createListFromReceipt.styles";
import { formatReceiptDate, getStoreColor } from "@/lib/receiptFormatters";

type ReceiptItem = {
  name: string;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
  category?: string;
  size?: string;
  unit?: string;
};

export type Receipt = {
  _id: Id<"receipts">;
  storeName: string;
  normalizedStoreId?: string;
  total: number;
  purchaseDate: number;
  items: ReceiptItem[];
  processingStatus: string;
};

export function usePickerHeader(
  validReceiptsLength: number,
  router: Router,
) {
  return useMemo(
    () => (
      <View>
        <Pressable
          style={styles.scanCta}
          onPress={() => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
            router.push("/(app)/(tabs)/scan?returnTo=create-list-from-receipt");
          }}
        >
          <View style={styles.scanCtaIcon}>
            <MaterialCommunityIcons
              name="camera"
              size={28}
              color={colors.accent.primary}
            />
          </View>
          <View style={styles.scanCtaText}>
            <Text style={styles.scanCtaTitle}>Scan a New Receipt</Text>
            <Text style={styles.scanCtaDesc}>
              Have a receipt? Scan it and we&apos;ll build your list
            </Text>
          </View>
          <MaterialCommunityIcons
            name="chevron-right"
            size={24}
            color={colors.text.tertiary}
          />
        </Pressable>

        {validReceiptsLength > 0 && (
          <View style={styles.dividerRow}>
            <View style={styles.dividerLine} />
            <Text style={styles.dividerText}>Or pick a past receipt</Text>
            <View style={styles.dividerLine} />
          </View>
        )}
      </View>
    ),
    [validReceiptsLength, router],
  );
}

export const PickerEmpty = (
  <View style={styles.emptyState}>
    <MaterialCommunityIcons
      name="receipt"
      size={48}
      color={colors.text.tertiary}
    />
    <Text style={styles.emptyTitle}>No receipts yet</Text>
    <Text style={styles.emptyDesc}>
      Scan a receipt above to get started
    </Text>
  </View>
);

export const PickerFooter = <View style={styles.bottomSpacer} />;

export function usePickerRenderItem(
  onSelect: (receiptId: Id<"receipts">) => void,
) {
  return useCallback(
    ({ item: receipt }: { item: Receipt }) => {
      const storeColor = getStoreColor(receipt.normalizedStoreId);
      return (
        <Pressable
          style={styles.receiptCard}
          onPress={() => onSelect(receipt._id)}
        >
          <View style={[styles.storeDot, { backgroundColor: storeColor }]} />
          <View style={styles.receiptCardInfo}>
            <Text style={styles.receiptCardStore}>{receipt.storeName}</Text>
            <Text style={styles.receiptCardMeta}>
              {formatReceiptDate(receipt.purchaseDate)} · {receipt.items.length} item
              {receipt.items.length !== 1 ? "s" : ""}
            </Text>
          </View>
          <Text style={styles.receiptCardTotal}>
            £{receipt.total.toFixed(2)}
          </Text>
          <MaterialCommunityIcons
            name="chevron-right"
            size={20}
            color={colors.text.tertiary}
          />
        </Pressable>
      );
    },
    [onSelect],
  );
}
