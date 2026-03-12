import React from "react";
import { View, Text } from "react-native";
import Animated, { FadeInDown, FadeOut } from "react-native-reanimated";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { colors } from "@/components/ui/glass";
import { formatItemDisplay } from "@/convex/lib/itemNameParser";
import { styles } from "./styles";

interface AddedFeedbackItem {
  id: number;
  name: string;
  size?: string;
  price?: number;
}

interface FeedbackPillsProps {
  addedThisSession: AddedFeedbackItem[];
}

export const FeedbackPills = ({ addedThisSession }: FeedbackPillsProps) => {
  if (addedThisSession.length === 0) return null;

  return (
    <View style={styles.feedbackContainer}>
      {addedThisSession.slice(0, 3).map((item) => (
        <Animated.View
          key={item.id}
          entering={FadeInDown.duration(250)}
          exiting={FadeOut.duration(200)}
          style={styles.feedbackPill}
        >
          <MaterialCommunityIcons
            name="check-circle"
            size={14}
            color={colors.accent.primary}
          />
          <Text style={styles.feedbackText} numberOfLines={1}>
            {formatItemDisplay(item.name, item.size)}
            {item.price != null ? ` \u00B7 \u00A3${item.price.toFixed(2)}` : ""}
            {" added"}
          </Text>
        </Animated.View>
      ))}
    </View>
  );
};
