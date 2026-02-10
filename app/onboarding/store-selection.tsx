import { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  ActivityIndicator,
} from "react-native";
import { useRouter, useLocalSearchParams } from "expo-router";
import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { safeHaptics } from "@/lib/utils/safeHaptics";
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
  animations,
} from "@/components/ui/glass";

export default function StoreSelectionScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const params = useLocalSearchParams<{ country?: string; cuisines?: string }>();

  // Fetch all UK stores
  const stores = useQuery(api.stores.getAll);
  const setStorePreferences = useMutation(api.stores.setUserPreferences);

  const [selectedStores, setSelectedStores] = useState<string[]>([]);
  const [isSaving, setIsSaving] = useState(false);

  function toggleStore(storeId: string) {
    safeHaptics.light();

    setSelectedStores((prev) => {
      if (prev.includes(storeId)) {
        return prev.filter((id) => id !== storeId);
      }
      return [...prev, storeId];
    });
  }

  async function handleContinue() {
    if (selectedStores.length === 0) {
      safeHaptics.warning();
      return;
    }

    setIsSaving(true);

    try {
      await setStorePreferences({
        favorites: selectedStores,
      });

      safeHaptics.success();
      router.push({
        pathname: "/onboarding/pantry-seeding",
        params: {
          country: params.country || "United Kingdom",
          cuisines: params.cuisines || "british",
        },
      });
    } catch (error) {
      console.error("Failed to save store preferences:", error);
      safeHaptics.error();
    } finally {
      setIsSaving(false);
    }
  }

  function handleSkip() {
    safeHaptics.light();
    router.push({
      pathname: "/onboarding/pantry-seeding",
      params: {
        country: params.country || "United Kingdom",
        cuisines: params.cuisines || "british",
      },
    });
  }

  // Loading state
  if (!stores) {
    return (
      <GlassScreen>
        <View style={styles.loadingContainer}>
          <View style={styles.loadingIconContainer}>
            <MaterialCommunityIcons
              name="store"
              size={48}
              color={colors.accent.primary}
            />
          </View>
          <ActivityIndicator size="large" color={colors.accent.primary} style={styles.spinner} />
          <Text style={styles.loadingText}>Loading stores...</Text>
        </View>
      </GlassScreen>
    );
  }

  return (
    <GlassScreen>
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={[
          styles.content,
          { paddingTop: insets.top + spacing.lg, paddingBottom: insets.bottom + spacing.lg },
        ]}
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <Text style={styles.title}>Where do you usually shop?</Text>

        {/* Section Header */}
        <View style={styles.sectionHeader}>
          <Text style={styles.description}>
            Select your favorite stores - we'll track prices and show you the best deals
          </Text>
        </View>

        {/* Store Grid */}
        <View style={styles.storeGrid}>
          {stores.map((store) => (
            <StoreButton
              key={store.id}
              store={store}
              isSelected={selectedStores.includes(store.id)}
              onToggle={() => toggleStore(store.id)}
            />
          ))}
        </View>

        {/* Continue Button */}
        <View style={styles.buttonContainer}>
          <GlassButton
            variant="primary"
            size="lg"
            icon="arrow-right"
            onPress={handleContinue}
            loading={isSaving}
            disabled={selectedStores.length === 0 || isSaving}
          >
            {selectedStores.length === 0
              ? "Select at least one store"
              : `Continue (${selectedStores.length} selected)`}
          </GlassButton>

          <GlassButton
            variant="ghost"
            size="md"
            onPress={handleSkip}
            disabled={isSaving}
          >
            Skip for now
          </GlassButton>
        </View>
      </ScrollView>
    </GlassScreen>
  );
}

// =============================================================================
// STORE BUTTON COMPONENT
// =============================================================================

interface StoreInfo {
  id: string;
  displayName: string;
  color: string;
  type: string;
  marketShare: number;
}

interface StoreButtonProps {
  store: StoreInfo;
  isSelected: boolean;
  onToggle: () => void;
}

function StoreButton({ store, isSelected, onToggle }: StoreButtonProps) {
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

  // Determine accent color based on selection
  const accentColor = isSelected ? store.color : undefined;

  return (
    <Animated.View style={[styles.storeButtonWrapper, animatedStyle]}>
      <Pressable
        onPress={onToggle}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
      >
        <GlassCard
          variant={isSelected ? "bordered" : "standard"}
          accentColor={accentColor}
          style={[styles.storeButton, isSelected && styles.storeButtonSelected]}
        >
          {/* Brand Color Chip */}
          <View style={[styles.colorChip, { backgroundColor: store.color }]} />

          {/* Store Name */}
          <Text
            style={[
              styles.storeName,
              isSelected && { color: store.color },
            ]}
            numberOfLines={1}
          >
            {store.displayName}
          </Text>

          {/* Store Type Badge */}
          <Text style={styles.storeType}>{store.type}</Text>

          {/* Checkmark */}
          {isSelected && (
            <View style={[styles.checkmark, { backgroundColor: store.color }]}>
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
    marginBottom: spacing.md,
  },
  sectionHeader: {
    marginBottom: spacing.lg,
  },
  description: {
    ...typography.bodyMedium,
    color: colors.text.secondary,
    lineHeight: 22,
  },
  storeGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.sm,
    marginBottom: spacing.xl,
  },
  storeButtonWrapper: {
    width: "48%",
    flexGrow: 1,
  },
  storeButton: {
    alignItems: "center",
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.sm,
    position: "relative",
    minHeight: 100,
    justifyContent: "center",
  },
  storeButtonSelected: {
    backgroundColor: `${colors.glass.backgroundStrong}`,
  },
  colorChip: {
    width: 40,
    height: 8,
    borderRadius: 4,
    marginBottom: spacing.sm,
  },
  storeName: {
    ...typography.bodyMedium,
    color: colors.text.primary,
    fontWeight: "600",
    textAlign: "center",
    marginBottom: 4,
  },
  storeType: {
    ...typography.labelSmall,
    color: colors.text.tertiary,
    textTransform: "capitalize",
  },
  checkmark: {
    position: "absolute",
    top: spacing.sm,
    right: spacing.sm,
    width: 24,
    height: 24,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  buttonContainer: {
    marginBottom: spacing.lg,
    gap: spacing.sm,
  },
});
