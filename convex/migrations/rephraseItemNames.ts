import { internalAction } from "../_generated/server";
import { internal } from "../_generated/api";
import { v } from "convex/values";
import { GoogleGenerativeAI } from "@google/generative-ai";

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || "");

async function geminiGenerate(prompt: string): Promise<string> {
  const model = genAI.getGenerativeModel({
    model: "gemini-2.0-flash",
    generationConfig: { temperature: 0.3, maxOutputTokens: 8000 },
  });
  const result = await model.generateContent(prompt);
  const response = await result.response;
  return response.text().trim();
}

function stripCodeBlocks(text: string): string {
  if (text.startsWith("```json")) {
    return text.replace(/```json\n?/g, "").replace(/```\n?/g, "");
  }
  if (text.startsWith("```")) {
    return text.replace(/```\n?/g, "");
  }
  return text;
}

const REPHRASE_PROMPT = `You are a UK grocery item name formatter. Rephrase each item name to follow these rules:

FORMAT: "{size} {descriptor} {product type}"
1. SIZE/QUANTITY COMES FIRST, then a concise descriptive name
2. MAX 30 CHARACTERS — meaningfully rephrase, never just truncate
3. If no size is apparent, estimate the standard UK size (milk = 2pt, eggs = 6pk, bread = 800g, etc.)
4. NEVER use just a brand name — always describe what the product IS
5. DROP all brand/own-label names (Tesco, Aldi, Merevale, Hovis, Warburtons, Cathedral City, Heinz, etc.) UNLESS the brand IS the product identity (Coke Zero, PG Tips, Marmite, Branston, Lurpak)
6. KEEP useful descriptors: size, type, style, variety (e.g., Wholemeal, Semi-Skimmed, Free Range, Mature)

Examples:
- "Whole Milk 2pt" → "2pt Whole Milk"
- "Semi-Skimmed Milk 4 pints" → "4pt Semi-Skimmed Milk"
- "Merevale 12 Free Range Eggs" → "12pk Free Range Eggs"
- "Hovis Wholemeal Bread 800g" → "800g Wholemeal Bread"
- "Coca-Cola Zero Sugar 2L" → "2L Coke Zero"
- "Chicken Breast Fillets 500g" → "500g Chicken Breast"
- "Warburtons Toastie White 800g" → "800g White Toastie Bread"
- "Cathedral City Mature Cheddar Cheese 350g" → "350g Mature Cheddar"
- "Heinz Baked Beans" → "415g Baked Beans"
- "PG Tips Tea Bags 80" → "80pk PG Tips Tea Bags"
- "Tesco British Semi Skimmed Milk 2 Pint" → "2pt Semi-Skimmed Milk"
- "Aldi Specially Selected Butter 250g" → "250g Salted Butter"

I will give you a JSON array of item names. Return a JSON object mapping each original name to its rephrased version. Every value MUST be 30 characters or fewer.

Input:
`;

/**
 * Rephrase existing listItem and receipt item names to size-first format (max 30 chars).
 *
 * Run via: npx convex run migrations/rephraseItemNames:run '{}'
 * Dry run: npx convex run migrations/rephraseItemNames:run '{"dryRun": true}'
 */
export const run = internalAction({
  args: {
    dryRun: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    const dryRun = args.dryRun ?? true;

    // ── Step 1: Collect all unique item names from listItems ──────────────
    const allListItems: Array<{ _id: string; name: string }> = await ctx.runQuery(
      internal.migrations.rephraseItemNames.getAllListItemNames
    );

    // ── Step 2: Collect all unique item names from receipts ───────────────
    type ReceiptItem = {
      name: string;
      quantity: number;
      unitPrice: number;
      totalPrice: number;
      category?: string;
      size?: string;
      unit?: string;
      confidence?: number;
    };
    const allReceipts: Array<{ _id: string; items: ReceiptItem[] }> = await ctx.runQuery(
      internal.migrations.rephraseItemNames.getAllReceiptItemNames
    );

    // Build unique name set
    const uniqueNames = new Set<string>();
    for (const item of allListItems) {
      uniqueNames.add(item.name);
    }
    for (const receipt of allReceipts) {
      for (const item of receipt.items) {
        uniqueNames.add(item.name);
      }
    }

    const nameArray = Array.from(uniqueNames);
    console.log(`Found ${nameArray.length} unique item names across ${allListItems.length} list items and ${allReceipts.length} receipts`);

    if (nameArray.length === 0) {
      return { total: 0, updated: 0, dryRun };
    }

    // ── Step 3: Send names to AI in batches of 50 ────────────────────────
    const BATCH_SIZE = 50;
    const nameMap: Record<string, string> = {};

    for (let i = 0; i < nameArray.length; i += BATCH_SIZE) {
      const batch = nameArray.slice(i, i + BATCH_SIZE);
      const prompt = REPHRASE_PROMPT + JSON.stringify(batch);

      try {
        const raw = await geminiGenerate(prompt);
        const cleaned = stripCodeBlocks(raw);
        const parsed: Record<string, string> = JSON.parse(cleaned);

        for (const [original, rephrased] of Object.entries(parsed)) {
          if (typeof rephrased === "string" && rephrased.length <= 30 && rephrased.length > 0) {
            nameMap[original] = rephrased;
          } else if (typeof rephrased === "string" && rephrased.length > 30) {
            // Truncate as last resort (shouldn't happen with good AI)
            nameMap[original] = rephrased.slice(0, 30);
            console.warn(`AI exceeded 30 chars for "${original}": "${rephrased}" → truncated`);
          }
        }

        console.log(`Batch ${Math.floor(i / BATCH_SIZE) + 1}: ${Object.keys(parsed).length} names rephrased`);
      } catch (error) {
        console.error(`Batch ${Math.floor(i / BATCH_SIZE) + 1} failed:`, error);
        // Skip this batch, continue with others
      }
    }

    console.log(`Total rephrased: ${Object.keys(nameMap).length} / ${nameArray.length}`);

    if (dryRun) {
      // Show a sample of changes
      const sample = Object.entries(nameMap).slice(0, 20);
      for (const [original, rephrased] of sample) {
        console.log(`  "${original}" → "${rephrased}" (${rephrased.length} chars)`);
      }
      return {
        total: nameArray.length,
        rephrased: Object.keys(nameMap).length,
        listItems: allListItems.length,
        receipts: allReceipts.length,
        dryRun: true,
        sample: Object.fromEntries(Object.entries(nameMap).slice(0, 20)),
      };
    }

    // ── Step 4: Apply changes to listItems ───────────────────────────────
    let listItemsUpdated = 0;
    for (const item of allListItems) {
      const newName = nameMap[item.name];
      if (newName && newName !== item.name) {
        await ctx.runMutation(internal.migrations.rephraseItemNames.patchListItemName, {
          id: item._id,
          name: newName,
        });
        listItemsUpdated++;
      }
    }
    console.log(`Updated ${listItemsUpdated} list items`);

    // ── Step 5: Apply changes to receipt items ───────────────────────────
    let receiptsUpdated = 0;
    for (const receipt of allReceipts) {
      let changed = false;
      const newItems = receipt.items.map((item) => {
        const newName = nameMap[item.name];
        if (newName && newName !== item.name) {
          changed = true;
          return { ...item, name: newName };
        }
        return item;
      });

      if (changed) {
        await ctx.runMutation(internal.migrations.rephraseItemNames.patchReceiptItems, {
          id: receipt._id,
          items: newItems,
        });
        receiptsUpdated++;
      }
    }
    console.log(`Updated ${receiptsUpdated} receipts`);

    return {
      total: nameArray.length,
      rephrased: Object.keys(nameMap).length,
      listItemsUpdated,
      receiptsUpdated,
      dryRun: false,
    };
  },
});

// ─── Helper queries/mutations (internal only) ────────────────────────────────

import { internalQuery, internalMutation } from "../_generated/server";

/** Get all listItem IDs and names */
export const getAllListItemNames = internalQuery({
  args: {},
  handler: async (ctx) => {
    const items = await ctx.db.query("listItems").collect();
    return items.map((i) => ({ _id: i._id as string, name: i.name }));
  },
});

/** Get all receipt IDs and their item arrays */
export const getAllReceiptItemNames = internalQuery({
  args: {},
  handler: async (ctx) => {
    const receipts = await ctx.db
      .query("receipts")
      .filter((q) => q.neq(q.field("processingStatus"), "pending"))
      .collect();

    return receipts
      .filter((r) => r.items && r.items.length > 0)
      .map((r) => ({
        _id: r._id as string,
        items: r.items.map((item) => ({ ...item })),
      }));
  },
});

/** Patch a single listItem name */
export const patchListItemName = internalMutation({
  args: {
    id: v.string(),
    name: v.string(),
  },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.id as any, { name: args.name, updatedAt: Date.now() });
  },
});

/** Patch a receipt's items array */
export const patchReceiptItems = internalMutation({
  args: {
    id: v.string(),
    items: v.array(
      v.object({
        name: v.string(),
        quantity: v.number(),
        unitPrice: v.number(),
        totalPrice: v.number(),
        category: v.optional(v.string()),
        size: v.optional(v.string()),
        unit: v.optional(v.string()),
        confidence: v.optional(v.number()),
      })
    ),
  },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.id as any, { items: args.items });
  },
});
