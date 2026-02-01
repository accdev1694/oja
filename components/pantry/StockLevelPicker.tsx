import React from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Modal,
  Pressable,
} from "react-native";
import * as Haptics from "expo-haptics";
import { type StockLevel } from "./GaugeIndicator";
import { MaterialCommunityIcons } from "@expo/vector-icons";

interface StockLevelPickerProps {
  visible: boolean;
  currentLevel: StockLevel;
  itemName: string;
  onSelect: (level: StockLevel) => void;
  onClose: () => void;
  onRemove?: () => void;
}

const SIMPLE_LEVELS: {
  key: StockLevel;
  label: string;
  color: string;
  icon: "check-circle" | "minus-circle" | "close-circle";
}[] = [
  { key: "stocked", label: "Stocked", color: "#10B981", icon: "check-circle" },
  { key: "low", label: "Running Low", color: "#F59E0B", icon: "minus-circle" },
  { key: "out", label: "Out", color: "#EF4444", icon: "close-circle" },
];

export function StockLevelPicker({
  visible,
  currentLevel,
  itemName,
  onSelect,
  onClose,
  onRemove,
}: StockLevelPickerProps) {
  const activeKey = currentLevel;

  const handleSelect = (level: StockLevel) => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    onSelect(level);
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
          <Text style={styles.itemName}>{itemName}</Text>
          <Text style={styles.subtitle}>Set stock level</Text>

          {/* 3 level buttons — tap to apply immediately */}
          <View style={styles.levelsColumn}>
            {SIMPLE_LEVELS.map((level) => {
              const isActive = activeKey === level.key;
              return (
                <TouchableOpacity
                  key={level.key}
                  style={[
                    styles.levelRow,
                    isActive && { borderColor: level.color, backgroundColor: `${level.color}15` },
                  ]}
                  onPress={() => handleSelect(level.key)}
                  activeOpacity={0.7}
                >
                  <MaterialCommunityIcons
                    name={level.icon}
                    size={22}
                    color={isActive ? level.color : "rgba(255, 255, 255, 0.4)"}
                  />
                  <Text
                    style={[
                      styles.levelLabel,
                      isActive && { color: level.color, fontWeight: "700" },
                    ]}
                  >
                    {level.label}
                  </Text>
                  {isActive && (
                    <View style={styles.currentBadge}>
                      <Text style={styles.currentBadgeText}>current</Text>
                    </View>
                  )}
                </TouchableOpacity>
              );
            })}
          </View>

          {/* Remove button */}
          {onRemove && (
            <TouchableOpacity style={styles.removeButton} onPress={onRemove}>
              <MaterialCommunityIcons
                name="delete-outline"
                size={16}
                color="#EF4444"
              />
              <Text style={styles.removeButtonText}>Remove from Stock</Text>
            </TouchableOpacity>
          )}

          {/* Cancel */}
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
    borderRadius: 20,
    padding: 20,
    width: "80%",
    maxWidth: 320,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.1)",
  },
  itemName: {
    fontSize: 18,
    fontWeight: "700",
    color: "#FFFFFF",
    marginBottom: 2,
  },
  subtitle: {
    fontSize: 14,
    color: "rgba(255, 255, 255, 0.5)",
    marginBottom: 16,
  },
  levelsColumn: {
    width: "100%",
    gap: 8,
    marginBottom: 16,
  },
  levelRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: "rgba(255, 255, 255, 0.1)",
    backgroundColor: "rgba(255, 255, 255, 0.04)",
    gap: 12,
  },
  levelLabel: {
    fontSize: 15,
    color: "rgba(255, 255, 255, 0.6)",
    fontWeight: "500",
    flex: 1,
  },
  currentBadge: {
    backgroundColor: "rgba(255, 255, 255, 0.1)",
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 2,
  },
  currentBadgeText: {
    fontSize: 10,
    fontWeight: "600",
    color: "rgba(255, 255, 255, 0.4)",
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  removeButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingVertical: 10,
    marginBottom: 4,
  },
  removeButtonText: {
    color: "#EF4444",
    fontSize: 14,
    fontWeight: "500",
  },
  cancelButton: {
    paddingVertical: 8,
  },
  cancelButtonText: {
    color: "rgba(255, 255, 255, 0.5)",
    fontSize: 14,
  },
});
