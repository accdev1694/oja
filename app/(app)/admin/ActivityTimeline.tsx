import React, { ComponentProps } from "react";
import { View, Text, ActivityIndicator } from "react-native";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { colors } from "@/components/ui/glass";
import { adminStyles as styles } from "./styles";
import { TimelineEvent } from "./types";
import type { Id } from "@/convex/_generated/dataModel";

interface ActivityTimelineProps {
  userId: string;
}

export function ActivityTimeline({ userId }: ActivityTimelineProps) {
  const events = useQuery(api.admin.getUserTimeline, { userId: userId as Id<"users">, limit: 20 }) as TimelineEvent[] | undefined;

  if (!events) return <ActivityIndicator color={colors.accent.primary} />;
  if (events.length === 0) return <Text style={styles.emptyText}>No recent activity found.</Text>;

  const getEventIcon = (type: string) => {
    switch (type) {
      case "login": return "login";
      case "signup": return "account-plus";
      case "onboarding_complete": return "check-decagram";
      case "first_list": return "clipboard-list";
      case "first_receipt": return "receipt";
      case "first_scan": return "barcode-scan";
      case "subscribed": return "crown";
      case "support_ticket_created": return "help-circle";
      default: return "circle-outline";
    }
  };

  return (
    <View style={styles.timelineContainer}>
      {events.map((e, idx) => (
        <View key={e._id} style={styles.timelineRow}>
          <View style={styles.timelineLineContainer}>
            <View style={styles.timelineIcon}>
              <MaterialCommunityIcons 
                name={getEventIcon(e.eventType) as ComponentProps<typeof MaterialCommunityIcons>["name"]} 
                size={14} 
                color={colors.accent.primary} 
              />
            </View>
            {idx < events.length - 1 && <View style={styles.timelineLine} />}
          </View>
          <View style={styles.timelineContent}>
            <Text style={styles.timelineType}>{e.eventType.replace(/_/g, " ").toUpperCase()}</Text>
            <Text style={styles.timelineTime}>{new Date(e.timestamp).toLocaleString()}</Text>
          </View>
        </View>
      ))}
    </View>
  );
}
