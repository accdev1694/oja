import { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  Pressable,
} from "react-native";
import { useRouter } from "expo-router";
import { useUser } from "@clerk/clerk-expo";
import { useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { detectLocation } from "@/lib/location/detectLocation";
import { safeHaptics } from "@/lib/haptics/safeHaptics";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from "react-native-reanimated";

import {
  GlassScreen,
  GlassCard,
  GlassButton,
  colors,
  typography,
  spacing,
  borderRadius,
  animations,
} from "@/components/ui/glass";

// Cuisine options with emojis
const CUISINES = [
  { id: "british", name: "British", emoji: "🇬🇧" },
  { id: "nigerian", name: "Nigerian", emoji: "🇳🇬" },
  { id: "indian", name: "Indian", emoji: "🇮🇳" },
  { id: "chinese", name: "Chinese", emoji: "🇨🇳" },
  { id: "italian", name: "Italian", emoji: "🇮🇹" },
  { id: "pakistani", name: "Pakistani", emoji: "🇵🇰" },
  { id: "caribbean", name: "Caribbean", emoji: "🇯🇲" },
  { id: "mexican", name: "Mexican", emoji: "🇲🇽" },
  { id: "middle-eastern", name: "Middle Eastern", emoji: "🇦🇪" },
  { id: "japanese", name: "Japanese", emoji: "🇯🇵" },
  { id: "korean", name: "Korean", emoji: "🇰🇷" },
  { id: "thai", name: "Thai", emoji: "🇹🇭" },
  { id: "vietnamese", name: "Vietnamese", emoji: "🇻🇳" },
  { id: "ethiopian", name: "Ethiopian", emoji: "🇪🇹" },
];

const DIETARY_RESTRICTIONS = [
  { id: "vegan", name: "Vegan", icon: "leaf" },
  { id: "vegetarian", name: "Vegetarian", icon: "carrot" },
  { id: "gluten-free", name: "Gluten-Free", icon: "wheat-off" },
  { id: "dairy-free", name: "Dairy-Free", icon: "cow-off" },
  { id: "halal", name: "Halal", icon: "star-crescent" },
  { id: "keto", name: "Keto", icon: "fire" },
  { id: "paleo", name: "Paleo", icon: "bone" },
];

export default function CuisineSelectionScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { user: clerkUser } = useUser();
  const getOrCreateUser = useMutation(api.users.getOrCreate);
  const setOnboardingData = useMutation(api.users.setOnboardingData);

  const [isDetecting, setIsDetecting] = useState(true);
  const [country, setCountry] = useState("");
  const [countryCode, setCountryCode] = useState("");
  const [currency, setCurrency] = useState("");
  const [selectedCuisines, setSelectedCuisines] = useState<string[]>([]);
  const [selectedDietary, setSelectedDietary] = useState<string[]>([]);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    initializeUser();
  }, []);

  async function initializeUser() {
    setIsDetecting(true);

    try {
      await getOrCreateUser({});
    } catch (error) {
      console.error("Failed to create user:", error);
    }

    const location = await detectLocation();
    setCountry(location.country);
    setCountryCode(location.countryCode);
    setCurrency(location.currency);
    setIsDetecting(false);
  }

  function toggleCuisine(cuisineId: string) {
    safeHaptics.light();

    setSelectedCuisines((prev) => {
      if (prev.includes(cuisineId)) {
        return prev.filter((id) => id !== cuisineId);
      }
      return [...prev, cuisineId];
    });
  }

  function toggleDietary(dietaryId: string) {
    safeHaptics.light();

    setSelectedDietary((prev) => {
      if (prev.includes(dietaryId)) {
        return prev.filter((id) => id !== dietaryId);
      }
      return [...prev, dietaryId];
    });
  }

  async function handleContinue() {
    if (selectedCuisines.length === 0) {
      safeHaptics.warning();
      return;
    }

    setIsSaving(true);

    try {
      // Use Clerk name if available, otherwise fallback to email prefix or "Shopper"
      const fallbackName = clerkUser?.primaryEmailAddress?.emailAddress?.split("@")[0] || "Shopper";
      const displayName = clerkUser?.firstName || clerkUser?.fullName || fallbackName;

      await setOnboardingData({
        name: displayName,
        country,
        cuisinePreferences: selectedCuisines,
        dietaryRestrictions: selectedDietary,
      });

      safeHaptics.success();
      router.push({
        pathname: "/onboarding/store-selection",
        params: {
          country,
          cuisines: selectedCuisines.join(","),
        },
      });
    } catch (error) {
      console.error("Failed to save onboarding data:", error);
      safeHaptics.error();
    } finally {
      setIsSaving(false);
    }
  }

  // Loading state
  if (isDetecting) {
    return (
      <GlassScreen>
        <View style={styles.loadingContainer}>
          <View style={styles.loadingIconContainer}>
            <MaterialCommunityIcons
              name="map-marker"
              size={48}
              color={colors.accent.primary}
            />
          </View>
          <ActivityIndicator size="large" color={colors.accent.primary} style={styles.spinner} />
          <Text style={styles.loadingText}>Detecting your location...</Text>
        </View>
      </GlassScreen>
    );
  }

  const PINNED_BUTTON_HEIGHT = 64 + spacing.md * 2; // button + vertical padding

  return (
    <GlassScreen>
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={[
          styles.content,
          {
            paddingTop: insets.top + spacing.lg,
            paddingBottom: PINNED_BUTTON_HEIGHT + insets.bottom + spacing.md,
          },
        ]}
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <Text style={styles.title}>Where are you cooking?</Text>

        {/* Location Card */}
        <GlassCard variant="bordered" accentColor={colors.accent.primary} style={styles.locationCard}>
          <View style={styles.locationRow}>
            <View style={styles.locationIconContainer}>
              <MaterialCommunityIcons
                name="map-marker"
                size={32}
                color={colors.accent.primary}
              />
            </View>
            <View style={styles.locationInfo}>
              <Text style={styles.locationText}>You&apos;re in {country}</Text>
              <Text style={styles.currencyText}>Prices shown in {currency}</Text>
            </View>
          </View>
        </GlassCard>

        {/* Section Header */}
        <View style={styles.sectionHeader}>
          <Text style={styles.subtitle}>What cuisines do you cook?</Text>
          <Text style={styles.description}>
            Select all that apply - we&apos;ll seed your stock with items you&apos;ll actually use
          </Text>
        </View>

        {/* Cuisine Grid */}
        <View style={styles.cuisineGrid}>
          {CUISINES.map((cuisine) => (
            <CuisineButton
              key={cuisine.id}
              cuisine={cuisine}
              isSelected={selectedCuisines.includes(cuisine.id)}
              onToggle={() => toggleCuisine(cuisine.id)}
            />
          ))}
        </View>

        {/* Dietary Restrictions */}
        <View style={styles.sectionHeader}>
          <Text style={styles.subtitle}>Any dietary preferences?</Text>
          <Text style={styles.description}>
            We&apos;ll use this to suggest healthier, suitable alternatives (optional)
          </Text>
        </View>

        <View style={styles.dietaryGrid}>
          {DIETARY_RESTRICTIONS.map((diet) => (
            <DietaryButton
              key={diet.id}
              diet={diet}
              isSelected={selectedDietary.includes(diet.id)}
              onToggle={() => toggleDietary(diet.id)}
            />
          ))}
        </View>
      </ScrollView>

      {/* Pinned Continue Button */}
      <View style={[styles.pinnedButtonContainer, { paddingBottom: insets.bottom + spacing.sm }]}>
        <GlassButton
          variant="primary"
          size="lg"
          icon="arrow-right"
          onPress={handleContinue}
          loading={isSaving}
          disabled={selectedCuisines.length === 0 || isSaving}
        >
          {`Continue (${selectedCuisines.length} selected)`}
        </GlassButton>
      </View>
    </GlassScreen>
  );
}

// =============================================================================
// SUB-COMPONENTS
// =============================================================================

interface CuisineButtonProps {
  cuisine: { id: string; name: string; emoji: string };
  isSelected: boolean;
  onToggle: () => void;
}

function CuisineButton({ cuisine, isSelected, onToggle }: CuisineButtonProps) {
  const scale = useSharedValue(1);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const handlePressIn = () => {
    scale.value = withSpring(0.95, animations.spring.stiff);
  };

  const handlePressOut = () => {
    scale.value = withSpring(1, animations.spring.gentle);
  };

  return (
    <Animated.View style={[styles.cuisineButtonWrapper, animatedStyle]}>
      <Pressable
        onPress={onToggle}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
      >
        <GlassCard
          variant={isSelected ? "bordered" : "standard"}
          accentColor={isSelected ? colors.accent.primary : undefined}
          style={[styles.cuisineButton, isSelected && styles.cuisineButtonSelected]}
        >
          <Text style={styles.cuisineEmoji}>{cuisine.emoji}</Text>
          <Text
            style={[
              styles.cuisineName,
              isSelected && styles.cuisineNameSelected,
            ]}
          >
            {cuisine.name}
          </Text>
          {isSelected && (
            <View style={styles.checkmark}>
              <MaterialCommunityIcons
                name="check"
                size={14}
                color={colors.text.primary}
              />
            </View>
          )}
        </GlassCard>
      </Pressable>
    </Animated.View>
  );
}

interface DietaryButtonProps {
  diet: { id: string; name: string; icon: string };
  isSelected: boolean;
  onToggle: () => void;
}

function DietaryButton({ diet, isSelected, onToggle }: DietaryButtonProps) {
  const scale = useSharedValue(1);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  return (
    <Animated.View style={[styles.dietaryButtonWrapper, animatedStyle]}>
      <Pressable
        onPress={onToggle}
        onPressIn={() => (scale.value = withSpring(0.95))}
        onPressOut={() => (scale.value = withSpring(1))}
      >
        <GlassCard
          variant={isSelected ? "bordered" : "standard"}
          accentColor={isSelected ? colors.accent.success : undefined}
          style={[styles.dietaryButton, isSelected && styles.dietaryButtonSelected]}
        >
          <MaterialCommunityIcons 
            name={diet.icon as const} 
            size={24} 
            color={isSelected ? colors.accent.success : colors.text.secondary} 
          />
          <Text
            style={[
              styles.dietaryName,
              isSelected && styles.dietaryNameSelected,
            ]}
          >
            {diet.name}
          </Text>
        </GlassCard>
      </Pressable>
    </Animated.View>
  );
}

// =============================================================================
// STYLES
// =============================================================================

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: spacing.xl,
  },
  loadingIconContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: `${colors.accent.primary}20`,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: spacing.lg,
  },
  spinner: {
    marginTop: spacing.md,
  },
  loadingText: {
    ...typography.bodyLarge,
    color: colors.text.secondary,
    marginTop: spacing.md,
  },
  scrollView: {
    flex: 1,
  },
  content: {
    paddingHorizontal: spacing.lg,
  },
  title: {
    ...typography.displaySmall,
    color: colors.text.primary,
    marginBottom: spacing.lg,
  },
  locationCard: {
    marginBottom: spacing.xl,
  },
  locationRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
  },
  locationIconContainer: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: `${colors.accent.primary}20`,
    justifyContent: "center",
    alignItems: "center",
  },
  locationInfo: {
    flex: 1,
  },
  locationText: {
    ...typography.headlineSmall,
    color: colors.text.primary,
    marginBottom: 2,
  },
  currencyText: {
    ...typography.bodyMedium,
    color: colors.text.secondary,
  },
  sectionHeader: {
    marginBottom: spacing.lg,
  },
  subtitle: {
    ...typography.headlineSmall,
    color: colors.text.primary,
    marginBottom: spacing.xs,
  },
  description: {
    ...typography.bodyMedium,
    color: colors.text.secondary,
    lineHeight: 22,
  },
  cuisineGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.sm,
    marginBottom: spacing.xl,
  },
  dietaryGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.sm,
    marginBottom: spacing.xl,
  },
  cuisineButtonWrapper: {
    width: "48%",
    flexGrow: 1,
  },
  dietaryButtonWrapper: {
    width: "31%",
    flexGrow: 1,
  },
  cuisineButton: {
    alignItems: "center",
    paddingVertical: spacing.md,
    position: "relative",
  },
  dietaryButton: {
    alignItems: "center",
    paddingVertical: spacing.sm,
    gap: spacing.xs,
  },
  cuisineButtonSelected: {
    backgroundColor: `${colors.accent.primary}10`,
  },
  dietaryButtonSelected: {
    backgroundColor: `${colors.accent.success}10`,
  },
  cuisineEmoji: {
    fontSize: 32,
    marginBottom: spacing.xs,
  },
  cuisineName: {
    ...typography.bodyMedium,
    color: colors.text.primary,
    fontWeight: "600",
    textAlign: "center",
  },
  dietaryName: {
    ...typography.labelSmall,
    color: colors.text.primary,
    textAlign: "center",
  },
  cuisineNameSelected: {
    color: colors.accent.primary,
  },
  dietaryNameSelected: {
    color: colors.accent.success,
    fontWeight: "700",
  },
  checkmark: {
    position: "absolute",
    top: spacing.sm,
    right: spacing.sm,
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: colors.accent.primary,
    alignItems: "center",
    justifyContent: "center",
  },
  pinnedButtonContainer: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
    backgroundColor: "rgba(13, 21, 40, 0.95)",
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: "rgba(255,255,255,0.08)",
  },
});
