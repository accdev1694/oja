import React, { useState } from "react";
import {
  View,
  Text,
  ScrollView,
  TextInput,
  Pressable,
  ActivityIndicator,
  StyleSheet,
} from "react-native";
import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import {
  GlassCard,
  colors,
  typography,
  spacing,
  borderRadius,
} from "@/components/ui/glass";

interface PointsTabProps {
  hasPermission: (p: string) => boolean;
}

export function PointsTab({ hasPermission }: PointsTabProps) {
  const [searchQuery, setSearchQuery] = useState("");
  
  // These queries would need to be added to convex/admin.ts
  // For now, we'll use placeholder data or existing queries if they fit
  const pointsBalance = useQuery(api.points.getPointsBalance); 

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      <View style={styles.header}>
        <Text style={styles.title}>Points Management</Text>
      </View>

      {/* Stats Overview */}
      <View style={styles.metricsGrid}>
        <GlassCard style={[styles.card, { width: "100%" }]}>
          <Text style={styles.label}>Feature Note</Text>
          <Text style={styles.value}>Points Economy</Text>
          <Text style={styles.subtext}>
            Manage user point balances, adjust for fraud, and track total reward liability.
          </Text>
        </GlassCard>
      </View>

      {/* Search Section */}
      <GlassCard style={styles.card}>
        <View style={styles.searchBar}>
          <MaterialCommunityIcons name="magnify" size={20} color={colors.text.tertiary} />
          <TextInput
            style={styles.input}
            placeholder="Search user by ID or Email..."
            placeholderTextColor={colors.text.tertiary}
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
        </View>
      </GlassCard>

      {/* Info Box */}
      <GlassCard variant="standard" style={{ marginTop: spacing.md }}>
        <View style={{ flexDirection: "row", gap: spacing.md, alignItems: "center" }}>
          <MaterialCommunityIcons name="information-outline" size={24} color={colors.accent.primary} />
          <View style={{ flex: 1 }}>
            <Text style={{ ...typography.bodyMedium, color: colors.text.primary, fontWeight: "600" }}>
              Admin Point Adjustments
            </Text>
            <Text style={{ ...typography.bodySmall, color: colors.text.secondary }}>
              Use the Users tab to find a specific user and manage their points balance from their profile view.
            </Text>
          </View>
        </View>
      </GlassCard>

      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>Economics Dashboard (Coming Soon)</Text>
      </View>
      
      <GlassCard style={{ padding: spacing.xl, alignItems: "center" }}>
        <MaterialCommunityIcons name="chart-line" size={48} color={colors.text.tertiary} />
        <Text style={{ ...typography.bodyMedium, color: colors.text.tertiary, marginTop: spacing.md }}>
          Point earn/burn analytics are being precomputed.
        </Text>
      </GlassCard>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: spacing.md },
  header: { marginBottom: spacing.lg },
  title: { ...typography.headlineSmall, color: colors.text.primary, fontWeight: "700" },
  metricsGrid: { marginBottom: spacing.md },
  card: { padding: spacing.md, marginBottom: spacing.md },
  label: { ...typography.labelSmall, color: colors.text.tertiary, textTransform: "uppercase" },
  value: { ...typography.headlineSmall, color: colors.accent.primary, marginVertical: 4, fontWeight: "700" },
  subtext: { ...typography.bodySmall, color: colors.text.secondary },
  searchBar: { flexDirection: "row", alignItems: "center", gap: spacing.sm, backgroundColor: "rgba(255,255,255,0.05)", padding: spacing.sm, borderRadius: borderRadius.md },
  input: { flex: 1, ...typography.bodyMedium, color: colors.text.primary, padding: 0 },
  sectionHeader: { marginTop: spacing.xl, marginBottom: spacing.md },
  sectionTitle: { ...typography.labelLarge, color: colors.text.primary, fontWeight: "600" },
});
