// Type definitions for voice assistant tools

import type { Id, Doc } from "../../_generated/dataModel";

export interface VoiceAssistantResponse {
  type: "error" | "limit_reached" | "confirm_action" | "answer";
  text: string;
  pendingAction?: {
    action: string;
    params: Record<string, unknown>;
    confirmLabel: string;
  } | null;
}

export interface ConversationMessage {
  role: "user" | "model";
  text: string;
}

export interface PendingAction {
  action: string;
  params: Record<string, unknown>;
  confirmLabel: string;
}

export interface FunctionCall {
  name: string;
  args: Record<string, unknown>;
}

export interface FunctionCallPart {
  functionCall?: FunctionCall;
}

export interface SizeVariant {
  size?: string;
  sizeNormalized?: string;
  price: number | null;
  source?: string;
}

export interface StoreInfo {
  id: string;
  displayName: string;
}
