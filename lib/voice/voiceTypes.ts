/**
 * Shared types for the Oja Voice Assistant feature.
 */

export interface ConversationMessage {
  role: "user" | "model";
  text: string;
}

export interface PendingAction {
  action: string;
  params: Record<string, unknown>;
  confirmLabel: string;
}

export interface VoiceAssistantResponse {
  type: "answer" | "confirm_action" | "error";
  text: string;
  pendingAction: PendingAction | null;
}

export interface VoiceAssistantState {
  isListening: boolean;
  isProcessing: boolean;
  transcript: string;
  partialTranscript: string;
  response: string;
  pendingAction: PendingAction | null;
  error: string | null;
  conversationHistory: ConversationMessage[];
  isSheetOpen: boolean;
}

export const INITIAL_VOICE_STATE: VoiceAssistantState = {
  isListening: false,
  isProcessing: false,
  transcript: "",
  partialTranscript: "",
  response: "",
  pendingAction: null,
  error: null,
  conversationHistory: [],
  isSheetOpen: false,
};
