import React from "react";
import { View, Text, StyleSheet } from "react-native";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { Id } from "@/convex/_generated/dataModel";
import {
  AnimatedSection,
  colors,
  typography,
  spacing,
} from "@/components/ui/glass";
import { HistoryCard } from "@/components/lists/HistoryCard";

interface HistoryListItem {
  _id: Id<"shoppingLists">;
  name: string;
  status: string;
  budget?: number;
  actualTotal?: number;
  pointsEarned?: number;
  completedAt?: number;
  createdAt: number;
  storeName?: string;
  storeSegments?: { storeId: string; storeName: string; switchedAt: number }[];
  listNumber?: number;
}

const HistoryListsContent = React.memo(function HistoryListsContent({
  displayList,
  animationKey,
  isMultiSelectMode,
  selectedHistoryLists,
  onHistoryPress,
  onUseAsTemplate,
  onToggleSelect,
  formatDateTime,
}: {
  displayList: HistoryListItem[];
  animationKey: number;
  isMultiSelectMode: boolean;
  selectedHistoryLists: Set<Id<"shoppingLists">>;
  onHistoryPress: (id: Id<"shoppingLists">) => void;
  onUseAsTemplate: (id: Id<"shoppingLists">, name: string) => void;
  onToggleSelect: (id: Id<"shoppingLists">) => void;
  formatDateTime: (timestamp: number) => string;
}) {
  if (displayList.length === 0) {
    return (
      <AnimatedSection key={`empty-history-${animationKey}`} animation="fadeInDown" duration={400} delay={150}>
        <View style={styles.emptyHistoryContainer}>
          <MaterialCommunityIcons
            name="clipboard-check-outline"
            size={64}
            color={colors.text.tertiary}
          />
          <Text style={styles.emptyHistoryTitle}>No trips yet</Text>
          <Text style={styles.emptyHistorySubtitle}>
            Complete a shopping trip and it&apos;ll show up here — great for tracking your spending over time.
          </Text>
        </View>
      </AnimatedSection>
    );
  }

  return (
    <View>
      {displayList.map((list, index) => (
        <AnimatedSection key={`${list._id}-${animationKey}`} animation="fadeInDown" duration={400} delay={150 + (index * 50)}>
          <View style={styles.cardWrapper}>
            <HistoryCard
              list={list}
              onPress={onHistoryPress}
              formatDateTime={formatDateTime}
              onUseAsTemplate={onUseAsTemplate}
              selectable={isMultiSelectMode}
              selected={selectedHistoryLists.has(list._id)}
              onToggleSelect={onToggleSelect}
            />
          </View>
        </AnimatedSection>
      ))}
    </View>
  );
});

export { HistoryListsContent };

const styles = StyleSheet.create({
  emptyHistoryContainer: {
    alignItems: "center",
    gap: spacing.md,
  },
  emptyHistoryTitle: {
    ...typography.headlineMedium,
    color: colors.text.secondary,
  },
  emptyHistorySubtitle: {
    ...typography.bodyMedium,
    color: colors.text.tertiary,
    textAlign: "center",
    lineHeight: 22,
  },
  cardWrapper: {
    marginHorizontal: spacing.lg,
  },
});
