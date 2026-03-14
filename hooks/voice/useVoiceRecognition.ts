/**
 * Voice Recognition Hook
 *
 * Manages speech-to-text via expo-speech-recognition with graceful
 * degradation in Expo Go (native module unavailable).
 */

import { useCallback, useRef } from "react";
import * as Haptics from "expo-haptics";
import type { VoiceAssistantState } from "@/lib/voice/voiceTypes";

// ── Safe dynamic import of expo-speech-recognition ──────────────────
let SpeechRecognitionModule: Record<string, unknown> | null = null;
let useSpeechRecognitionEvent: ((event: string, cb: (...args: unknown[]) => void) => void) | null = null;

try {
  const mod = require("expo-speech-recognition");
  SpeechRecognitionModule = mod.ExpoSpeechRecognitionModule;
  useSpeechRecognitionEvent = mod.useSpeechRecognitionEvent;
} catch {
  // Native module not available (Expo Go) — voice will be disabled
}

export const STT_AVAILABLE = SpeechRecognitionModule != null;

// Noop hook when native module isn't available
const noopEventHook = (_event: string, _cb: (...args: unknown[]) => void) => {};
const useSpeechEvent = useSpeechRecognitionEvent ?? noopEventHook;

const RATE_LIMIT_MS = 6000; // 1 request per 6 seconds

export function useVoiceRecognition(
  setState: React.Dispatch<React.SetStateAction<VoiceAssistantState>>,
  onFinalTranscript: (transcript: string) => void,
) {
  const lastRequestTime = useRef(0);

  // ── Speech Recognition Events ──────────────────────────────────────
  useSpeechEvent("start", () => {
    setState((s: VoiceAssistantState) => ({ ...s, isListening: true, error: null }));
  });

  useSpeechEvent("end", () => {
    setState((s: VoiceAssistantState) => ({ ...s, isListening: false }));
  });

  useSpeechEvent("result", (...args) => {
    const event = args[0];
    if (!event || typeof event !== "object") return;

    const results = "results" in event && Array.isArray(event.results) ? event.results : [];
    const isFinal = "isFinal" in event && typeof event.isFinal === "boolean" ? event.isFinal : false;

    const transcript = results[0] && typeof results[0] === "object" && "transcript" in results[0] && typeof results[0].transcript === "string"
      ? results[0].transcript
      : "";

    if (isFinal) {
      setState((s) => ({ ...s, transcript, partialTranscript: "" }));
      onFinalTranscript(transcript);
    } else {
      setState((s) => ({ ...s, partialTranscript: transcript }));
    }
  });

  useSpeechEvent("error", (...args) => {
    const event = args[0];
    if (event && typeof event === "object") {
      const errorMsg = "error" in event && typeof event.error === "string" ? event.error : "";
      const message = "message" in event && typeof event.message === "string" ? event.message : "";
      console.warn("[useVoiceRecognition] STT error:", errorMsg, message);
    }
    setState((s) => ({
      ...s,
      isListening: false,
      error: "Couldn't hear you clearly. Tap the mic and try again?",
    }));
  });

  // ── Rate Limiting ──────────────────────────────────────────────────
  const checkRateLimit = useCallback((): boolean => {
    const now = Date.now();
    if (now - lastRequestTime.current < RATE_LIMIT_MS) {
      setState((s) => ({
        ...s,
        error: "Give me a moment before your next question.",
      }));
      return false;
    }
    lastRequestTime.current = now;
    return true;
  }, [setState]);

  // ── Start / Stop ──────────────────────────────────────────────────
  const startListening = useCallback(async (isAutoResume = false, isSpeaking = false) => {
    if (!STT_AVAILABLE) {
      setState((s) => ({
        ...s,
        error: "Voice requires a dev build. Not available in Expo Go.",
      }));
      return;
    }

    // Don't start listening while Tobi is still speaking (prevents echo)
    if (isSpeaking && isAutoResume) {
      return;
    }

    Haptics.impactAsync(
      isAutoResume
        ? Haptics.ImpactFeedbackStyle.Light
        : Haptics.ImpactFeedbackStyle.Medium
    );

    if (!SpeechRecognitionModule || typeof SpeechRecognitionModule.requestPermissionsAsync !== "function") {
      setState((s) => ({
        ...s,
        error: "Speech recognition module not available.",
      }));
      return;
    }

    const permResult = await SpeechRecognitionModule.requestPermissionsAsync();

    if (!permResult || typeof permResult !== "object" || !("granted" in permResult) || !permResult.granted) {
      setState((s) => ({
        ...s,
        error: "Microphone permission is needed for voice commands.",
      }));
      return;
    }

    setState((s) => ({
      ...s,
      isListening: true,
      transcript: "",
      partialTranscript: "",
      error: null,
    }));

    if (typeof SpeechRecognitionModule.start === "function") {
      SpeechRecognitionModule.start({
        lang: "en-GB",
        interimResults: true,
        continuous: false,
      });
    }
  }, [setState]);

  const stopListening = useCallback(() => {
    if (STT_AVAILABLE && SpeechRecognitionModule && typeof SpeechRecognitionModule.stop === "function") {
      SpeechRecognitionModule.stop();
    }
    setState((s) => ({ ...s, isListening: false }));
  }, [setState]);

  /** Cleanup on unmount — call from effect */
  const cleanupSTT = useCallback(() => {
    if (STT_AVAILABLE && SpeechRecognitionModule && typeof SpeechRecognitionModule.stop === "function") {
      SpeechRecognitionModule.stop();
    }
  }, []);

  return {
    startListening,
    stopListening,
    checkRateLimit,
    cleanupSTT,
  };
}
