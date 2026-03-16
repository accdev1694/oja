import React from "react";
import { CreateListOptionsModal } from "@/components/lists/CreateListOptionsModal";
import { TemplatePickerModal } from "@/components/lists/TemplatePickerModal";
import { CreateFromTemplateModal } from "@/components/lists/CreateFromTemplateModal";
import { EditListNameModal } from "@/components/lists/EditListNameModal";

const ListsModals = React.memo(function ListsModals({
  showCreateOptionsModal,
  showTemplatePickerModal,
  showTemplateModal,
  showEditNameModal,
  selectedTemplateId,
  selectedTemplateName,
  editingListName,
  historyLists,
  hasHistory,
  onCloseCreateOptions,
  onCreateFromScratch,
  onShowTemplatePicker,
  onCloseTemplatePicker,
  onPickTemplate,
  onCloseTemplate,
  onConfirmTemplate,
  onCloseEditName,
  onSaveListName,
}: any) {
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
        historyLists={historyLists}
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
