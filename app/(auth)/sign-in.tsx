import { useSignIn, useOAuth } from "@clerk/clerk-expo";
import { Link, useRouter } from "expo-router";
import { useState, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  Platform,
  ActivityIndicator,
  Pressable,
  Image,
} from "react-native";
import * as Haptics from "expo-haptics";
import * as WebBrowser from "expo-web-browser";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { SafeKeyboardAwareScrollView } from "@/lib/keyboard/safeKeyboardController";

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

export default function SignInScreen() {
  const { signIn, setActive, isLoaded } = useSignIn();
  const { startOAuthFlow: startGoogleOAuth } = useOAuth({ strategy: "oauth_google" });
  const { startOAuthFlow: startAppleOAuth } = useOAuth({ strategy: "oauth_apple" });
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const [emailAddress, setEmailAddress] = useState("");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [pendingVerification, setPendingVerification] = useState(false);
  const [code, setCode] = useState("");

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
        // Navigation handled by _layout.tsx useEffect
      }
    } catch (err: any) {
      const message = err?.errors?.[0]?.message || `${provider} sign in failed`;
      setError(message);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    } finally {
      setIsLoading(false);
    }
  }, [startGoogleOAuth, startAppleOAuth, router]);

  const onSignInPress = useCallback(async () => {
    if (!isLoaded) return;

    setIsLoading(true);
    setError("");

    try {
      // First, create the sign-in attempt with identifier only to check available strategies
      let signInAttempt = await signIn.create({
        identifier: emailAddress,
      });

      // Check if password strategy is available
      const passwordFactor = signInAttempt.supportedFirstFactors?.find(
        (factor) => factor.strategy === "password"
      );

      if (passwordFactor && password) {
        // Password strategy available - attempt password auth
        signInAttempt = await signIn.attemptFirstFactor({
          strategy: "password",
          password,
        });
      } else if (signInAttempt.status === "needs_first_factor") {
        // No password strategy - try email code
        const emailFactor = signInAttempt.supportedFirstFactors?.find(
          (factor) => factor.strategy === "email_code"
        );
        if (emailFactor && "emailAddressId" in emailFactor) {
          await signIn.prepareFirstFactor({
            strategy: "email_code",
            emailAddressId: emailFactor.emailAddressId,
          });
          setPendingVerification(true);
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
          return;
        } else {
          // No password, no email code - this account likely uses OAuth only
          setError("This account uses Google sign-in. Please use the Google button below.");
          return;
        }
      }

      if (signInAttempt.status === "complete") {
        await setActive({ session: signInAttempt.createdSessionId });
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        // Navigation handled by _layout.tsx useEffect
      } else if (signInAttempt.status === "needs_second_factor") {
        // Handle 2FA if needed
        setError("Two-factor authentication required. Please check your authenticator app.");
      } else {
        console.log("[SignIn] Unexpected status:", signInAttempt.status);
        setError(`Sign in incomplete (${signInAttempt.status}). Please try again.`);
      }
    } catch (err: any) {
      console.error("[SignIn] Error:", err);
      const clerkError = err?.errors?.[0];
      const message = clerkError?.longMessage || clerkError?.message || "Sign in failed";
      setError(message);
    } finally {
      setIsLoading(false);
    }
  }, [isLoaded, emailAddress, password, signIn]);

  const onVerifyPress = useCallback(async () => {
    if (!isLoaded) return;

    setIsLoading(true);
    setError("");

    try {
      const signInAttempt = await signIn.attemptFirstFactor({
        strategy: "email_code",
        code,
      });

      if (signInAttempt.status === "complete") {
        await setActive({ session: signInAttempt.createdSessionId });
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        // Navigation handled by _layout.tsx useEffect
      } else {
        setError("Verification incomplete. Please try again.");
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      }
    } catch (err: any) {
      const message = err?.errors?.[0]?.message || "Verification failed";
      setError(message);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    } finally {
      setIsLoading(false);
    }
  }, [isLoaded, code, signIn, setActive, router]);

  if (pendingVerification) {
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

          <Pressable style={styles.backButton} onPress={() => setPendingVerification(false)}>
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
        contentContainerStyle={[
          styles.content,
          { paddingTop: insets.top + spacing["2xl"], paddingBottom: insets.bottom + spacing.lg },
        ]}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
        bottomOffset={20}
      >
          <Image
            source={require("@/assets/logo.png")}
            style={styles.logo}
            resizeMode="contain"
          />
          <Text style={styles.title}>Welcome back</Text>
          <Text style={styles.subtitle}>Sign in to continue to Oja</Text>

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
            autoComplete="password"
            iconLeft="lock-outline"
            iconRight={showPassword ? "eye-off-outline" : "eye-outline"}
            onPressIconRight={() => setShowPassword(!showPassword)}
          />

          {/* Forgot Password */}
          <Pressable
            style={styles.forgotPassword}
            onPress={() => router.push("/(auth)/forgot-password")}
          >
            <Text style={styles.linkText}>Forgot password?</Text>
          </Pressable>

          <View style={styles.spacer} />

          <GlassButton
            variant="primary"
            size="lg"
            onPress={onSignInPress}
            loading={isLoading}
            disabled={isLoading || !emailAddress || !password}
          >
            Sign In
          </GlassButton>

          {/* Divider */}
          <View style={styles.divider}>
            <View style={styles.dividerLine} />
            <Text style={styles.dividerText}>or continue with</Text>
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
            <Text style={styles.footerText}>Don't have an account? </Text>
            <Link href="/(auth)/sign-up" asChild>
              <Pressable>
                <Text style={styles.linkText}>Sign up</Text>
              </Pressable>
            </Link>
          </View>
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
  forgotPassword: {
    alignSelf: "flex-end",
    marginTop: spacing.sm,
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
  backButton: {
    alignItems: "center",
    marginTop: spacing.md,
  },
});
