import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Modal,
  Pressable,
} from "react-native";
import * as Haptics from "expo-haptics";
import {
  GaugeIndicator,
  STOCK_LEVEL_ORDER,
  STOCK_LEVEL_PERCENTAGES,
  type StockLevel,
} from "./GaugeIndicator";

interface StockLevelPickerProps {
  visible: boolean;
  currentLevel: StockLevel;
  itemName: string;
  onSelect: (level: StockLevel) => void;
  onClose: () => void;
}

const LEVELS: { key: StockLevel; label: string; color: string }[] = [
  { key: "stocked", label: "Full", color: "#10B981" },
  { key: "good", label: "Good", color: "#34D399" },
  { key: "half", label: "Half", color: "#EAB308" },
  { key: "low", label: "Low", color: "#F59E0B" },
  { key: "out", label: "Out", color: "#EF4444" },
];

export function StockLevelPicker({
  visible,
  currentLevel,
  itemName,
  onSelect,
  onClose,
}: StockLevelPickerProps) {
  const [previewLevel, setPreviewLevel] = useState<StockLevel>(currentLevel);

  // Reset preview when modal opens
  React.useEffect(() => {
    if (visible) {
      setPreviewLevel(currentLevel);
    }
  }, [visible, currentLevel]);

  const handleLevelPress = (level: StockLevel) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setPreviewLevel(level);
  };

  const handleConfirm = () => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    onSelect(previewLevel);
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <Pressable style={styles.overlay} onPress={onClose}>
        <Pressable style={styles.modal} onPress={(e) => e.stopPropagation()}>
          <Text style={styles.title}>Update Stock Level</Text>
          <Text style={styles.itemName}>{itemName}</Text>

          {/* Large gauge */}
          <View style={styles.gaugeContainer}>
            <GaugeIndicator level={previewLevel} size="large" />
          </View>

          {/* Level buttons */}
          <View style={styles.buttonsRow}>
            {LEVELS.map((level) => (
              <TouchableOpacity
                key={level.key}
                style={[
                  styles.levelButton,
                  previewLevel === level.key && styles.levelButtonActive,
                  { borderColor: level.color },
                ]}
                onPress={() => handleLevelPress(level.key)}
              >
                <View style={[styles.levelDot, { backgroundColor: level.color }]} />
                <Text
                  style={[
                    styles.levelLabel,
                    previewLevel === level.key && styles.levelLabelActive,
                  ]}
                >
                  {level.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          {/* Confirm button */}
          <TouchableOpacity style={styles.confirmButton} onPress={handleConfirm}>
            <Text style={styles.confirmButtonText}>Confirm</Text>
          </TouchableOpacity>

          {/* Cancel button */}
          <TouchableOpacity style={styles.cancelButton} onPress={onClose}>
            <Text style={styles.cancelButtonText}>Cancel</Text>
          </TouchableOpacity>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.6)",
    justifyContent: "center",
    alignItems: "center",
  },
  modal: {
    backgroundColor: "#0F1A2E",
    borderRadius: 24,
    padding: 20,
    width: "85%",
    maxWidth: 360,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.1)",
  },
  title: {
    fontSize: 18,
    fontWeight: "700",
    color: "#FFFFFF",
    marginBottom: 2,
  },
  itemName: {
    fontSize: 15,
    color: "rgba(255, 255, 255, 0.6)",
    marginBottom: 12,
  },
  gaugeContainer: {
    marginBottom: 16,
    alignItems: "center",
  },
  buttonsRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 6,
    marginBottom: 16,
    width: "100%",
    justifyContent: "center",
  },
  levelButton: {
    width: "30%",
    alignItems: "center",
    paddingVertical: 6,
    paddingHorizontal: 6,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: "rgba(255, 255, 255, 0.15)",
    backgroundColor: "rgba(255, 255, 255, 0.05)",
  },
  levelButtonActive: {
    backgroundColor: "rgba(0, 212, 170, 0.15)",
  },
  levelDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    marginBottom: 4,
  },
  levelLabel: {
    fontSize: 11,
    color: "rgba(255, 255, 255, 0.5)",
    fontWeight: "500",
  },
  levelLabelActive: {
    color: "#FFFFFF",
    fontWeight: "700",
  },
  confirmButton: {
    backgroundColor: "#00D4AA",
    paddingVertical: 12,
    paddingHorizontal: 48,
    borderRadius: 12,
    width: "100%",
    alignItems: "center",
    marginBottom: 8,
  },
  confirmButtonText: {
    color: "#0B1426",
    fontSize: 16,
    fontWeight: "600",
  },
  cancelButton: {
    paddingVertical: 10,
  },
  cancelButtonText: {
    color: "rgba(255, 255, 255, 0.5)",
    fontSize: 14,
  },
});
