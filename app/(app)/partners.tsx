import { View, Text, StyleSheet, ScrollView, Alert, Platform, Share, TextInput, Modal, Pressable } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { useState } from "react";
import { Id } from "@/convex/_generated/dataModel";
import * as Haptics from "expo-haptics";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import {
  GlassScreen,
  GlassCard,
  GlassButton,
  GlassHeader,
  colors,
  typography,
  spacing,
} from "@/components/ui/glass";

export default function PartnersScreen() {
  const { listId } = useLocalSearchParams<{ listId: string }>();
  const router = useRouter();
  const partners = useQuery(api.partners.getByList, listId ? { listId: listId as Id<"shoppingLists"> } : "skip");
  const createInvite = useMutation(api.partners.createInviteCode);
  const updateRole = useMutation(api.partners.updateRole);
  const removePartner = useMutation(api.partners.removePartner);

  const [showInviteModal, setShowInviteModal] = useState(false);
  const [inviteCode, setInviteCode] = useState("");
  const [selectedRole, setSelectedRole] = useState<"viewer" | "editor" | "approver">("editor");

  async function handleCreateInvite() {
    if (!listId) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    try {
      const result = await createInvite({
        listId: listId as Id<"shoppingLists">,
        role: selectedRole,
      });
      setInviteCode(result.code);
      setShowInviteModal(true);
    } catch (error) {
      Alert.alert("Error", "Failed to create invite code");
    }
  }

  async function handleShareCode() {
    try {
      await Share.share({
        message: `Join my shopping list on Oja! Use code: ${inviteCode}`,
      });
    } catch (error) {
      // User cancelled
    }
  }

  async function handleRemovePartner(partnerId: Id<"listPartners">, name: string) {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    if (Platform.OS === "web") {
      if (window.confirm(`Remove ${name} from this list?`)) {
        await removePartner({ partnerId });
      }
    } else {
      Alert.alert("Remove Partner", `Remove ${name} from this list?`, [
        { text: "Cancel", style: "cancel" },
        {
          text: "Remove",
          style: "destructive",
          onPress: () => removePartner({ partnerId }),
        },
      ]);
    }
  }

  const roleColors = {
    viewer: colors.text.tertiary,
    editor: colors.accent.primary,
    approver: colors.semantic.warning,
  };

  const roleIcons: Record<string, any> = {
    viewer: "eye-outline",
    editor: "pencil-outline",
    approver: "shield-check-outline",
  };

  return (
    <GlassScreen>
      <GlassHeader
        title="Partners"
        subtitle={partners ? `${partners.length} partner${partners.length !== 1 ? "s" : ""}` : "Loading..."}
        showBack
        onBack={() => router.back()}
        rightElement={
          <GlassButton variant="primary" size="sm" icon="account-plus" onPress={handleCreateInvite}>
            Invite
          </GlassButton>
        }
      />

      <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent}>
        {/* Role selector for invites */}
        <GlassCard style={styles.roleSelector}>
          <Text style={styles.sectionTitle}>Invite Role</Text>
          <View style={styles.roleRow}>
            {(["viewer", "editor", "approver"] as const).map((role) => (
              <Pressable
                key={role}
                style={[styles.roleChip, selectedRole === role && styles.roleChipActive]}
                onPress={() => setSelectedRole(role)}
              >
                <MaterialCommunityIcons
                  name={roleIcons[role]}
                  size={16}
                  color={selectedRole === role ? colors.accent.primary : colors.text.tertiary}
                />
                <Text style={[styles.roleChipText, selectedRole === role && styles.roleChipTextActive]}>
                  {role.charAt(0).toUpperCase() + role.slice(1)}
                </Text>
              </Pressable>
            ))}
          </View>
        </GlassCard>

        {/* Partners List */}
        {partners && partners.length === 0 && (
          <View style={styles.emptyState}>
            <MaterialCommunityIcons name="account-group-outline" size={64} color={colors.text.tertiary} />
            <Text style={styles.emptyTitle}>No Partners Yet</Text>
            <Text style={styles.emptySubtitle}>Invite someone to collaborate on this list</Text>
          </View>
        )}

        {partners?.map((partner) => (
          <GlassCard key={partner._id} style={styles.partnerCard}>
            <View style={styles.partnerRow}>
              <View style={styles.partnerInfo}>
                <View style={styles.avatar}>
                  <Text style={styles.avatarText}>
                    {(partner.userName || "U").charAt(0).toUpperCase()}
                  </Text>
                </View>
                <View>
                  <Text style={styles.partnerName}>{partner.userName}</Text>
                  <View style={styles.roleBadge}>
                    <MaterialCommunityIcons
                      name={roleIcons[partner.role]}
                      size={12}
                      color={roleColors[partner.role]}
                    />
                    <Text style={[styles.roleText, { color: roleColors[partner.role] }]}>
                      {partner.role}
                    </Text>
                  </View>
                </View>
              </View>
              <Pressable
                style={styles.removeBtn}
                onPress={() => handleRemovePartner(partner._id, partner.userName)}
              >
                <MaterialCommunityIcons name="close" size={20} color={colors.semantic.danger} />
              </Pressable>
            </View>
          </GlassCard>
        ))}

        <View style={{ height: 100 }} />
      </ScrollView>

      {/* Invite Code Modal */}
      <Modal visible={showInviteModal} transparent animationType="fade" onRequestClose={() => setShowInviteModal(false)}>
        <Pressable style={styles.modalOverlay} onPress={() => setShowInviteModal(false)}>
          <Pressable style={styles.modalContent} onPress={(e) => e.stopPropagation()}>
            <MaterialCommunityIcons name="ticket-confirmation-outline" size={48} color={colors.accent.primary} />
            <Text style={styles.modalTitle}>Invite Code</Text>
            <Text style={styles.codeText}>{inviteCode}</Text>
            <Text style={styles.modalSubtitle}>Share this code with your partner</Text>
            <View style={styles.modalActions}>
              <GlassButton variant="primary" size="md" icon="share-variant" onPress={handleShareCode}>
                Share Code
              </GlassButton>
              <GlassButton variant="secondary" size="md" onPress={() => setShowInviteModal(false)}>
                Done
              </GlassButton>
            </View>
          </Pressable>
        </Pressable>
      </Modal>
    </GlassScreen>
  );
}

const styles = StyleSheet.create({
  scrollView: { flex: 1 },
  scrollContent: { paddingHorizontal: spacing.lg, paddingTop: spacing.md },
  roleSelector: { marginBottom: spacing.md },
  sectionTitle: { ...typography.labelMedium, color: colors.text.secondary, marginBottom: spacing.sm },
  roleRow: { flexDirection: "row", gap: spacing.sm },
  roleChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.xs,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: 20,
    backgroundColor: colors.glass.background,
    borderWidth: 1,
    borderColor: colors.glass.border,
  },
  roleChipActive: {
    backgroundColor: `${colors.accent.primary}20`,
    borderColor: colors.accent.primary,
  },
  roleChipText: { ...typography.bodySmall, color: colors.text.tertiary },
  roleChipTextActive: { color: colors.accent.primary, fontWeight: "600" },
  emptyState: { alignItems: "center", marginTop: 60, gap: spacing.sm },
  emptyTitle: { ...typography.headlineSmall, color: colors.text.primary },
  emptySubtitle: { ...typography.bodyMedium, color: colors.text.tertiary },
  partnerCard: { marginBottom: spacing.sm },
  partnerRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  partnerInfo: { flexDirection: "row", alignItems: "center", gap: spacing.md },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: `${colors.accent.primary}30`,
    justifyContent: "center",
    alignItems: "center",
  },
  avatarText: { ...typography.headlineSmall, color: colors.accent.primary },
  partnerName: { ...typography.bodyLarge, color: colors.text.primary, fontWeight: "600" },
  roleBadge: { flexDirection: "row", alignItems: "center", gap: 4 },
  roleText: { ...typography.bodySmall, textTransform: "capitalize" },
  removeBtn: { padding: spacing.sm, borderRadius: 8, backgroundColor: `${colors.semantic.danger}15` },
  modalOverlay: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "rgba(0,0,0,0.75)",
  },
  modalContent: {
    width: "80%",
    maxWidth: 320,
    backgroundColor: colors.background.primary,
    borderRadius: 20,
    padding: spacing.xl,
    alignItems: "center",
    gap: spacing.md,
    borderWidth: 1,
    borderColor: colors.glass.borderFocus,
  },
  modalTitle: { ...typography.headlineMedium, color: colors.text.primary },
  codeText: {
    fontSize: 32,
    fontWeight: "800",
    color: colors.accent.primary,
    letterSpacing: 4,
    paddingVertical: spacing.md,
  },
  modalSubtitle: { ...typography.bodyMedium, color: colors.text.tertiary, textAlign: "center" },
  modalActions: { width: "100%", gap: spacing.sm, marginTop: spacing.md },
});
