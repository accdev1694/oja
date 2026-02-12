import { memo, useState, useEffect, useCallback } from "react";
import {
  View,
  Text,
  ScrollView,
  Pressable,
  ActivityIndicator,
  StyleSheet,
  type NativeSyntheticEvent,
  type TextInputFocusEventData,
} from "react-native";
import { useQuery, useMutation, useAction } from "convex/react";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";

import {
  GlassCard,
  GlassButton,
  GlassInput,
  colors,
  typography,
  spacing,
  borderRadius,
  useGlassAlert,
} from "@/components/ui/glass";
import { areItemsSimilar, getPriceLabel } from "@/lib/list/helpers";
import type { ListItem } from "@/components/list/ShoppingListItem";
import { useVariantPrefetch } from "@/hooks/useVariantPrefetch";
import { useItemSuggestions } from "@/hooks/useItemSuggestions";
import { ItemSuggestionsDropdown } from "./ItemSuggestionsDropdown";
import { DidYouMeanChip } from "./DidYouMeanChip";

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

export interface AddItemFormProps {
  listId: Id<"shoppingLists">;
  /** The list's userId — needed for AI price estimation */
  listUserId?: Id<"users">;
  /** The list's storeName — used for variant price lookup */
  listStoreName?: string;
  /** Current list status */
  listStatus?: string;
  /** Existing items — used for duplicate detection */
  existingItems: ListItem[] | undefined;
  /** Whether the form panel is visible (controlled by parent) */
  isVisible: boolean;
  /** Callback when the form toggle button is pressed */
  onToggleVisible: () => void;
  /** Whether the user can edit (partner permissions) */
  canEdit: boolean;
  /** Budget amount — if > 0 and shopping, we show mid-shop modal */
  budget: number;
  /** Called when user wants to open the mid-shop modal with item details */
  onMidShopAdd: (name: string, quantity: number, price: number) => void;
  /** Called when an input is focused — parent can scroll to keep form visible */
  onInputFocus?: () => void;
}

// ─────────────────────────────────────────────────────────────────────────────
// Component
// ─────────────────────────────────────────────────────────────────────────────

export const AddItemForm = memo(function AddItemForm({
  listId,
  listUserId,
  listStoreName,
  listStatus,
  existingItems,
  isVisible,
  onToggleVisible,
  canEdit,
  budget,
  onMidShopAdd,
  onInputFocus,
}: AddItemFormProps) {
  const { alert } = useGlassAlert();

  // Convex mutations/actions
  const addItem = useMutation(api.listItems.create);
  const updateItem = useMutation(api.listItems.update);
  const setPreferredVariant = useMutation(api.pantryItems.setPreferredVariant);
  const generateSuggestions = useAction(api.ai.generateListSuggestions);
  const estimateItemPrice = useAction(api.ai.estimateItemPrice);

  // ── Variant prefetch for Size/Price modal performance ─────────────────────
  // Pre-warms the Convex query cache as user types, so the modal opens instantly
  const { triggerPrefetch } = useVariantPrefetch({
    store: listStoreName ?? "tesco",
  });

  // ── Form state ──────────────────────────────────────────────────────────────
  const [isAddingItem, setIsAddingItem] = useState(false);
  const [newItemName, setNewItemName] = useState("");
  const [newItemQuantity, setNewItemQuantity] = useState("1");
  const [newItemPrice, setNewItemPrice] = useState("");
  const [selectedVariantName, setSelectedVariantName] = useState<string | null>(null);
  const [selectedVariantSize, setSelectedVariantSize] = useState<string | null>(null);
  const [selectedVariantUnit, setSelectedVariantUnit] = useState<string | null>(null);
  const [isEstimatingPrice, setIsEstimatingPrice] = useState(false);

  // ── Suggestions state ───────────────────────────────────────────────────────
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [dismissedSuggestions, setDismissedSuggestions] = useState<string[]>([]);
  const [isLoadingSuggestions, setIsLoadingSuggestions] = useState(false);
  const [showSuggestions, setShowSuggestions] = useState(true);

  // ── Fuzzy item suggestions (autocomplete + "Did you mean?") ───────────────
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

  // ── Convex queries (reactive, skip when no input) ──────────────────────────
  const priceEstimate = useQuery(
    api.currentPrices.getEstimate,
    newItemName.trim().length >= 2 ? { itemName: newItemName.trim() } : "skip"
  );

  const itemVariants = useQuery(
    api.itemVariants.getWithPrices,
    newItemName.trim().length >= 2
      ? {
          baseItem: newItemName.trim(),
          ...(listUserId ? { userId: listUserId } : {}),
          ...(listStoreName ? { storeName: listStoreName } : {}),
        }
      : "skip"
  );

  // ── Effects ─────────────────────────────────────────────────────────────────

  // Auto-fill price estimate when available and user hasn't typed one
  useEffect(() => {
    if (priceEstimate && priceEstimate.cheapest && !newItemPrice) {
      setNewItemPrice(priceEstimate.cheapest.price.toFixed(2));
    }
  }, [priceEstimate]); // eslint-disable-line react-hooks/exhaustive-deps

  // Reset selected variant when item name changes
  useEffect(() => {
    setSelectedVariantName(null);
    setSelectedVariantSize(null);
    setSelectedVariantUnit(null);
  }, [newItemName]);

  // Pre-select "your usual" variant when variants load (if no variant already selected)
  useEffect(() => {
    if (!itemVariants || itemVariants.length === 0 || selectedVariantName) return;

    // Find the user's usual variant (priceSource === "personal")
    const usualVariant = itemVariants.find((v) => v.priceSource === "personal");
    if (usualVariant) {
      setSelectedVariantName(usualVariant.variantName);
      setSelectedVariantSize(usualVariant.size);
      setSelectedVariantUnit(usualVariant.unit);
      setNewItemName(usualVariant.variantName);
      if (usualVariant.price != null) {
        setNewItemPrice(usualVariant.price.toFixed(2));
      }
    }
  }, [itemVariants]); // eslint-disable-line react-hooks/exhaustive-deps

  // Trigger AI price estimation for completely unknown items
  useEffect(() => {
    if (
      newItemName.trim().length < 2 ||
      isEstimatingPrice ||
      !listUserId
    ) return;

    // Wait for both queries to resolve (not undefined/loading)
    if (priceEstimate === undefined || itemVariants === undefined) return;

    // If we already have price data from either source, no need to estimate
    if (priceEstimate !== null || (itemVariants && itemVariants.length > 0)) return;

    // No price data anywhere — trigger AI estimation
    setIsEstimatingPrice(true);
    estimateItemPrice({
      itemName: newItemName.trim(),
      userId: listUserId!,
    })
      .catch(console.error)
      .finally(() => setIsEstimatingPrice(false));
  }, [newItemName, priceEstimate, itemVariants, listUserId]); // eslint-disable-line react-hooks/exhaustive-deps

  // Load suggestions when items change
  const loadSuggestions = useCallback(async () => {
    if (!existingItems || existingItems.length === 0 || !showSuggestions) {
      setSuggestions([]);
      return;
    }

    setIsLoadingSuggestions(true);
    try {
      const currentItemNames = existingItems.map((item) => item.name);
      const excludeItems = [...currentItemNames, ...dismissedSuggestions];

      const newSuggestions = await generateSuggestions({
        currentItems: currentItemNames,
        excludeItems,
      });

      setSuggestions(newSuggestions);
    } catch (error) {
      console.error("Failed to load suggestions:", error);
      setSuggestions([]);
    } finally {
      setIsLoadingSuggestions(false);
    }
  }, [existingItems, dismissedSuggestions, showSuggestions, generateSuggestions]);

  // Fetch suggestions when items change (debounced)
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      if (existingItems && existingItems.length > 0 && showSuggestions) {
        loadSuggestions();
      }
    }, 500);

    return () => clearTimeout(timeoutId);
  }, [existingItems?.length, showSuggestions]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Helpers ─────────────────────────────────────────────────────────────────

  function findSimilarItem(name: string): ListItem | undefined {
    if (!existingItems) return undefined;
    return existingItems.find((item) => areItemsSimilar(item.name, name)) as ListItem | undefined;
  }

  function resetForm() {
    setNewItemName("");
    setNewItemQuantity("1");
    setNewItemPrice("");
    setSelectedVariantName(null);
    setSelectedVariantSize(null);
    setSelectedVariantUnit(null);
    setShowSuggestionsDropdown(false);
    clearItemSuggestions();
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
        // Pass size/unit from variant selection (Zero-Blank: ensures items have full context)
        ...(size ? { size } : {}),
        ...(unit ? { unit } : {}),
      });

      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      resetForm();
    } catch (error) {
      console.error("Failed to add item:", error);
      alert("Error", "Failed to add item");
    }
  }

  async function addAsNewItem() {
    const itemName = newItemName.trim();
    const quantity = parseInt(newItemQuantity) || 1;
    const price = newItemPrice ? parseFloat(newItemPrice) : 0;

    await addItemToList(
      itemName,
      quantity,
      price || undefined,
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

      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
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
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

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
              // If in shopping mode with budget, show mid-shop modal
              if (listStatus === "shopping" && budget > 0) {
                openMidShopModal();
              } else {
                await addAsNewItem();
              }
              setIsAddingItem(false);
            },
          },
        ]
      );
      return;
    }

    // If in shopping mode with budget, show mid-shop modal
    if (listStatus === "shopping" && budget > 0) {
      openMidShopModal();
      return;
    }

    // Add item directly - variant selection happens inline via chips
    setIsAddingItem(true);
    await addAsNewItem();
    setIsAddingItem(false);
  }

  function openMidShopModal() {
    const itemName = newItemName.trim();
    const quantity = parseInt(newItemQuantity) || 1;
    const price = parseFloat(newItemPrice) || 0;

    onMidShopAdd(itemName, quantity, price);
    // Reset form — the parent's mid-shop modal takes over from here
    resetForm();
  }

  // ── Suggestion handlers ─────────────────────────────────────────────────────

  async function handleAddSuggestion(suggestionName: string) {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

    // Remove from suggestions
    setSuggestions((prev) => prev.filter((s) => s !== suggestionName));

    try {
      // Get a price estimate before adding
      let price: number | undefined;
      try {
        if (listUserId) {
          const estimate = await estimateItemPrice({ itemName: suggestionName, userId: listUserId as Id<"users"> });
          price = estimate?.estimatedPrice;
        }
      } catch {
        // Price estimation failed — add without price rather than blocking
      }

      await addItem({
        listId,
        name: suggestionName,
        quantity: 1,
        estimatedPrice: price,
      });
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch (error) {
      console.error("Failed to add suggestion:", error);
      // Add back to suggestions if failed
      setSuggestions((prev) => [...prev, suggestionName]);
      alert("Error", "Failed to add item");
    }
  }

  function handleDismissSuggestion(suggestionName: string) {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setSuggestions((prev) => prev.filter((s) => s !== suggestionName));
    setDismissedSuggestions((prev) => [...prev, suggestionName]);
  }

  function handleRefreshSuggestions() {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    loadSuggestions();
  }

  function handleToggleSuggestions() {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setShowSuggestions((prev) => !prev);
    if (!showSuggestions) {
      // Clear dismissed when toggling back on
      setDismissedSuggestions([]);
    }
  }

  // ── Item name change handler ───────────────────────────────────────────────
  const handleItemNameChange = useCallback((text: string) => {
    setNewItemName(text);
    // Trigger fuzzy autocomplete search
    searchItemSuggestions(text);
    setShowSuggestionsDropdown(text.trim().length >= 2);
    // Pre-warm the Convex cache for variant data (helps inline chips load faster)
    if (listStatus !== "shopping") {
      triggerPrefetch(text);
    }
  }, [triggerPrefetch, listStatus, searchItemSuggestions]);

  // ── Render ──────────────────────────────────────────────────────────────────

  if (!canEdit) return null;

  const itemCount = existingItems?.length ?? 0;

  return (
    <>
      {/* Collapsed: "+ Add Item" button (hidden during shopping — button is in the row above) */}
      {!isVisible && itemCount > 0 && listStatus !== "shopping" && (
        <GlassButton
          variant="secondary"
          size="md"
          icon="plus"
          onPress={onToggleVisible}
          style={styles.addItemCollapsedButton}
        >
          Add Item
        </GlassButton>
      )}

      {/* Expanded: Full add form with inline suggestions */}
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

            {/* "Did you mean?" inline correction chip */}
            {didYouMean && !showSuggestionsDropdown && (
              <DidYouMeanChip
                original={didYouMean.original}
                suggestion={didYouMean.suggestion}
                similarity={didYouMean.similarity}
                onAccept={() => {
                  const corrected = acceptDidYouMean();
                  setNewItemName(corrected);
                  setShowSuggestionsDropdown(false);
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                }}
                onDismiss={dismissDidYouMean}
              />
            )}

            {/* Fuzzy autocomplete suggestions dropdown */}
            <ItemSuggestionsDropdown
              suggestions={itemSuggestions}
              isLoading={isSuggestionsSearchLoading}
              onSelect={(suggestion) => {
                const name = acceptSuggestion(suggestion);
                setNewItemName(name);
                setShowSuggestionsDropdown(false);
                // Pre-fill price if available and user hasn't entered one
                if (suggestion.estimatedPrice && !newItemPrice) {
                  setNewItemPrice(suggestion.estimatedPrice.toFixed(2));
                }
                // Pre-fill size/unit if available
                if (suggestion.size) {
                  setSelectedVariantSize(suggestion.size);
                }
                if (suggestion.unit) {
                  setSelectedVariantUnit(suggestion.unit);
                }
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
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
                onChangeText={setNewItemPrice}
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

            {/* Price estimate hint (only show when no variants available) */}
            {priceEstimate && priceEstimate.cheapest && (!itemVariants || itemVariants.length === 0) && (
              <Text style={styles.priceHint}>
                {priceEstimate.cheapest.confidence != null && priceEstimate.cheapest.confidence < 0.1
                  ? `~£${priceEstimate.cheapest.price.toFixed(2)} est.`
                  : `Based on £${priceEstimate.cheapest.price.toFixed(2)} at ${priceEstimate.cheapest.storeName}`
                }
              </Text>
            )}

            {/* Variant picker chips */}
            {itemVariants && itemVariants.length > 0 && (
              <View style={styles.variantPickerContainer}>
                <Text style={styles.variantPickerLabel}>Choose a size:</Text>
                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  contentContainerStyle={styles.variantChipsList}
                >
                  {itemVariants.map((variant) => {
                    const isSelected = selectedVariantName === variant.variantName;
                    const label = variant.price != null
                      ? getPriceLabel(variant.price, variant.priceSource, variant.reportCount, variant.storeName)
                      : null;

                    return (
                      <Pressable
                        key={variant._id}
                        style={[styles.variantChip, isSelected && styles.variantChipSelected]}
                        onPress={() => {
                          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                          setSelectedVariantName(variant.variantName);
                          setSelectedVariantSize(variant.size);
                          setSelectedVariantUnit(variant.unit);
                          setNewItemName(variant.variantName);
                          if (variant.price != null) {
                            setNewItemPrice(variant.price.toFixed(2));
                          }
                          // Persist preferred variant on pantry item (fire-and-forget)
                          setPreferredVariant({
                            itemName: variant.baseItem,
                            preferredVariant: variant.variantName,
                          }).catch(console.error);
                        }}
                      >
                        <Text style={[styles.variantChipName, isSelected && styles.variantChipNameSelected]} numberOfLines={1}>
                          {variant.variantName}
                        </Text>
                        {variant.price != null && label && (
                          <Text style={[styles.variantChipPrice, isSelected && styles.variantChipPriceSelected]}>
                            {label.prefix}£{variant.price.toFixed(2)}{label.suffix ? ` ${label.suffix}` : ""}
                          </Text>
                        )}
                        {variant.priceSource === "personal" && (
                          <Text style={styles.variantChipBadge}>Your usual</Text>
                        )}
                      </Pressable>
                    );
                  })}
                  {/* "Other / not sure" option */}
                  <Pressable
                    style={[styles.variantChip, styles.variantChipOther]}
                    onPress={() => {
                      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                      setSelectedVariantName(null);
                      setSelectedVariantSize(null);
                      setSelectedVariantUnit(null);
                      // Use base-item average price if available
                      if (priceEstimate?.average) {
                        setNewItemPrice(priceEstimate.average.toFixed(2));
                      }
                    }}
                  >
                    <Text style={styles.variantChipName}>Not sure</Text>
                  </Pressable>
                </ScrollView>
              </View>
            )}

            {/* Loading indicator for AI price estimation */}
            {isEstimatingPrice && (
              <View style={styles.estimatingContainer}>
                <ActivityIndicator size="small" color={colors.accent.primary} />
                <Text style={styles.estimatingText}>Getting price estimate...</Text>
              </View>
            )}
          </View>

          {/* Inline Suggestions — only visible when add form is open */}
          {itemCount > 0 && isVisible && (
            <View style={styles.inlineSuggestionsContainer}>
              <View style={styles.suggestionsHeader}>
                <View style={styles.suggestionsHeaderLeft}>
                  <MaterialCommunityIcons
                    name="lightbulb-on-outline"
                    size={16}
                    color={colors.accent.secondary}
                  />
                  <Text style={styles.suggestionsTitle}>Suggestions</Text>
                  <Text style={styles.suggestionsSubtitle}>Based on your shopping history</Text>
                </View>
                <View style={styles.suggestionsHeaderRight}>
                  {showSuggestions && suggestions.length > 0 && (
                    <Pressable
                      style={styles.refreshButton}
                      onPress={handleRefreshSuggestions}
                      hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                      disabled={isLoadingSuggestions}
                    >
                      <MaterialCommunityIcons
                        name="refresh"
                        size={16}
                        color={isLoadingSuggestions ? colors.text.tertiary : colors.text.secondary}
                      />
                    </Pressable>
                  )}
                  <Pressable
                    style={styles.toggleSuggestionsButton}
                    onPress={handleToggleSuggestions}
                    hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                  >
                    <MaterialCommunityIcons
                      name={showSuggestions ? "chevron-up" : "chevron-down"}
                      size={18}
                      color={colors.text.secondary}
                    />
                  </Pressable>
                </View>
              </View>

              {showSuggestions && (
                <View style={styles.suggestionsContent}>
                  {isLoadingSuggestions ? (
                    <View style={styles.suggestionsLoading}>
                      <ActivityIndicator size="small" color={colors.accent.secondary} />
                      <Text style={styles.suggestionsLoadingText}>Finding suggestions...</Text>
                    </View>
                  ) : suggestions.length > 0 ? (
                    <View style={styles.suggestionsList}>
                      {suggestions.map((suggestion, index) => (
                        <View key={`${suggestion}-${index}`} style={styles.suggestionChip}>
                          <Text style={styles.suggestionText}>{suggestion}</Text>
                          <View style={styles.suggestionActions}>
                            <Pressable
                              style={styles.suggestionAddButton}
                              onPress={() => handleAddSuggestion(suggestion)}
                              hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
                            >
                              <MaterialCommunityIcons
                                name="plus"
                                size={16}
                                color={colors.semantic.success}
                              />
                            </Pressable>
                            <Pressable
                              style={styles.suggestionDismissButton}
                              onPress={() => handleDismissSuggestion(suggestion)}
                              hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
                            >
                              <MaterialCommunityIcons
                                name="close"
                                size={14}
                                color={colors.text.tertiary}
                              />
                            </Pressable>
                          </View>
                        </View>
                      ))}
                    </View>
                  ) : (
                    <Text style={styles.noSuggestionsText}>
                      No suggestions available
                    </Text>
                  )}
                </View>
              )}
            </View>
          )}
        </GlassCard>
      )}
    </>
  );
});

// ─────────────────────────────────────────────────────────────────────────────
// Styles
// ─────────────────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  // Add Item Card
  addItemCollapsedButton: {
    marginBottom: spacing.lg,
  },
  addItemCard: {
    marginBottom: spacing.lg,
  },
  addItemHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: spacing.sm,
  },
  addItemTitle: {
    ...typography.labelLarge,
    color: colors.text.primary,
  },
  addItemForm: {
    gap: spacing.sm,
  },
  nameInput: {
    flex: 1,
  },
  smallInputRow: {
    flexDirection: "row",
    gap: spacing.sm,
    alignItems: "center",
  },
  smallInput: {
    flex: 1,
  },
  addButton: {
    width: 48,
    paddingHorizontal: 0,
  },
  priceHint: {
    ...typography.bodySmall,
    color: colors.accent.primary,
    marginTop: 4,
    opacity: 0.8,
  },
  variantPickerContainer: {
    marginTop: spacing.sm,
  },
  variantPickerLabel: {
    ...typography.labelSmall,
    color: colors.text.secondary,
    marginBottom: spacing.xs,
  },
  variantChipsList: {
    gap: spacing.sm,
    paddingVertical: 2,
  },
  variantChip: {
    backgroundColor: colors.glass.background,
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    borderColor: colors.glass.border,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    alignItems: "center",
    minWidth: 90,
  },
  variantChipName: {
    ...typography.labelSmall,
    color: colors.text.primary,
    fontWeight: "600",
    marginBottom: 2,
  },
  variantChipPrice: {
    ...typography.labelSmall,
    color: colors.accent.primary,
    fontWeight: "700",
  },
  variantChipSelected: {
    borderColor: colors.accent.primary,
    backgroundColor: "rgba(0, 212, 170, 0.15)",
  },
  variantChipNameSelected: {
    color: colors.accent.primary,
  },
  variantChipPriceSelected: {
    color: colors.accent.primary,
  },
  variantChipBadge: {
    ...typography.labelSmall,
    fontSize: 9,
    color: colors.accent.secondary,
    marginTop: 2,
    fontWeight: "600",
  },
  variantChipOther: {
    borderStyle: "dashed" as any,
    opacity: 0.7,
  },
  estimatingContainer: {
    flexDirection: "row" as const,
    alignItems: "center" as const,
    gap: spacing.xs,
    marginTop: spacing.xs,
  },
  estimatingText: {
    ...typography.labelSmall,
    color: colors.text.tertiary,
    fontStyle: "italic" as const,
  },

  // Smart Suggestions Styles
  inlineSuggestionsContainer: {
    marginTop: spacing.md,
    paddingTop: spacing.sm,
    borderTopWidth: 1,
    borderTopColor: colors.glass.border,
  },
  suggestionsHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  suggestionsHeaderLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.xs,
  },
  suggestionsTitle: {
    ...typography.labelLarge,
    color: colors.text.primary,
  },
  suggestionsSubtitle: {
    ...typography.labelSmall,
    color: colors.text.tertiary,
  },
  suggestionsHeaderRight: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.xs,
  },
  refreshButton: {
    width: 32,
    height: 32,
    borderRadius: borderRadius.lg,
    backgroundColor: colors.glass.background,
    justifyContent: "center",
    alignItems: "center",
  },
  toggleSuggestionsButton: {
    width: 32,
    height: 32,
    borderRadius: borderRadius.lg,
    justifyContent: "center",
    alignItems: "center",
  },
  suggestionsContent: {
    marginTop: spacing.md,
  },
  suggestionsLoading: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: spacing.sm,
    paddingVertical: spacing.md,
  },
  suggestionsLoadingText: {
    ...typography.bodySmall,
    color: colors.text.tertiary,
  },
  suggestionsList: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.sm,
  },
  suggestionChip: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: `${colors.accent.secondary}15`,
    borderRadius: borderRadius.full,
    paddingLeft: spacing.md,
    paddingRight: spacing.xs,
    paddingVertical: spacing.xs,
    gap: spacing.xs,
  },
  suggestionText: {
    ...typography.bodyMedium,
    color: colors.text.primary,
  },
  suggestionActions: {
    flexDirection: "row",
    alignItems: "center",
    gap: 2,
  },
  suggestionAddButton: {
    width: 26,
    height: 26,
    borderRadius: borderRadius.full,
    backgroundColor: `${colors.semantic.success}20`,
    justifyContent: "center",
    alignItems: "center",
  },
  suggestionDismissButton: {
    width: 22,
    height: 22,
    borderRadius: borderRadius.full,
    justifyContent: "center",
    alignItems: "center",
  },
  noSuggestionsText: {
    ...typography.bodySmall,
    color: colors.text.tertiary,
    textAlign: "center",
    paddingVertical: spacing.sm,
  },
});
