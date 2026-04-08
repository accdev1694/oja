import { memo } from "react";
import { View, Text, Pressable, ActivityIndicator } from "react-native";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { colors } from "@/components/ui/glass";
import { styles } from "./addItemForm.styles";

interface InlineSuggestionsProps {
  suggestions: string[];
  isLoadingSuggestions: boolean;
  showSuggestions: boolean;
  onAddSuggestion: (name: string) => void;
  onDismissSuggestion: (name: string) => void;
  onRefresh: () => void;
  onToggle: () => void;
}

export const InlineSuggestions = memo(function InlineSuggestions({
  suggestions,
  isLoadingSuggestions,
  showSuggestions,
  onAddSuggestion,
  onDismissSuggestion,
  onRefresh,
  onToggle,
}: InlineSuggestionsProps) {
  return (
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
              onPress={onRefresh}
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
            onPress={onToggle}
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
                      onPress={() => onAddSuggestion(suggestion)}
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
                      onPress={() => onDismissSuggestion(suggestion)}
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
  );
});
