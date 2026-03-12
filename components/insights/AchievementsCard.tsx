import React from "react";
import { View, Text } from "react-native";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { GlassCollapsible, colors } from "@/components/ui/glass";
import { styles } from "./styles";

interface AchievementsCardProps {
  achievements: any[] | undefined;
}

export const AchievementsCard = ({ achievements }: AchievementsCardProps) => {
  return (
    <View style={styles.section}>
      <GlassCollapsible
        title="Achievements"
        icon="medal"
        iconColor={colors.accent.secondary}
        badge={achievements && achievements.length > 0 ? achievements.length : undefined}
      >
        {achievements && achievements.length > 0 ? (
          <View style={styles.achievementsGrid}>
            {achievements.map((a: any) => (
              <AchievementBadge
                key={a._id}
                icon={a.icon}
                title={a.title}
                description={a.description}
              />
            ))}
          </View>
        ) : (
          <View style={styles.emptyAchievements}>
            <MaterialCommunityIcons
              name="lock-outline"
              size={32}
              color={colors.text.tertiary}
            />
            <Text style={styles.emptyText}>
              Keep shopping to unlock achievements!
            </Text>
          </View>
        )}
      </GlassCollapsible>
    </View>
  );
};

const AchievementBadge = React.memo(function AchievementBadge({
  icon,
  title,
  description,
}: {
  icon: string;
  title: string;
  description: string;
}) {
  return (
    <View style={styles.achievementBadge}>
      <View style={styles.achievementIconCircle}>
        <MaterialCommunityIcons
          name={(icon as any) || "star"}
          size={24}
          color={colors.accent.secondary}
        />
      </View>
      <Text style={styles.achievementTitle} numberOfLines={1}>
        {title}
      </Text>
      <Text style={styles.achievementDesc} numberOfLines={2}>
        {description}
      </Text>
    </View>
  );
});
