/**
 * UnmatchedItemsModal - User confirmation UI for receipt ↔ product matching
 *
 * Shows unmatched receipt items and allows users to:
 * 1. Select a matching item from suggestions
 * 2. Skip the item (don't match)
 * 3. Mark as "no match" (receipt item has no corresponding product)
 */

import React, { useState, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  ScrollView,
  ActivityIndicator,
} from "react-native";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useMutation, useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import type { Id, Doc } from "@/convex/_generated/dataModel";
import * as Haptics from "expo-haptics";

import {
  GlassModal,
  GlassCard,
  GlassButton,
  colors,
  typography,
  spacing,
  borderRadius,
} from "@/components/ui/glass";

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

type PendingMatch = Doc<"pendingItemMatches">;

interface UnmatchedItemsModalProps {
  visible: boolean;
  onClose: () => void;
  receiptId: Id<"receipts">;
  onComplete?: (matchedCount: number) => void;
}

interface CandidateMatch {
  listItemId?: Id<"listItems">;
  pantryItemId?: Id<"pantryItems">;
  scannedProductName?: string;
  matchScore: number;
  matchReason: string;
}

// ─────────────────────────────────────────────────────────────────────────────
// Component
// ─────────────────────────────────────────────────────────────────────────────

export function UnmatchedItemsModal({
  visible,
  onClose,
  receiptId,
  onComplete,
}: UnmatchedItemsModalProps) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isProcessing, setIsProcessing] = useState(false);
  const [matchedCount, setMatchedCount] = useState(0);

  // Queries
  const pendingMatches = useQuery(api.itemMatching.getPendingMatches, {
    receiptId,
  });

  // Mutations
  const confirmMatch = useMutation(api.itemMatching.confirmMatch);
  const skipMatch = useMutation(api.itemMatching.skipMatch);
  const markNoMatch = useMutation(api.itemMatching.markNoMatch);
  const skipAll = useMutation(api.itemMatching.skipAllPendingMatches);

  const currentMatch = pendingMatches?.[currentIndex];
  const totalCount = pendingMatches?.length ?? 0;
  const remainingCount = totalCount - currentIndex;

  // ─── Handlers ────────────────────────────────────────────────────────────

  const handleConfirmMatch = useCallback(
    async (candidate: CandidateMatch) => {
      if (!currentMatch || isProcessing) return;

      setIsProcessing(true);
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

      try {
        const itemId = candidate.listItemId || candidate.pantryItemId;
        const matchType = candidate.listItemId
          ? "list_item"
          : candidate.pantryItemId
            ? "pantry_item"
            : "new_item";

        await confirmMatch({
          pendingMatchId: currentMatch._id,
          matchType,
          itemId: itemId as string | undefined,
          canonicalName: candidate.scannedProductName ?? currentMatch.receiptItemName,
          category: undefined,
        });

        setMatchedCount((prev) => prev + 1);
        moveToNext();
      } catch (error) {
        console.error("Failed to confirm match:", error);
      } finally {
        setIsProcessing(false);
      }
    },
    [currentMatch, isProcessing, confirmMatch]
  );

  const handleSkip = useCallback(async () => {
    if (!currentMatch || isProcessing) return;

    setIsProcessing(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

    try {
      await skipMatch({ pendingMatchId: currentMatch._id });
      moveToNext();
    } catch (error) {
      console.error("Failed to skip match:", error);
    } finally {
      setIsProcessing(false);
    }
  }, [currentMatch, isProcessing, skipMatch]);

  const handleNoMatch = useCallback(async () => {
    if (!currentMatch || isProcessing) return;

    setIsProcessing(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

    try {
      await markNoMatch({ pendingMatchId: currentMatch._id });
      moveToNext();
    } catch (error) {
      console.error("Failed to mark no match:", error);
    } finally {
      setIsProcessing(false);
    }
  }, [currentMatch, isProcessing, markNoMatch]);

  const handleSkipAll = useCallback(async () => {
    if (isProcessing) return;

    setIsProcessing(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

    try {
      await skipAll({ receiptId });
      onComplete?.(matchedCount);
      onClose();
    } catch (error) {
      console.error("Failed to skip all:", error);
    } finally {
      setIsProcessing(false);
    }
  }, [isProcessing, skipAll, receiptId, matchedCount, onComplete, onClose]);

  const moveToNext = useCallback(() => {
    if (currentIndex < totalCount - 1) {
      setCurrentIndex((prev) => prev + 1);
    } else {
      // All done
      onComplete?.(matchedCount);
      onClose();
    }
  }, [currentIndex, totalCount, matchedCount, onComplete, onClose]);

  // ─── Render ──────────────────────────────────────────────────────────────

  if (!visible) return null;

  // Loading state
  if (pendingMatches === undefined) {
    return (
      <GlassModal visible={visible} onClose={onClose}>
        <View style={styles.loadingContainer}>
          <Text style={styles.modalTitle}>Matching Items...</Text>
          <ActivityIndicator size="large" color={colors.accent.primary} />
          <Text style={styles.loadingText}>Finding unmatched items...</Text>
        </View>
      </GlassModal>
    );
  }

  // No pending matches
  if (totalCount === 0) {
    return (
      <GlassModal visible={visible} onClose={onClose}>
        <View style={styles.emptyContainer}>
          <Text style={styles.modalTitle}>All Matched!</Text>
          <MaterialCommunityIcons
            name="check-circle"
            size={64}
            color={colors.semantic.success}
          />
          <Text style={styles.emptyTitle}>All items matched</Text>
          <Text style={styles.emptySubtitle}>
            No items need manual matching
          </Text>
          <GlassButton variant="primary" onPress={onClose} style={styles.doneButton}>
            Done
          </GlassButton>
        </View>
      </GlassModal>
    );
  }

  return (
    <GlassModal
      visible={visible}
      onClose={onClose}
    >
      <View style={styles.container}>
        {/* Modal Title */}
        <Text style={styles.modalTitle}>Match Receipt Items</Text>

        {/* Progress indicator */}
        <View style={styles.progressBar}>
          <View
            style={[
              styles.progressFill,
              { width: `${((currentIndex + 1) / totalCount) * 100}%` },
            ]}
          />
        </View>
        <Text style={styles.progressText}>
          {currentIndex + 1} of {totalCount} items
        </Text>

        {/* Current receipt item */}
        {currentMatch && (
          <>
            <GlassCard variant="elevated" style={styles.receiptItemCard}>
              <View style={styles.receiptItemHeader}>
                <MaterialCommunityIcons
                  name="receipt"
                  size={24}
                  color={colors.accent.primary}
                />
                <Text style={styles.receiptItemLabel}>Receipt says:</Text>
              </View>
              <Text style={styles.receiptItemName}>
                {currentMatch.receiptItemName}
              </Text>
              <Text style={styles.receiptItemPrice}>
                £{currentMatch.receiptItemPrice.toFixed(2)} × {currentMatch.receiptItemQuantity}
              </Text>
            </GlassCard>

            {/* Candidate matches */}
            <Text style={styles.sectionLabel}>Is this the same as...</Text>

            <ScrollView
              style={styles.candidatesContainer}
              showsVerticalScrollIndicator={false}
            >
              {currentMatch.candidateMatches.map((candidate, index) => (
                <Pressable
                  key={index}
                  style={({ pressed }) => [
                    styles.candidateCard,
                    pressed && styles.candidateCardPressed,
                  ]}
                  onPress={() => handleConfirmMatch(candidate)}
                  disabled={isProcessing}
                >
                  <View style={styles.candidateContent}>
                    <View style={styles.candidateIcon}>
                      <MaterialCommunityIcons
                        name={
                          candidate.listItemId
                            ? "format-list-checkbox"
                            : "fridge-outline"
                        }
                        size={20}
                        color={colors.text.secondary}
                      />
                    </View>
                    <View style={styles.candidateInfo}>
                      <Text style={styles.candidateName}>
                        {candidate.scannedProductName ?? "Unknown"}
                      </Text>
                      <Text style={styles.candidateReason}>
                        {formatMatchReason(candidate.matchReason)}
                      </Text>
                    </View>
                    <View style={styles.candidateScore}>
                      <Text
                        style={[
                          styles.scoreText,
                          candidate.matchScore >= 50
                            ? styles.scoreHigh
                            : styles.scoreLow,
                        ]}
                      >
                        {candidate.matchScore}%
                      </Text>
                    </View>
                  </View>
                </Pressable>
              ))}

              {currentMatch.candidateMatches.length === 0 && (
                <View style={styles.noCandidates}>
                  <MaterialCommunityIcons
                    name="help-circle-outline"
                    size={32}
                    color={colors.text.tertiary}
                  />
                  <Text style={styles.noCandidatesText}>
                    No matching items found in your lists
                  </Text>
                </View>
              )}
            </ScrollView>

            {/* Action buttons */}
            <View style={styles.actions}>
              <GlassButton
                variant="secondary"
                size="sm"
                icon="close"
                onPress={handleNoMatch}
                disabled={isProcessing}
                style={styles.actionButton}
              >
                No Match
              </GlassButton>
              <GlassButton
                variant="secondary"
                size="sm"
                icon="skip-next"
                onPress={handleSkip}
                disabled={isProcessing}
                style={styles.actionButton}
              >
                Skip
              </GlassButton>
            </View>

            {/* Skip all remaining */}
            {remainingCount > 1 && (
              <Pressable
                style={styles.skipAllButton}
                onPress={handleSkipAll}
                disabled={isProcessing}
              >
                <Text style={styles.skipAllText}>
                  Skip all {remainingCount} remaining
                </Text>
              </Pressable>
            )}
          </>
        )}

        {isProcessing && (
          <View style={styles.processingOverlay}>
            <ActivityIndicator size="small" color={colors.accent.primary} />
          </View>
        )}
      </View>
    </GlassModal>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────

function formatMatchReason(reason: string): string {
  const parts = reason.split(", ");
  const formatted: string[] = [];

  for (const part of parts) {
    if (part.startsWith("token_overlap:")) {
      formatted.push("Similar words");
    } else if (part === "category_match") {
      formatted.push("Same category");
    } else if (part.startsWith("price_match:")) {
      formatted.push("Similar price");
    } else if (part.startsWith("learned:")) {
      formatted.push("Previously matched");
    } else if (part.startsWith("fuzzy:")) {
      formatted.push("Similar name");
    } else if (part === "fuzzy_duplicate") {
      formatted.push("Likely same item");
    }
  }

  return formatted.join(" • ") || "Potential match";
}

// ─────────────────────────────────────────────────────────────────────────────
// Styles
// ─────────────────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingHorizontal: spacing.md,
    paddingBottom: spacing.md,
  },
  modalTitle: {
    ...typography.headlineSmall,
    color: colors.text.primary,
    marginBottom: spacing.md,
    textAlign: "center",
  },
  loadingContainer: {
    alignItems: "center",
    justifyContent: "center",
    padding: spacing.xl,
    gap: spacing.md,
  },
  loadingText: {
    ...typography.bodyMedium,
    color: colors.text.secondary,
  },
  emptyContainer: {
    alignItems: "center",
    justifyContent: "center",
    padding: spacing.xl,
    gap: spacing.md,
  },
  emptyTitle: {
    ...typography.headlineSmall,
    color: colors.text.primary,
    marginTop: spacing.sm,
  },
  emptySubtitle: {
    ...typography.bodyMedium,
    color: colors.text.secondary,
    textAlign: "center",
  },
  doneButton: {
    marginTop: spacing.md,
    minWidth: 120,
  },

  // Progress
  progressBar: {
    height: 4,
    backgroundColor: "rgba(255,255,255,0.1)",
    borderRadius: 2,
    overflow: "hidden",
    marginBottom: spacing.xs,
  },
  progressFill: {
    height: "100%",
    backgroundColor: colors.accent.primary,
    borderRadius: 2,
  },
  progressText: {
    ...typography.labelSmall,
    color: colors.text.tertiary,
    textAlign: "center",
    marginBottom: spacing.md,
  },

  // Receipt item card
  receiptItemCard: {
    marginBottom: spacing.md,
  },
  receiptItemHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.xs,
    marginBottom: spacing.xs,
  },
  receiptItemLabel: {
    ...typography.labelSmall,
    color: colors.text.tertiary,
  },
  receiptItemName: {
    ...typography.headlineSmall,
    color: colors.text.primary,
    marginBottom: spacing.xs,
  },
  receiptItemPrice: {
    ...typography.bodyMedium,
    color: colors.accent.primary,
    fontWeight: "600",
  },

  // Section label
  sectionLabel: {
    ...typography.labelMedium,
    color: colors.text.secondary,
    marginBottom: spacing.sm,
  },

  // Candidates
  candidatesContainer: {
    maxHeight: 250,
    marginBottom: spacing.md,
  },
  candidateCard: {
    backgroundColor: "rgba(255,255,255,0.05)",
    borderRadius: borderRadius.md,
    padding: spacing.sm,
    marginBottom: spacing.xs,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.1)",
  },
  candidateCardPressed: {
    backgroundColor: "rgba(0, 212, 170, 0.15)",
    borderColor: colors.accent.primary,
  },
  candidateContent: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
  },
  candidateIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "rgba(255,255,255,0.1)",
    alignItems: "center",
    justifyContent: "center",
  },
  candidateInfo: {
    flex: 1,
  },
  candidateName: {
    ...typography.bodyMedium,
    color: colors.text.primary,
    fontWeight: "500",
  },
  candidateReason: {
    ...typography.labelSmall,
    color: colors.text.tertiary,
    marginTop: 2,
  },
  candidateScore: {
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.sm,
    backgroundColor: "rgba(255,255,255,0.1)",
  },
  scoreText: {
    ...typography.labelSmall,
    fontWeight: "700",
  },
  scoreHigh: {
    color: colors.semantic.success,
  },
  scoreLow: {
    color: colors.text.tertiary,
  },

  // No candidates
  noCandidates: {
    alignItems: "center",
    justifyContent: "center",
    padding: spacing.lg,
    gap: spacing.sm,
  },
  noCandidatesText: {
    ...typography.bodySmall,
    color: colors.text.tertiary,
    textAlign: "center",
  },

  // Actions
  actions: {
    flexDirection: "row",
    gap: spacing.sm,
    marginBottom: spacing.sm,
  },
  actionButton: {
    flex: 1,
  },

  // Skip all
  skipAllButton: {
    alignSelf: "center",
    paddingVertical: spacing.sm,
  },
  skipAllText: {
    ...typography.labelSmall,
    color: colors.text.tertiary,
    textDecorationLine: "underline",
  },

  // Processing overlay
  processingOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0,0,0,0.3)",
    alignItems: "center",
    justifyContent: "center",
    borderRadius: borderRadius.lg,
  },
});
