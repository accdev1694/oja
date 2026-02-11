import { useSignIn } from "@clerk/clerk-expo";
import { useRouter } from "expo-router";
import { useState, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  Pressable,
} from "react-native";
import * as Haptics from "expo-haptics";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { SafeSafeKeyboardAwareScrollView } from "@/lib/keyboard/safeKeyboardController";

import {
  GlassScreen,
  GlassCard,
  GlassButton,
  GlassInput,
  colors,
  typography,
  spacing,
} from "@/components/ui/glass";

export default function ForgotPasswordScreen() {
  const { signIn, setActive, isLoaded } = useSignIn();
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const [emailAddress, setEmailAddress] = useState("");
  const [code, setCode] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [step, setStep] = useState<"email" | "reset">("email");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const [successMessage, setSuccessMessage] = useState("");

  const onRequestReset = useCallback(async () => {
    if (!isLoaded) return;

    setIsLoading(true);
    setError("");

    try {
      await signIn.create({
        strategy: "reset_password_email_code",
        identifier: emailAddress,
      });
      setStep("reset");
      setSuccessMessage("Check your email for a reset code");
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    } catch (err: any) {
      const message = err?.errors?.[0]?.message || "Failed to send reset code";
      setError(message);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    } finally {
      setIsLoading(false);
    }
  }, [isLoaded, emailAddress, signIn]);

  const onResetPassword = useCallback(async () => {
    if (!isLoaded) return;

    setIsLoading(true);
    setError("");

    try {
      const result = await signIn.attemptFirstFactor({
        strategy: "reset_password_email_code",
        code,
        password: newPassword,
      });

      if (result.status === "complete") {
        await setActive({ session: result.createdSessionId });
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        router.replace("/(app)/(tabs)");
      } else {
        setError("Password reset incomplete. Please try again.");
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      }
    } catch (err: any) {
      const message = err?.errors?.[0]?.message || "Password reset failed";
      setError(message);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    } finally {
      setIsLoading(false);
    }
  }, [isLoaded, code, newPassword, signIn, setActive, router]);

  if (step === "reset") {
    return (
      <GlassScreen>
        <SafeKeyboardAwareScrollView
          style={styles.flex}
          contentContainerStyle={[styles.content, { paddingTop: insets.top + spacing.xl }]}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
          bottomOffset={20}
        >
            <View style={styles.iconContainer}>
              <MaterialCommunityIcons name="lock-reset" size={48} color={colors.accent.primary} />
            </View>
            <Text style={styles.title}>Set new password</Text>
            <Text style={styles.subtitle}>
              Enter the code sent to {emailAddress} and your new password
            </Text>

            {error ? (
              <GlassCard variant="bordered" accentColor={colors.accent.error} style={styles.errorCard}>
                <Text style={styles.errorText}>{error}</Text>
              </GlassCard>
            ) : null}

            {successMessage ? (
              <GlassCard variant="bordered" accentColor={colors.accent.primary} style={styles.errorCard}>
                <Text style={styles.successText}>{successMessage}</Text>
              </GlassCard>
            ) : null}

            <GlassInput
              placeholder="Reset code"
              value={code}
              onChangeText={setCode}
              keyboardType="number-pad"
              iconLeft="shield-key-outline"
            />

            <View style={{ height: spacing.sm }} />

            <GlassInput
              placeholder="New password"
              value={newPassword}
              onChangeText={setNewPassword}
              secureTextEntry={!showPassword}
              autoComplete="password-new"
              iconLeft="lock-outline"
              iconRight={showPassword ? "eye-off-outline" : "eye-outline"}
              onPressIconRight={() => setShowPassword(!showPassword)}
            />

            <View style={styles.spacer} />

            <GlassButton
              variant="primary"
              size="lg"
              onPress={onResetPassword}
              loading={isLoading}
              disabled={isLoading || !code || !newPassword}
            >
              Reset Password
            </GlassButton>

            <Pressable style={styles.backButton} onPress={() => router.back()}>
              <Text style={styles.linkText}>Back to sign in</Text>
            </Pressable>
        </SafeKeyboardAwareScrollView>
      </GlassScreen>
    );
  }

  return (
    <GlassScreen>
      <SafeKeyboardAwareScrollView
        style={styles.flex}
        contentContainerStyle={[styles.content, { paddingTop: insets.top + spacing.xl }]}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
        bottomOffset={20}
      >
          <View style={styles.iconContainer}>
            <MaterialCommunityIcons name="email-lock-outline" size={48} color={colors.accent.primary} />
          </View>
          <Text style={styles.title}>Forgot password?</Text>
          <Text style={styles.subtitle}>
            Enter your email and we'll send you a code to reset your password
          </Text>

          {error ? (
            <GlassCard variant="bordered" accentColor={colors.accent.error} style={styles.errorCard}>
              <Text style={styles.errorText}>{error}</Text>
            </GlassCard>
          ) : null}

          <GlassInput
            placeholder="Email"
            value={emailAddress}
            onChangeText={setEmailAddress}
            autoCapitalize="none"
            keyboardType="email-address"
            autoComplete="email"
            iconLeft="email-outline"
          />

          <View style={styles.spacer} />

          <GlassButton
            variant="primary"
            size="lg"
            onPress={onRequestReset}
            loading={isLoading}
            disabled={isLoading || !emailAddress}
          >
            Send Reset Code
          </GlassButton>

          <Pressable style={styles.backButton} onPress={() => router.back()}>
            <Text style={styles.linkText}>Back to sign in</Text>
          </Pressable>
      </SafeKeyboardAwareScrollView>
    </GlassScreen>
  );
}

const styles = StyleSheet.create({
  flex: {
    flex: 1,
  },
  content: {
    flexGrow: 1,
    justifyContent: "center",
    paddingHorizontal: spacing.lg,
  },
  iconContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: `${colors.accent.primary}20`,
    justifyContent: "center",
    alignItems: "center",
    alignSelf: "center",
    marginBottom: spacing.lg,
  },
  title: {
    ...typography.displaySmall,
    color: colors.text.primary,
    textAlign: "center",
    marginBottom: spacing.xs,
  },
  subtitle: {
    ...typography.bodyLarge,
    color: colors.text.secondary,
    textAlign: "center",
    marginBottom: spacing.xl,
  },
  errorCard: {
    marginBottom: spacing.md,
  },
  errorText: {
    ...typography.bodySmall,
    color: colors.accent.error,
  },
  successText: {
    ...typography.bodySmall,
    color: colors.accent.primary,
  },
  spacer: {
    height: spacing.lg,
  },
  backButton: {
    alignItems: "center",
    marginTop: spacing.lg,
  },
  linkText: {
    ...typography.bodyMedium,
    color: colors.accent.primary,
    fontWeight: "600",
  },
});
