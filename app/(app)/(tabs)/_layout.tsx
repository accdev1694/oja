import { Tabs } from "expo-router";
import { Platform } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

export default function TabLayout() {
  const insets = useSafeAreaInsets();
  const bottomPadding = Math.max(insets.bottom, 8);

  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: "#FF6B35",
        tabBarInactiveTintColor: "#9CA3AF",
        tabBarStyle: {
          backgroundColor: "#FFFAF8",
          borderTopColor: "#E5E7EB",
          paddingTop: 8,
          paddingBottom: bottomPadding,
          height: 56 + bottomPadding,
        },
        headerStyle: {
          backgroundColor: "#FFFAF8",
        },
        headerTitleStyle: {
          color: "#2D3436",
          fontWeight: "600",
        },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: "Pantry",
          headerTitle: "My Pantry",
          tabBarIcon: ({ color, size }) => (
            <TabIcon name="pantry" color={color} size={size} />
          ),
        }}
      />
      <Tabs.Screen
        name="lists"
        options={{
          title: "Lists",
          headerTitle: "Shopping Lists",
          tabBarIcon: ({ color, size }) => (
            <TabIcon name="lists" color={color} size={size} />
          ),
        }}
      />
      <Tabs.Screen
        name="scan"
        options={{
          title: "Scan",
          headerTitle: "Scan Receipt",
          tabBarIcon: ({ color, size }) => (
            <TabIcon name="scan" color={color} size={size} />
          ),
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: "Profile",
          headerTitle: "My Profile",
          tabBarIcon: ({ color, size }) => (
            <TabIcon name="profile" color={color} size={size} />
          ),
        }}
      />
    </Tabs>
  );
}

// Simple placeholder icon component
function TabIcon({
  name,
  color,
  size,
}: {
  name: string;
  color: string;
  size: number;
}) {
  // Using Unicode symbols as placeholders
  // Will be replaced with proper icons later
  const icons: Record<string, string> = {
    pantry: "🏠",
    lists: "📝",
    scan: "📷",
    profile: "👤",
  };

  const { Text } = require("react-native");
  return <Text style={{ fontSize: size - 4 }}>{icons[name] || "•"}</Text>;
}
