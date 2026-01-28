import {
  View,
  Text,
  StyleSheet,
  Alert,
  ActivityIndicator,
  Image,
} from "react-native";
import { useState } from "react";
import * as ImagePicker from "expo-image-picker";
import * as Haptics from "expo-haptics";
import { useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { useRouter } from "expo-router";
import { MaterialCommunityIcons } from "@expo/vector-icons";

import {
  GlassScreen,
  GlassCard,
  GlassButton,
  SimpleHeader,
  colors,
  typography,
  spacing,
  borderRadius,
} from "@/components/ui/glass";

export default function ScanScreen() {
  const router = useRouter();
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);

  const generateUploadUrl = useMutation(api.receipts.generateUploadUrl);
  const createReceipt = useMutation(api.receipts.create);

  async function handleTakePhoto() {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    try {
      const { status } = await ImagePicker.requestCameraPermissionsAsync();

      if (status !== "granted") {
        Alert.alert("Permission Required", "Camera access is needed to scan receipts");
        return;
      }

      const result = await ImagePicker.launchCameraAsync({
        mediaTypes: "images" as any,
        allowsEditing: true,
        quality: 0.8,
        aspect: [3, 4],
      });

      if (!result.canceled && result.assets[0]) {
        setSelectedImage(result.assets[0].uri);
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      }
    } catch (error) {
      console.error("Camera error:", error);
      Alert.alert("Error", "Failed to open camera");
    }
  }

  async function handlePickImage() {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    try {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();

      if (status !== "granted") {
        Alert.alert("Permission Required", "Photo library access is needed to select receipts");
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: "images" as any,
        allowsEditing: true,
        quality: 0.8,
        aspect: [3, 4],
      });

      if (!result.canceled && result.assets[0]) {
        setSelectedImage(result.assets[0].uri);
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      }
    } catch (error) {
      console.error("Image picker error:", error);
      Alert.alert("Error", "Failed to select image");
    }
  }

  async function handleUploadReceipt() {
    if (!selectedImage) {
      Alert.alert("Error", "No image selected");
      return;
    }

    setIsUploading(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

    try {
      const uploadUrl = await generateUploadUrl();

      const response = await fetch(selectedImage);
      const blob = await response.blob();

      const uploadResponse = await fetch(uploadUrl, {
        method: "POST",
        headers: {
          "Content-Type": blob.type,
        },
        body: blob,
      });

      if (!uploadResponse.ok) {
        throw new Error("Upload failed");
      }

      const { storageId } = await uploadResponse.json();

      const receiptId = await createReceipt({
        imageStorageId: storageId,
      });

      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

      Alert.alert("Receipt Uploaded", "Your receipt is being processed", [
        {
          text: "OK",
          onPress: () => {
            setSelectedImage(null);
          },
        },
      ]);
    } catch (error) {
      console.error("Upload error:", error);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      Alert.alert("Error", "Failed to upload receipt");
    } finally {
      setIsUploading(false);
    }
  }

  function handleRetake() {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setSelectedImage(null);
  }

  // Preview mode - showing selected image
  if (selectedImage) {
    return (
      <GlassScreen>
        <SimpleHeader title="Review Receipt" subtitle="Make sure the receipt is clear" />

        <View style={styles.previewContent}>
          <GlassCard variant="bordered" accentColor={colors.semantic.scan} style={styles.imageCard}>
            <Image
              source={{ uri: selectedImage }}
              style={styles.previewImage}
              resizeMode="contain"
            />
          </GlassCard>

          <View style={styles.previewActions}>
            <GlassButton
              variant="secondary"
              size="lg"
              icon="camera-retake"
              onPress={handleRetake}
              disabled={isUploading}
              style={styles.actionButton}
            >
              Retake
            </GlassButton>

            <GlassButton
              variant="primary"
              size="lg"
              icon="check"
              onPress={handleUploadReceipt}
              loading={isUploading}
              disabled={isUploading}
              style={styles.actionButton}
            >
              Use Photo
            </GlassButton>
          </View>
        </View>
      </GlassScreen>
    );
  }

  // Main scan screen
  return (
    <GlassScreen>
      <SimpleHeader
        title="Scan Receipt"
        subtitle="Track spending & build price history"
      />

      <View style={styles.content}>
        {/* Receipt Icon */}
        <View style={styles.iconSection}>
          <View style={styles.iconContainer}>
            <MaterialCommunityIcons
              name="receipt"
              size={64}
              color={colors.semantic.scan}
            />
          </View>
        </View>

        {/* Instructions Card */}
        <GlassCard variant="standard" style={styles.instructionsCard}>
          <View style={styles.instructionsHeader}>
            <MaterialCommunityIcons
              name="lightbulb-outline"
              size={20}
              color={colors.accent.primary}
            />
            <Text style={styles.instructionsTitle}>Tips for best results</Text>
          </View>

          <View style={styles.instructionsList}>
            <InstructionItem number={1} text="Lay receipt on a flat surface" />
            <InstructionItem number={2} text="Ensure good lighting" />
            <InstructionItem number={3} text="Capture the entire receipt" />
            <InstructionItem number={4} text="Keep the image sharp and clear" />
          </View>
        </GlassCard>

        {/* Action Buttons */}
        <View style={styles.buttons}>
          <GlassButton
            variant="primary"
            size="lg"
            icon="camera"
            onPress={handleTakePhoto}
          >
            Take Photo
          </GlassButton>

          <GlassButton
            variant="secondary"
            size="lg"
            icon="image-multiple"
            onPress={handlePickImage}
          >
            Choose from Library
          </GlassButton>
        </View>

        {/* Bottom spacing */}
        <View style={styles.bottomSpacer} />
      </View>
    </GlassScreen>
  );
}

// =============================================================================
// INSTRUCTION ITEM COMPONENT
// =============================================================================

interface InstructionItemProps {
  number: number;
  text: string;
}

function InstructionItem({ number, text }: InstructionItemProps) {
  return (
    <View style={styles.instructionItem}>
      <View style={styles.instructionNumber}>
        <Text style={styles.instructionNumberText}>{number}</Text>
      </View>
      <Text style={styles.instructionText}>{text}</Text>
    </View>
  );
}

// =============================================================================
// STYLES
// =============================================================================

const styles = StyleSheet.create({
  content: {
    flex: 1,
    paddingHorizontal: spacing.lg,
  },

  // Icon Section
  iconSection: {
    alignItems: "center",
    paddingVertical: spacing.xl,
  },
  iconContainer: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: `${colors.semantic.scan}20`,
    justifyContent: "center",
    alignItems: "center",
  },

  // Instructions Card
  instructionsCard: {
    marginBottom: spacing.xl,
  },
  instructionsHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.xs,
    marginBottom: spacing.md,
  },
  instructionsTitle: {
    ...typography.labelLarge,
    color: colors.text.primary,
  },
  instructionsList: {
    gap: spacing.sm,
  },
  instructionItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
  },
  instructionNumber: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: colors.glass.backgroundStrong,
    justifyContent: "center",
    alignItems: "center",
  },
  instructionNumberText: {
    ...typography.labelSmall,
    color: colors.text.secondary,
    fontWeight: "600",
  },
  instructionText: {
    ...typography.bodyMedium,
    color: colors.text.secondary,
    flex: 1,
  },

  // Buttons
  buttons: {
    gap: spacing.md,
  },

  // Preview Mode
  previewContent: {
    flex: 1,
    paddingHorizontal: spacing.lg,
  },
  imageCard: {
    flex: 1,
    marginVertical: spacing.md,
    overflow: "hidden",
  },
  previewImage: {
    width: "100%",
    height: "100%",
    borderRadius: borderRadius.md,
  },
  previewActions: {
    flexDirection: "row",
    gap: spacing.md,
    marginBottom: spacing.xl,
  },
  actionButton: {
    flex: 1,
  },

  // Bottom spacing
  bottomSpacer: {
    height: 120,
  },
});
