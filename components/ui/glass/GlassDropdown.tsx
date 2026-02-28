import React, { useState } from "react";
import {
  View,
  Text,
  Pressable,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
} from "react-native";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { haptic } from "@/lib/haptics/safeHaptics";
import {
  colors,
  typography,
  spacing,
  borderRadius,
} from "@/lib/design/glassTokens";
import { GlassModal } from "./GlassModal";

export interface DropdownOption {
  label: string;
  value: string | null;
  count?: number;
  icon?: string;
}

interface GlassDropdownProps {
  label?: string;
  options: DropdownOption[];
  selected: string | null;
  onSelect: (value: string | null) => void;
  placeholder?: string;
  style?: any;
}

export function GlassDropdown({
  label,
  options,
  selected,
  onSelect,
  placeholder = "Select option",
  style,
}: GlassDropdownProps) {
  const [isOpen, setIsOpen] = useState(false);

  const selectedOption = options.find((o) => o.value === selected);
  const displayLabel = selectedOption ? selectedOption.label : placeholder;

  const handleSelect = (value: string | null) => {
    haptic("light");
    onSelect(value);
    setIsOpen(false);
  };

  return (
    <View style={[styles.container, style]}>
      {label && <Text style={styles.inputLabel}>{label}</Text>}
      
      <TouchableOpacity
        onPress={() => {
          haptic("light");
          setIsOpen(true);
        }}
        activeOpacity={0.7}
        style={styles.trigger}
      >
        <Text style={[styles.triggerText, !selectedOption && styles.placeholder]}>
          {displayLabel}
          {selectedOption?.count !== undefined && ` (${selectedOption.count})`}
        </Text>
        <MaterialCommunityIcons
          name={isOpen ? "chevron-up" : "chevron-down"}
          size={20}
          color={colors.text.tertiary}
        />
      </TouchableOpacity>

      <GlassModal
        visible={isOpen}
        onClose={() => setIsOpen(false)}
        position="bottom"
        maxWidth="full"
      >
        <View style={styles.modalContent}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>{label || "Select Category"}</Text>
            <TouchableOpacity onPress={() => setIsOpen(false)} hitSlop={12}>
              <MaterialCommunityIcons name="close" size={24} color={colors.text.tertiary} />
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.optionsList} showsVerticalScrollIndicator={false}>
            {options.map((option) => {
              const isActive = selected === option.value;
              return (
                <TouchableOpacity
                  key={String(option.value)}
                  style={[styles.optionItem, isActive && styles.optionItemActive]}
                  onPress={() => handleSelect(option.value)}
                >
                  <View style={styles.optionLeft}>
                    {option.icon && (
                      <MaterialCommunityIcons
                        name={option.icon as any}
                        size={20}
                        color={isActive ? colors.accent.primary : colors.text.secondary}
                        style={styles.optionIcon}
                      />
                    )}
                    <Text style={[styles.optionLabel, isActive && styles.optionLabelActive]}>
                      {option.label}
                    </Text>
                  </View>
                  
                  <View style={styles.optionRight}>
                    {option.count !== undefined && (
                      <Text style={[styles.optionCount, isActive && styles.optionCountActive]}>
                        {option.count}
                      </Text>
                    )}
                    {isActive && (
                      <MaterialCommunityIcons name="check" size={20} color={colors.accent.primary} />
                    )}
                  </View>
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        </View>
      </GlassModal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    width: "100%",
  },
  inputLabel: {
    ...typography.labelSmall,
    color: colors.text.tertiary,
    marginBottom: spacing.xs,
    marginLeft: spacing.xs,
  },
  trigger: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: colors.glass.background,
    borderWidth: 1,
    borderColor: colors.glass.border,
    borderRadius: borderRadius.lg,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    minHeight: 44,
  },
  triggerText: {
    ...typography.bodyMedium,
    color: colors.text.primary,
  },
  placeholder: {
    color: colors.text.tertiary,
  },
  modalContent: {
    width: "100%",
  },
  modalHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: spacing.lg,
  },
  modalTitle: {
    ...typography.headlineSmall,
    color: colors.text.primary,
  },
  optionsList: {
    maxHeight: 400,
  },
  optionItem: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.sm,
    borderRadius: borderRadius.md,
    marginBottom: spacing.xs,
  },
  optionItemActive: {
    backgroundColor: "rgba(255, 255, 255, 0.08)",
  },
  optionLeft: {
    flexDirection: "row",
    alignItems: "center",
  },
  optionIcon: {
    marginRight: spacing.sm,
  },
  optionLabel: {
    ...typography.bodyLarge,
    color: colors.text.secondary,
  },
  optionLabelActive: {
    color: colors.text.primary,
    fontWeight: "600",
  },
  optionRight: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
  },
  optionCount: {
    ...typography.bodySmall,
    color: colors.text.tertiary,
    backgroundColor: "rgba(255, 255, 255, 0.05)",
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: borderRadius.sm,
    overflow: "hidden",
  },
  optionCountActive: {
    color: colors.accent.primary,
    backgroundColor: "rgba(0, 212, 170, 0.1)",
  },
});
