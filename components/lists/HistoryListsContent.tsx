import React, { useMemo, useCallback } from "react";
import { View, Text, StyleSheet } from "react-native";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import Animated, { FadeInDown } from "react-native-reanimated";
import { FlashList } from "@shopify/flash-list";
import {
  AnimatedSection,
  GlassButton,
  colors,
  typography,
  spacing,
} from "@/components/ui/glass";
import { HistoryCard } from "@/components/lists/HistoryCard";

const MONTH_NAMES = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

const HistoryListsContent = React.memo(function HistoryListsContent({
  displayList,
  animationKey,
  onHistoryPress,
  onUseAsTemplate,
  formatDateTime,
  headerContent,
  hasActiveFilters,
  onClearFilters,
}: any) {
  // Build flat data with month headers interleaved
  const flatData = useMemo(() => {
    if (displayList.length === 0) return [];

    const result = [];
    let currentMonth = "";

    for (const list of displayList) {
      const ts = list.completedAt ?? list.createdAt;
      const date = new Date(ts);
      const monthYear = `${MONTH_NAMES[date.getMonth()]} ${date.getFullYear()}`;

      if (monthYear !== currentMonth) {
        currentMonth = monthYear;
        result.push({ _id: `month-${monthYear}`, isMonthHeader: true, month: monthYear });
      }
      result.push(list);
    }

    return result;
  }, [displayList]);

  const renderItem = useCallback(
    ({ item }: any) => {
      if (item.isMonthHeader) {
        return <Text style={styles.monthHeader}>{item.month}</Text>;
      }

      return (
        <Animated.View entering={FadeInDown.duration(300).delay(50)}>
          <HistoryCard
            list={item}
            onPress={onHistoryPress}
            formatDateTime={formatDateTime}
            onUseAsTemplate={onUseAsTemplate}
          />
        </Animated.View>
      );
    },
    [onHistoryPress, formatDateTime, onUseAsTemplate]
  );

  const keyExtractor = useCallback((item: any) => item._id, []);

  const getItemType = useCallback(
    (item: any) => (item.isMonthHeader ? "monthHeader" : "card"),
    []
  );

  const ListHeaderComponent = useMemo(
    () => headerContent ?? null,
    [headerContent]
  );

  const ListEmptyComponent = useMemo(
    () => (
      <AnimatedSection animation="fadeInDown" duration={400} delay={150}>
        <View style={styles.emptyContainer}>
          <MaterialCommunityIcons
            name={hasActiveFilters ? "filter-remove-outline" : "clipboard-check-outline"}
            size={64}
            color={colors.text.tertiary}
          />
          <Text style={styles.emptyTitle}>
            {hasActiveFilters ? "No matching trips" : "No trips yet"}
          </Text>
          <Text style={styles.emptySubtitle}>
            {hasActiveFilters
              ? "Try adjusting your search or filters to find what you're looking for."
              : "Complete a shopping trip and it'll show up here \u2014 great for tracking your spending over time."}
          </Text>
          {hasActiveFilters && onClearFilters && (
            <GlassButton
              variant="secondary"
              onPress={onClearFilters}
              style={styles.clearButton}
            >
              Clear Filters
            </GlassButton>
          )}
        </View>
      </AnimatedSection>
    ),
    [hasActiveFilters, onClearFilters]
  );

  return (
    <FlashList
      data={flatData}
      renderItem={renderItem}
      keyExtractor={keyExtractor}
      getItemType={getItemType}
      ListHeaderComponent={ListHeaderComponent}
      ListEmptyComponent={ListEmptyComponent}
      extraData={animationKey}
      showsVerticalScrollIndicator={false}
      contentContainerStyle={styles.listContent}
    />
  );
});

export { HistoryListsContent };

const styles = StyleSheet.create({
  listContent: {
    paddingHorizontal: spacing.lg,
    paddingBottom: 140,
    paddingTop: spacing.sm,
  },
  monthHeader: {
    ...typography.labelLarge,
    color: colors.text.secondary,
    marginLeft: spacing.xs,
    marginTop: spacing.sm,
    marginBottom: spacing.sm,
    fontWeight: "600",
  },
  emptyContainer: {
    alignItems: "center",
    gap: spacing.md,
    paddingTop: spacing.xl,
  },
  emptyTitle: {
    ...typography.headlineMedium,
    color: colors.text.secondary,
  },
  emptySubtitle: {
    ...typography.bodyMedium,
    color: colors.text.tertiary,
    textAlign: "center",
    lineHeight: 22,
    paddingHorizontal: spacing.lg,
  },
  clearButton: {
    marginTop: spacing.sm,
  },
});
