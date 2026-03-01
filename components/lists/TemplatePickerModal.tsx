import React, { useState, useCallback, useMemo } from "react";
import { View, Text, Pressable, StyleSheet, Modal, SafeAreaView } from "react-native";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { FlashList } from "@shopify/flash-list";
import * as Haptics from "expo-haptics";
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from "react-native-reanimated";
import { BlurView } from "expo-blur";
import type { Id } from "@/convex/_generated/dataModel";
import {
  colors,
  typography,
  spacing,
  borderRadius,
  animations,
} from "@/components/ui/glass";

interface TemplatePickerModalProps {
  visible: boolean;
  onClose: () => void;
  onSelectTemplate: (id: Id<"shoppingLists">, name: string) => void;
  historyLists: Array<{
    _id: Id<"shoppingLists">;
    name: string;
    status: string;
    completedAt?: number;
    createdAt: number;
    storeName?: string;
    storeSegments?: Array<{ storeId: string; storeName: string; switchedAt: number }>;
    listNumber?: number;
  }>;
}

interface TemplateCardProps {
  list: TemplatePickerModalProps["historyLists"][0];
  onPress: () => void;
}

function TemplateCard({ list, onPress }: TemplateCardProps) {
  const scale = useSharedValue(1);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const handlePressIn = () => {
    scale.value = withSpring(0.98, animations.spring.stiff);
  };

  const handlePressOut = () => {
    scale.value = withSpring(1, animations.spring.gentle);
  };

  const handlePress = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onPress();
  };

  const formatShortDate = (ts: number) => {
    const d = new Date(ts);
    const dd = String(d.getDate()).padStart(2, "0");
    const mm = String(d.getMonth() + 1).padStart(2, "0");
    const yy = String(d.getFullYear()).slice(-2);
    return `${dd}/${mm}/${yy}`;
  };

  const completedDate = list.completedAt
    ? formatShortDate(list.completedAt)
    : formatShortDate(list.createdAt);

  // Collect store names
  const storeNames: string[] = [];
  if (list.storeSegments && list.storeSegments.length > 0) {
    for (const seg of list.storeSegments) {
      if (!storeNames.includes(seg.storeName)) {
        storeNames.push(seg.storeName);
      }
    }
  } else if (list.storeName) {
    storeNames.push(list.storeName);
  }

  return (
    <Animated.View style={[styles.cardWrapper, animatedStyle]}>
      <Pressable
        onPress={handlePress}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        style={({ pressed }) => [
          styles.card,
          pressed && { opacity: 0.8 },
        ]}
      >
        <View style={styles.cardContent}>
          <View style={styles.cardHeader}>
            <MaterialCommunityIcons
              name="clipboard-check"
              size={20}
              color={colors.text.tertiary}
            />
            <Text style={styles.listName} numberOfLines={1}>
              {list.name}
            </Text>
            {list.listNumber != null && (
              <Text style={styles.listNumber}>#{list.listNumber}</Text>
            )}
          </View>

          <View style={styles.cardMeta}>
            {storeNames.length > 0 && (
              <View style={styles.metaItem}>
                <MaterialCommunityIcons
                  name="store"
                  size={14}
                  color={colors.text.tertiary}
                />
                <Text style={styles.metaText} numberOfLines={1}>
                  {storeNames.join(" • ")}
                </Text>
              </View>
            )}
            <View style={styles.metaItem}>
              <MaterialCommunityIcons
                name="calendar"
                size={14}
                color={colors.text.tertiary}
              />
              <Text style={styles.metaText}>{completedDate}</Text>
            </View>
          </View>
        </View>

        <MaterialCommunityIcons
          name="chevron-right"
          size={20}
          color={colors.text.tertiary}
        />
      </Pressable>
    </Animated.View>
  );
}

export function TemplatePickerModal({
  visible,
  onClose,
  onSelectTemplate,
  historyLists,
}: TemplatePickerModalProps) {
  const handleSelect = useCallback(
    (id: Id<"shoppingLists">, name: string) => {
      onSelectTemplate(id, name);
    },
    [onSelectTemplate]
  );

  const renderItem = useCallback(
    ({ item }: { item: TemplatePickerModalProps["historyLists"][0] }) => (
      <TemplateCard
        list={item}
        onPress={() => handleSelect(item._id, item.name)}
      />
    ),
    [handleSelect]
  );

  const keyExtractor = useCallback(
    (item: TemplatePickerModalProps["historyLists"][0]) => item._id,
    []
  );

  const ListEmptyComponent = useMemo(
    () => (
      <View style={styles.emptyContainer}>
        <MaterialCommunityIcons
          name="clipboard-text-off-outline"
          size={64}
          color={colors.text.tertiary}
        />
        <Text style={styles.emptyTitle}>No Completed Lists</Text>
        <Text style={styles.emptySubtitle}>
          Complete a shopping trip first, then you can use it as a template.
        </Text>
      </View>
    ),
    []
  );

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <BlurView intensity={95} tint="dark" style={styles.container}>
        <SafeAreaView style={styles.safeArea}>
          {/* Header */}
          <View style={styles.header}>
            <Pressable
              onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                onClose();
              }}
              style={styles.backButton}
            >
              <MaterialCommunityIcons
                name="arrow-left"
                size={24}
                color={colors.text.primary}
              />
            </Pressable>
            <Text style={styles.headerTitle}>Choose a Template</Text>
            <View style={styles.headerSpacer} />
          </View>

          {/* List */}
          <FlashList
            data={historyLists}
            renderItem={renderItem}
            keyExtractor={keyExtractor}
            contentContainerStyle={styles.listContent}
            ListEmptyComponent={ListEmptyComponent}
          />
        </SafeAreaView>
      </BlurView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background.primary,
  },
  safeArea: {
    flex: 1,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(255, 255, 255, 0.1)",
  },
  backButton: {
    width: 40,
    height: 40,
    alignItems: "center",
    justifyContent: "center",
  },
  headerTitle: {
    ...typography.headlineSmall,
    color: colors.text.primary,
    fontWeight: "600",
  },
  headerSpacer: {
    width: 40,
  },
  listContent: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
    paddingBottom: spacing.xl,
  },
  cardWrapper: {
    marginBottom: spacing.md,
  },
  card: {
    flexDirection: "row",
    alignItems: "center",
    padding: spacing.md,
    backgroundColor: "rgba(255, 255, 255, 0.05)",
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.1)",
    gap: spacing.sm,
  },
  cardContent: {
    flex: 1,
    gap: spacing.sm,
  },
  cardHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
  },
  listName: {
    ...typography.bodyLarge,
    color: colors.text.primary,
    fontWeight: "600",
    flex: 1,
  },
  listNumber: {
    ...typography.bodySmall,
    color: colors.text.tertiary,
  },
  cardMeta: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
    flexWrap: "wrap",
  },
  metaItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.xs,
  },
  metaText: {
    ...typography.bodySmall,
    color: colors.text.tertiary,
  },
  emptyContainer: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: spacing.xl * 3,
    paddingHorizontal: spacing.xl,
  },
  emptyTitle: {
    ...typography.headlineMedium,
    color: colors.text.primary,
    marginTop: spacing.lg,
    marginBottom: spacing.sm,
  },
  emptySubtitle: {
    ...typography.bodyMedium,
    color: colors.text.secondary,
    textAlign: "center",
  },
});
