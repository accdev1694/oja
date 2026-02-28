import React, { useState, useEffect } from "react";
import {
  Modal,
  View,
  Text,
  StyleSheet,
  Pressable,
  ScrollView,
  TextInput,
} from "react-native";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { colors, spacing, typography, GlassCard } from "@/components/ui/glass";
import * as Haptics from "expo-haptics";
import { useAdminSearch } from "../hooks";
import { AdminTab } from "../types";

interface GlobalSearchModalProps {
  visible: boolean;
  onClose: () => void;
  onSelectResult: (tab: AdminTab, id: string) => void;
}

/**
 * GlobalSearchModal Component
 * Provides a Cmd+K style search overlay for the Admin Dashboard.
 */
export function GlobalSearchModal({ visible, onClose, onSelectResult }: GlobalSearchModalProps) {
  const [query, setQuery] = useState("");
  const results = useAdminSearch(query);

  // Auto-focus input when modal opens
  useEffect(() => {
    if (!visible) setQuery("");
  }, [visible]);

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <Pressable style={styles.overlay} onPress={onClose}>
        <GlassCard style={styles.modalContent}>
          <View style={styles.searchHeader}>
            <MaterialCommunityIcons name="magnify" size={24} color={colors.accent.primary} />
            <TextInput
              style={styles.input}
              placeholder="Search users, receipts, settings..."
              placeholderTextColor={colors.text.tertiary}
              value={query}
              onChangeText={setQuery}
              autoFocus
              autoCapitalize="none"
            />
            {query.length > 0 && (
              <Pressable onPress={() => setQuery("")} hitSlop={8}>
                <MaterialCommunityIcons name="close-circle" size={20} color={colors.text.tertiary} />
              </Pressable>
            )}
          </View>

          <ScrollView style={styles.resultsList} keyboardShouldPersistTaps="handled">
            {results.map((item) => (
              <Pressable
                key={`${item.type}-${item.id}`}
                style={styles.resultItem}
                onPress={() => {
                  onSelectResult(item.tab, item.id);
                  onClose();
                  Haptics.selectionAsync();
                }}
              >
                <View style={styles.iconCircle}>
                  <MaterialCommunityIcons 
                    name={item.type === "user" ? "account" : item.type === "receipt" ? "receipt" : "cog"} 
                    size={18} 
                    color={colors.accent.primary} 
                  />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.resultTitle}>{item.title}</Text>
                  <Text style={styles.resultSubtitle}>{item.subtitle}</Text>
                </View>
                <View style={styles.tabBadge}>
                  <Text style={styles.tabText}>{item.tab}</Text>
                </View>
              </Pressable>
            ))}

            {query.length >= 2 && results.length === 0 && (
              <Text style={styles.emptyText}>No results found for "{query}"</Text>
            )}
            
            {query.length < 2 && (
              <View style={styles.hints}>
                <Text style={styles.hintText}>Type at least 2 characters to search...</Text>
                <View style={styles.shortcutRow}>
                  <Text style={styles.shortcutLabel}>Tip: Try searching for "Tesco" or "Premium"</Text>
                </View>
              </View>
            )}
          </ScrollView>
        </GlassCard>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.6)",
    padding: spacing.md,
    paddingTop: 100,
  },
  modalContent: {
    maxHeight: 400,
    padding: 0,
    overflow: "hidden",
  },
  searchHeader: {
    flexDirection: "row",
    alignItems: "center",
    padding: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.glass.border,
    gap: spacing.sm,
  },
  input: {
    flex: 1,
    ...typography.bodyLarge,
    color: colors.text.primary,
    padding: 0,
  },
  resultsList: {
    padding: spacing.sm,
  },
  resultItem: {
    flexDirection: "row",
    alignItems: "center",
    padding: spacing.md,
    borderRadius: 12,
    gap: spacing.md,
  },
  iconCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: `${colors.accent.primary}15`,
    alignItems: "center",
    justifyContent: "center",
  },
  resultTitle: {
    ...typography.bodyMedium,
    color: colors.text.primary,
    fontWeight: "600",
  },
  resultSubtitle: {
    ...typography.bodySmall,
    color: colors.text.tertiary,
  },
  tabBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
    backgroundColor: `${colors.glass.border}40`,
  },
  tabText: {
    fontSize: 9,
    color: colors.text.secondary,
    textTransform: "uppercase",
    fontWeight: "700",
  },
  emptyText: {
    ...typography.bodyMedium,
    color: colors.text.tertiary,
    textAlign: "center",
    padding: spacing.xl,
  },
  hints: {
    padding: spacing.xl,
    alignItems: "center",
    gap: spacing.sm,
  },
  hintText: {
    ...typography.bodySmall,
    color: colors.text.tertiary,
    fontStyle: "italic",
  },
  shortcutRow: {
    marginTop: spacing.md,
  },
  shortcutLabel: {
    fontSize: 10,
    color: colors.text.tertiary,
  },
});
