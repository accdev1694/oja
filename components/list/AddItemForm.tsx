import { memo, useState, useCallback } from "react";
import { View, Text, Pressable, ActivityIndicator } from "react-native";
import { useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { haptic } from "@/lib/haptics/safeHaptics";
import { GlassCard, GlassButton, GlassInput, colors, useGlassAlert } from "@/components/ui/glass";
import { areItemsSimilar } from "@/lib/list/helpers";
import type { ListItem } from "@/components/list/ShoppingListItem";
import { useVariantPrefetch } from "@/hooks/useVariantPrefetch";
import { useItemSuggestions } from "@/hooks/useItemSuggestions";
import { ItemSuggestionsDropdown } from "./ItemSuggestionsDropdown";
import { DidYouMeanChip } from "./DidYouMeanChip";
import { VariantPicker } from "@/components/items/VariantPicker";
import { useAddItemSuggestions } from "@/hooks/useAddItemSuggestions";
import { useVariantSelection } from "@/hooks/useVariantSelection";
import { useItemPriceEstimation } from "@/hooks/useItemPriceEstimation";
import { InlineSuggestions } from "./InlineSuggestions";
import { styles } from "./addItemForm.styles";

export interface AddItemFormProps {
  listId: Id<"shoppingLists">;
  listUserId?: Id<"users">;
  listStoreName?: string;
  existingItems: ListItem[] | undefined;
  isVisible: boolean;
  onToggleVisible: () => void;
  canEdit: boolean;
  budget: number;
  onMidShopAdd: (name: string, quantity: number, price: number) => void;
  onInputFocus?: () => void;
}

export const AddItemForm = memo(function AddItemForm({
  listId,
  listUserId,
  listStoreName,
  existingItems,
  isVisible,
  onToggleVisible,
  canEdit,
  budget,
  onMidShopAdd,
  onInputFocus,
}: AddItemFormProps) {
  const { alert } = useGlassAlert();
  const addItem = useMutation(api.listItems.create);
  const updateItem = useMutation(api.listItems.update);

  const { triggerPrefetch } = useVariantPrefetch({
    store: listStoreName ?? "tesco",
  });

  const [isAddingItem, setIsAddingItem] = useState(false);
  const [newItemName, setNewItemName] = useState("");
  const [newItemQuantity, setNewItemQuantity] = useState("1");
  const [newItemPrice, setNewItemPrice] = useState("");
  const [showSuggestionsDropdown, setShowSuggestionsDropdown] = useState(false);

  const {
    suggestions: itemSuggestions,
    didYouMean,
    isLoading: isSuggestionsSearchLoading,
    search: searchItemSuggestions,
    acceptSuggestion,
    acceptDidYouMean,
    dismissDidYouMean,
    clear: clearItemSuggestions,
  } = useItemSuggestions({ storeName: listStoreName });

  const {
    selectedVariantName,
    selectedVariantSize,
    selectedVariantUnit,
    itemVariants,
    variantOptions,
    handleVariantSelect,
    clearVariantSelection,
    setVariantSizeUnit,
  } = useVariantSelection({
    itemName: newItemName,
    listUserId,
    listStoreName,
    setNewItemName,
    setNewItemPrice,
    setShowSuggestionsDropdown,
  });

  const {
    priceEstimate,
    isEstimatingPrice,
    markUserTypedPrice,
    resetUserTypedPrice,
  } = useItemPriceEstimation({
    itemName: newItemName,
    listUserId,
    itemVariants,
    setNewItemPrice,
  });

  const {
    suggestions,
    isLoadingSuggestions,
    showSuggestions,
    handleAddSuggestion,
    handleDismissSuggestion,
    handleRefreshSuggestions,
    handleToggleSuggestions,
  } = useAddItemSuggestions({
    listId,
    listUserId,
    existingItems,
    alert,
  });

  function findSimilarItem(name: string): ListItem | undefined {
    if (!existingItems) return undefined;
    return existingItems.find((item) => areItemsSimilar(item.name, name)) as ListItem | undefined;
  }

  function resetForm() {
    setNewItemName("");
    setNewItemQuantity("1");
    setNewItemPrice("");
    clearVariantSelection();
    setShowSuggestionsDropdown(false);
    clearItemSuggestions();
    resetUserTypedPrice();
  }

  async function addItemToList(
    name: string,
    quantity: number,
    price?: number,
    size?: string | null,
    unit?: string | null
  ) {
    try {
      await addItem({
        listId,
        name,
        quantity,
        estimatedPrice: price,
        ...(size ? { size } : {}),
        ...(unit ? { unit } : {}),
        force: true,
      });

      haptic("success");
      resetForm();
    } catch (error) {
      console.error("Failed to add item:", error);
      alert("Error", "Failed to add item");
    }
  }

  async function addAsNewItem() {
    const itemName = newItemName.trim();
    const quantity = parseInt(newItemQuantity) || 1;
    const price = newItemPrice.trim() ? parseFloat(newItemPrice) : undefined;

    await addItemToList(
      itemName,
      quantity,
      price != null && !isNaN(price) ? price : undefined,
      selectedVariantSize,
      selectedVariantUnit
    );
  }

  async function addToExistingItem(existingItem: ListItem) {
    try {
      const additionalQty = parseInt(newItemQuantity) || 1;
      const newQuantity = existingItem.quantity + additionalQty;

      await updateItem({
        id: existingItem._id,
        quantity: newQuantity,
      });

      haptic("success");
      alert("Quantity Updated", `"${existingItem.name}" quantity increased to ${newQuantity}`);

      resetForm();
    } catch (error) {
      console.error("Failed to update item:", error);
      alert("Error", "Failed to update item quantity");
    }
  }

  async function handleAddItem() {
    if (!newItemName.trim()) {
      alert("Error", "Please enter an item name");
      return;
    }

    const similarItem = findSimilarItem(newItemName.trim());

    if (similarItem) {
      haptic("medium");

      alert(
        "Similar Item Found",
        `"${similarItem.name}" is already in your list (Qty: ${similarItem.quantity}).\n\nWhat would you like to do?`,
        [
          { text: "Cancel", style: "cancel" },
          {
            text: "Add to Existing",
            onPress: async () => {
              setIsAddingItem(true);
              await addToExistingItem(similarItem);
              setIsAddingItem(false);
            },
          },
          {
            text: "Add as Separate",
            onPress: async () => {
              setIsAddingItem(true);
              await addAsNewItem();
              setIsAddingItem(false);
            },
          },
        ]
      );
      return;
    }

    setIsAddingItem(true);
    await addAsNewItem();
    setIsAddingItem(false);
  }

  const handleItemNameChange = useCallback((text: string) => {
    setNewItemName(text);
    searchItemSuggestions(text);
    setShowSuggestionsDropdown(text.trim().length >= 2);
    triggerPrefetch(text);
  }, [triggerPrefetch, searchItemSuggestions]);

  if (!canEdit) return null;

  const itemCount = existingItems?.length ?? 0;

  return (
    <>
      {(isVisible || itemCount === 0) && (
        <GlassCard variant="standard" style={styles.addItemCard}>
          <View style={styles.addItemHeader}>
            <Text style={styles.addItemTitle}>Add Item</Text>
            {itemCount > 0 && (
              <Pressable
                onPress={onToggleVisible}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              >
                <MaterialCommunityIcons
                  name="close"
                  size={20}
                  color={colors.text.tertiary}
                />
              </Pressable>
            )}
          </View>
          <View style={styles.addItemForm}>
            <GlassInput
              placeholder="Item name"
              value={newItemName}
              onChangeText={handleItemNameChange}
              editable={!isAddingItem}
              style={styles.nameInput}
              onFocus={onInputFocus}
            />

            {didYouMean && !showSuggestionsDropdown && (
              <DidYouMeanChip
                original={didYouMean.original}
                suggestion={didYouMean.suggestion}
                similarity={didYouMean.similarity}
                onAccept={() => {
                  const corrected = acceptDidYouMean();
                  setNewItemName(corrected);
                  setShowSuggestionsDropdown(false);
                  haptic("light");
                }}
                onDismiss={dismissDidYouMean}
              />
            )}

            <ItemSuggestionsDropdown
              suggestions={itemSuggestions}
              isLoading={isSuggestionsSearchLoading}
              onSelect={(suggestion) => {
                const name = acceptSuggestion(suggestion);
                setNewItemName(name);
                setShowSuggestionsDropdown(false);
                if (suggestion.estimatedPrice && !newItemPrice) {
                  setNewItemPrice(suggestion.estimatedPrice.toFixed(2));
                }
                if (suggestion.size || suggestion.unit) {
                  setVariantSizeUnit(suggestion.size ?? null, suggestion.unit ?? null);
                }
                haptic("light");
              }}
              onDismiss={() => setShowSuggestionsDropdown(false)}
              visible={showSuggestionsDropdown}
              existingItemNames={existingItems?.map((i) => i.name)}
            />

            <View style={styles.smallInputRow}>
              <GlassInput
                placeholder="Qty"
                value={newItemQuantity}
                onChangeText={setNewItemQuantity}
                keyboardType="numeric"
                editable={!isAddingItem}
                style={styles.smallInput}
                onFocus={onInputFocus}
              />
              <GlassInput
                placeholder="£ Est."
                value={newItemPrice}
                onChangeText={(text: string) => {
                  setNewItemPrice(text);
                  markUserTypedPrice();
                }}
                keyboardType="decimal-pad"
                editable={!isAddingItem}
                style={styles.smallInput}
                onFocus={onInputFocus}
              />
              <GlassButton
                variant="primary"
                size="md"
                icon="plus"
                onPress={handleAddItem}
                loading={isAddingItem}
                disabled={isAddingItem}
                style={styles.addButton}
              />
            </View>

            {priceEstimate && priceEstimate.cheapest && (!itemVariants || itemVariants.length === 0) && (
              <Text style={styles.priceHint}>
                {priceEstimate.cheapest.confidence != null && priceEstimate.cheapest.confidence < 0.1
                  ? `~£${priceEstimate.cheapest.price.toFixed(2)} est.`
                  : `Based on £${priceEstimate.cheapest.price.toFixed(2)} at ${priceEstimate.cheapest.storeName}`
                }
              </Text>
            )}

            {variantOptions.length > 0 && (
              <View style={styles.variantPickerContainer}>
                <VariantPicker
                  baseItem={newItemName.trim()}
                  variants={variantOptions}
                  selectedVariant={selectedVariantName ?? undefined}
                  onSelect={handleVariantSelect}
                  compact
                />
                <Pressable
                  style={styles.notSureButton}
                  onPress={() => {
                    haptic("light");
                    clearVariantSelection();
                    if (priceEstimate?.average) {
                      setNewItemPrice(priceEstimate.average.toFixed(2));
                    }
                  }}
                >
                  <Text style={styles.notSureText}>Not sure</Text>
                </Pressable>
              </View>
            )}

            {isEstimatingPrice && (
              <View style={styles.estimatingContainer}>
                <ActivityIndicator size="small" color={colors.accent.primary} />
                <Text style={styles.estimatingText}>Getting price estimate...</Text>
              </View>
            )}
          </View>

          {itemCount > 0 && isVisible && (
            <InlineSuggestions
              suggestions={suggestions}
              isLoadingSuggestions={isLoadingSuggestions}
              showSuggestions={showSuggestions}
              onAddSuggestion={handleAddSuggestion}
              onDismissSuggestion={handleDismissSuggestion}
              onRefresh={handleRefreshSuggestions}
              onToggle={handleToggleSuggestions}
            />
          )}
        </GlassCard>
      )}
    </>
  );
});
