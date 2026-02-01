import { Stack } from "expo-router";
import { colors } from "@/components/ui/glass";

export default function OnboardingLayout() {
  return (
    <Stack
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: colors.background.primary },
        animation: "slide_from_right",
      }}
    >
      <Stack.Screen name="welcome" />
    </Stack>
  );
}
