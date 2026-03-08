import React, { useEffect, useState } from "react";
import { View, Text, StyleSheet, ScrollView, Modal, Pressable, ActivityIndicator } from "react-native";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useAction, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { colors, typography, spacing, borderRadius, GlassCard, GlassButton } from "@/components/ui/glass";
import * as Haptics from "expo-haptics";
import { Id } from "@/convex/_generated/dataModel";
import { LinearGradient } from "expo-linear-gradient";

interface HealthSwap {
  originalName: string;
  originalId?: Id<"listItems">;
  suggestedName: string;
  suggestedCategory?: string;
  suggestedSize?: string;
  suggestedUnit?: string;
  priceDelta?: number;
  scoreImpact?: number;
  reason: string;
}

interface HealthAnalysis {
  score: number;
  summary: string;
  strengths: string[];
  weaknesses: string[];
  swaps: HealthSwap[];
  itemCountAtAnalysis?: number;
  updatedAt: number;
}

interface HealthAnalysisModalProps {
  visible: boolean;
  onClose: () => void;
  listId: Id<"shoppingLists">;
  initialAnalysis?: HealthAnalysis;
  itemCount?: number;
}

export function HealthAnalysisModal({ visible, onClose, listId, initialAnalysis, itemCount }: HealthAnalysisModalProps) {
  const [analysis, setAnalysis] = useState<HealthAnalysis | undefined>(initialAnalysis);
  const [loading, setLoading] = useState(false);
  const [swappingId, setSwappingId] = useState<string | null>(null);
  const [addingBonus, setAddingBonus] = useState<string | null>(null);

  const analyzeHealth = useAction(api.ai.analyzeListHealth);
  const applySwap = useMutation(api.listItems.applyHealthSwap);
  const addItem = useMutation(api.listItems.create);

  useEffect(() => {
    setAnalysis(initialAnalysis);
  }, [initialAnalysis]);

  useEffect(() => {
    if (visible && !analysis && !loading) {
      handleAnalyze();
    }
  }, [visible]);

  const handleAnalyze = async () => {
    setLoading(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    try {
      const result = await analyzeHealth({ listId });
      setAnalysis(result as HealthAnalysis);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch (e) {
      console.error(e);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    } finally {
      setLoading(false);
    }
  };

  const handleApplySwap = async (
    originalId: string, 
    suggestedName: string, 
    suggestedCategory?: string, 
    scoreImpact?: number,
    suggestedSize?: string,
    suggestedUnit?: string
  ) => {
    if (!originalId) return;
    setSwappingId(originalId);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    try {
      await applySwap({
        listId,
        originalItemId: originalId as Id<"listItems">,
        suggestedName,
        suggestedCategory,
        scoreImpact,
        suggestedSize,
        suggestedUnit,
      });

      // Update local state to reflect UI update immediately (including score)
      setAnalysis((prev) => {
        if (!prev) return prev;
        const newScore = Math.min(100, prev.score + (scoreImpact || 0));
        return {
          ...prev,
          score: newScore,
          swaps: prev.swaps.filter((s) => s.originalId !== originalId)
        };
      });
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch (e) {
      console.error(e);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    } finally {
      setSwappingId(null);
    }
  };

  const handleAddBonus = async (
    name: string, 
    category?: string, 
    scoreImpact?: number,
    suggestedSize?: string,
    suggestedUnit?: string
  ) => {
    setAddingBonus(name);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    try {
      await addItem({
        listId,
        name,
        category: category || "Produce",
        quantity: 1,
        priority: "should-have",
        size: suggestedSize,
        unit: suggestedUnit,
      });

      // Also manually update list health for bonuses (optional but good for consistency)
      // Note: Backend doesn't have a direct 'addBonusScore' mutation yet, 
      // but we can update local UI state.
      setAnalysis((prev) => {
        if (!prev) return prev;
        const newScore = Math.min(100, prev.score + (scoreImpact || 0));
        return {
          ...prev,
          score: newScore,
          swaps: prev.swaps.filter((s) => s.suggestedName !== name)
        };
      });

      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch (e) {
      console.error(e);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    } finally {
      setAddingBonus(null);
    }
  };

  const getScoreColor = (score: number) => {
    if (score >= 80) return colors.accent.success;
    if (score >= 60) return colors.accent.warning;
    return colors.accent.error;
  };

  const isStale = analysis && itemCount !== undefined && analysis.itemCountAtAnalysis !== undefined && 
                 Math.abs(itemCount - analysis.itemCountAtAnalysis) > (analysis.itemCountAtAnalysis * 0.3);

  const regularSwaps = analysis?.swaps?.filter((s) => s.originalName !== "Bonus") || [];
  const bonusItems = analysis?.swaps?.filter((s) => s.originalName === "Bonus") || [];

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent={true}
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <View style={styles.container}>
          <View style={styles.header}>
            <View>
              <Text style={styles.title}>AI Health Analysis</Text>
              {isStale && (
                <View style={styles.staleBadge}>
                  <MaterialCommunityIcons name="alert-outline" size={12} color={colors.accent.warning} />
                  <Text style={styles.staleText}>List has changed significantly</Text>
                </View>
              )}
            </View>
            <Pressable onPress={onClose} style={({pressed}) => [styles.closeBtn, pressed && {opacity: 0.7}]}>
              <MaterialCommunityIcons name="close" size={24} color={colors.text.secondary} />
            </Pressable>
          </View>

          {loading ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color={colors.accent.primary} />
              <Text style={styles.loadingText}>Our AI Nutritionist is reviewing your list...</Text>
            </View>
          ) : analysis ? (
            <ScrollView style={styles.scroll} showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: spacing["2xl"] }}>
              
              {/* Score Section */}
              <View style={styles.scoreContainer}>
                <View style={[styles.scoreRing, { borderColor: getScoreColor(analysis.score) }]}>
                  <Text style={[styles.scoreText, { color: getScoreColor(analysis.score) }]}>{analysis.score}</Text>
                  <Text style={styles.scoreMax}>/100</Text>
                </View>
                <Text style={styles.summaryText}>{analysis.summary}</Text>
              </View>

              {/* Strengths & Weaknesses */}
              <View style={styles.splitSection}>
                <GlassCard variant="standard" style={styles.splitCard}>
                  <Text style={styles.splitTitle}>
                    <MaterialCommunityIcons name="heart-pulse" size={16} color="#4ADE80" /> Great Job
                  </Text>
                  {analysis.strengths?.map((s: string, i: number) => (
                    <Text key={i} style={styles.bulletText}>• {s}</Text>
                  ))}
                  {(!analysis.strengths || analysis.strengths.length === 0) && (
                    <Text style={styles.bulletText}>No specific strengths identified.</Text>
                  )}
                </GlassCard>

                <GlassCard variant="standard" style={styles.splitCard}>
                  <Text style={styles.splitTitle}>
                    <MaterialCommunityIcons name="alert-circle-outline" size={16} color={colors.accent.warning} /> To Improve
                  </Text>
                  {analysis.weaknesses?.map((w: string, i: number) => (
                    <Text key={i} style={styles.bulletText}>• {w}</Text>
                  ))}
                  {(!analysis.weaknesses || analysis.weaknesses.length === 0) && (
                    <Text style={styles.bulletText}>Looks perfect!</Text>
                  )}
                </GlassCard>
              </View>

              {/* Swaps */}
              {regularSwaps.length > 0 && (
                <View style={styles.swapsSection}>
                  <Text style={styles.sectionTitle}>Healthy Swaps</Text>
                  {regularSwaps.map((swap: any, i: number) => (
                    <LinearGradient
                      key={i}
                      colors={[colors.glass.background, colors.glass.backgroundHover]}
                      style={styles.swapCard}
                    >
                      <View style={styles.swapHeader}>
                        <View style={styles.swapItem}>
                          <Text style={styles.swapItemLabel}>Original</Text>
                          <Text style={styles.swapItemText} numberOfLines={1}>{swap.originalName}</Text>
                        </View>
                        <View style={styles.swapArrow}>
                          <MaterialCommunityIcons name="arrow-right-bold" size={20} color={colors.accent.primary} />
                          {swap.priceDelta !== undefined && (
                            <Text style={[styles.priceDelta, { color: swap.priceDelta > 0 ? colors.accent.error : colors.accent.success }]}>
                              {swap.priceDelta > 0 ? `+£${swap.priceDelta.toFixed(2)}` : `-£${Math.abs(swap.priceDelta).toFixed(2)}`}
                            </Text>
                          )}
                        </View>
                        <View style={styles.swapItem}>
                          <Text style={styles.swapItemLabel}>Suggested</Text>
                          <Text style={styles.swapItemText} numberOfLines={1}>{swap.suggestedName}</Text>
                        </View>
                      </View>
                      <Text style={styles.swapReason}>{swap.reason}</Text>
                      <GlassButton
                        onPress={() => handleApplySwap(
                          swap.originalId!, 
                          swap.suggestedName, 
                          swap.suggestedCategory, 
                          swap.scoreImpact,
                          swap.suggestedSize,
                          swap.suggestedUnit
                        )}
                        variant="primary"
                        disabled={!swap.originalId || swappingId === swap.originalId}
                        style={{ marginTop: spacing.md }}
                      >
                        {swappingId === swap.originalId ? "Swapping..." : "Swap Now"}
                      </GlassButton>
                    </LinearGradient>
                  ))}
                </View>
              )}

              {/* Bonus Suggestions */}
              {bonusItems.length > 0 && (
                <View style={styles.swapsSection}>
                  <Text style={styles.sectionTitle}>Boost Your Health</Text>
                  {bonusItems.map((bonus: HealthSwap, i: number) => (
                    <LinearGradient
                      key={i}
                      colors={[colors.glass.background, colors.glass.backgroundHover]}
                      style={styles.swapCard}
                    >
                      <View style={styles.bonusHeader}>
                        <MaterialCommunityIcons name="plus-circle-outline" size={24} color="#4ADE80" />
                        <View style={{ flex: 1, marginLeft: spacing.sm }}>
                          <Text style={styles.swapItemText}>{bonus.suggestedName}</Text>
                          <Text style={styles.swapReason}>{bonus.reason}</Text>
                        </View>
                      </View>
                      <GlassButton
                        onPress={() => handleAddBonus(
                          bonus.suggestedName, 
                          bonus.suggestedCategory, 
                          bonus.scoreImpact,
                          bonus.suggestedSize,
                          bonus.suggestedUnit
                        )}
                        variant="secondary"
                        disabled={addingBonus === bonus.suggestedName}
                        style={{ marginTop: spacing.md }}
                      >
                        {addingBonus === bonus.suggestedName ? "Adding..." : "Add to List"}
                      </GlassButton>
                    </LinearGradient>
                  ))}
                </View>
              )}

              {/* Disclaimer */}
              <View style={styles.disclaimerBox}>
                <MaterialCommunityIcons name="information-outline" size={14} color={colors.text.tertiary} />
                <Text style={styles.disclaimerText}>
                  AI suggestions are general guidance based on your list. Please check labels for allergens and medical suitability.
                </Text>
              </View>

              <View style={styles.footerActions}>
                <Pressable onPress={handleAnalyze} style={({pressed}) => [styles.reAnalyzeBtn, pressed && {opacity: 0.7}]}>
                  <MaterialCommunityIcons name="refresh" size={16} color={colors.text.secondary} />
                  <Text style={styles.reAnalyzeText}>Re-analyze List</Text>
                </Pressable>
              </View>
            </ScrollView>
          ) : (
            <View style={styles.emptyContainer}>
              <Text style={styles.emptyText}>Could not analyze list. Make sure you have items on it!</Text>
              <GlassButton onPress={handleAnalyze} variant="primary">Try Again</GlassButton>
            </View>
          )}
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.6)",
    justifyContent: "flex-end",
  },
  container: {
    backgroundColor: colors.background.primary,
    borderTopLeftRadius: borderRadius.xl,
    borderTopRightRadius: borderRadius.xl,
    minHeight: "75%",
    maxHeight: "90%",
    padding: spacing.lg,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: spacing.lg,
  },
  title: {
    ...typography.headlineLarge,
    color: colors.text.primary,
  },
  staleBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    marginTop: 2,
  },
  staleText: {
    ...typography.labelSmall,
    color: colors.accent.warning,
  },
  closeBtn: {
    padding: 4,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  loadingText: {
    ...typography.bodyMedium,
    color: colors.text.secondary,
    marginTop: spacing.md,
    textAlign: "center",
  },
  emptyContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    gap: spacing.lg,
  },
  emptyText: {
    ...typography.bodyMedium,
    color: colors.text.secondary,
    textAlign: "center",
  },
  scroll: {
    flex: 1,
  },
  scoreContainer: {
    alignItems: "center",
    marginBottom: spacing.xl,
    paddingHorizontal: spacing.md,
  },
  scoreRing: {
    width: 120,
    height: 120,
    borderRadius: 60,
    borderWidth: 6,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: spacing.md,
  },
  scoreText: {
    fontSize: 48,
    fontWeight: "900",
  },
  scoreMax: {
    ...typography.labelSmall,
    color: colors.text.tertiary,
    marginTop: -4,
  },
  summaryText: {
    ...typography.bodyLarge,
    color: colors.text.primary,
    textAlign: "center",
    lineHeight: 24,
  },
  splitSection: {
    flexDirection: "row",
    gap: spacing.md,
    marginBottom: spacing.xl,
  },
  splitCard: {
    flex: 1,
    padding: spacing.md,
    backgroundColor: "rgba(255,255,255,0.03)",
  },
  splitTitle: {
    ...typography.labelMedium,
    color: colors.text.primary,
    marginBottom: spacing.sm,
    fontWeight: "700",
  },
  bulletText: {
    ...typography.bodySmall,
    color: colors.text.secondary,
    marginBottom: 4,
  },
  swapsSection: {
    marginBottom: spacing.xl,
  },
  sectionTitle: {
    ...typography.headlineMedium,
    color: colors.text.primary,
    marginBottom: spacing.md,
  },
  swapCard: {
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    marginBottom: spacing.md,
    borderWidth: 1,
    borderColor: colors.glass.border,
  },
  swapHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: spacing.sm,
  },
  swapArrow: {
    alignItems: "center",
    paddingHorizontal: spacing.xs,
  },
  priceDelta: {
    ...typography.labelSmall,
    marginTop: 2,
    fontWeight: "bold",
  },
  bonusHeader: {
    flexDirection: "row",
    alignItems: "flex-start",
  },
  swapItem: {
    flex: 1,
  },
  swapItemLabel: {
    ...typography.labelSmall,
    color: colors.text.tertiary,
    marginBottom: 2,
  },
  swapItemText: {
    ...typography.bodyMedium,
    color: colors.text.primary,
    fontWeight: "600",
  },
  swapReason: {
    ...typography.bodySmall,
    color: colors.text.secondary,
    fontStyle: "italic",
    marginTop: spacing.xs,
  },
  disclaimerBox: {
    flexDirection: "row",
    gap: spacing.xs,
    padding: spacing.md,
    backgroundColor: "rgba(255,255,255,0.03)",
    borderRadius: borderRadius.md,
    marginBottom: spacing.lg,
  },
  disclaimerText: {
    ...typography.bodySmall,
    color: colors.text.tertiary,
    flex: 1,
    lineHeight: 16,
  },
  footerActions: {
    alignItems: "center",
    marginTop: spacing.md,
  },
  reAnalyzeBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.xs,
    padding: spacing.sm,
  },
  reAnalyzeText: {
    ...typography.labelMedium,
    color: colors.text.secondary,
  },
});
