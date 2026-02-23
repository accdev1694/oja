import { Tabs } from "expo-router";

export default function TabLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarStyle: { display: "none" },
      }}
    >
      <Tabs.Screen name="index" options={{ title: "Lists" }} />
      <Tabs.Screen name="stock" options={{ title: "Stock" }} />
      <Tabs.Screen name="scan" options={{ title: "Scan" }} />
      <Tabs.Screen name="profile" options={{ title: "Profile" }} />
    </Tabs>
  );
}
