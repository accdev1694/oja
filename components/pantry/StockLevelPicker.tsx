import React, { useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Modal,
  Pressable,
} from "react-native";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withRepeat,
  withSequence,
  withTiming,
  interpolateColor,
  runOnJS,
} from "react-native-reanimated";
import * as Haptics from "expo-haptics";

export type StockLevel = "stocked" | "good" | "low" | "out";

interface StockLevelPickerProps {
  visible: boolean;
  currentLevel: StockLevel;
  itemName: string;
  onSelect: (level: StockLevel) => void;
  onClose: () => void;
}

const LEVELS: { key: StockLevel; label: string; emoji: string; fill: number }[] = [
  { key: "stocked", label: "Stocked", emoji: "🟢", fill: 100 },
  { key: "good", label: "Good", emoji: "🟡", fill: 75 },
  { key: "low", label: "Low", emoji: "🟠", fill: 25 },
  { key: "out", label: "Out", emoji: "🔴", fill: 0 },
];

const LEVEL_COLORS: Record<StockLevel, string> = {
  stocked: "#10B981",
  good: "#34D399",
  low: "#F59E0B",
  out: "#EF4444",
};

/**
 * StockLevelPicker - Modal with large animated liquid container
 *
 * Features:
 * - Large visual liquid indicator
 * - Tap level buttons to see liquid drain/fill animation
 * - Spring physics for natural liquid movement
 * - Wave animation at liquid surface
 * - Haptic feedback on selection
 */
export function StockLevelPicker({
  visible,
  currentLevel,
  itemName,
  onSelect,
  onClose,
}: StockLevelPickerProps) {
  const fillPercentage = useSharedValue(
    LEVELS.find((l) => l.key === currentLevel)?.fill ?? 100
  );
  const selectedLevel = useSharedValue<StockLevel>(currentLevel);
  const waveOffset = useSharedValue(0);
  const colorIndex = useSharedValue(LEVELS.findIndex((l) => l.key === currentLevel));

  // Reset when modal opens
  useEffect(() => {
    if (visible) {
      const levelData = LEVELS.find((l) => l.key === currentLevel);
      fillPercentage.value = levelData?.fill ?? 100;
      colorIndex.value = LEVELS.findIndex((l) => l.key === currentLevel);
      selectedLevel.value = currentLevel;

      // Start wave animation
      waveOffset.value = withRepeat(
        withSequence(
          withTiming(1, { duration: 2000 }),
          withTiming(0, { duration: 2000 })
        ),
        -1,
        true
      );
    }
  }, [visible, currentLevel]);

  const handleLevelPress = (level: StockLevel) => {
    const levelData = LEVELS.find((l) => l.key === level);
    if (!levelData) return;

    // Haptic feedback
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

    // Animate liquid to new level with spring physics
    fillPercentage.value = withSpring(levelData.fill, {
      damping: 8,
      stiffness: 80,
      mass: 0.8,
    });

    // Animate color
    colorIndex.value = withTiming(LEVELS.findIndex((l) => l.key === level), {
      duration: 400,
    });

    selectedLevel.value = level;
  };

  const handleConfirm = () => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    onSelect(selectedLevel.value);
  };

  const liquidStyle = useAnimatedStyle(() => {
    const containerHeight = 180;
    const fillHeight = (fillPercentage.value / 100) * containerHeight;

    const backgroundColor = interpolateColor(
      colorIndex.value,
      [0, 1, 2, 3],
      [LEVEL_COLORS.stocked, LEVEL_COLORS.good, LEVEL_COLORS.low, LEVEL_COLORS.out]
    );

    return {
      height: Math.max(fillHeight, 0),
      backgroundColor,
    };
  });

  const waveStyle = useAnimatedStyle(() => {
    // Hide wave when empty
    if (fillPercentage.value < 5) {
      return { opacity: 0 };
    }

    return {
      opacity: 0.4,
      transform: [
        { translateX: waveOffset.value * 10 - 5 },
        { scaleY: 0.6 + waveOffset.value * 0.4 },
      ],
    };
  });

  const containerBorderStyle = useAnimatedStyle(() => {
    const borderColor = interpolateColor(
      colorIndex.value,
      [0, 1, 2, 3],
      [LEVEL_COLORS.stocked, LEVEL_COLORS.good, LEVEL_COLORS.low, LEVEL_COLORS.out]
    );

    return {
      borderColor,
    };
  });

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

          {/* Large liquid container */}
          <Animated.View style={[styles.liquidContainer, containerBorderStyle]}>
            <Animated.View style={[styles.liquid, liquidStyle]}>
              {/* Wave effect */}
              <Animated.View style={[styles.wave, waveStyle]} />
              <Animated.View style={[styles.wave2, waveStyle]} />
            </Animated.View>

            {/* Glass reflection */}
            <View style={styles.reflection} />

            {/* Level markers */}
            <View style={styles.markers}>
              <View style={styles.marker} />
              <View style={styles.marker} />
              <View style={styles.marker} />
            </View>
          </Animated.View>

          {/* Level buttons */}
          <View style={styles.buttonsRow}>
            {LEVELS.map((level) => (
              <TouchableOpacity
                key={level.key}
                style={[
                  styles.levelButton,
                  selectedLevel.value === level.key && styles.levelButtonActive,
                  { borderColor: LEVEL_COLORS[level.key] },
                ]}
                onPress={() => handleLevelPress(level.key)}
              >
                <Text style={styles.levelEmoji}>{level.emoji}</Text>
                <Text
                  style={[
                    styles.levelLabel,
                    selectedLevel.value === level.key && styles.levelLabelActive,
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
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    justifyContent: "center",
    alignItems: "center",
  },
  modal: {
    backgroundColor: "#fff",
    borderRadius: 24,
    padding: 24,
    width: "85%",
    maxWidth: 360,
    alignItems: "center",
  },
  title: {
    fontSize: 20,
    fontWeight: "700",
    color: "#2D3436",
    marginBottom: 4,
  },
  itemName: {
    fontSize: 16,
    color: "#636E72",
    marginBottom: 24,
  },
  liquidContainer: {
    width: 120,
    height: 180,
    borderRadius: 16,
    borderWidth: 3,
    backgroundColor: "rgba(245, 245, 245, 0.9)",
    overflow: "hidden",
    justifyContent: "flex-end",
    marginBottom: 24,
  },
  liquid: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    borderBottomLeftRadius: 12,
    borderBottomRightRadius: 12,
  },
  wave: {
    position: "absolute",
    top: -6,
    left: 4,
    right: 4,
    height: 12,
    backgroundColor: "rgba(255, 255, 255, 0.5)",
    borderRadius: 6,
  },
  wave2: {
    position: "absolute",
    top: -3,
    left: 10,
    right: 10,
    height: 8,
    backgroundColor: "rgba(255, 255, 255, 0.3)",
    borderRadius: 4,
  },
  reflection: {
    position: "absolute",
    top: 8,
    left: 8,
    width: 12,
    height: "70%",
    backgroundColor: "rgba(255, 255, 255, 0.3)",
    borderRadius: 6,
  },
  markers: {
    position: "absolute",
    right: 8,
    top: 20,
    bottom: 20,
    justifyContent: "space-between",
  },
  marker: {
    width: 8,
    height: 2,
    backgroundColor: "rgba(0, 0, 0, 0.1)",
  },
  buttonsRow: {
    flexDirection: "row",
    gap: 8,
    marginBottom: 20,
  },
  levelButton: {
    alignItems: "center",
    padding: 12,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: "#E5E7EB",
    backgroundColor: "#fff",
    minWidth: 70,
  },
  levelButtonActive: {
    backgroundColor: "rgba(255, 107, 53, 0.1)",
  },
  levelEmoji: {
    fontSize: 20,
    marginBottom: 4,
  },
  levelLabel: {
    fontSize: 12,
    color: "#636E72",
    fontWeight: "500",
  },
  levelLabelActive: {
    color: "#2D3436",
    fontWeight: "700",
  },
  confirmButton: {
    backgroundColor: "#FF6B35",
    paddingVertical: 14,
    paddingHorizontal: 48,
    borderRadius: 12,
    width: "100%",
    alignItems: "center",
    marginBottom: 12,
  },
  confirmButtonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "600",
  },
  cancelButton: {
    paddingVertical: 10,
  },
  cancelButtonText: {
    color: "#636E72",
    fontSize: 14,
  },
});
