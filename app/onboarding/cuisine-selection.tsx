import { useState, useEffect, useMemo } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  Pressable,
  TextInput,
} from "react-native";
import { useRouter } from "expo-router";
import { useUser } from "@clerk/clerk-expo";
import { useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { detectLocation } from "@/lib/location/detectLocation";
import { safeHaptics } from "@/lib/haptics/safeHaptics";
import { isGenericName } from "@/lib/names";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import {
  GlassScreen,
  GlassCard,
  GlassButton,
  colors,
  typography,
  spacing,
} from "@/components/ui/glass";
import { useCurrentUser } from "@/hooks/useCurrentUser";
import { CUISINES, DIETARY_RESTRICTIONS } from "./cuisineData";
import { CuisineButton } from "./components/CuisineButton";
import { DietaryButton } from "./components/DietaryButton";
import { OtherCuisineTile, OtherCuisineInput } from "./components/OtherCuisineField";

export default function CuisineSelectionScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { user: clerkUser } = useUser();
  const { user: convexUser, firstName: convexFirstName } = useCurrentUser();
  const getOrCreateUser = useMutation(api.users.getOrCreate);
  const setOnboardingData = useMutation(api.users.setOnboardingData);

  const [isDetecting, setIsDetecting] = useState(true);
  const [country, setCountry] = useState("");
  const [countryCode, setCountryCode] = useState("");
  const [currency, setCurrency] = useState("");
  const [selectedCuisines, setSelectedCuisines] = useState<string[]>([]);
  const [selectedDietary, setSelectedDietary] = useState<string[]>([]);
  const [isSaving, setIsSaving] = useState(false);
  const [postcodePrefix, setPostcodePrefix] = useState("");
  const [isEditingPostcode, setIsEditingPostcode] = useState(false);
  const [otherSelected, setOtherSelected] = useState(false);
  const [otherText, setOtherText] = useState("");

  // Combine predefined selections with free-text "Other" value
  const effectiveCuisines = useMemo(() => {
    const cuisines = [...selectedCuisines];
    if (otherSelected && otherText.trim()) {
      cuisines.push(otherText.trim());
    }
    return cuisines;
  }, [selectedCuisines, otherSelected, otherText]);

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
    if (location.postcodePrefix) {
      setPostcodePrefix(location.postcodePrefix);
    }
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

  function toggleOther() {
    safeHaptics.light();
    setOtherSelected((prev) => !prev);
  }

  async function handleContinue() {
    if (effectiveCuisines.length === 0) {
      safeHaptics.warning();
      return;
    }

    setIsSaving(true);

    try {
      const convexName = convexUser?.name && !isGenericName(convexUser.name) ? convexUser.name : undefined;
      const fallbackName = clerkUser?.primaryEmailAddress?.emailAddress?.split("@")[0] || "Shopper";
      const displayName = convexName || clerkUser?.firstName || clerkUser?.fullName || fallbackName;

      await setOnboardingData({
        name: displayName,
        country,
        cuisinePreferences: effectiveCuisines,
        dietaryRestrictions: selectedDietary,
        postcodePrefix: postcodePrefix || undefined,
      });

      safeHaptics.success();
      router.push({
        pathname: "/onboarding/store-selection",
        params: {
          country,
          cuisines: effectiveCuisines.join(","),
        },
      });
    } catch (error) {
      console.error("Failed to save onboarding data:", error);
      safeHaptics.error();
    } finally {
      setIsSaving(false);
    }
  }

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

  const PINNED_BUTTON_HEIGHT = 64 + spacing.md * 2;

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
        <Text style={styles.title}>
          {convexFirstName ? `${convexFirstName}, where are you cooking?` : "Where are you cooking?"}
        </Text>

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
          <View style={styles.postcodeRow}>
            <MaterialCommunityIcons
              name="map-marker-radius"
              size={18}
              color={colors.text.secondary}
            />
            {isEditingPostcode ? (
              <TextInput
                style={styles.postcodeInput}
                value={postcodePrefix}
                onChangeText={(text) => setPostcodePrefix(text.toUpperCase().slice(0, 5))}
                onBlur={() => setIsEditingPostcode(false)}
                onSubmitEditing={() => setIsEditingPostcode(false)}
                placeholder="e.g. CV12"
                placeholderTextColor={colors.text.disabled}
                autoCapitalize="characters"
                maxLength={5}
                autoFocus
              />
            ) : (
              <Pressable
                onPress={() => { safeHaptics.light(); setIsEditingPostcode(true); }}
                style={styles.postcodeDisplay}
              >
                <Text style={styles.postcodeText}>
                  {postcodePrefix ? `Price area: ${postcodePrefix}` : "Set your area for local prices"}
                </Text>
                <MaterialCommunityIcons
                  name="pencil"
                  size={14}
                  color={colors.accent.primary}
                />
              </Pressable>
            )}
          </View>
        </GlassCard>

        {/* Section Header */}
        <View style={styles.sectionHeader}>
          <Text style={styles.subtitle}>What cuisines do you cook?</Text>
          <Text style={styles.description}>
            Select all that apply - we&apos;ll seed your stock with items you&apos;ll actually use
          </Text>
        </View>

        {/* Cuisine Grid (3-column) */}
        <View style={styles.cuisineGrid}>
          {CUISINES.map((cuisine) => (
            <CuisineButton
              key={cuisine.id}
              cuisine={cuisine}
              isSelected={selectedCuisines.includes(cuisine.id)}
              onToggle={() => toggleCuisine(cuisine.id)}
            />
          ))}
          <OtherCuisineTile isSelected={otherSelected} onToggle={toggleOther} />
        </View>

        {/* Other cuisine text input (shown when Other is selected) */}
        {otherSelected && (
          <OtherCuisineInput text={otherText} onChangeText={setOtherText} />
        )}

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
          disabled={effectiveCuisines.length === 0 || isSaving}
        >
          {`Continue (${effectiveCuisines.length} selected)`}
        </GlassButton>
      </View>
    </GlassScreen>
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
  postcodeRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    marginTop: spacing.sm,
    paddingTop: spacing.sm,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: "rgba(255,255,255,0.08)",
  },
  postcodeDisplay: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.xs,
    flex: 1,
  },
  postcodeText: {
    ...typography.bodySmall,
    color: colors.text.secondary,
  },
  postcodeInput: {
    ...typography.bodySmall,
    color: colors.text.primary,
    flex: 1,
    padding: 0,
    borderBottomWidth: 1,
    borderBottomColor: colors.accent.primary,
    paddingBottom: 2,
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
