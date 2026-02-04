/**
 * Voice Command NLU Prompt Template
 *
 * Generates a Gemini/OpenAI prompt that parses a spoken transcript
 * into a structured JSON intent for list creation or item addition.
 */

export interface VoiceContext {
  currentScreen: string;
  activeListId?: string;
  activeListName?: string;
  recentLists: { id: string; name: string }[];
}

export interface VoiceCommandResult {
  action: "create_list" | "add_to_list" | "unsupported";
  listName?: string;
  matchedListId?: string;
  items: ParsedItem[];
  confidence: number;
  rawTranscript: string;
  error?: string;
}

export interface ParsedItem {
  name: string;
  quantity: number;
  unit?: string;
}

/**
 * Build the NLU prompt for Gemini/OpenAI.
 *
 * The prompt instructs the model to:
 * 1. Identify the user's intent (create list or add items)
 * 2. Extract a list name (new or fuzzy-matched existing)
 * 3. Parse individual items with quantities and units
 * 4. Return structured JSON
 */
export function buildVoicePrompt(
  transcript: string,
  context: VoiceContext
): string {
  const recentListsBlock =
    context.recentLists.length > 0
      ? context.recentLists
          .map((l) => `  - id: "${l.id}", name: "${l.name}"`)
          .join("\n")
      : "  (none)";

  return `You are a shopping list voice command parser for a UK grocery app called Oja.

Parse the user's spoken command into a structured JSON response.

## Rules
1. Identify the ACTION:
   - "create_list": user wants to make a NEW list (keywords: "create", "make", "new list", "start a list")
   - "add_to_list": user wants to add items to an EXISTING list (keywords: "add", "put", "get", or just item names)
   - "unsupported": any other intent (editing, deleting, navigating, questions)

2. Extract LIST NAME:
   - For "create_list": extract the list name from the command. If none given, use "Shopping List".
   - For "add_to_list": fuzzy-match against existing lists below. If user says a list name, match it.
     If no list name mentioned, use context rules:
     - If user is on a list detail screen, use that list's ID.
     - Otherwise use the most recently created list.
     - If no lists exist, switch action to "create_list" with name "Shopping List".

3. Extract ITEMS as an array:
   - Each item must have: name (string), quantity (number, default 1), unit (optional string)
   - "2 pints of milk" → { name: "milk", quantity: 2, unit: "pint" }
   - "chicken thighs" → { name: "chicken thighs", quantity: 1 } (compound noun = ONE item)
   - "rice, chicken, and beans" → THREE separate items, each quantity 1
   - "a dozen eggs" → { name: "eggs", quantity: 12, unit: "each" }
   - "half a kilo of mince" → { name: "mince", quantity: 0.5, unit: "kg" }
   - UK grocery context: recognise brands (Weetabix, PG Tips, Warburtons) and cultural items (plantain, yam, scotch bonnet, jollof spice mix)

4. Set CONFIDENCE (0-1):
   - 1.0: clear intent, clear items
   - 0.7-0.9: intent clear but some ambiguity in items
   - 0.3-0.6: unclear intent or garbled speech
   - Below 0.3: likely nonsense or unrelated speech

## User Context
- Current screen: ${context.currentScreen}
- Active list: ${context.activeListId ? `id="${context.activeListId}", name="${context.activeListName}"` : "none"}
- Recent lists:
${recentListsBlock}

## User's spoken command
"${transcript}"

## Response Format
Respond with ONLY valid JSON, no markdown, no explanation:
{
  "action": "create_list" | "add_to_list" | "unsupported",
  "listName": "string or null",
  "matchedListId": "string or null",
  "items": [{ "name": "string", "quantity": number, "unit": "string or null" }],
  "confidence": number,
  "rawTranscript": "${transcript}",
  "error": "string or null"
}`;
}
