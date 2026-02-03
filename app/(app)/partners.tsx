import { View, Text, StyleSheet, ScrollView, Share, TextInput, Pressable } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { useState, useCallback } from "react";
import { Id } from "@/convex/_generated/dataModel";
import * as Clipboard from "expo-clipboard";
import * as Haptics from "expo-haptics";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  interpolateColor,
} from "react-native-reanimated";
import {
  GlassScreen,
  GlassCard,
  GlassButton,
  GlassHeader,
  GlassModal,
  colors,
  typography,
  spacing,
  borderRadius,
  useGlassAlert,
} from "@/components/ui/glass";
import { usePartnerRole } from "@/hooks/usePartnerRole";

export default function PartnersScreen() {
  const { listId } = useLocalSearchParams<{ listId: string }>();
  const router = useRouter();
  const { alert } = useGlassAlert();
  const partners = useQuery(api.partners.getByList, listId ? { listId: listId as Id<"shoppingLists"> } : "skip");
  const createInvite = useMutation(api.partners.createInviteCode);
  const updateRole = useMutation(api.partners.updateRole);
  const removePartner = useMutation(api.partners.removePartner);
  const leaveList = useMutation(api.partners.leaveList);

  const { isOwner, isPartner } = usePartnerRole(listId ? listId as Id<"shoppingLists"> : undefined);

  const [showInviteModal, setShowInviteModal] = useState(false);
  const [inviteCode, setInviteCode] = useState("");
  const [selectedRole, setSelectedRole] = useState<"viewer" | "editor" | "approver">("editor");

  // Sliding pill animation for role selector: 0=viewer, 1=editor, 2=approver
  const ROLES = ["viewer", "editor", "approver"] as const;
  const roleProgress = useSharedValue(1); // default "editor" = index 1
  const rolePillWidth = useSharedValue(0);

  const onRoleContainerLayout = useCallback((e: { nativeEvent: { layout: { width: number } } }) => {
    rolePillWidth.value = (e.nativeEvent.layout.width - 8) / 3;
  }, []);

  const rolePillStyle = useAnimatedStyle(() => {
    return {
      width: rolePillWidth.value,
      transform: [{ translateX: roleProgress.value * rolePillWidth.value }],
      backgroundColor: interpolateColor(
        roleProgress.value,
        [0, 1, 2],
        [`${colors.text.tertiary}25`, `${colors.accent.primary}25`, `${colors.semantic.warning}25`]
      ),
    };
  });

  const handleRoleSelect = (role: "viewer" | "editor" | "approver") => {
    if (role === selectedRole) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setSelectedRole(role);
    const index = ROLES.indexOf(role);
    roleProgress.value = withSpring(index, {
      damping: 18,
      stiffness: 180,
    });
  };

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
    } catch (error: any) {
      const msg = error?.message ?? error?.data ?? "";
      if (msg.includes("Premium") || msg.includes("partner") || msg.includes("Upgrade")) {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
        alert(
          "Premium Feature",
          "Partner Mode lets you share lists with family and friends. Upgrade to Premium to unlock it.",
          [
            { text: "Maybe Later", style: "cancel" },
            { text: "Upgrade", onPress: () => router.push("/(app)/subscription") },
          ]
        );
      } else {
        alert("Error", "Failed to create invite code");
      }
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
    alert("Copied!", "Invite code copied to clipboard");
  }

  async function handleRemovePartner(partnerId: Id<"listPartners">, name: string) {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    alert("Remove Partner", `Remove ${name} from this list?`, [
      { text: "Cancel", style: "cancel" },
      {
        text: "Remove",
        style: "destructive",
        onPress: () => removePartner({ partnerId }),
      },
    ]);
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
      alert("Error", "Failed to update role");
    }
  }

  async function handleLeaveList() {
    if (!listId) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    alert(
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
              alert("Error", "Failed to leave list");
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
          <View style={styles.roleRow} onLayout={onRoleContainerLayout}>
            <Animated.View style={[styles.roleSlidingPill, rolePillStyle]} />
            {ROLES.map((role) => {
              const roleColor = role === "viewer" ? colors.text.tertiary
                : role === "editor" ? colors.accent.primary
                : colors.semantic.warning;
              return (
                <Pressable
                  key={role}
                  style={styles.roleChip}
                  onPress={() => handleRoleSelect(role)}
                >
                  <MaterialCommunityIcons
                    name={roleIcons[role]}
                    size={16}
                    color={selectedRole === role ? roleColor : colors.text.tertiary}
                  />
                  <Text style={[
                    styles.roleChipText,
                    selectedRole === role && {
                      color: roleColor,
                      fontWeight: "600" as const,
                    },
                  ]}>
                    {role.charAt(0).toUpperCase() + role.slice(1)}
                  </Text>
                </Pressable>
              );
            })}
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

        <View style={{ height: 140 }} />
      </ScrollView>

      {/* Invite Code Modal */}
      <GlassModal
        visible={showInviteModal}
        onClose={() => setShowInviteModal(false)}
        overlayOpacity={0.75}
        maxWidth={320}
        contentStyle={styles.modalContentStyle}
      >
        <Text style={styles.modalTitle}>Invite Code</Text>
        <Text style={styles.codeText}>{inviteCode}</Text>
        <Text style={styles.modalSubtitle}>Share this code with your partner</Text>
        <View style={styles.inviteActions}>
          <Pressable style={styles.inviteActionBtn} onPress={handleCopyCode}>
            <View style={styles.inviteIconCircle}>
              <MaterialCommunityIcons name="content-copy" size={24} color={colors.text.primary} />
            </View>
            <Text style={styles.inviteActionLabel}>Copy</Text>
          </Pressable>
          <Pressable style={styles.inviteActionBtn} onPress={handleShareCode}>
            <View style={styles.inviteIconCircle}>
              <MaterialCommunityIcons name="share-variant" size={24} color={colors.text.primary} />
            </View>
            <Text style={styles.inviteActionLabel}>Share</Text>
          </Pressable>
          <Pressable style={styles.inviteActionBtn} onPress={() => setShowInviteModal(false)}>
            <View style={[styles.inviteIconCircle, styles.inviteDoneCircle]}>
              <MaterialCommunityIcons name="check-bold" size={28} color={colors.text.primary} />
            </View>
            <Text style={[styles.inviteActionLabel, styles.inviteDoneLabel]}>Done</Text>
          </Pressable>
        </View>
      </GlassModal>

      {/* Role Change Modal */}
      <GlassModal
        visible={showRoleModal}
        onClose={() => setShowRoleModal(false)}
        overlayOpacity={0.75}
        maxWidth={320}
        contentStyle={styles.modalContentStyle}
      >
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
      </GlassModal>
    </GlassScreen>
  );
}

const styles = StyleSheet.create({
  scrollView: { flex: 1 },
  scrollContent: { paddingHorizontal: spacing.lg, paddingTop: spacing.md },
  roleSelector: { marginBottom: spacing.md },
  sectionTitle: { ...typography.labelMedium, color: colors.text.secondary, marginBottom: spacing.sm },
  roleRow: {
    flexDirection: "row",
    backgroundColor: colors.glass.background,
    borderRadius: borderRadius.lg,
    padding: 4,
    borderWidth: 1,
    borderColor: colors.glass.border,
    overflow: "hidden",
  },
  roleSlidingPill: {
    position: "absolute",
    top: 4,
    bottom: 4,
    left: 4,
    borderRadius: borderRadius.md,
  },
  roleChip: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: spacing.xs,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.md,
  },
  roleChipText: { ...typography.bodySmall, color: colors.text.tertiary },
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
  modalContentStyle: {
    alignItems: "center",
    gap: spacing.md,
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
  inviteActions: {
    flexDirection: "row",
    justifyContent: "center",
    gap: spacing.xl,
    marginTop: spacing.md,
    width: "100%",
  },
  inviteActionBtn: {
    alignItems: "center",
    gap: spacing.sm,
  },
  inviteIconCircle: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: colors.glass.background,
    borderWidth: 1,
    borderColor: colors.glass.border,
    justifyContent: "center",
    alignItems: "center",
  },
  inviteDoneCircle: {
    backgroundColor: `${colors.accent.primary}30`,
    borderColor: colors.accent.primary,
  },
  inviteActionLabel: {
    ...typography.bodySmall,
    color: colors.text.secondary,
    fontWeight: "600",
  },
  inviteDoneLabel: {
    color: colors.accent.primary,
    fontWeight: "700",
  },
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
