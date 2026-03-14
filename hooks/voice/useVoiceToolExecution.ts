/**
 * Voice Tool Execution Hook
 *
 * Handles sending transcripts to the Convex voiceAssistant action,
 * processing results, and managing pending action confirm/cancel.
 */

import { useCallback, useRef } from "react";
import { useAction } from "convex/react";
import { api } from "@/convex/_generated/api";
import * as Haptics from "expo-haptics";
import type { VoiceAssistantState, PendingAction } from "@/lib/voice/voiceTypes";
import type { ConversationMessage } from "@/lib/voice/voiceTypes";
import type { Id } from "@/convex/_generated/dataModel";

const PENDING_ACTION_TIMEOUT_MS = 30_000; // 30 seconds to confirm a pending action

interface UseVoiceToolExecutionOptions {
  currentScreen: string;
  activeListId?: Id<"shoppingLists">;
  activeListName?: string;
  userName?: string;
  ttsEnabled: boolean;
  speakText: (text: string, onDone?: () => void) => Promise<void>;
  historyRef: React.MutableRefObject<ConversationMessage[]>;
  appendTurn: (userText: string, modelText: string) => Promise<void>;
  checkRateLimit: () => boolean;
  sheetOpenRef: React.MutableRefObject<boolean>;
  startListeningRef: React.MutableRefObject<((isAutoResume?: boolean) => Promise<void>) | null>;
}

export function useVoiceToolExecution(
  setState: React.Dispatch<React.SetStateAction<VoiceAssistantState>>,
  opts: UseVoiceToolExecutionOptions,
) {
  const voiceAssistant = useAction(api.ai.voiceAssistant);
  const executeAction = useAction(api.ai.executeVoiceAction);
  const pendingActionTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  /** Auto-resume listening helper (used after TTS or action completion) */
  const autoResumeListen = useCallback((hasPendingAction: boolean) => {
    if (!hasPendingAction && opts.sheetOpenRef.current && opts.startListeningRef.current) {
      setTimeout(() => {
        if (opts.sheetOpenRef.current) {
          opts.startListeningRef.current?.(true);
        }
      }, 500);
    }
  }, [opts.sheetOpenRef, opts.startListeningRef]);

  const processTranscript = useCallback(
    async (transcript: string) => {
      if (!transcript.trim()) return;

      const allowed = opts.checkRateLimit();
      if (!allowed) return;

      setState((s) => ({ ...s, isProcessing: true, error: null }));

      try {
        const result = await voiceAssistant({
          transcript,
          currentScreen: opts.currentScreen,
          activeListId: opts.activeListId,
          activeListName: opts.activeListName,
          userName: opts.userName,
          conversationHistory: opts.historyRef.current,
        });

        // Update conversation history + persist
        await opts.appendTurn(transcript, result.text);

        const hasPendingAction = !!result.pendingAction;

        setState((s) => ({
          ...s,
          isProcessing: false,
          response: result.text,
          pendingAction: (result.pendingAction as PendingAction | null) || null,
          conversationHistory: [...opts.historyRef.current],
        }));

        // Start pending action timeout — auto-cancel after 30s
        if (hasPendingAction) {
          if (pendingActionTimerRef.current) clearTimeout(pendingActionTimerRef.current);
          pendingActionTimerRef.current = setTimeout(() => {
            setState((s) => {
              if (!s.pendingAction) return s;
              return { ...s, pendingAction: null, response: "That confirmation timed out. Just ask again if you'd like." };
            });
            pendingActionTimerRef.current = null;
          }, PENDING_ACTION_TIMEOUT_MS);
        }

        // TTS with auto-resume listening when done
        if (opts.ttsEnabled && result.text) {
          opts.speakText(result.text, () => {
            autoResumeListen(hasPendingAction);
          });
        } else {
          autoResumeListen(hasPendingAction);
        }

        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      } catch (error) {
        console.error("[useVoiceToolExecution] Action failed:", error);
        setState((s) => ({
          ...s,
          isProcessing: false,
          error: "Something went wrong. Try again?",
        }));
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      }
    },
    [
      opts.currentScreen,
      opts.activeListId,
      opts.activeListName,
      opts.userName,
      opts.ttsEnabled,
      opts.speakText,
      opts.historyRef,
      opts.appendTurn,
      opts.checkRateLimit,
      voiceAssistant,
      setState,
      autoResumeListen,
    ]
  );

  const confirmAction = useCallback(async (pendingAction: VoiceAssistantState["pendingAction"]) => {
    if (!pendingAction) return;

    // Clear pending action timer on confirm
    if (pendingActionTimerRef.current) {
      clearTimeout(pendingActionTimerRef.current);
      pendingActionTimerRef.current = null;
    }

    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setState((s) => ({ ...s, isProcessing: true }));

    try {
      const result = await executeAction({
        actionName: pendingAction.action,
        params: pendingAction.params,
      });

      const message = result?.message || "Done!";
      setState((s) => ({
        ...s,
        isProcessing: false,
        pendingAction: null,
        response: message,
      }));

      if (opts.ttsEnabled) {
        opts.speakText(message, () => {
          autoResumeListen(false);
        });
      } else {
        autoResumeListen(false);
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
  }, [executeAction, opts.ttsEnabled, opts.speakText, setState, autoResumeListen]);

  const cancelAction = useCallback(() => {
    // Clear pending action timer on cancel
    if (pendingActionTimerRef.current) {
      clearTimeout(pendingActionTimerRef.current);
      pendingActionTimerRef.current = null;
    }
    setState((s) => ({ ...s, pendingAction: null }));
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    autoResumeListen(false);
  }, [setState, autoResumeListen]);

  /** Cleanup on unmount — call from effect */
  const cleanupTimers = useCallback(() => {
    if (pendingActionTimerRef.current) {
      clearTimeout(pendingActionTimerRef.current);
    }
  }, []);

  return {
    processTranscript,
    confirmAction,
    cancelAction,
    pendingActionTimerRef,
    cleanupTimers,
  };
}
