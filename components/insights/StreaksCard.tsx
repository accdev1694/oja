import React from "react";
import { View, Text } from "react-native";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { GlassCollapsible, colors } from "@/components/ui/glass";
import { styles } from "./styles";

interface Streak {
  _id: string;
  type: string;
  currentCount: number;
  longestCount: number;
}

interface StreaksCardProps {
  streaks: Streak[] | undefined;
}

export const StreaksCard = ({ streaks }: StreaksCardProps) => {
  return (
    <View style={styles.section}>
      <GlassCollapsible
        title="Streaks"
        icon="fire"
        iconColor={colors.semantic.fire}
      >
        {streaks && streaks.length > 0 ? (
          streaks.map((streak) => (
            <View key={streak._id} style={styles.streakRow}>
              <View style={styles.streakLeft}>
                <View style={styles.streakFlame}>
                  <MaterialCommunityIcons
                    name="fire"
                    size={20}
                    color={streak.currentCount >= 7 ? colors.semantic.fire : colors.text.tertiary}
                  />
                </View>
                <View>
                  <Text style={styles.streakType}>
                    {streak.type.replace(/_/g, " ")}
                  </Text>
                  <Text style={styles.streakDays}>
                    {streak.currentCount} day
                    {streak.currentCount !== 1 ? "s" : ""}
                  </Text>
                </View>
              </View>
              <View style={styles.streakBestBadge}>
                <MaterialCommunityIcons
                  name="trophy-outline"
                  size={12}
                  color={colors.accent.warning}
                />
                <Text style={styles.streakBestText}>
                  {streak.longestCount}
                </Text>
              </View>
            </View>
          ))
        ) : (
          <Text style={styles.emptyText}>
            Complete shopping trips to build streaks!
          </Text>
        )}
      </GlassCollapsible>
    </View>
  );
};
