import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import { useCallback, useMemo } from "react";
import * as Haptics from "expo-haptics";
import { useGlassAlert } from "@/components/ui/glass";
import { useIsSwitchingUsers } from "./useIsSwitchingUsers";

/**
 * Hook to manage shopping list data and operations.
 * Separates list business logic from the UI layer.
 */
export function useShoppingList() {
  const { alert } = useGlassAlert();
  const isSwitchingUsers = useIsSwitchingUsers();

  // Queries
  const activeLists = useQuery(api.shoppingLists.getActive, !isSwitchingUsers ? {} : "skip");
  const historyLists = useQuery(api.shoppingLists.getHistory, !isSwitchingUsers ? {} : "skip");
  const sharedLists = useQuery(api.partners.getSharedLists, !isSwitchingUsers ? {} : "skip");

  // Mutations
  const createListMutation = useMutation(api.shoppingLists.create);
  const deleteListMutation = useMutation(api.shoppingLists.remove);
  const updateListMutation = useMutation(api.shoppingLists.update);
  const createFromTemplateMutation = useMutation(api.shoppingLists.createFromTemplate);
  const createFromMultipleListsMutation = useMutation(api.shoppingLists.createFromMultipleLists);

  const deleteList = useCallback(async (listId: Id<"shoppingLists">, listName: string) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    
    return new Promise((resolve) => {
      alert("Delete List", `Are you sure you want to delete "${listName}"?`, [
        { text: "Cancel", style: "cancel", onPress: () => resolve(false) },
        {
          text: "Delete",
          style: "destructive",
          onPress: async () => {
            try {
              await deleteListMutation({ id: listId });
              Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
              resolve(true);
            } catch (error) {
              console.error("Failed to delete list:", error);
              alert("Error", "Failed to delete shopping list");
              resolve(false);
            }
          },
        },
      ]);
    });
  }, [alert, deleteListMutation]);

  const updateListName = useCallback(async (listId: Id<"shoppingLists">, newName: string) => {
    try {
      await updateListMutation({ id: listId, name: newName });
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      return true;
    } catch (error) {
      console.error("Failed to update list name:", error);
      alert("Error", "Failed to update list name");
      return false;
    }
  }, [updateListMutation, alert]);

  const createFromMultiple = useCallback(async (sourceListIds: Id<"shoppingLists">[], newName: string, budget?: number) => {
    try {
      const result = await createFromMultipleListsMutation({
        sourceListIds,
        newListName: newName,
        newBudget: budget,
      });
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      return result;
    } catch (error) {
      console.error("Failed to combine lists:", error);
      alert("Error", "Failed to combine shopping lists");
      throw error;
    }
  }, [createFromMultipleListsMutation, alert]);

  const createFromTemplate = useCallback(async (sourceListId: Id<"shoppingLists">, newName: string) => {
    try {
      const result = await createFromTemplateMutation({
        sourceListId,
        newListName: newName,
      });
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      return result;
    } catch (error) {
      console.error("Failed to create from template:", error);
      alert("Error", "Failed to create list from template");
      throw error;
    }
  }, [createFromTemplateMutation, alert]);

  return {
    // Data
    activeLists,
    historyLists,
    sharedLists,
    isLoading: activeLists === undefined || historyLists === undefined || sharedLists === undefined,
    
    // Operations
    createList: createListMutation,
    deleteList,
    updateListName,
    createFromMultiple,
    createFromTemplate,
  };
}
