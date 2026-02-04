/**
 * Voice Assistant Hook
 *
 * Manages the full voice assistant lifecycle:
 * - Speech recognition via expo-speech-recognition
 * - Sending transcripts to the voiceAssistant Convex action
 * - Conversation history (multi-turn, max 6 turns)
 * - TTS via expo-speech
 * - Action confirmation flow
 * - Rate limiting (1 req / 6s, 200/day)
 */

import { useState, useCallback, useRef, useEffect } from "react";
import {
  ExpoSpeechRecognitionModule,
  useSpeechRecognitionEvent,
} from "expo-speech-recognition";
import * as Speech from "expo-speech";
import { useAction } from "convex/react";
import { api } from "@/convex/_generated/api";
import * as Haptics from "expo-haptics";
import AsyncStorage from "@react-native-async-storage/async-storage";
import type {
  ConversationMessage,
  PendingAction,
  VoiceAssistantState,
  INITIAL_VOICE_STATE,
} from "@/lib/voice/voiceTypes";
import type { Id } from "@/convex/_generated/dataModel";

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
  const historyRef = useRef<ConversationMessage[]>([]);
  const lastRequestTime = useRef(0);
  const ttsEnabled = options.ttsEnabled ?? true;

  // ── Speech Recognition Events ──────────────────────────────────────

  useSpeechRecognitionEvent("start", () => {
    setState((s) => ({ ...s, isListening: true, error: null }));
  });

  useSpeechRecognitionEvent("end", () => {
    setState((s) => ({ ...s, isListening: false }));
  });

  useSpeechRecognitionEvent("result", (event) => {
    const transcript = event.results[0]?.transcript || "";
    if (event.isFinal) {
      setState((s) => ({ ...s, transcript, partialTranscript: "" }));
      processTranscript(transcript);
    } else {
      setState((s) => ({ ...s, partialTranscript: transcript }));
    }
  });

  useSpeechRecognitionEvent("error", (event) => {
    console.warn("[useVoiceAssistant] STT error:", event.error, event.message);
    setState((s) => ({
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

  const startListening = useCallback(async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

    const permResult =
      await ExpoSpeechRecognitionModule.requestPermissionsAsync();
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

    ExpoSpeechRecognitionModule.start({
      lang: "en-GB",
      interimResults: true,
      continuous: false,
    });
  }, []);

  const stopListening = useCallback(() => {
    ExpoSpeechRecognitionModule.stop();
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

        setState((s) => ({
          ...s,
          isProcessing: false,
          response: result.text,
          pendingAction: result.pendingAction || null,
          conversationHistory: [...historyRef.current],
        }));

        // TTS
        if (ttsEnabled && result.text) {
          Speech.speak(result.text, { language: "en-GB", rate: 0.95 });
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
        Speech.speak(message, { language: "en-GB", rate: 0.95 });
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
  }, [state.pendingAction, executeAction, ttsEnabled]);

  const cancelAction = useCallback(() => {
    setState((s) => ({ ...s, pendingAction: null }));
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  }, []);

  const openSheet = useCallback(() => {
    setState((s) => ({ ...s, isSheetOpen: true }));
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  }, []);

  const closeSheet = useCallback(() => {
    Speech.stop();
    ExpoSpeechRecognitionModule.stop();
    setState((s) => ({ ...s, isSheetOpen: false, isListening: false }));
  }, []);

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
      ExpoSpeechRecognitionModule.stop();
    };
  }, []);

  return {
    ...state,
    startListening,
    stopListening,
    confirmAction,
    cancelAction,
    openSheet,
    closeSheet,
    resetConversation,
  };
}
