import { Link, useRouter } from "expo-router";
import {
  View,
  Text,
  Platform,
  Pressable,
  Image,
} from "react-native";
import * as WebBrowser from "expo-web-browser";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { SafeKeyboardAwareScrollView } from "@/lib/keyboard/safeKeyboardController";

import {
  GlassScreen,
  GlassCard,
  GlassButton,
  GlassInput,
  colors,
  spacing,
} from "@/components/ui/glass";
import { styles } from "./sign-in.styles";
import { useSignInFlow } from "./useSignInFlow";

const SAVED_AUTH_KEY = "oja_saved_auth";

WebBrowser.maybeCompleteAuthSession();

export default function SignInScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const {
    emailAddress, setEmailAddress,
    password, setPassword,
    isLoading, error, setError,
    showPassword, setShowPassword,
    pendingVerification, setPendingVerification,
    code, setCode,
    step, setStep,
    savedAuth, setSavedAuth,
    onOAuthPress, onContinuePress, onSignInPress, onVerifyPress,
  } = useSignInFlow();

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

