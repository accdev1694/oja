import { useState, useCallback, useEffect } from "react";
import { useSignIn, useOAuth } from "@clerk/clerk-expo";
import AsyncStorage from "@react-native-async-storage/async-storage";
import * as Haptics from "expo-haptics";

const SAVED_AUTH_KEY = "oja_saved_auth";

interface SavedAuth {
  email: string;
  method: "password" | "google";
}

export function useSignInFlow() {
  const { signIn, setActive, isLoaded } = useSignIn();
  const { startOAuthFlow: startGoogleOAuth } = useOAuth({ strategy: "oauth_google" });
  const { startOAuthFlow: startAppleOAuth } = useOAuth({ strategy: "oauth_apple" });

  const [emailAddress, setEmailAddress] = useState("");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [pendingVerification, setPendingVerification] = useState(false);
  const [code, setCode] = useState("");
  const [step, setStep] = useState<"email" | "password">("email");
  const [savedAuth, setSavedAuth] = useState<SavedAuth | null>(null);

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
        if (emailAddress) {
          AsyncStorage.setItem(SAVED_AUTH_KEY, JSON.stringify({ email: emailAddress, method: "google" })).catch(() => {});
        }
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      }
    } catch (err: unknown) {
      const clerkErr = err as { errors?: { message?: string }[] };
      const message = clerkErr?.errors?.[0]?.message || `${provider} sign in failed`;
      setError(message);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    } finally {
      setIsLoading(false);
    }
  }, [startGoogleOAuth, startAppleOAuth, emailAddress]);

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

      AsyncStorage.setItem(SAVED_AUTH_KEY, JSON.stringify({ email: emailAddress, method: "google" })).catch(() => {});
      setSavedAuth({ email: emailAddress, method: "google" });
      setIsLoading(false);
      onOAuthPress("google");
    } catch (err: unknown) {
      console.error("[SignIn] Error:", err);
      const clerkErr = err as { errors?: { longMessage?: string; message?: string; code?: string }[] };
      const clerkError = clerkErr?.errors?.[0];
      const errCode = clerkError?.code || "";
      let message;
      if (errCode === "form_identifier_not_found") {
        message = "No account found with this email. Check the address or sign up.";
      } else if (errCode === "form_param_format_invalid") {
        message = "Please enter a valid email address.";
      } else {
        message = clerkError?.longMessage || clerkError?.message || "Something went wrong. Please try again.";
      }
      setError(message);
    } finally {
      setIsLoading(false);
    }
  }, [isLoaded, emailAddress, signIn, onOAuthPress]);

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
  }, [isLoaded, code, signIn, setActive]);

  return {
    emailAddress,
    setEmailAddress,
    password,
    setPassword,
    isLoading,
    error,
    setError,
    showPassword,
    setShowPassword,
    pendingVerification,
    setPendingVerification,
    code,
    setCode,
    step,
    setStep,
    savedAuth,
    setSavedAuth,
    onOAuthPress,
    onContinuePress,
    onSignInPress,
    onVerifyPress,
  };
}
