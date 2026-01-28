import { View, Text, StyleSheet, TouchableOpacity, Platform, Alert, ActivityIndicator, Image } from "react-native";
import { useState } from "react";
import * as ImagePicker from "expo-image-picker";
import { useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { useRouter } from "expo-router";

export default function ScanScreen() {
  const router = useRouter();
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);

  const generateUploadUrl = useMutation(api.receipts.generateUploadUrl);
  const createReceipt = useMutation(api.receipts.create);

  async function handleTakePhoto() {
    try {
      // Request camera permissions
      const { status } = await ImagePicker.requestCameraPermissionsAsync();

      if (status !== "granted") {
        Alert.alert(
          "Permission Required",
          "Camera access is needed to scan receipts"
        );
        return;
      }

      // Launch camera
      const result = await ImagePicker.launchCameraAsync({
        mediaTypes: "images" as any,
        allowsEditing: true,
        quality: 0.8,
        aspect: [3, 4],
      });

      if (!result.canceled && result.assets[0]) {
        setSelectedImage(result.assets[0].uri);
      }
    } catch (error) {
      console.error("Camera error:", error);
      Alert.alert("Error", "Failed to open camera");
    }
  }

  async function handlePickImage() {
    try {
      // Request media library permissions
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();

      if (status !== "granted") {
        Alert.alert(
          "Permission Required",
          "Photo library access is needed to select receipts"
        );
        return;
      }

      // Launch image picker
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: "images" as any,
        allowsEditing: true,
        quality: 0.8,
        aspect: [3, 4],
      });

      if (!result.canceled && result.assets[0]) {
        setSelectedImage(result.assets[0].uri);
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
    try {
      // Get upload URL from Convex
      const uploadUrl = await generateUploadUrl();

      // Upload the image
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

      // Create receipt record
      const receiptId = await createReceipt({
        imageStorageId: storageId,
      });

      Alert.alert(
        "Receipt Uploaded",
        "Your receipt is being processed",
        [
          {
            text: "OK",
            onPress: () => {
              setSelectedImage(null);
              // TODO: Navigate to receipt detail screen
              // router.push(`/receipt/${receiptId}`);
            },
          },
        ]
      );
    } catch (error) {
      console.error("Upload error:", error);
      Alert.alert("Error", "Failed to upload receipt");
    } finally {
      setIsUploading(false);
    }
  }

  function handleRetake() {
    setSelectedImage(null);
  }

  // Preview mode
  if (selectedImage) {
    return (
      <View style={styles.container}>
        <View style={styles.previewHeader}>
          <Text style={styles.previewTitle}>Review Receipt</Text>
        </View>

        <View style={styles.imageContainer}>
          <Image
            source={{ uri: selectedImage }}
            style={styles.previewImage}
            resizeMode="contain"
          />
        </View>

        <View style={styles.previewActions}>
          <TouchableOpacity
            style={[styles.actionButton, styles.retakeButton]}
            onPress={handleRetake}
            disabled={isUploading}
          >
            <Text style={styles.actionButtonText}>Retake</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.actionButton, styles.uploadButton, isUploading && styles.uploadButtonDisabled]}
            onPress={handleUploadReceipt}
            disabled={isUploading}
          >
            {isUploading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={[styles.actionButtonText, styles.uploadButtonText]}>
                Use This Photo
              </Text>
            )}
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  // Main scan screen
  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Scan Receipt</Text>
        <Text style={styles.subtitle}>
          Capture your receipt to track spending and build price history
        </Text>
      </View>

      <View style={styles.content}>
        <View style={styles.iconContainer}>
          <Text style={styles.receiptIcon}>🧾</Text>
        </View>

        <View style={styles.instructions}>
          <Text style={styles.instructionTitle}>How to scan:</Text>
          <Text style={styles.instructionText}>1. Lay receipt on a flat surface</Text>
          <Text style={styles.instructionText}>2. Ensure good lighting</Text>
          <Text style={styles.instructionText}>3. Capture the entire receipt</Text>
          <Text style={styles.instructionText}>4. Keep the image sharp and clear</Text>
        </View>

        <View style={styles.buttons}>
          <TouchableOpacity
            style={[styles.scanButton, styles.cameraButton]}
            onPress={handleTakePhoto}
          >
            <Text style={styles.scanButtonIcon}>📷</Text>
            <Text style={styles.scanButtonText}>Take Photo</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.scanButton, styles.galleryButton]}
            onPress={handlePickImage}
          >
            <Text style={styles.scanButtonIcon}>🖼️</Text>
            <Text style={styles.scanButtonText}>Choose from Library</Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#FFFAF8",
  },
  header: {
    padding: 24,
    paddingTop: 24,
  },
  title: {
    fontSize: 32,
    fontWeight: "700",
    color: "#2D3436",
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: "#636E72",
    lineHeight: 24,
  },
  content: {
    flex: 1,
    padding: 24,
    justifyContent: "center",
  },
  iconContainer: {
    alignItems: "center",
    marginBottom: 32,
  },
  receiptIcon: {
    fontSize: 80,
  },
  instructions: {
    backgroundColor: "#fff",
    borderRadius: 12,
    padding: 20,
    marginBottom: 32,
    borderWidth: 1,
    borderColor: "#E5E7EB",
  },
  instructionTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: "#2D3436",
    marginBottom: 12,
  },
  instructionText: {
    fontSize: 16,
    color: "#636E72",
    marginBottom: 8,
    lineHeight: 24,
  },
  buttons: {
    gap: 16,
  },
  scanButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 16,
    borderRadius: 12,
    borderWidth: 2,
    gap: 12,
  },
  cameraButton: {
    backgroundColor: "#FF6B35",
    borderColor: "#FF6B35",
  },
  galleryButton: {
    backgroundColor: "#fff",
    borderColor: "#E5E7EB",
  },
  scanButtonIcon: {
    fontSize: 24,
  },
  scanButtonText: {
    fontSize: 18,
    fontWeight: "600",
    color: "#fff",
  },
  previewHeader: {
    padding: 24,
    paddingTop: 24,
  },
  previewTitle: {
    fontSize: 24,
    fontWeight: "700",
    color: "#2D3436",
  },
  imageContainer: {
    flex: 1,
    padding: 24,
    justifyContent: "center",
    alignItems: "center",
  },
  previewImage: {
    width: "100%",
    height: "100%",
    borderRadius: 12,
  },
  previewActions: {
    flexDirection: "row",
    padding: 24,
    gap: 12,
  },
  actionButton: {
    flex: 1,
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  retakeButton: {
    backgroundColor: "#fff",
    borderWidth: 2,
    borderColor: "#E5E7EB",
  },
  uploadButton: {
    backgroundColor: "#10B981",
    borderWidth: 2,
    borderColor: "#10B981",
  },
  uploadButtonDisabled: {
    opacity: 0.6,
  },
  actionButtonText: {
    fontSize: 16,
    fontWeight: "600",
    color: "#2D3436",
  },
  uploadButtonText: {
    color: "#fff",
  },
});
