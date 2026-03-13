/**
 * Conversation History Hook
 *
 * Manages voice assistant conversation history with AsyncStorage persistence.
 * Handles save/load/clear with 30-minute expiry.
 */

import { useCallback, useRef } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import type { ConversationMessage } from "@/lib/voice/voiceTypes";

const MAX_HISTORY = 12; // 6 turns (user + model each)
const CONVERSATION_HISTORY_KEY = "oja_voice_history";
const CONVERSATION_EXPIRY_MS = 30 * 60 * 1000; // 30 minutes

export function useConversationHistory() {
  const historyRef = useRef<ConversationMessage[]>([]);

  const saveHistory = useCallback(async (history: ConversationMessage[]) => {
    try {
      await AsyncStorage.setItem(
        CONVERSATION_HISTORY_KEY,
        JSON.stringify({ history, savedAt: Date.now() })
      );
    } catch {
      // Silently fail — persistence is best-effort
    }
  }, []);

  const loadHistory = useCallback(async (): Promise<ConversationMessage[]> => {
    try {
      const raw = await AsyncStorage.getItem(CONVERSATION_HISTORY_KEY);
      if (!raw) return [];
      const { history, savedAt } = JSON.parse(raw);
      // Expire after 30 minutes of inactivity
      if (Date.now() - savedAt > CONVERSATION_EXPIRY_MS) {
        await AsyncStorage.removeItem(CONVERSATION_HISTORY_KEY);
        return [];
      }
      return history || [];
    } catch {
      return [];
    }
  }, []);

  const clearPersistedHistory = useCallback(async () => {
    try {
      await AsyncStorage.removeItem(CONVERSATION_HISTORY_KEY);
    } catch {
      // Silently fail
    }
  }, []);

  /** Append a user+model turn, trim to MAX_HISTORY, persist. */
  const appendTurn = useCallback(
    async (userText: string, modelText: string) => {
      historyRef.current.push({ role: "user", text: userText });
      historyRef.current.push({ role: "model", text: modelText });
      if (historyRef.current.length > MAX_HISTORY) {
        historyRef.current = historyRef.current.slice(-MAX_HISTORY);
      }
      await saveHistory(historyRef.current);
    },
    [saveHistory]
  );

  const resetHistory = useCallback(() => {
    historyRef.current = [];
    clearPersistedHistory();
  }, [clearPersistedHistory]);

  return {
    historyRef,
    loadHistory,
    appendTurn,
    resetHistory,
  };
}
