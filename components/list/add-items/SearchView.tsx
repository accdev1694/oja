import React from "react";
import { View, Text, Pressable, ActivityIndicator } from "react-native";
import { ScrollView as GHScrollView } from "react-native-gesture-handler";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { colors } from "@/components/ui/glass";
import { VariantPicker } from "@/components/items/VariantPicker";
import type { VariantOption } from "@/components/items/VariantPicker";
import { PersonalizedSuggestions } from "@/components/lists/PersonalizedSuggestions";
import { styles } from "./styles";
import type { Id } from "@/convex/_generated/dataModel";
import type { ItemSuggestion } from "@/hooks/useItemSuggestions";

interface SearchViewProps {
  itemName: string;
  isSuggestionsLoading: boolean;
  selectedSuggestion: ItemSuggestion | null;
  onSelectSuggestion: (suggestion: ItemSuggestion) => void;
  isVariantsLoading: boolean;
  variantOptions: VariantOption[];
  selectedVariantName?: string;
  onVariantSelect: (variantName: string) => void;
  altSuggestions: ItemSuggestion[];
  listId: Id<"shoppingLists">;
  onItemAddedFeedback: () => void;
}

export const SearchView = ({
  itemName,
  isSuggestionsLoading,
  selectedSuggestion,
  onSelectSuggestion,
  isVariantsLoading,
  variantOptions,
  selectedVariantName,
  onVariantSelect,
  altSuggestions,
  listId,
  onItemAddedFeedback,
}: SearchViewProps) => {
  return (
    <GHScrollView
      style={styles.variantScrollView}
      contentContainerStyle={styles.variantScrollContent}
      keyboardShouldPersistTaps="always"
      showsVerticalScrollIndicator={false}
      nestedScrollEnabled={true}
    >
      {itemName.trim().length === 0 ? (
        <>
          <PersonalizedSuggestions 
            activeListId={listId} 
            onItemAdded={onItemAddedFeedback}
          />
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyHint}>
              Search above or add from pantry
            </Text>
          </View>
        </>
      ) : isSuggestionsLoading && !selectedSuggestion ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="small" color={colors.accent.primary} />
          <Text style={styles.loadingText}>Searching...</Text>
        </View>
      ) : !selectedSuggestion ? (
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyHint}>
            No matches found — tap &quot;Add Item&quot; to add manually
          </Text>
        </View>
      ) : (
        <>
          <Pressable
            style={styles.matchedItemRow}
            onPress={() => onSelectSuggestion(selectedSuggestion)}
          >
            <Text style={styles.matchedItemLabel}>
              {selectedSuggestion.name}
              {selectedSuggestion.source === "pantry" && (
                <Text style={styles.matchedItemBadge}> · in pantry</Text>
              )}
            </Text>
            <MaterialCommunityIcons
              name="arrow-up-left"
              size={18}
              color={colors.text.tertiary}
            />
          </Pressable>

          {isVariantsLoading ? (
            <VariantPicker
              baseItem={selectedSuggestion.name}
              variants={[]}
              onSelect={onVariantSelect}
              isLoading
              compact
            />
          ) : variantOptions.length > 0 ? (
            <VariantPicker
              baseItem={selectedSuggestion.name}
              variants={variantOptions}
              selectedVariant={selectedVariantName}
              onSelect={onVariantSelect}
              showPricePerUnit
              compact
            />
          ) : (
            <Text style={styles.noVariantsHint}>
              No size options — use Size button above or tap &quot;Add Item&quot;
            </Text>
          )}

          {altSuggestions.length > 0 && (
            <View style={styles.altSuggestionsSection}>
              <Text style={styles.altSuggestionsLabel}>Did you mean?</Text>
              <GHScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                keyboardShouldPersistTaps="always"
                nestedScrollEnabled={true}
                contentContainerStyle={styles.altSuggestionsRow}
              >
                {altSuggestions.map((s) => (
                  <Pressable
                    key={s.name}
                    style={styles.altSuggestionChip}
                    onPress={() => onSelectSuggestion(s)}
                  >
                    <Text style={styles.altSuggestionText} numberOfLines={1}>
                      {s.name}
                    </Text>
                    {s.source === "pantry" && (
                      <View style={[styles.stockDot, {
                        backgroundColor:
                          s.stockLevel === "out" ? colors.accent.error :
                          s.stockLevel === "low" ? colors.accent.warning :
                          colors.accent.success,
                      }]} />
                    )}
                  </Pressable>
                ))}
              </GHScrollView>
            </View>
          )}
        </>
      )}
    </GHScrollView>
  );
};
