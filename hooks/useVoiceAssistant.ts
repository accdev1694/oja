/**
 * Voice Assistant Hook
 *
 * Manages the full voice assistant lifecycle:
 * - Speech recognition via expo-speech-recognition
 * - Sending transcripts to the voiceAssistant Convex action
 * - Conversation history (multi-turn, max 6 turns)
 * - TTS via Google Cloud Neural2 (fallback: expo-speech)
 * - Continuous conversation mode
 * - Rate limiting (1 req / 6s, 200/day)
 *
 * Gracefully degrades in Expo Go (native module unavailable).
 */

import { useState, useCallback, useRef, useEffect } from "react";
import * as Speech from "expo-speech";
import { useAction } from "convex/react";
import { api } from "@/convex/_generated/api";
import * as Haptics from "expo-haptics";
import AsyncStorage from "@react-native-async-storage/async-storage";

// ── Safe dynamic import of expo-av ─────────────────────────────────────
// The native module crashes if not in the dev build, so we try/catch.

let AudioModule: any = null;

try {
  const mod = require("expo-av");
  AudioModule = mod.Audio;
} catch {
  // Native module not available — will fall back to device TTS
}

const AUDIO_AVAILABLE = AudioModule != null;
console.log("[Voice] expo-av available:", AUDIO_AVAILABLE);
import type {
  ConversationMessage,
  PendingAction,
  VoiceAssistantState,
} from "@/lib/voice/voiceTypes";
import type { Id } from "@/convex/_generated/dataModel";

// ── Safe dynamic import of expo-speech-recognition ──────────────────
// The native module crashes in Expo Go, so we try/catch the require.

let SpeechRecognitionModule: any = null;
let useSpeechRecognitionEvent: any = null;

try {
  const mod = require("expo-speech-recognition");
  SpeechRecognitionModule = mod.ExpoSpeechRecognitionModule;
  useSpeechRecognitionEvent = mod.useSpeechRecognitionEvent;
} catch {
  // Native module not available (Expo Go) — voice will be disabled
}

const STT_AVAILABLE = SpeechRecognitionModule != null;

// Noop hook when native module isn't available
const noopEventHook = (_event: string, _cb: (...args: any[]) => void) => {};
const useSpeechEvent = useSpeechRecognitionEvent ?? noopEventHook;

const MAX_HISTORY = 12; // 6 turns (user + model each)
const RATE_LIMIT_MS = 6000; // 1 request per 6 seconds
const DAILY_LIMIT = 200;
const DAILY_COUNT_KEY = "oja_voice_daily_count";
const DAILY_DATE_KEY = "oja_voice_daily_date";

interface UseVoiceAssistantOptions {
  currentScreen: string;
  activeListId?: Id<"shoppingLists">;
  activeListName?: string;
  userName?: string;
  ttsEnabled?: boolean;
}

export function useVoiceAssistant(options: UseVoiceAssistantOptions) {
  const [state, setState] = useState<VoiceAssistantState>({
    isListening: false,
    isProcessing: false,
    transcript: "",
    partialTranscript: "",
    response: "",
    pendingAction: null,
    error: null,
    conversationHistory: [],
    isSheetOpen: false,
  });

  const voiceAssistant = useAction(api.ai.voiceAssistant);
  const executeAction = useAction(api.ai.executeVoiceAction);
  const textToSpeech = useAction(api.ai.textToSpeech);
  const historyRef = useRef<ConversationMessage[]>([]);
  const lastRequestTime = useRef(0);
  const ttsEnabled = options.ttsEnabled ?? true;
  const sheetOpenRef = useRef(false); // Track sheet state for continuous mode
  const startListeningRef = useRef<((isAutoResume?: boolean) => Promise<void>) | null>(null); // For auto-listen callback
  const soundRef = useRef<any>(null); // For audio playback cleanup (expo-av Sound)

  // ── Neural TTS with fallback to device TTS ────────────────────────────

  const speakText = useCallback(
    async (text: string, onDone?: () => void) => {
      console.log("[Voice] speakText called with:", text.substring(0, 50) + "...");

      // Only try neural TTS if expo-av is available
      if (AUDIO_AVAILABLE) {
        console.log("[Voice] Trying neural TTS...");
        try {
          // Try Google Cloud / Azure Neural TTS first
          const result = await textToSpeech({ text, voiceGender: "MALE" });
          console.log("[Voice] TTS result:", result.provider, result.error ? `Error: ${result.error}` : "Success");

          if (result.audioBase64) {
            // Play the neural voice audio
            const { sound } = await AudioModule.Sound.createAsync(
              { uri: `data:audio/mp3;base64,${result.audioBase64}` },
              { shouldPlay: true }
            );
            soundRef.current = sound;

            // Set up completion callback
            sound.setOnPlaybackStatusUpdate((status: any) => {
              if (status.isLoaded && status.didJustFinish) {
                sound.unloadAsync();
                soundRef.current = null;
                onDone?.();
              }
            });
            return;
          }
        } catch (error) {
          console.warn("[speakText] Neural TTS failed, using device TTS:", error);
        }
      }

      // Fallback to device TTS (expo-speech) — try to find best voice
      console.log("[Voice] Using device TTS fallback...");
      try {
        const voices = await Speech.getAvailableVoicesAsync();
        console.log("[Voice] Available voices count:", voices.length);
        // Prefer enhanced/premium British voices
        const britishVoice = voices.find(
          (v) =>
            v.language?.startsWith("en-GB") &&
            (v.quality === "Enhanced" ||
              v.name?.includes("Enhanced") ||
              v.name?.includes("Premium") ||
              v.identifier?.includes("premium") ||
              v.identifier?.includes("enhanced"))
        ) ||
          voices.find((v) => v.language?.startsWith("en-GB")) ||
          undefined;

        Speech.speak(text, {
          language: "en-GB",
          voice: britishVoice?.identifier,
          rate: 0.92,
          pitch: 1.05,
          onDone,
        });
      } catch {
        // If voice selection fails, use defaults
        Speech.speak(text, {
          language: "en-GB",
          rate: 0.92,
          pitch: 1.05,
          onDone,
        });
      }
    },
    [textToSpeech]
  );

  // Stop any playing audio
  const stopSpeaking = useCallback(async () => {
    Speech.stop();
    if (soundRef.current) {
      try {
        await soundRef.current.stopAsync();
        await soundRef.current.unloadAsync();
      } catch {
        // Ignore cleanup errors
      }
      soundRef.current = null;
    }
  }, []);

  // ── Speech Recognition Events ──────────────────────────────────────

  useSpeechEvent("start", () => {
    console.log("[Voice] Speech recognition started");
    setState((s: VoiceAssistantState) => ({ ...s, isListening: true, error: null }));
  });

  useSpeechEvent("end", () => {
    setState((s: VoiceAssistantState) => ({ ...s, isListening: false }));
  });

  useSpeechEvent("result", (event: any) => {
    const transcript = event.results[0]?.transcript || "";
    console.log("[Voice] Result:", { transcript, isFinal: event.isFinal });
    if (event.isFinal) {
      setState((s: VoiceAssistantState) => ({ ...s, transcript, partialTranscript: "" }));
      processTranscript(transcript);
    } else {
      setState((s: VoiceAssistantState) => ({ ...s, partialTranscript: transcript }));
    }
  });

  useSpeechEvent("error", (event: any) => {
    console.warn("[useVoiceAssistant] STT error:", event.error, event.message);
    setState((s: VoiceAssistantState) => ({
      ...s,
      isListening: false,
      error: "Couldn't hear you clearly. Tap the mic and try again?",
    }));
  });

  // ── Rate Limiting ──────────────────────────────────────────────────

  const checkRateLimit = useCallback(async (): Promise<boolean> => {
    // Per-request throttle
    const now = Date.now();
    if (now - lastRequestTime.current < RATE_LIMIT_MS) {
      setState((s) => ({
        ...s,
        error: "Give me a moment before your next question.",
      }));
      return false;
    }

    // Daily limit
    try {
      const storedDate = await AsyncStorage.getItem(DAILY_DATE_KEY);
      const today = new Date().toDateString();

      if (storedDate !== today) {
        await AsyncStorage.setItem(DAILY_DATE_KEY, today);
        await AsyncStorage.setItem(DAILY_COUNT_KEY, "1");
        return true;
      }

      const count = parseInt(
        (await AsyncStorage.getItem(DAILY_COUNT_KEY)) || "0",
        10
      );
      if (count >= DAILY_LIMIT) {
        setState((s) => ({
          ...s,
          error:
            "I've reached my daily limit. I'll be back tomorrow — check the app for now!",
        }));
        return false;
      }

      await AsyncStorage.setItem(DAILY_COUNT_KEY, String(count + 1));
    } catch {
      // If AsyncStorage fails, allow the request
    }

    lastRequestTime.current = now;
    return true;
  }, []);

  // ── Core Actions ───────────────────────────────────────────────────

  const startListening = useCallback(async (isAutoResume = false) => {
    console.log("[Voice] startListening called, STT_AVAILABLE:", STT_AVAILABLE);

    if (!STT_AVAILABLE) {
      setState((s) => ({
        ...s,
        error: "Voice requires a dev build. Not available in Expo Go.",
      }));
      return;
    }

    // Softer haptic for auto-resume, stronger for manual tap
    Haptics.impactAsync(
      isAutoResume
        ? Haptics.ImpactFeedbackStyle.Light
        : Haptics.ImpactFeedbackStyle.Medium
    );

    const permResult =
      await SpeechRecognitionModule.requestPermissionsAsync();
    console.log("[Voice] Permission result:", permResult);

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

    console.log("[Voice] Starting speech recognition...");
    SpeechRecognitionModule.start({
      lang: "en-GB",
      interimResults: true,
      continuous: false,
    });
  }, []);

  // Store ref for use in TTS onDone callback
  useEffect(() => {
    startListeningRef.current = startListening;
  }, [startListening]);

  const stopListening = useCallback(() => {
    if (STT_AVAILABLE) {
      SpeechRecognitionModule.stop();
    }
    setState((s) => ({ ...s, isListening: false }));
  }, []);

  const processTranscript = useCallback(
    async (transcript: string) => {
      if (!transcript.trim()) return;

      const allowed = await checkRateLimit();
      if (!allowed) return;

      setState((s) => ({ ...s, isProcessing: true, error: null }));

      try {
        const result = await voiceAssistant({
          transcript,
          currentScreen: options.currentScreen,
          activeListId: options.activeListId,
          activeListName: options.activeListName,
          userName: options.userName,
          conversationHistory: historyRef.current,
        });

        // Update conversation history
        historyRef.current.push({ role: "user", text: transcript });
        historyRef.current.push({ role: "model", text: result.text });
        if (historyRef.current.length > MAX_HISTORY) {
          historyRef.current = historyRef.current.slice(-MAX_HISTORY);
        }

        const hasPendingAction = !!result.pendingAction;

        setState((s) => ({
          ...s,
          isProcessing: false,
          response: result.text,
          pendingAction: result.pendingAction || null,
          conversationHistory: [...historyRef.current],
        }));

        // TTS with auto-resume listening when done
        console.log("[Voice] TTS check:", { ttsEnabled, hasText: !!result.text });
        if (ttsEnabled && result.text) {
          speakText(result.text, () => {
            // Auto-resume listening if sheet is open and no pending action
            if (sheetOpenRef.current && !hasPendingAction && startListeningRef.current) {
              setTimeout(() => {
                if (sheetOpenRef.current) {
                  startListeningRef.current?.(true); // true = auto-resume (softer haptic)
                }
              }, 500);
            }
          });
        } else if (!hasPendingAction && sheetOpenRef.current) {
          // No TTS, but still auto-resume if appropriate
          setTimeout(() => {
            if (sheetOpenRef.current) {
              startListeningRef.current?.(true);
            }
          }, 500);
        }

        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      } catch (error) {
        console.error("[useVoiceAssistant] Action failed:", error);
        setState((s) => ({
          ...s,
          isProcessing: false,
          error: "Something went wrong. Try again?",
        }));
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      }
    },
    [
      options.currentScreen,
      options.activeListId,
      options.activeListName,
      options.userName,
      ttsEnabled,
      speakText,
      voiceAssistant,
      checkRateLimit,
    ]
  );

  const confirmAction = useCallback(async () => {
    if (!state.pendingAction) return;

    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setState((s) => ({ ...s, isProcessing: true }));

    try {
      const result = await executeAction({
        actionName: state.pendingAction.action,
        params: state.pendingAction.params,
      });

      const message = result?.message || "Done!";
      setState((s) => ({
        ...s,
        isProcessing: false,
        pendingAction: null,
        response: message,
      }));

      if (ttsEnabled) {
        speakText(message, () => {
          // Auto-resume listening after action confirmation
          if (sheetOpenRef.current && startListeningRef.current) {
            setTimeout(() => {
              if (sheetOpenRef.current) {
                startListeningRef.current?.(true);
              }
            }, 500);
          }
        });
      } else if (sheetOpenRef.current) {
        setTimeout(() => {
          if (sheetOpenRef.current) {
            startListeningRef.current?.(true);
          }
        }, 500);
      }

      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch {
      setState((s) => ({
        ...s,
        isProcessing: false,
        error: "Couldn't complete that. Try again?",
      }));
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    }
  }, [state.pendingAction, executeAction, ttsEnabled, speakText]);

  const cancelAction = useCallback(() => {
    setState((s) => ({ ...s, pendingAction: null }));
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    // Auto-resume listening after cancel
    if (sheetOpenRef.current && startListeningRef.current) {
      setTimeout(() => {
        if (sheetOpenRef.current) {
          startListeningRef.current?.(true);
        }
      }, 300);
    }
  }, []);

  const openSheet = useCallback(() => {
    sheetOpenRef.current = true;
    setState((s) => ({ ...s, isSheetOpen: true }));
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  }, []);

  const closeSheet = useCallback(() => {
    sheetOpenRef.current = false; // Stop continuous mode
    stopSpeaking(); // Stop neural TTS or device TTS
    if (STT_AVAILABLE) {
      SpeechRecognitionModule.stop();
    }
    setState((s) => ({ ...s, isSheetOpen: false, isListening: false }));
  }, [stopSpeaking]);

  const resetConversation = useCallback(() => {
    historyRef.current = [];
    setState((s) => ({
      ...s,
      transcript: "",
      partialTranscript: "",
      response: "",
      pendingAction: null,
      error: null,
      conversationHistory: [],
    }));
  }, []);

  // Clean up on unmount
  useEffect(() => {
    return () => {
      Speech.stop();
      if (soundRef.current) {
        soundRef.current.unloadAsync();
      }
      if (STT_AVAILABLE) {
        SpeechRecognitionModule.stop();
      }
    };
  }, []);

  return {
    ...state,
    isAvailable: STT_AVAILABLE,
    startListening,
    stopListening,
    confirmAction,
    cancelAction,
    openSheet,
    closeSheet,
    resetConversation,
  };
}
