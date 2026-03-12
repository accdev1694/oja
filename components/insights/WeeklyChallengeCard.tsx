import React from "react";
import { View, Text, TouchableOpacity } from "react-native";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { GlassCard, GlassProgressBar, colors } from "@/components/ui/glass";
import { styles } from "./styles";

interface WeeklyChallengeCardProps {
  activeChallenge: any;
  challengeRef: React.RefObject<View | null>;
  challengeGenerating: boolean;
  onGenerate: () => void;
}

export const WeeklyChallengeCard = ({
  activeChallenge,
  challengeRef,
  challengeGenerating,
  onGenerate,
}: WeeklyChallengeCardProps) => {
  return (
    <View ref={challengeRef}>
      <GlassCard style={styles.section}>
        <View style={styles.sectionHeader}>
          <MaterialCommunityIcons
            name="flag-checkered"
            size={22}
            color={colors.accent.warning}
          />
          <Text style={styles.sectionTitle}>Weekly Challenge</Text>
        </View>

        {activeChallenge ? (
          <View style={styles.challengeCard}>
            <View style={styles.challengeTop}>
              <View style={styles.challengeIconCircle}>
                <MaterialCommunityIcons
                  name={(activeChallenge.icon as any) || "star"}
                  size={24}
                  color={colors.accent.warning}
                />
              </View>
              <View style={styles.challengeInfo}>
                <Text style={styles.challengeTitle}>{activeChallenge.title}</Text>
                <Text style={styles.challengeDesc}>{activeChallenge.description}</Text>
              </View>
              <View style={styles.challengeReward}>
                <Text style={styles.rewardPoints}>+{activeChallenge.reward}</Text>
                <Text style={styles.rewardLabel}>pts</Text>
              </View>
            </View>
            <View style={styles.challengeProgressRow}>
              <GlassProgressBar
                progress={Math.round(
                  (activeChallenge.progress / activeChallenge.target) * 100
                )}
                size="md"
              />
              <Text style={styles.challengeProgressText}>
                {activeChallenge.progress}/{activeChallenge.target}
              </Text>
            </View>
            {activeChallenge.completedAt && (
              <View style={styles.challengeCompleteBanner}>
                <MaterialCommunityIcons name="check-circle" size={16} color={colors.accent.success} />
                <Text style={styles.challengeCompleteText}>Completed!</Text>
              </View>
            )}
          </View>
        ) : (
          <TouchableOpacity
            style={styles.generateChallengeBtn}
            onPress={onGenerate}
            disabled={challengeGenerating}
            activeOpacity={0.7}
          >
            <MaterialCommunityIcons
              name="dice-multiple"
              size={24}
              color={colors.accent.warning}
            />
            <Text style={styles.generateChallengeText}>
              {challengeGenerating ? "Generating..." : "Start a Challenge"}
            </Text>
          </TouchableOpacity>
        )}
      </GlassCard>
    </View>
  );
};
