import { View, Text, StyleSheet, ScrollView, Alert, Platform, Share, TextInput, Modal, Pressable } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { useState } from "react";
import { Id } from "@/convex/_generated/dataModel";
import * as Clipboard from "expo-clipboard";
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
import { usePartnerRole } from "@/hooks/usePartnerRole";

export default function PartnersScreen() {
  const { listId } = useLocalSearchParams<{ listId: string }>();
  const router = useRouter();
  const partners = useQuery(api.partners.getByList, listId ? { listId: listId as Id<"shoppingLists"> } : "skip");
  const createInvite = useMutation(api.partners.createInviteCode);
  const updateRole = useMutation(api.partners.updateRole);
  const removePartner = useMutation(api.partners.removePartner);
  const leaveList = useMutation(api.partners.leaveList);

  const { isOwner, isPartner } = usePartnerRole(listId ? listId as Id<"shoppingLists"> : undefined);

  const [showInviteModal, setShowInviteModal] = useState(false);
  const [inviteCode, setInviteCode] = useState("");
  const [selectedRole, setSelectedRole] = useState<"viewer" | "editor" | "approver">("editor");

  // Role change modal
  const [showRoleModal, setShowRoleModal] = useState(false);
  const [changingPartnerId, setChangingPartnerId] = useState<Id<"listPartners"> | null>(null);
  const [changingPartnerName, setChangingPartnerName] = useState("");
  const [changingPartnerRole, setChangingPartnerRole] = useState<"viewer" | "editor" | "approver">("editor");

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

  async function handleCopyCode() {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    await Clipboard.setStringAsync(inviteCode);
    if (Platform.OS === "web") {
      window.alert("Code copied!");
    } else {
      Alert.alert("Copied!", "Invite code copied to clipboard");
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

  function openRoleChange(partnerId: Id<"listPartners">, name: string, currentRole: string) {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setChangingPartnerId(partnerId);
    setChangingPartnerName(name);
    setChangingPartnerRole(currentRole as "viewer" | "editor" | "approver");
    setShowRoleModal(true);
  }

  async function handleRoleChange(newRole: "viewer" | "editor" | "approver") {
    if (!changingPartnerId) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    try {
      await updateRole({ partnerId: changingPartnerId, role: newRole });
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      setShowRoleModal(false);
    } catch (error) {
      console.error("Failed to update role:", error);
      Alert.alert("Error", "Failed to update role");
    }
  }

  async function handleLeaveList() {
    if (!listId) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    Alert.alert(
      "Leave List",
      "Are you sure you want to leave this shared list?",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Leave",
          style: "destructive",
          onPress: async () => {
            try {
              await leaveList({ listId: listId as Id<"shoppingLists"> });
              Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
              router.back();
            } catch (error) {
              console.error("Failed to leave list:", error);
              Alert.alert("Error", "Failed to leave list");
            }
          },
        },
      ]
    );
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
                  <Pressable
                    style={styles.roleBadge}
                    onPress={isOwner ? () => openRoleChange(partner._id, partner.userName, partner.role) : undefined}
                    disabled={!isOwner}
                  >
                    <MaterialCommunityIcons
                      name={roleIcons[partner.role]}
                      size={12}
                      color={roleColors[partner.role]}
                    />
                    <Text style={[styles.roleText, { color: roleColors[partner.role] }]}>
                      {partner.role}
                    </Text>
                    {isOwner && (
                      <MaterialCommunityIcons
                        name="chevron-down"
                        size={12}
                        color={colors.text.tertiary}
                      />
                    )}
                  </Pressable>
                </View>
              </View>
              {isOwner && (
                <Pressable
                  style={styles.removeBtn}
                  onPress={() => handleRemovePartner(partner._id, partner.userName)}
                >
                  <MaterialCommunityIcons name="close" size={20} color={colors.semantic.danger} />
                </Pressable>
              )}
            </View>
          </GlassCard>
        ))}

        {/* Leave List button for partners */}
        {isPartner && !isOwner && (
          <GlassButton
            variant="secondary"
            size="md"
            icon="logout"
            onPress={handleLeaveList}
            style={styles.leaveButton}
          >
            Leave List
          </GlassButton>
        )}

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
              <View style={styles.modalActionRow}>
                <GlassButton variant="primary" size="md" icon="content-copy" onPress={handleCopyCode} style={styles.modalActionButton}>
                  Copy Code
                </GlassButton>
                <GlassButton variant="primary" size="md" icon="share-variant" onPress={handleShareCode} style={styles.modalActionButton}>
                  Share Code
                </GlassButton>
              </View>
              <GlassButton variant="secondary" size="md" onPress={() => setShowInviteModal(false)}>
                Done
              </GlassButton>
            </View>
          </Pressable>
        </Pressable>
      </Modal>
      {/* Role Change Modal */}
      <Modal visible={showRoleModal} transparent animationType="fade" onRequestClose={() => setShowRoleModal(false)}>
        <Pressable style={styles.modalOverlay} onPress={() => setShowRoleModal(false)}>
          <Pressable style={styles.modalContent} onPress={(e) => e.stopPropagation()}>
            <MaterialCommunityIcons name="account-edit-outline" size={32} color={colors.accent.primary} />
            <Text style={styles.modalTitle}>Change Role</Text>
            <Text style={styles.modalSubtitle}>
              Update {changingPartnerName}'s role
            </Text>
            <View style={styles.roleChangeOptions}>
              {(["viewer", "editor", "approver"] as const).map((role) => (
                <Pressable
                  key={role}
                  style={[
                    styles.roleChangeOption,
                    changingPartnerRole === role && styles.roleChangeOptionActive,
                  ]}
                  onPress={() => handleRoleChange(role)}
                >
                  <MaterialCommunityIcons
                    name={roleIcons[role]}
                    size={20}
                    color={changingPartnerRole === role ? colors.accent.primary : colors.text.secondary}
                  />
                  <View style={styles.roleChangeOptionText}>
                    <Text style={[
                      styles.roleChangeOptionTitle,
                      changingPartnerRole === role && styles.roleChangeOptionTitleActive,
                    ]}>
                      {role.charAt(0).toUpperCase() + role.slice(1)}
                    </Text>
                    <Text style={styles.roleChangeOptionDesc}>
                      {role === "viewer" ? "Can view items only" :
                       role === "editor" ? "Can add and edit items" :
                       "Can add items and approve/reject"}
                    </Text>
                  </View>
                  {changingPartnerRole === role && (
                    <MaterialCommunityIcons name="check" size={20} color={colors.accent.primary} />
                  )}
                </Pressable>
              ))}
            </View>
            <GlassButton variant="secondary" size="md" onPress={() => setShowRoleModal(false)}>
              Cancel
            </GlassButton>
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
  modalActionRow: { flexDirection: "row", gap: spacing.sm },
  modalActionButton: { flex: 1 },
  leaveButton: {
    marginTop: spacing.lg,
    marginHorizontal: spacing.lg,
  },
  roleChangeOptions: {
    width: "100%",
    gap: spacing.sm,
    marginBottom: spacing.md,
  },
  roleChangeOption: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
    padding: spacing.md,
    borderRadius: 12,
    backgroundColor: colors.glass.background,
    borderWidth: 1,
    borderColor: colors.glass.border,
  },
  roleChangeOptionActive: {
    backgroundColor: `${colors.accent.primary}15`,
    borderColor: colors.accent.primary,
  },
  roleChangeOptionText: {
    flex: 1,
  },
  roleChangeOptionTitle: {
    ...typography.bodyMedium,
    color: colors.text.secondary,
    fontWeight: "600",
  },
  roleChangeOptionTitleActive: {
    color: colors.accent.primary,
  },
  roleChangeOptionDesc: {
    ...typography.bodySmall,
    color: colors.text.tertiary,
    marginTop: 2,
  },
});
