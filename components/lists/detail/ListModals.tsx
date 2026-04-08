import React from "react";
import type { Id } from "@/convex/_generated/dataModel";
import type { ListItem } from "@/components/list/ShoppingListItem";
import type { TripStats } from "@/hooks/useTripSummary";
import { AddItemsModal } from "@/components/list/AddItemsModal";
import { EditItemModal } from "@/components/list/modals/EditItemModal";
import { EditListNameModal } from "@/components/lists/EditListNameModal";
import { EditBudgetModal } from "@/components/list/modals/EditBudgetModal";
import { TripSummaryModal } from "@/components/list/modals/TripSummaryModal";
import { ScanReceiptNudgeModal, type ScanReceiptNudgeModalProps } from "@/components/list/modals/ScanReceiptNudgeModal";
import { HealthAnalysisModal } from "@/components/lists/HealthAnalysisModal";
import { ListChatThread } from "@/components/partners/ListChatThread";
import { CommentThread } from "@/components/partners/CommentThread";

export function ListModals({
  listId,
  listName,
  listStoreName,
  listNormalizedStoreId,
  listBudget,
  listHealthAnalysis,
  items,
  showAddModal,
  onCloseAddModal,
  editingItem,
  onCloseEditItem,
  onSaveEditItem,
  showEditModal,
  onCloseEditModal,
  onSaveListName,
  showBudgetModal,
  onCloseBudgetModal,
  onSaveBudget,
  showSummaryModal,
  onCloseSummaryModal,
  onFinishSummary,
  onScanReceipt,
  onContinueShopping,
  onRemoveItem,
  onMoveItem,
  tripSummary,
  showScanNudge,
  onScanReceiptNudge,
  onDismissScanNudge,
  pointsBalance,
  streakCount,
  showHealthModal,
  onCloseHealthModal,
  showChat,
  onCloseChat,
  commentItem,
  onCloseComment,
}: {
  listId: Id<"shoppingLists">;
  listName: string;
  listStoreName: string | undefined;
  listNormalizedStoreId: string | undefined;
  listBudget: number;
  listHealthAnalysis: {
    score: number;
    summary: string;
    strengths: string[];
    weaknesses: string[];
    swaps: { originalName: string; reason: string; suggestedName: string; originalId?: Id<"listItems">; suggestedCategory?: string; suggestedSize?: string; suggestedUnit?: string; priceDelta?: number; scoreImpact?: number }[];
    itemCountAtAnalysis?: number;
    updatedAt: number;
  } | undefined;
  items: ListItem[];
  showAddModal: boolean;
  onCloseAddModal: () => void;
  editingItem: ListItem | null;
  onCloseEditItem: () => void;
  onSaveEditItem: (updates: {
    id: Id<"listItems">;
    name?: string;
    quantity?: number;
    estimatedPrice?: number;
    size?: string;
    unit?: string;
    priceOverride?: boolean;
    sizeOverride?: boolean;
  }) => Promise<void>;
  showEditModal: boolean;
  onCloseEditModal: () => void;
  onSaveListName: (name: string) => Promise<void>;
  showBudgetModal: boolean;
  onCloseBudgetModal: () => void;
  onSaveBudget: (budget: number | undefined) => Promise<void>;
  showSummaryModal: boolean;
  onCloseSummaryModal: () => void;
  onFinishSummary: () => void;
  onScanReceipt: () => void;
  onContinueShopping: () => void;
  onRemoveItem: (itemId: string) => void;
  onMoveItem: () => void;
  tripSummary: TripStats | null;
  showScanNudge: boolean;
  onScanReceiptNudge: () => void;
  onDismissScanNudge: () => void;
  pointsBalance: ScanReceiptNudgeModalProps["pointsBalance"];
  streakCount: number;
  showHealthModal: boolean;
  onCloseHealthModal: () => void;
  showChat: boolean;
  onCloseChat: () => void;
  commentItem: { id: Id<"listItems">; name: string } | null;
  onCloseComment: () => void;
}) {
  return (
    <>
      <AddItemsModal
        visible={showAddModal}
        onClose={onCloseAddModal}
        listId={listId}
        listStoreName={listStoreName}
        listNormalizedStoreId={listNormalizedStoreId}
        existingItems={items}
      />

      <EditItemModal
        item={editingItem}
        onClose={onCloseEditItem}
        onSave={onSaveEditItem}
      />

      <EditListNameModal
        visible={showEditModal}
        currentName={listName}
        onClose={onCloseEditModal}
        onSave={onSaveListName}
      />

      <EditBudgetModal
        visible={showBudgetModal}
        budget={listBudget}
        onClose={onCloseBudgetModal}
        onSave={onSaveBudget}
      />

      <TripSummaryModal
        visible={showSummaryModal}
        onClose={onCloseSummaryModal}
        onFinish={onFinishSummary}
        onScanReceipt={onScanReceipt}
        onContinueShopping={onContinueShopping}
        onRemoveItem={onRemoveItem}
        onMoveItem={onMoveItem}
        stats={tripSummary}
      />

      <ScanReceiptNudgeModal
        visible={showScanNudge}
        onScanReceipt={onScanReceiptNudge}
        onDismiss={onDismissScanNudge}
        storeName={listStoreName}
        pointsBalance={pointsBalance}
        streakCount={streakCount}
      />

      <HealthAnalysisModal
        visible={showHealthModal}
        onClose={onCloseHealthModal}
        listId={listId}
        initialAnalysis={listHealthAnalysis}
        itemCount={items.length}
      />

      <ListChatThread
        visible={showChat}
        listId={listId}
        listName={listName}
        onClose={onCloseChat}
      />

      <CommentThread
        visible={!!commentItem}
        itemId={commentItem?.id ?? null}
        itemName={commentItem?.name ?? ""}
        onClose={onCloseComment}
      />
    </>
  );
}
