import { View, Text, StyleSheet, TextInput } from "react-native";
import { useRouter } from "expo-router";
import { useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { useState } from "react";
import * as Haptics from "expo-haptics";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { SafeKeyboardAwareScrollView } from "@/lib/keyboard/safeKeyboardController";
import {
  GlassScreen,
  GlassCard,
  GlassButton,
  GlassHeader,
  colors,
  typography,
  spacing,
  useGlassAlert,
} from "@/components/ui/glass";

export default function JoinListScreen() {
  const router = useRouter();
  const { alert } = useGlassAlert();
  const acceptInvite = useMutation(api.partners.acceptInvite);
  const [code, setCode] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleJoin() {
    if (!code.trim()) {
      alert("Error", "Please enter an invite code");
      return;
    }

    setLoading(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

    try {
      const result = await acceptInvite({ code: code.trim().toUpperCase() });
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

      alert("Joined!", "You've successfully joined the shared list.", [
        { text: "View List", onPress: () => router.push(`/list/${result.listId}`) },
      ]);
    } catch (error: any) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      alert("Error", error?.message || "Invalid or expired invite code");
    } finally {
      setLoading(false);
    }
  }

  return (
    <GlassScreen>
      <GlassHeader title="Join a List" showBack onBack={() => router.back()} />

      <SafeKeyboardAwareScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
        bottomOffset={20}
      >
        <View style={styles.iconContainer}>
          <MaterialCommunityIcons name="ticket-confirmation-outline" size={64} color={colors.accent.primary} />
        </View>

        <Text style={styles.heading}>Enter Invite Code</Text>
        <Text style={styles.subtitle}>Ask your partner for the 6-character code</Text>

        <GlassCard style={styles.inputCard}>
          <TextInput
            style={styles.codeInput}
            value={code}
            onChangeText={(t) => setCode(t.toUpperCase())}
            placeholder="ABC123"
            placeholderTextColor={colors.text.tertiary}
            maxLength={6}
            autoCapitalize="characters"
            autoFocus
          />
        </GlassCard>

        <GlassButton
          variant="primary"
          size="lg"
          icon="check"
          onPress={handleJoin}
          loading={loading}
          disabled={loading || code.length < 6}
          style={styles.joinButton}
        >
          Accept Invite
        </GlassButton>
      </SafeKeyboardAwareScrollView>
    </GlassScreen>
  );
}

const styles = StyleSheet.create({
  scrollView: { flex: 1 },
  content: { flexGrow: 1, paddingHorizontal: spacing.xl, alignItems: "center", paddingTop: 40 },
  iconContainer: { marginBottom: spacing.lg },
  heading: { ...typography.headlineMedium, color: colors.text.primary, marginBottom: spacing.xs },
  subtitle: { ...typography.bodyMedium, color: colors.text.tertiary, marginBottom: spacing.xl },
  inputCard: { width: "100%", alignItems: "center", marginBottom: spacing.xl },
  codeInput: {
    fontSize: 36,
    fontWeight: "800",
    color: colors.accent.primary,
    letterSpacing: 8,
    textAlign: "center",
    paddingVertical: spacing.md,
    width: "100%",
  },
  joinButton: { width: "100%" },
});
