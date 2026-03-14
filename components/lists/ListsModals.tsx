import React from "react";
import { Id } from "@/convex/_generated/dataModel";
import { CreateListOptionsModal } from "@/components/lists/CreateListOptionsModal";
import { TemplatePickerModal } from "@/components/lists/TemplatePickerModal";
import { CreateFromTemplateModal } from "@/components/lists/CreateFromTemplateModal";
import { CombineListsModal } from "@/components/lists/CombineListsModal";
import { EditListNameModal } from "@/components/lists/EditListNameModal";

interface HistoryList {
  _id: Id<"shoppingLists">;
  name: string;
  status: string;
  completedAt?: number;
  createdAt: number;
  storeName?: string;
  storeSegments?: { storeId: string; storeName: string; switchedAt: number }[];
  listNumber?: number;
}

const ListsModals = React.memo(function ListsModals({
  showCreateOptionsModal,
  showTemplatePickerModal,
  showTemplateModal,
  showCombineModal,
  showEditNameModal,
  selectedTemplateId,
  selectedTemplateName,
  editingListName,
  selectedHistoryLists,
  historyLists,
  hasHistory,
  onCloseCreateOptions,
  onCreateFromScratch,
  onShowTemplatePicker,
  onCloseTemplatePicker,
  onPickTemplate,
  onCloseTemplate,
  onConfirmTemplate,
  onCloseCombine,
  onConfirmCombine,
  onCloseEditName,
  onSaveListName,
}: {
  showCreateOptionsModal: boolean;
  showTemplatePickerModal: boolean;
  showTemplateModal: boolean;
  showCombineModal: boolean;
  showEditNameModal: boolean;
  selectedTemplateId: Id<"shoppingLists"> | null;
  selectedTemplateName: string;
  editingListName: string;
  selectedHistoryLists: Set<Id<"shoppingLists">>;
  historyLists: HistoryList[];
  hasHistory: boolean;
  onCloseCreateOptions: () => void;
  onCreateFromScratch: () => void;
  onShowTemplatePicker: () => void;
  onCloseTemplatePicker: () => void;
  onPickTemplate: (id: Id<"shoppingLists">, name: string) => void;
  onCloseTemplate: () => void;
  onConfirmTemplate: (name: string) => Promise<void>;
  onCloseCombine: () => void;
  onConfirmCombine: (name: string, budget?: number) => Promise<void>;
  onCloseEditName: () => void;
  onSaveListName: (name: string) => Promise<void>;
}) {
  return (
    <>
      <CreateListOptionsModal
        visible={showCreateOptionsModal}
        onClose={onCloseCreateOptions}
        onFromScratch={onCreateFromScratch}
        onUseTemplate={onShowTemplatePicker}
        hasHistory={hasHistory}
      />

      <TemplatePickerModal
        visible={showTemplatePickerModal}
        onClose={onCloseTemplatePicker}
        onSelectTemplate={onPickTemplate}
        historyLists={historyLists}
      />

      <CreateFromTemplateModal
        visible={showTemplateModal}
        sourceListId={selectedTemplateId}
        sourceListName={selectedTemplateName}
        onClose={onCloseTemplate}
        onConfirm={onConfirmTemplate}
      />

      <CombineListsModal
        visible={showCombineModal}
        sourceListIds={Array.from(selectedHistoryLists)}
        onClose={onCloseCombine}
        onConfirm={onConfirmCombine}
      />

      <EditListNameModal
        visible={showEditNameModal}
        currentName={editingListName}
        onClose={onCloseEditName}
        onSave={onSaveListName}
      />
    </>
  );
});

export { ListsModals };
