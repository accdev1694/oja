/**
 * Voice command response parser.
 *
 * Pure function that validates and normalizes AI-generated JSON
 * from the voice NLU prompt. Extracted for testability.
 */

export interface ParsedVoiceItem {
  name: string;
  quantity: number;
  unit: string | null;
}

export interface VoiceCommandResponse {
  action: "create_list" | "add_to_list" | "unsupported";
  listName: string | null;
  matchedListId: string | null;
  items: ParsedVoiceItem[];
  confidence: number;
  rawTranscript: string;
  error: string | null;
}

/**
 * Strip markdown code fences from AI output.
 */
export function stripCodeBlocks(text: string): string {
  if (text.startsWith("```json")) {
    return text.replace(/```json\n?/g, "").replace(/```\n?/g, "");
  }
  if (text.startsWith("```")) {
    return text.replace(/```\n?/g, "");
  }
  return text;
}

/**
 * Parse raw AI text into a validated VoiceCommandResponse.
 *
 * Handles: malformed JSON, missing fields, invalid actions,
 * non-array items, missing item properties.
 */
export function parseVoiceResponse(
  raw: string,
  transcript: string
): VoiceCommandResponse {
  const cleaned = stripCodeBlocks(raw);
  try {
    const parsed = JSON.parse(cleaned);

    // Validate action
    if (
      !parsed.action ||
      !["create_list", "add_to_list", "unsupported"].includes(parsed.action)
    ) {
      parsed.action = "unsupported";
      parsed.error = "Could not determine intent";
      parsed.confidence = 0.1;
    }

    // Ensure items is always an array
    if (!Array.isArray(parsed.items)) {
      parsed.items = [];
    }

    // Normalize items
    parsed.items = parsed.items.map(
      (item: { name?: string; quantity?: number; unit?: string | null }) => ({
        name: item.name || "unknown item",
        quantity:
          typeof item.quantity === "number" && item.quantity > 0
            ? item.quantity
            : 1,
        unit: item.unit || null,
      })
    );

    parsed.rawTranscript = transcript;
    return parsed;
  } catch {
    return {
      action: "unsupported",
      listName: null,
      matchedListId: null,
      items: [],
      confidence: 0.1,
      rawTranscript: transcript,
      error: "Failed to parse AI response",
    };
  }
}
