import React from "react";
import { View, Text, StyleSheet, Pressable } from "react-native";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { 
  GlassCard, 
  AnimatedSection, 
  colors, 
  typography, 
  spacing, 
  borderRadius 
} from "@/components/ui/glass";

interface ScanOnboardingTipProps {
  visible: boolean;
  onDismiss: () => void;
}

export function ScanOnboardingTip({ visible, onDismiss }: ScanOnboardingTipProps) {
  if (!visible) return null;

  return (
    <AnimatedSection animation="fadeInDown" duration={500} style={styles.container}>
      <GlassCard variant="bordered" accentColor={colors.accent.primary} style={styles.card}>
        <View style={styles.content}>
          <View style={styles.iconContainer}>
            <MaterialCommunityIcons name="lightbulb-on-outline" size={24} color={colors.accent.primary} />
          </View>
          <View style={styles.textContainer}>
            <Text style={styles.title}>Pro Tip: Receipt Scanning</Text>
            <Text style={styles.text}>
              Make sure to capture the store name, total amount, and date. Flatten the receipt for better results!
            </Text>
          </View>
          <Pressable onPress={onDismiss} hitSlop={12}>
            <MaterialCommunityIcons name="close" size={20} color={colors.text.tertiary} />
          </Pressable>
        </View>
      </GlassCard>
    </AnimatedSection>
  );
}

const styles = StyleSheet.create({
  container: {
    marginHorizontal: spacing.lg,
    marginTop: spacing.sm,
    marginBottom: spacing.md,
  },
  card: { padding: spacing.md },
  content: { flexDirection: "row", gap: spacing.md, alignItems: "flex-start" },
  iconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: `${colors.accent.primary}15`,
    justifyContent: "center",
    alignItems: "center",
  },
  textContainer: { flex: 1 },
  title: { ...typography.labelLarge, color: colors.text.primary, fontWeight: "700", marginBottom: 2 },
  text: { ...typography.bodySmall, color: colors.text.secondary, lineHeight: 18 },
});
