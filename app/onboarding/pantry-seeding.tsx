import { useState, useEffect } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
} from "react-native";
import { useRouter, useLocalSearchParams } from "expo-router";
import { useAction } from "convex/react";
import { api } from "@/convex/_generated/api";
import type { SeedItem } from "@/convex/ai";
import { safeHaptics } from "@/lib/utils/safeHaptics";

export default function PantrySeedingScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ country?: string; cuisines?: string }>();

  const generateItems = useAction(api.ai.generateHybridSeedItems);

  const [isGenerating, setIsGenerating] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [seedItems, setSeedItems] = useState<SeedItem[]>([]);

  useEffect(() => {
    generateSeedItems();
  }, []);

  async function generateSeedItems() {
    setIsGenerating(true);
    setError(null);

    try {
      // Parse cuisines from URL params
      const country = params.country || "United Kingdom";
      const cuisines = params.cuisines ? params.cuisines.split(",") : ["british"];

      const items = await generateItems({ country, cuisines });

      setSeedItems(items);
      safeHaptics.success();

      // Navigate to review screen with generated items
      // For now, we'll navigate to a placeholder
      setTimeout(() => {
        router.push({
          pathname: "/onboarding/review-items",
          params: { items: JSON.stringify(items) },
        });
      }, 1000);
    } catch (err) {
      console.error("Failed to generate items:", err);
      setError("Failed to generate your pantry. Please try again.");
      safeHaptics.error();
    } finally {
      setIsGenerating(false);
    }
  }

  async function handleSkip() {
    safeHaptics.light();
    // Navigate to main app with empty pantry
    router.replace("/(app)/(tabs)");
  }

  if (isGenerating) {
    return (
      <View style={styles.container}>
        <View style={styles.loadingAnimation}>
          <Text style={styles.emoji}>🛒</Text>
          <ActivityIndicator size="large" color="#FF6B35" style={styles.spinner} />
        </View>
        <Text style={styles.loadingTitle}>Generating your personalized pantry...</Text>
        <Text style={styles.loadingSubtitle}>
          Creating 200 items based on your location and cuisine preferences
        </Text>
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.container}>
        <Text style={styles.errorEmoji}>😕</Text>
        <Text style={styles.errorTitle}>Oops!</Text>
        <Text style={styles.errorMessage}>{error}</Text>

        <TouchableOpacity
          style={styles.retryButton}
          onPress={generateSeedItems}
        >
          <Text style={styles.retryButtonText}>Try Again</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.skipButton}
          onPress={handleSkip}
        >
          <Text style={styles.skipButtonText}>Skip & Start Empty</Text>
        </TouchableOpacity>
      </View>
    );
  }

  // Success state (shown briefly before navigation)
  return (
    <View style={styles.container}>
      <Text style={styles.successEmoji}>✨</Text>
      <Text style={styles.successTitle}>Pantry Generated!</Text>
      <Text style={styles.successSubtitle}>
        {seedItems.length} items ready for review
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#FFFAF8",
    justifyContent: "center",
    alignItems: "center",
    padding: 24,
  },
  loadingAnimation: {
    position: "relative",
    marginBottom: 32,
    alignItems: "center",
    justifyContent: "center",
  },
  emoji: {
    fontSize: 80,
  },
  spinner: {
    position: "absolute",
    top: "50%",
    left: "50%",
    marginTop: -20,
    marginLeft: -20,
  },
  loadingTitle: {
    fontSize: 24,
    fontWeight: "700",
    color: "#2D3436",
    marginBottom: 12,
    textAlign: "center",
  },
  loadingSubtitle: {
    fontSize: 16,
    color: "#636E72",
    textAlign: "center",
    paddingHorizontal: 32,
  },
  errorEmoji: {
    fontSize: 80,
    marginBottom: 24,
  },
  errorTitle: {
    fontSize: 28,
    fontWeight: "700",
    color: "#2D3436",
    marginBottom: 12,
  },
  errorMessage: {
    fontSize: 16,
    color: "#636E72",
    textAlign: "center",
    marginBottom: 32,
    paddingHorizontal: 32,
  },
  retryButton: {
    backgroundColor: "#FF6B35",
    borderRadius: 12,
    padding: 16,
    width: "100%",
    alignItems: "center",
    marginBottom: 12,
  },
  retryButtonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "600",
  },
  skipButton: {
    padding: 16,
    width: "100%",
    alignItems: "center",
  },
  skipButtonText: {
    color: "#636E72",
    fontSize: 16,
    fontWeight: "600",
  },
  successEmoji: {
    fontSize: 80,
    marginBottom: 24,
  },
  successTitle: {
    fontSize: 28,
    fontWeight: "700",
    color: "#2D3436",
    marginBottom: 12,
  },
  successSubtitle: {
    fontSize: 16,
    color: "#636E72",
  },
});
