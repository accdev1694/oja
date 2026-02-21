import { View, Text, StyleSheet, ScrollView, Share, Pressable } from "react-native";
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
  SimpleHeader,
  GlassModal,
  colors,
  typography,
  spacing,
  useGlassAlert,
} from "@/components/ui/glass";
import { usePartnerRole } from "@/hooks/usePartnerRole";

export default function PartnersScreen() {
  const { listId } = useLocalSearchParams<{ listId: string }>();
  const router = useRouter();
  const { alert } = useGlassAlert();
  const partners = useQuery(api.partners.getByList, listId ? { listId: listId as Id<"shoppingLists"> } : "skip");
  const createInvite = useMutation(api.partners.createInviteCode);
  const removePartner = useMutation(api.partners.removePartner);
  const leaveList = useMutation(api.partners.leaveList);

  const { isOwner, isPartner } = usePartnerRole(listId ? listId as Id<"shoppingLists"> : undefined);

  const [showInviteModal, setShowInviteModal] = useState(false);
  const [inviteCode, setInviteCode] = useState("");

  async function handleCreateInvite() {
    if (!listId) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    try {
      const result = await createInvite({
        listId: listId as Id<"shoppingLists">,
      });
      setInviteCode(result.code);
      setShowInviteModal(true);
    } catch (error: unknown) {
      const msg = error instanceof Error ? error.message : String(error);
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

  return (
    <GlassScreen>
      <SimpleHeader
        title="Partners"
        subtitle={partners ? `${partners.length} partner${partners.length !== 1 ? "s" : ""}` : "Loading..."}
        showBack
        onBack={() => router.back()}
        rightElement={
          isOwner ? (
            <GlassButton variant="primary" size="sm" icon="account-plus" onPress={handleCreateInvite}>
              Invite
            </GlassButton>
          ) : undefined
        }
      />

      <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent}>
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
                      name="account-check-outline"
                      size={12}
                      color={colors.accent.primary}
                    />
                    <Text style={[styles.roleText, { color: colors.accent.primary }]}>
                      Member
                    </Text>
                  </View>
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
          </Pressable>
          <Pressable style={styles.inviteActionBtn} onPress={handleShareCode}>
            <View style={styles.inviteIconCircle}>
              <MaterialCommunityIcons name="share-variant" size={24} color={colors.text.primary} />
            </View>
          </Pressable>
          <Pressable style={styles.inviteActionBtn} onPress={() => setShowInviteModal(false)}>
            <View style={[styles.inviteIconCircle, styles.inviteDoneCircle]}>
              <MaterialCommunityIcons name="check-bold" size={28} color={colors.text.primary} />
            </View>
          </Pressable>
        </View>
      </GlassModal>
    </GlassScreen>
  );
}

const styles = StyleSheet.create({
  scrollView: { flex: 1 },
  scrollContent: { paddingHorizontal: spacing.lg, paddingTop: spacing.md },
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
  roleText: { ...typography.bodySmall },
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
  leaveButton: {
    marginTop: spacing.lg,
    marginHorizontal: spacing.lg,
  },
});
