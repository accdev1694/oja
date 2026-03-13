/**
 * Voice Assistant Hook (Composed)
 *
 * Orchestrates the full voice assistant lifecycle by composing:
 * - useConversationHistory — persistence + turn management
 * - useVoiceRecognition — STT via expo-speech-recognition
 * - useVoiceTTS — Neural TTS + device fallback
 * - useVoiceToolExecution — Convex actions, pending action confirm/cancel
 *
 * Gracefully degrades in Expo Go (native module unavailable).
 */

import { useState, useCallback, useRef, useEffect } from "react";
import * as Haptics from "expo-haptics";
import { INITIAL_VOICE_STATE } from "@/lib/voice/voiceTypes";
import { useConversationHistory } from "./voice/useConversationHistory";
import { useVoiceTTS } from "./voice/useVoiceTTS";
import { useVoiceRecognition, STT_AVAILABLE } from "./voice/useVoiceRecognition";
import { useVoiceToolExecution } from "./voice/useVoiceToolExecution";
import type { VoiceAssistantState } from "@/lib/voice/voiceTypes";
import type { Id } from "@/convex/_generated/dataModel";

interface UseVoiceAssistantOptions {
  currentScreen: string;
  activeListId?: Id<"shoppingLists">;
  activeListName?: string;
  userName?: string;
  ttsEnabled?: boolean;
}

export function useVoiceAssistant(options: UseVoiceAssistantOptions) {
  const [state, setState] = useState<VoiceAssistantState>(INITIAL_VOICE_STATE);

  const ttsEnabled = options.ttsEnabled ?? true;
  const sheetOpenRef = useRef(false);
  const startListeningRef = useRef<((isAutoResume?: boolean) => Promise<void>) | null>(null);

  // ── Sub-hooks ──────────────────────────────────────────────────────

  const { historyRef, loadHistory, appendTurn, resetHistory } =
    useConversationHistory();

  const { speakText, stopSpeaking, cleanupTTS, isSpeakingRef } =
    useVoiceTTS();

  // useVoiceRecognition needs processTranscript as callback, but
  // processTranscript comes from useVoiceToolExecution which needs
  // checkRateLimit from useVoiceRecognition — circular dependency.
  // Break it with a ref-based callback.
  const processTranscriptRef = useRef<(transcript: string) => void>(() => {});

  const onFinalTranscript = useCallback((transcript: string) => {
    processTranscriptRef.current(transcript);
  }, []);

  const { startListening: sttStart, stopListening, checkRateLimit, cleanupSTT } =
    useVoiceRecognition(setState, onFinalTranscript);

  const { processTranscript, confirmAction: toolConfirm, cancelAction: toolCancel, cleanupTimers } =
    useVoiceToolExecution(setState, {
      currentScreen: options.currentScreen,
      activeListId: options.activeListId,
      activeListName: options.activeListName,
      userName: options.userName,
      ttsEnabled,
      speakText,
      historyRef,
      appendTurn,
      checkRateLimit,
      sheetOpenRef,
      startListeningRef,
    });

  // Wire the ref so useVoiceRecognition's onFinalTranscript calls processTranscript
  useEffect(() => {
    processTranscriptRef.current = processTranscript;
  }, [processTranscript]);

  // ── Wrap startListening to inject isSpeakingRef ────────────────────

  const startListening = useCallback(
    async (isAutoResume = false) => {
      await sttStart(isAutoResume, isSpeakingRef.current);
    },
    [sttStart, isSpeakingRef]
  );

  // Keep startListeningRef current for auto-resume callbacks in tool execution
  useEffect(() => {
    startListeningRef.current = startListening;
  }, [startListening]);

  // ── Wrap confirmAction to pass pendingAction from state ────────────

  const confirmAction = useCallback(async () => {
    await toolConfirm(state.pendingAction);
  }, [toolConfirm, state.pendingAction]);

  const cancelAction = useCallback(() => {
    toolCancel();
  }, [toolCancel]);

  // ── Sheet open / close ─────────────────────────────────────────────

  const openSheet = useCallback(async () => {
    sheetOpenRef.current = true;
    // Restore persisted conversation history
    const restored = await loadHistory();
    if (restored.length > 0) {
      historyRef.current = restored;
      setState((s) => ({
        ...s,
        isSheetOpen: true,
        conversationHistory: restored,
      }));
    } else {
      setState((s) => ({ ...s, isSheetOpen: true }));
    }
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  }, [loadHistory, historyRef]);

  const closeSheet = useCallback(() => {
    sheetOpenRef.current = false;
    stopSpeaking();
    if (STT_AVAILABLE) {
      stopListening();
    }
    setState((s) => ({ ...s, isSheetOpen: false, isListening: false }));
  }, [stopSpeaking, stopListening]);

  // ── Reset conversation ─────────────────────────────────────────────

  const resetConversation = useCallback(() => {
    resetHistory();
    cleanupTimers();
    setState((s) => ({
      ...s,
      transcript: "",
      partialTranscript: "",
      response: "",
      pendingAction: null,
      error: null,
      conversationHistory: [],
    }));
  }, [resetHistory, cleanupTimers]);

  // ── Cleanup on unmount ─────────────────────────────────────────────

  useEffect(() => {
    return () => {
      cleanupTTS();
      cleanupSTT();
      cleanupTimers();
    };
  }, [cleanupTTS, cleanupSTT, cleanupTimers]);

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
