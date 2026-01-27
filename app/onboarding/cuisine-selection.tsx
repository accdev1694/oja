import { useState, useEffect } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
} from "react-native";
import { useRouter } from "expo-router";
import { useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { detectLocation, SUPPORTED_COUNTRIES } from "@/lib/location/detectLocation";
import { safeHaptics } from "@/lib/utils/safeHaptics";

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

export default function CuisineSelectionScreen() {
  const router = useRouter();
  const setOnboardingData = useMutation(api.users.setOnboardingData);

  const [isDetecting, setIsDetecting] = useState(true);
  const [country, setCountry] = useState("");
  const [countryCode, setCountryCode] = useState("");
  const [currency, setCurrency] = useState("");
  const [selectedCuisines, setSelectedCuisines] = useState<string[]>([]);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    detectUserLocation();
  }, []);

  async function detectUserLocation() {
    setIsDetecting(true);
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

  async function handleContinue() {
    if (selectedCuisines.length === 0) {
      safeHaptics.warning();
      return;
    }

    setIsSaving(true);

    try {
      await setOnboardingData({
        name: "User", // Will be updated in next onboarding step
        country,
        cuisinePreferences: selectedCuisines,
      });

      safeHaptics.success();
      router.push({
        pathname: "/onboarding/pantry-seeding",
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

  if (isDetecting) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#FF6B35" />
        <Text style={styles.loadingText}>Detecting your location...</Text>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.title}>Where are you cooking?</Text>
      
      <View style={styles.locationCard}>
        <Text style={styles.locationEmoji}>📍</Text>
        <Text style={styles.locationText}>
          You're in {country}
        </Text>
        <Text style={styles.currencyText}>
          Prices shown in {currency}
        </Text>
      </View>

      <Text style={styles.subtitle}>
        What cuisines do you cook?
      </Text>
      <Text style={styles.description}>
        Select all that apply - we'll seed your pantry with ingredients you'll actually use
      </Text>

      <View style={styles.cuisineGrid}>
        {CUISINES.map((cuisine) => {
          const isSelected = selectedCuisines.includes(cuisine.id);
          
          return (
            <TouchableOpacity
              key={cuisine.id}
              style={[
                styles.cuisineButton,
                isSelected && styles.cuisineButtonSelected,
              ]}
              onPress={() => toggleCuisine(cuisine.id)}
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
                  <Text style={styles.checkmarkText}>✓</Text>
                </View>
              )}
            </TouchableOpacity>
          );
        })}
      </View>

      <TouchableOpacity
        style={[
          styles.continueButton,
          (selectedCuisines.length === 0 || isSaving) && styles.continueButtonDisabled,
        ]}
        onPress={handleContinue}
        disabled={selectedCuisines.length === 0 || isSaving}
      >
        {isSaving ? (
          <ActivityIndicator color="#fff" />
        ) : (
          <Text style={styles.continueButtonText}>
            Continue ({selectedCuisines.length} selected)
          </Text>
        )}
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#FFFAF8",
  },
  content: {
    padding: 24,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#FFFAF8",
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: "#636E72",
  },
  title: {
    fontSize: 32,
    fontWeight: "700",
    color: "#2D3436",
    marginBottom: 16,
  },
  locationCard: {
    backgroundColor: "#fff",
    borderRadius: 16,
    padding: 20,
    marginBottom: 32,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#E5E7EB",
  },
  locationEmoji: {
    fontSize: 48,
    marginBottom: 12,
  },
  locationText: {
    fontSize: 18,
    fontWeight: "600",
    color: "#2D3436",
    marginBottom: 4,
  },
  currencyText: {
    fontSize: 14,
    color: "#636E72",
  },
  subtitle: {
    fontSize: 20,
    fontWeight: "600",
    color: "#2D3436",
    marginBottom: 8,
  },
  description: {
    fontSize: 14,
    color: "#636E72",
    marginBottom: 24,
    lineHeight: 20,
  },
  cuisineGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 12,
    marginBottom: 32,
  },
  cuisineButton: {
    width: "47%",
    backgroundColor: "#fff",
    borderRadius: 12,
    padding: 16,
    alignItems: "center",
    borderWidth: 2,
    borderColor: "#E5E7EB",
    position: "relative",
  },
  cuisineButtonSelected: {
    borderColor: "#FF6B35",
    backgroundColor: "#FFF5F2",
  },
  cuisineEmoji: {
    fontSize: 32,
    marginBottom: 8,
  },
  cuisineName: {
    fontSize: 14,
    fontWeight: "600",
    color: "#2D3436",
    textAlign: "center",
  },
  cuisineNameSelected: {
    color: "#FF6B35",
  },
  checkmark: {
    position: "absolute",
    top: 8,
    right: 8,
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: "#FF6B35",
    alignItems: "center",
    justifyContent: "center",
  },
  checkmarkText: {
    color: "#fff",
    fontSize: 14,
    fontWeight: "700",
  },
  continueButton: {
    backgroundColor: "#FF6B35",
    borderRadius: 12,
    padding: 16,
    alignItems: "center",
    marginBottom: 32,
  },
  continueButtonDisabled: {
    opacity: 0.5,
  },
  continueButtonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "600",
  },
});
