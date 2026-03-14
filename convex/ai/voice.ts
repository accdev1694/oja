import { action } from "../_generated/server";
import { api } from "../_generated/api";
import { v } from "convex/values";
import {
  smartGenerate, 
  stripCodeBlocks,
  genAI
} from "./shared";
import { 
  voiceFunctionDeclarations, 
  buildSystemPrompt, 
  executeVoiceTool 
} from "../lib/voice";
import type { VoiceAssistantResponse, ConversationMessage, PendingAction } from "../lib/voice/types";

/** Shape of the confirm-type result from executeVoiceTool */
interface ConfirmResult {
  action: string;
  params: Record<string, unknown>;
  description: string;
}

export const parseVoiceCommand = action({
  args: {
    transcript: v.string(),
    currentScreen: v.string(),
    activeListId: v.optional(v.id("shoppingLists")),
    activeListName: v.optional(v.string()),
    recentLists: v.array(v.object({ id: v.string(), name: v.string() })),
  },
  handler: async (ctx, args): Promise<VoiceAssistantResponse> => {
    const prompt = `Parse this UK grocery voice command: "${args.transcript}". 
Recent lists: ${args.recentLists.map(l => l.name).join(", ")}.
Return JSON with action, listName, matchedListId, items, confidence.`;

    try {
      const raw = await smartGenerate(prompt, "parseVoiceCommand", { temperature: 0.2 });
      return JSON.parse(stripCodeBlocks(raw));
    } catch (error) {
      console.error("parseVoiceCommand failed:", error);
      return { type: "error", text: "Sorry, I couldn't understand that command." };
    }
  },
});

export const voiceAssistant = action({
  args: {
    transcript: v.string(),
    currentScreen: v.string(),
    activeListId: v.optional(v.id("shoppingLists")),
    activeListName: v.optional(v.string()),
    activeListBudget: v.optional(v.number()),
    activeListSpent: v.optional(v.number()),
    activeListsCount: v.optional(v.number()),
    lowStockCount: v.optional(v.number()),
    userName: v.optional(v.string()),
    conversationHistory: v.optional(v.array(v.object({ role: v.union(v.literal("user"), v.literal("model")), text: v.string() }))),
  },
  handler: async (ctx, args): Promise<VoiceAssistantResponse> => {
    const rateLimit = await ctx.runMutation(api.aiUsage.checkRateLimit, { feature: "voice" });
    if (!rateLimit.allowed) return { type: "error", text: "Too fast! Slow down." };

    const usage: { allowed: boolean; message?: string } = await ctx.runMutation(api.aiUsage.incrementUsage, { feature: "voice", tokenCount: 500 });
    if (!usage.allowed) return { type: "limit_reached", text: usage.message ?? "You've reached your voice usage limit." };

    const systemPrompt = buildSystemPrompt({ ...args, lowStockItems: [], activeListNames: [] });
    const model = genAI.getGenerativeModel({
      model: "gemini-2.0-flash",
      systemInstruction: systemPrompt,
      tools: [{ functionDeclarations: voiceFunctionDeclarations }],
    });

    const history = (args.conversationHistory || []).map((msg: ConversationMessage) => ({ role: msg.role, parts: [{ text: msg.text }] }));
    const chat = model.startChat({ history });
    let response = await chat.sendMessage(args.transcript);

    let pendingAction: PendingAction | null = null;
    for (let i = 0; i < 3; i++) {
      const part = response.response.candidates?.[0].content.parts.find((p) => p.functionCall);
      if (!part?.functionCall) break;

      const { name, args: fnArgs } = part.functionCall;
      const toolResult = await executeVoiceTool(ctx, name, (fnArgs as Record<string, unknown>) || {});
      if (toolResult.type === "confirm") {
        const confirmData = toolResult.result as ConfirmResult;
        pendingAction = { action: confirmData.action, params: confirmData.params, confirmLabel: confirmData.description };
      }
      const responsePayload = (toolResult.result ?? {}) as object;
      response = await chat.sendMessage([{ functionResponse: { name, response: responsePayload } }]);
    }

    return { type: pendingAction ? "confirm_action" : "answer", text: response.response.text(), pendingAction };
  },
});

export const executeVoiceAction = action({
  args: { actionName: v.string(), params: v.record(v.string(), v.union(v.string(), v.number(), v.boolean(), v.null())) },
  handler: async (ctx, args): Promise<{ success: boolean; message: string; listId?: string }> => {
    switch (args.actionName) {
      case "create_shopping_list":
        const listId: string = await ctx.runMutation(api.shoppingLists.create, args.params as { name: string; budget?: number; storeName?: string; normalizedStoreId?: string; plannedDate?: number });
        return { success: true, listId, message: "Created!" };
      default:
        return { success: false, message: "Action not implemented yet" };
    }
  },
});

export const textToSpeech = action({
  args: { text: v.string(), voiceGender: v.optional(v.union(v.literal("FEMALE"), v.literal("MALE"))) },
  handler: async (_, args) => {
    const azureKey = process.env.AZURE_SPEECH_KEY;
    if (!azureKey) return { audioBase64: null, provider: null, error: null };
    
    const response = await fetch(`https://${process.env.AZURE_SPEECH_REGION}.tts.speech.microsoft.com/cognitiveservices/v1`, {
      method: "POST",
      headers: { "Ocp-Apim-Subscription-Key": azureKey, "Content-Type": "application/ssml+xml", "X-Microsoft-OutputFormat": "audio-16khz-128kbitrate-mono-mp3" },
      body: `<speak version="1.0" xmlns="http://www.w3.org/2001/10/synthesis" xml:lang="en-GB"><voice name="${args.voiceGender === "FEMALE" ? "en-GB-SoniaNeural" : "en-GB-RyanNeural"}">${args.text}</voice></speak>`
    });

    if (response.ok) {
      const buffer = await response.arrayBuffer();
      const base64 = btoa(String.fromCharCode(...new Uint8Array(buffer)));
      return { audioBase64: base64, provider: "azure", error: null };
    }
    return { audioBase64: null, provider: null, error: "Azure failed" };
  },
});
