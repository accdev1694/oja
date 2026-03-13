import React from "react";
import { View, Text, Pressable, StyleSheet } from "react-native";
import { useRouter } from "expo-router";
import * as Haptics from "expo-haptics";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { Id } from "@/convex/_generated/dataModel";
import {
  GlassCard,
  AnimatedSection,
  colors,
  typography,
  spacing,
  borderRadius,
} from "@/components/ui/glass";
import { EmptyLists } from "@/components/ui/glass/GlassErrorState";
import { ListCard } from "@/components/lists/ListCard";
import { SharedListCard } from "@/components/lists/SharedListCard";

interface ShoppingListItem {
  _id: Id<"shoppingLists">;
  name: string;
  [key: string]: unknown;
}

interface SharedListItem {
  _id: Id<"shoppingLists">;
  name: string;
  [key: string]: unknown;
}

const ActiveListsContent = React.memo(function ActiveListsContent({
  displayList,
  activeShared,
  hasAnyActiveLists,
  isCreating,
  animationKey,
  createCardRef,
  onCreateListFlow,
  onListPress,
  onDeletePress,
  onEditName,
  onSharedPress,
  formatDateTime,
}: {
  displayList: ShoppingListItem[];
  activeShared: SharedListItem[];
  hasAnyActiveLists: boolean;
  isCreating: boolean;
  animationKey: number;
  createCardRef: React.RefObject<View | null>;
  onCreateListFlow: () => void;
  onListPress: (id: Id<"shoppingLists">) => void;
  onDeletePress: (id: Id<"shoppingLists">, name: string) => void;
  onEditName: (id: Id<"shoppingLists">, name: string) => void;
  onSharedPress: (id: Id<"shoppingLists">) => void;
  formatDateTime: (timestamp: number) => string;
}) {
  const router = useRouter();

  if (!hasAnyActiveLists) {
    return (
      <AnimatedSection key={`empty-${animationKey}`} animation="fadeInDown" duration={400} delay={150}>
        <View style={styles.emptyScrollContentInner}>
          <EmptyLists
            onAction={onCreateListFlow}
            actionText="Create a New List"
          />
          {/* Join a shared list — always visible even with no lists */}
          <View style={styles.joinCardEmpty}>
            <Pressable
              onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                router.push("/join-list");
              }}
            >
              <GlassCard variant="bordered" style={styles.joinCard}>
                <View style={styles.joinCardContent}>
                  <MaterialCommunityIcons
                    name="link-variant"
                    size={18}
                    color={colors.text.tertiary}
                  />
                  <Text style={styles.joinCardText}>Accept Invite</Text>
                  <MaterialCommunityIcons
                    name="chevron-right"
                    size={18}
                    color={colors.text.tertiary}
                  />
                </View>
              </GlassCard>
            </Pressable>
          </View>
        </View>
      </AnimatedSection>
    );
  }

  return (
    <View>
      {/* Inline create-list card — always visible as first item */}
      <AnimatedSection key={`create-${animationKey}`} animation="fadeInDown" duration={400} delay={150}>
        <View ref={createCardRef}>
          <Pressable
            onPress={onCreateListFlow}
            disabled={isCreating}
            style={({ pressed }) => [
              styles.createCard,
              isCreating && { opacity: 0.5 },
              pressed && { opacity: 0.7 },
            ]}
          >
            <View style={styles.createCardInner}>
              <View style={styles.createCardIcon}>
                <MaterialCommunityIcons name="plus" size={24} color={colors.accent.primary} />
              </View>
              <View style={styles.createCardText}>
                <Text style={styles.createCardTitle}>Create a new list</Text>
                <Text style={styles.createCardSubtitle}>Set a budget and start adding items</Text>
              </View>
              <MaterialCommunityIcons name="chevron-right" size={20} color={colors.text.tertiary} />
            </View>
          </Pressable>
        </View>
      </AnimatedSection>

      {displayList.map((list, index) => (
        <AnimatedSection key={`${list._id}-${animationKey}`} animation="fadeInDown" duration={400} delay={200 + (index * 50)}>
          <View style={styles.cardWrapper}>
            <ListCard
              list={list}
              onPress={onListPress}
              onDelete={onDeletePress}
              onEditName={onEditName}
            />
          </View>
        </AnimatedSection>
      ))}

      {/* Shared With Me section */}
      {activeShared.length > 0 && (
        <View>
          <AnimatedSection key={`shared-title-${animationKey}`} animation="fadeInDown" duration={400} delay={200 + (displayList.length * 50)}>
            <View style={styles.sharedSectionHeader}>
              <MaterialCommunityIcons
                name="account-group"
                size={18}
                color={colors.text.secondary}
              />
              <Text style={styles.sharedSectionTitle}>Shared With Me</Text>
            </View>
          </AnimatedSection>
          {activeShared.map((list, index) =>
            list ? (
              <AnimatedSection key={`${list._id}-${animationKey}`} animation="fadeInDown" duration={400} delay={250 + (displayList.length * 50) + (index * 50)}>
                <View style={styles.cardWrapper}>
                  <SharedListCard
                    list={list}
                    onPress={onSharedPress}
                    formatDateTime={formatDateTime}
                  />
                </View>
              </AnimatedSection>
            ) : null
          )}
        </View>
      )}

      {/* Join a shared list — inline card */}
      <AnimatedSection key={`join-${animationKey}`} animation="fadeInDown" duration={400} delay={200 + ((displayList.length + activeShared.length) * 50)}>
        <View style={styles.joinCardWrapper}>
          <Pressable
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              router.push("/join-list");
            }}
          >
            <GlassCard variant="bordered" style={styles.joinCard}>
              <View style={styles.joinCardContent}>
                <MaterialCommunityIcons
                  name="link-variant"
                  size={18}
                  color={colors.text.tertiary}
                />
                <Text style={styles.joinCardText}>Accept Invite</Text>
                <MaterialCommunityIcons
                  name="chevron-right"
                  size={18}
                  color={colors.text.tertiary}
                />
              </View>
            </GlassCard>
          </Pressable>
        </View>
      </AnimatedSection>
    </View>
  );
});

export { ActiveListsContent };

const styles = StyleSheet.create({
  emptyScrollContentInner: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: spacing.xl,
  },
  cardWrapper: {
    marginHorizontal: spacing.lg,
  },
  joinCardWrapper: {
    alignItems: "center",
    marginTop: spacing.lg,
  },
  joinCard: {
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
  },
  joinCardContent: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
  },
  joinCardText: {
    ...typography.bodyMedium,
    color: colors.text.secondary,
  },
  joinCardEmpty: {
    alignItems: "center",
    marginTop: spacing.lg,
  },
  createCard: {
    marginHorizontal: spacing.lg,
    marginBottom: spacing.md,
    borderWidth: 1.5,
    borderStyle: "dashed",
    borderColor: `${colors.accent.primary}50`,
    borderRadius: borderRadius.lg,
    backgroundColor: `${colors.accent.primary}08`,
    padding: spacing.md,
  },
  createCardInner: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
  },
  createCardIcon: {
    width: 44,
    height: 44,
    borderRadius: borderRadius.full,
    backgroundColor: `${colors.accent.primary}20`,
    alignItems: "center",
    justifyContent: "center",
  },
  createCardText: {
    flex: 1,
  },
  createCardTitle: {
    ...typography.bodyLarge,
    color: colors.accent.primary,
    fontWeight: "600",
  },
  createCardSubtitle: {
    ...typography.bodySmall,
    color: colors.text.tertiary,
    marginTop: 2,
  },
  sharedSectionHeader: {
    marginHorizontal: spacing.lg,
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    marginTop: spacing.md,
    marginBottom: spacing.sm,
    paddingTop: spacing.md,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.glass.border,
  },
  sharedSectionTitle: {
    ...typography.labelMedium,
    color: colors.text.secondary,
    fontWeight: "600",
  },
});
