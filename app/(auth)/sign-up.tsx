import { useSignUp, useOAuth } from "@clerk/clerk-expo";
import { Link, useRouter } from "expo-router";
import { useState, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  Pressable,
  ScrollView,
  Image,
} from "react-native";
import * as Haptics from "expo-haptics";
import * as WebBrowser from "expo-web-browser";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import {
  GlassScreen,
  GlassCard,
  GlassButton,
  GlassInput,
  colors,
  typography,
  spacing,
  borderRadius,
} from "@/components/ui/glass";

WebBrowser.maybeCompleteAuthSession();

export default function SignUpScreen() {
  const { signUp, setActive, isLoaded } = useSignUp();
  const { startOAuthFlow: startGoogleOAuth } = useOAuth({ strategy: "oauth_google" });
  const { startOAuthFlow: startAppleOAuth } = useOAuth({ strategy: "oauth_apple" });
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const [emailAddress, setEmailAddress] = useState("");
  const [password, setPassword] = useState("");
  const [pendingVerification, setPendingVerification] = useState(false);
  const [code, setCode] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");

  const onOAuthPress = useCallback(async (provider: "google" | "apple") => {
    try {
      setIsLoading(true);
      setError("");
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

      const oAuthFlow = provider === "google" ? startGoogleOAuth : startAppleOAuth;
      const { createdSessionId, setActive: setActiveSession } = await oAuthFlow();

      if (createdSessionId) {
        await setActiveSession!({ session: createdSessionId });
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        router.replace("/onboarding/welcome");
      }
    } catch (err: any) {
      const message = err?.errors?.[0]?.message || `${provider} sign up failed`;
      setError(message);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    } finally {
      setIsLoading(false);
    }
  }, [startGoogleOAuth, startAppleOAuth, router]);

  const onSignUpPress = useCallback(async () => {
    if (!isLoaded) return;

    setIsLoading(true);
    setError("");

    try {
      await signUp.create({
        emailAddress,
        password,
      });

      await signUp.prepareEmailAddressVerification({ strategy: "email_code" });
      setPendingVerification(true);
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    } catch (err: any) {
      const message = err?.errors?.[0]?.message || "Sign up failed";
      setError(message);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    } finally {
      setIsLoading(false);
    }
  }, [isLoaded, emailAddress, password]);

  const onVerifyPress = useCallback(async () => {
    if (!isLoaded) return;

    setIsLoading(true);
    setError("");

    try {
      const signUpAttempt = await signUp.attemptEmailAddressVerification({
        code,
      });

      if (signUpAttempt.status === "complete") {
        await setActive({ session: signUpAttempt.createdSessionId });
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        router.replace("/onboarding/welcome");
      } else {
        setError("Verification incomplete");
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      }
    } catch (err: any) {
      const message = err?.errors?.[0]?.message || "Verification failed";
      setError(message);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    } finally {
      setIsLoading(false);
    }
  }, [isLoaded, code]);

  if (pendingVerification) {
    return (
      <GlassScreen>
        <KeyboardAvoidingView
          behavior={Platform.OS === "ios" ? "padding" : "height"}
          style={styles.flex}
        >
          <View style={[styles.content, { paddingTop: insets.top + spacing.xl }]}>
            <View style={styles.iconContainer}>
              <MaterialCommunityIcons name="email-check-outline" size={48} color={colors.accent.primary} />
            </View>
            <Text style={styles.title}>Verify your email</Text>
            <Text style={styles.subtitle}>
              We sent a verification code to {emailAddress}
            </Text>

            {error ? (
              <GlassCard variant="bordered" accentColor={colors.accent.error} style={styles.errorCard}>
                <Text style={styles.errorText}>{error}</Text>
              </GlassCard>
            ) : null}

            <GlassInput
              placeholder="Verification code"
              value={code}
              onChangeText={setCode}
              keyboardType="number-pad"
              iconLeft="shield-key-outline"
            />

            <View style={styles.spacer} />

            <GlassButton
              variant="primary"
              size="lg"
              onPress={onVerifyPress}
              loading={isLoading}
              disabled={isLoading || !code}
            >
              Verify
            </GlassButton>
          </View>
        </KeyboardAvoidingView>
      </GlassScreen>
    );
  }

  return (
    <GlassScreen>
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={styles.flex}
      >
        <ScrollView
          contentContainerStyle={[
            styles.content,
            { paddingTop: insets.top + spacing["2xl"], paddingBottom: insets.bottom + spacing.lg },
          ]}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <Image
            source={require("@/assets/logo.png")}
            style={styles.logo}
            resizeMode="contain"
          />
          <Text style={styles.title}>Create account</Text>
          <Text style={styles.subtitle}>Start your budget-first shopping journey</Text>

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

          <View style={{ height: spacing.sm }} />

          <GlassInput
            placeholder="Password"
            value={password}
            onChangeText={setPassword}
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
            onPress={onSignUpPress}
            loading={isLoading}
            disabled={isLoading || !emailAddress || !password}
          >
            Create Account
          </GlassButton>

          {/* Divider */}
          <View style={styles.divider}>
            <View style={styles.dividerLine} />
            <Text style={styles.dividerText}>or sign up with</Text>
            <View style={styles.dividerLine} />
          </View>

          {/* OAuth Buttons */}
          <View style={styles.oauthContainer}>
            <Pressable
              style={[styles.oauthButton, isLoading && styles.buttonDisabled]}
              onPress={() => onOAuthPress("google")}
              disabled={isLoading}
            >
              <MaterialCommunityIcons name="google" size={20} color={colors.text.primary} />
              <Text style={styles.oauthButtonText}>Google</Text>
            </Pressable>

            {Platform.OS === "ios" && (
              <Pressable
                style={[styles.oauthButton, isLoading && styles.buttonDisabled]}
                onPress={() => onOAuthPress("apple")}
                disabled={isLoading}
              >
                <MaterialCommunityIcons name="apple" size={20} color={colors.text.primary} />
                <Text style={styles.oauthButtonText}>Apple</Text>
              </Pressable>
            )}
          </View>

          {/* Footer */}
          <View style={styles.footer}>
            <Text style={styles.footerText}>Already have an account? </Text>
            <Link href="/(auth)/sign-in" asChild>
              <Pressable>
                <Text style={styles.linkText}>Sign in</Text>
              </Pressable>
            </Link>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
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
  logo: {
    width: 140,
    height: 97,
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
  spacer: {
    height: spacing.lg,
  },
  divider: {
    flexDirection: "row",
    alignItems: "center",
    marginVertical: spacing.lg,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: colors.glass.border,
  },
  dividerText: {
    ...typography.bodySmall,
    color: colors.text.tertiary,
    marginHorizontal: spacing.md,
  },
  oauthContainer: {
    flexDirection: "row",
    gap: spacing.sm,
    marginBottom: spacing.md,
  },
  oauthButton: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: spacing.sm,
    backgroundColor: colors.glass.background,
    borderWidth: 1,
    borderColor: colors.glass.border,
    borderRadius: borderRadius.lg,
    paddingVertical: spacing.md,
  },
  oauthButtonText: {
    ...typography.bodyMedium,
    color: colors.text.primary,
    fontWeight: "600",
  },
  buttonDisabled: {
    opacity: 0.5,
  },
  footer: {
    flexDirection: "row",
    justifyContent: "center",
    marginTop: spacing.lg,
  },
  footerText: {
    ...typography.bodyMedium,
    color: colors.text.secondary,
  },
  linkText: {
    ...typography.bodyMedium,
    color: colors.accent.primary,
    fontWeight: "600",
  },
});
