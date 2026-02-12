import { v } from "convex/values";
import { query } from "./_generated/server";
import {
  normalizeItemName,
  calculateSimilarity,
} from "./lib/fuzzyMatch";

/**
 * Search for item suggestions based on user input.
 *
 * Returns items from:
 * 1. User's pantry items (highest priority, tagged "pantry")
 * 2. Known items from currentPrices table (tagged "known")
 * 3. Item variants from itemVariants table (tagged "variant")
 *
 * Store-aware: when storeName is provided, prices at that store are preferred.
 */
export const searchItems = query({
  args: {
    searchTerm: v.string(),
    storeName: v.optional(v.string()),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const term = args.searchTerm.trim();
    if (term.length < 2) {
      return { suggestions: [], didYouMean: null };
    }

    const maxResults = args.limit ?? 10;
    const normalizedTerm = normalizeItemName(term);
    const loweredTerm = term.toLowerCase().trim();

    // Collect all candidate names with metadata
    interface Candidate {
      name: string;
      source: "pantry" | "known" | "variant";
      pantryItemId?: string;
      stockLevel?: string;
      estimatedPrice?: number;
      priceSource?: "personal" | "crowdsourced" | "ai";
      storeName?: string;
      size?: string;
      unit?: string;
      category?: string;
    }

    const candidates: Candidate[] = [];
    const seenNormalized = new Set<string>();

    // ─── 1. User's pantry items ───────────────────────────────────────
    const identity = await ctx.auth.getUserIdentity();
    if (identity) {
      const user = await ctx.db
        .query("users")
        .filter((q) => q.eq(q.field("clerkId"), identity.subject))
        .first();

      if (user) {
        const pantryItems = await ctx.db
          .query("pantryItems")
          .withIndex("by_user", (q) => q.eq("userId", user._id))
          .collect();

        for (const item of pantryItems) {
          const normalized = normalizeItemName(item.name);
          if (seenNormalized.has(normalized)) continue;

          // Relevance check: use word-boundary matching for substring checks
          // to avoid false positives like "suya spice" matching "ya"
          const words = normalized.split(/\s+/);
          const startsWithTerm = words.some((w) => w.startsWith(normalizedTerm));
          const termStartsWithWord = words.some(
            (w) => w.length >= 3 && normalizedTerm.startsWith(w)
          );
          const similarEnough =
            calculateSimilarity(normalizedTerm, normalized) >= 60;

          const isMaybeRelevant =
            startsWithTerm || termStartsWithWord || similarEnough;

          if (!isMaybeRelevant) continue;

          seenNormalized.add(normalized);
          candidates.push({
            name: item.name,
            source: "pantry",
            pantryItemId: item._id,
            stockLevel: item.stockLevel,
            estimatedPrice: item.lastPrice,
            priceSource: item.priceSource === "receipt" ? "personal" : undefined,
            storeName: item.lastStoreName,
            size: item.defaultSize,
            unit: item.defaultUnit,
            category: item.category,
          });
        }
      }
    }

    // ─── 2. Known items from currentPrices ────────────────────────────
    // Query by normalizedName index — we use the lowered term as prefix
    const priceRecords = await ctx.db
      .query("currentPrices")
      .withIndex("by_item", (q) => q.eq("normalizedName", loweredTerm))
      .collect();

    // Also try the normalized (plural-stripped) version
    const priceRecordsNormalized =
      normalizedTerm !== loweredTerm
        ? await ctx.db
            .query("currentPrices")
            .withIndex("by_item", (q) =>
              q.eq("normalizedName", normalizedTerm)
            )
            .collect()
        : [];

    const allPriceRecords = [...priceRecords, ...priceRecordsNormalized];

    // Group by normalizedName to pick best price per item
    const pricesByItem = new Map<
      string,
      { name: string; price: number; store: string; source: string; size?: string; unit?: string }
    >();

    for (const record of allPriceRecords) {
      const key = record.normalizedName;
      if (seenNormalized.has(key)) continue;

      const existing = pricesByItem.get(key);

      // Prefer the list's store price
      if (args.storeName && record.storeName === args.storeName) {
        pricesByItem.set(key, {
          name: record.itemName,
          price: record.averagePrice ?? record.unitPrice,
          store: record.storeName,
          source: "crowdsourced",
          size: record.size,
          unit: record.unit,
        });
      } else if (!existing) {
        pricesByItem.set(key, {
          name: record.itemName,
          price: record.averagePrice ?? record.unitPrice,
          store: record.storeName,
          source: "crowdsourced",
          size: record.size,
          unit: record.unit,
        });
      }
    }

    for (const [normalized, info] of pricesByItem) {
      seenNormalized.add(normalized);
      candidates.push({
        name: info.name,
        source: "known",
        estimatedPrice: info.price,
        priceSource: info.source as "crowdsourced",
        storeName: info.store,
        size: info.size,
        unit: info.unit,
      });
    }

    // ─── 3. Item variants ─────────────────────────────────────────────
    const variants = await ctx.db
      .query("itemVariants")
      .withIndex("by_base_item", (q) => q.eq("baseItem", loweredTerm))
      .collect();

    const variantsNormalized =
      normalizedTerm !== loweredTerm
        ? await ctx.db
            .query("itemVariants")
            .withIndex("by_base_item", (q) =>
              q.eq("baseItem", normalizedTerm)
            )
            .collect()
        : [];

    for (const variant of [...variants, ...variantsNormalized]) {
      const normalized = normalizeItemName(variant.variantName);
      if (seenNormalized.has(normalized)) continue;

      // Only include variants whose name is actually relevant to the search
      // (baseItem match alone is insufficient — "ya" baseItem can have
      //  unrelated variants like "Whole Milk 1 Pint" from AI seeding)
      const variantWords = normalized.split(/\s+/);
      const variantRelevant =
        variantWords.some((w) => w.startsWith(normalizedTerm)) ||
        normalized.startsWith(normalizedTerm) ||
        calculateSimilarity(normalizedTerm, normalized) >= 50;

      if (!variantRelevant) continue;

      seenNormalized.add(normalized);
      candidates.push({
        name: variant.variantName,
        source: "variant",
        estimatedPrice: variant.estimatedPrice,
        priceSource: "ai",
        size: variant.size,
        unit: variant.unit,
        category: variant.category,
      });
    }

    // ─── 4. Fuzzy scan of pantry for typo correction ──────────────────
    // If we haven't found many exact matches, scan pantry for fuzzy matches
    if (candidates.length < 3 && identity) {
      const user = await ctx.db
        .query("users")
        .filter((q) => q.eq(q.field("clerkId"), identity.subject))
        .first();

      if (user) {
        const pantryItems = await ctx.db
          .query("pantryItems")
          .withIndex("by_user", (q) => q.eq("userId", user._id))
          .collect();

        for (const item of pantryItems) {
          const normalized = normalizeItemName(item.name);
          if (seenNormalized.has(normalized)) continue;

          const similarity = calculateSimilarity(normalizedTerm, normalized);
          // Lower threshold for short words
          const threshold = normalizedTerm.length < 4 ? 55 : 65;
          if (similarity >= threshold) {
            seenNormalized.add(normalized);
            candidates.push({
              name: item.name,
              source: "pantry",
              pantryItemId: item._id,
              stockLevel: item.stockLevel,
              estimatedPrice: item.lastPrice,
              category: item.category,
            });
          }
        }
      }
    }

    // ─── 5. Score and rank ─────────────────────────────────────────────
    interface ScoredCandidate extends Candidate {
      similarity: number;
      isExactMatch: boolean;
    }

    const scored: ScoredCandidate[] = candidates.map((c) => {
      const normalized = normalizeItemName(c.name);
      const similarity = calculateSimilarity(normalizedTerm, normalized);
      const isExactMatch =
        normalized === normalizedTerm ||
        c.name.toLowerCase().trim() === loweredTerm;

      return { ...c, similarity, isExactMatch };
    });

    // Filter: remove candidates below minimum similarity
    // Use a lower floor for short terms (they inherently score lower)
    const minFloor = normalizedTerm.length < 4 ? 40 : 50;
    const filtered = scored.filter(
      (c) => c.isExactMatch || c.similarity >= minFloor
    );

    // Sort: exact matches first, then by source priority, then by similarity
    const sourcePriority = { pantry: 0, known: 1, variant: 2 };
    filtered.sort((a, b) => {
      if (a.isExactMatch !== b.isExactMatch) return a.isExactMatch ? -1 : 1;
      if (a.source !== b.source)
        return sourcePriority[a.source] - sourcePriority[b.source];
      return b.similarity - a.similarity;
    });

    const suggestions = filtered.slice(0, maxResults).map((c) => ({
      name: c.name,
      source: c.source,
      similarity: Math.round(c.similarity),
      isExactMatch: c.isExactMatch,
      pantryItemId: c.pantryItemId,
      stockLevel: c.stockLevel,
      estimatedPrice: c.estimatedPrice,
      priceSource: c.priceSource,
      storeName: c.storeName,
      size: c.size,
      unit: c.unit,
      category: c.category,
    }));

    // ─── 6. "Did you mean?" detection ─────────────────────────────────
    // If top result is a fuzzy match (not exact), suggest it as correction
    let didYouMean: {
      original: string;
      suggestion: string;
      similarity: number;
    } | null = null;

    if (
      filtered.length > 0 &&
      !filtered[0].isExactMatch &&
      filtered[0].similarity >= 60 &&
      filtered[0].similarity < 100
    ) {
      didYouMean = {
        original: term,
        suggestion: filtered[0].name,
        similarity: Math.round(filtered[0].similarity),
      };
    }

    return { suggestions, didYouMean };
  },
});
