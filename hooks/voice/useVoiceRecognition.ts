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
let SpeechRecognitionModule: any = null;
let useSpeechRecognitionEvent: any = null;

try {
  const mod = require("expo-speech-recognition");
  SpeechRecognitionModule = mod.ExpoSpeechRecognitionModule;
  useSpeechRecognitionEvent = mod.useSpeechRecognitionEvent;
} catch {
  // Native module not available (Expo Go) — voice will be disabled
}

export const STT_AVAILABLE = SpeechRecognitionModule != null;

// Noop hook when native module isn't available
const noopEventHook = (_event: string, _cb: (...args: any[]) => void) => {};
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

  useSpeechEvent("result", (event: any) => {
    const transcript = event.results[0]?.transcript || "";
    if (event.isFinal) {
      setState((s: VoiceAssistantState) => ({ ...s, transcript, partialTranscript: "" }));
      onFinalTranscript(transcript);
    } else {
      setState((s: VoiceAssistantState) => ({ ...s, partialTranscript: transcript }));
    }
  });

  useSpeechEvent("error", (event: any) => {
    console.warn("[useVoiceRecognition] STT error:", event.error, event.message);
    setState((s: VoiceAssistantState) => ({
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

    const permResult =
      await SpeechRecognitionModule.requestPermissionsAsync();

    if (!permResult.granted) {
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

    SpeechRecognitionModule.start({
      lang: "en-GB",
      interimResults: true,
      continuous: false,
    });
  }, [setState]);

  const stopListening = useCallback(() => {
    if (STT_AVAILABLE) {
      SpeechRecognitionModule.stop();
    }
    setState((s) => ({ ...s, isListening: false }));
  }, [setState]);

  /** Cleanup on unmount — call from effect */
  const cleanupSTT = useCallback(() => {
    if (STT_AVAILABLE) {
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
