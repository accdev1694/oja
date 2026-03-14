import { useSignIn, useOAuth } from "@clerk/clerk-expo";
import { Link, useRouter } from "expo-router";
import { useState, useCallback, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  Platform,
  Pressable,
  Image,
} from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
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

const SAVED_AUTH_KEY = "oja_saved_auth";

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
  const [step, setStep] = useState<"email" | "password">("email");
  const [savedAuth, setSavedAuth] = useState<{ email: string; method: "password" | "google" } | null>(null);

  // Load saved auth on mount
  useEffect(() => {
    AsyncStorage.getItem(SAVED_AUTH_KEY)
      .then((value) => {
        if (value) {
          const parsed = JSON.parse(value);
          setSavedAuth(parsed);
          setEmailAddress(parsed.email);
        }
      })
      .catch(() => {});
  }, []);

  const onOAuthPress = useCallback(async (provider: "google" | "apple") => {
    try {
      setIsLoading(true);
      setError("");
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

      const oAuthFlow = provider === "google" ? startGoogleOAuth : startAppleOAuth;
      const { createdSessionId, setActive: setActiveSession } = await oAuthFlow();

      if (createdSessionId) {
        await setActiveSession!({ session: createdSessionId });
        // Save auth method for returning-user experience
        if (emailAddress) {
          AsyncStorage.setItem(SAVED_AUTH_KEY, JSON.stringify({ email: emailAddress, method: "google" })).catch(() => {});
        }
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        // Navigation handled by _layout.tsx useEffect
      }
    } catch (err: unknown) {
      const clerkErr = err as { errors?: { message?: string }[] };
      const message = clerkErr?.errors?.[0]?.message || `${provider} sign in failed`;
      setError(message);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    } finally {
      setIsLoading(false);
    }
  }, [startGoogleOAuth, startAppleOAuth, router]);

  // Step 1: Check what auth strategies are available for this email
  const onContinuePress = useCallback(async () => {
    if (!isLoaded) return;

    const trimmed = emailAddress.trim();
    if (!trimmed || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmed)) {
      setError("Please enter a valid email address.");
      return;
    }

    setIsLoading(true);
    setError("");

    try {
      const signInAttempt = await signIn.create({
        identifier: trimmed,
      });

      const passwordFactor = signInAttempt.supportedFirstFactors?.find(
        (factor) => factor.strategy === "password"
      );

      if (passwordFactor) {
        // Account has password auth - show password field and save method
        AsyncStorage.setItem(SAVED_AUTH_KEY, JSON.stringify({ email: emailAddress, method: "password" })).catch(() => {});
        setSavedAuth({ email: emailAddress, method: "password" });
        setStep("password");
        setIsLoading(false);
        return;
      }

      if (signInAttempt.status === "needs_first_factor") {
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
        }
      }

      // No password or email code - OAuth-only account, save and auto-redirect to Google
      AsyncStorage.setItem(SAVED_AUTH_KEY, JSON.stringify({ email: emailAddress, method: "google" })).catch(() => {});
      setSavedAuth({ email: emailAddress, method: "google" });
      setIsLoading(false);
      onOAuthPress("google");
    } catch (err: unknown) {
      console.error("[SignIn] Error:", err);
      const clerkErr = err as { errors?: { longMessage?: string; message?: string; code?: string }[] };
      const clerkError = clerkErr?.errors?.[0];
      const code = clerkError?.code || "";
      let message;
      if (code === "form_identifier_not_found") {
        message = "No account found with this email. Check the address or sign up.";
      } else if (code === "form_param_format_invalid") {
        message = "Please enter a valid email address.";
      } else {
        message = clerkError?.longMessage || clerkError?.message || "Something went wrong. Please try again.";
      }
      setError(message);
    } finally {
      setIsLoading(false);
    }
  }, [isLoaded, emailAddress, signIn, onOAuthPress]);

  // Step 2: Submit password
  const onSignInPress = useCallback(async () => {
    if (!isLoaded) return;

    setIsLoading(true);
    setError("");

    try {
      const signInAttempt = await signIn.create({
        identifier: emailAddress,
        password,
      });

      if (signInAttempt.status === "complete") {
        await setActive({ session: signInAttempt.createdSessionId });
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      } else if (signInAttempt.status === "needs_second_factor") {
        setError("Two-factor authentication required. Please check your authenticator app.");
      } else {
        setError(`Sign in incomplete (${signInAttempt.status}). Please try again.`);
      }
    } catch (err: unknown) {
      console.error("[SignIn] Error:", err);
      const clerkErr = err as { errors?: { longMessage?: string; message?: string }[] };
      const clerkError = clerkErr?.errors?.[0];
      const message = clerkError?.longMessage || clerkError?.message || "Sign in failed";
      setError(message);
    } finally {
      setIsLoading(false);
    }
  }, [isLoaded, emailAddress, password, signIn, setActive]);

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
    } catch (err: unknown) {
      const clerkErr = err as { errors?: { message?: string }[] };
      const message = clerkErr?.errors?.[0]?.message || "Verification failed";
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

          {/* Returning user: show saved account card */}
          {savedAuth && step === "email" ? (
            <>
              <GlassCard style={styles.savedAccountCard}>
                <View style={styles.savedAccountRow}>
                  <View style={styles.savedAccountIcon}>
                    <MaterialCommunityIcons
                      name={savedAuth.method === "google" ? "google" : "account-circle"}
                      size={28}
                      color={colors.accent.primary}
                    />
                  </View>
                  <View style={styles.savedAccountInfo}>
                    <Text style={styles.savedAccountEmail}>{savedAuth.email}</Text>
                    <Text style={styles.savedAccountMethod}>
                      {savedAuth.method === "google" ? "Google account" : "Email & password"}
                    </Text>
                  </View>
                </View>
              </GlassCard>

              <View style={styles.spacer} />

              {savedAuth.method === "google" ? (
                <GlassButton
                  variant="primary"
                  size="lg"
                  onPress={() => onOAuthPress("google")}
                  loading={isLoading}
                  disabled={isLoading}
                >
                  Continue with Google
                </GlassButton>
              ) : (
                <>
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
                    disabled={isLoading || !password}
                  >
                    Sign In
                  </GlassButton>
                </>
              )}

              <Pressable
                style={styles.backButton}
                onPress={() => {
                  setSavedAuth(null);
                  setEmailAddress("");
                  setPassword("");
                  setError("");
                  AsyncStorage.removeItem(SAVED_AUTH_KEY).catch(() => {});
                }}
              >
                <Text style={styles.linkText}>Use a different account</Text>
              </Pressable>
            </>
          ) : (
            <>
              {/* Fresh sign-in: identifier-first flow */}
              <GlassInput
                placeholder="Email"
                value={emailAddress}
                onChangeText={(text) => {
                  setEmailAddress(text);
                  if (step === "password") {
                    setStep("email");
                    setPassword("");
                  }
                }}
                autoCapitalize="none"
                keyboardType="email-address"
                autoComplete="email"
                iconLeft="email-outline"
              />

              {step === "password" ? (
                <>
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
                    disabled={isLoading || !password}
                  >
                    Sign In
                  </GlassButton>

                  <Pressable
                    style={styles.backButton}
                    onPress={() => { setStep("email"); setPassword(""); setError(""); }}
                  >
                    <Text style={styles.linkText}>Use a different email</Text>
                  </Pressable>
                </>
              ) : (
                <>
                  <View style={styles.spacer} />

                  <GlassButton
                    variant="primary"
                    size="lg"
                    onPress={onContinuePress}
                    loading={isLoading}
                    disabled={isLoading || !emailAddress}
                  >
                    Continue
                  </GlassButton>
                </>
              )}
            </>
          )}

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
            <Text style={styles.footerText}>Don&apos;t have an account? </Text>
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
  savedAccountCard: {
    marginBottom: spacing.sm,
  },
  savedAccountRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
  },
  savedAccountIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: `${colors.accent.primary}15`,
    justifyContent: "center",
    alignItems: "center",
  },
  savedAccountInfo: {
    flex: 1,
  },
  savedAccountEmail: {
    ...typography.bodyMedium,
    color: colors.text.primary,
    fontWeight: "600",
  },
  savedAccountMethod: {
    ...typography.bodySmall,
    color: colors.text.tertiary,
    marginTop: 2,
  },
});
