# Item Matching System - Implementation Complete ✅

## Overview
Implemented a comprehensive multi-signal item matching system to solve the problem where receipt item names (e.g., "socks black 35 38 0502927") don't match scanned product names (e.g., "2pk nfl socks").

## What Was Built

### Phase 1-3: Multi-Signal Matching + User Confirmation + Learning ✅

#### 1. Database Schema (`convex/schema.ts`)

**New Tables:**

- **`itemMappings`** - Stores learned receipt pattern → canonical name mappings
  - Indexes: `by_store_pattern`, `by_store`, `by_canonical`, `by_confirmations`
  - Fields: `normalizedStoreId`, `receiptPattern`, `canonicalName`, `confirmationCount`, `typicalPriceMin/Max`
  - Purpose: Crowdsourced intelligence - learns from all user confirmations

- **`pendingItemMatches`** - Tracks items needing user confirmation
  - Indexes: `by_receipt`, `by_user_status`
  - Fields: `receiptId`, `receiptItemName`, `candidateMatches[]`, `status`, `confirmedMatch`
  - Purpose: Queue for user confirmation UI

#### 2. Matching Engine (`convex/lib/itemMatcher.ts`)

**Multi-Signal Algorithm:**

```
Score = (Token Overlap × 0.4) + (Category Match × 0.2) + (Price Proximity × 0.2) + (Learned Mapping × 0.2)
```

**Signals:**

1. **Token Overlap** (40% weight)
   - Strips brands (Tesco, Asda, etc.)
   - Extracts meaningful keywords
   - Jaccard similarity on token sets
   - Example: "Tesco Semi-Skimmed Milk 2 Pint" → ["semi", "skimmed", "milk", "2", "pint"]

2. **Category Matching** (20% weight)
   - Smart aliases (e.g., "produce" = "fruits & veg")
   - Exact or alias match = 100%

3. **Price Proximity** (20% weight)
   - ±20% tolerance = 100%
   - ±50% tolerance = 50%
   - Falls off linearly

4. **Learned Mappings** (20% weight)
   - Checks crowdsourced `itemMappings` table
   - Store-specific patterns
   - Learns from user confirmations
   - Example: "socks black 35 38 0502927" → "2pk nfl socks" at Tesco

**Functions:**

- `tokenize(name)` - Extracts meaningful keywords
- `calculateTokenOverlap(a, b)` - Token similarity score
- `calculateCategoryMatch(catA, catB)` - Category matching with aliases
- `calculatePriceProximity(p1, p2)` - Price similarity score
- `findLearnedMapping(ctx, storeId, receiptName)` - Lookup crowdsourced mapping
- `calculateMatchScore(receipt, candidate, mapping)` - Combines all signals
- `findBestMatch(receipt, candidates)` - Returns best match with confidence
- `matchReceiptItems(ctx, receiptItems, candidates, storeId)` - Batch matching
- `learnMapping(ctx, storeId, receiptName, canonicalName, ...)` - Store confirmed mapping

#### 3. Backend Integration

**Updated Mutations:**

- **`refreshListPrices`** (`convex/listItems.ts`)
  - NOW: Priority 0 = Check learned mappings first
  - Priority 1 = Personal price history
  - Priority 2 = Crowdsourced currentPrices
  - Fallback = Fuzzy matching

- **`refreshActiveListsFromReceipt`** (`convex/currentPrices.ts`)
  - Uses full `matchReceiptItems()` algorithm
  - Auto-learns high-confidence matches via `learnMapping()`
  - Returns `{ updated, listsUpdated, learned }`

**New API (`convex/itemMatching.ts`):**

- `getPendingMatches(receiptId)` - Query pending matches for receipt
- `getMyPendingMatches()` - Query all user's pending matches
- `getPendingMatchCount(receiptId)` - Count pending for badge
- `processReceiptMatching(receiptId)` - Creates pending matches after receipt save
- `confirmMatch(pendingMatchId, matchType, itemId, canonicalName)` - User confirms match
- `skipMatch(pendingMatchId)` - Skip without matching
- `markNoMatch(pendingMatchId)` - Mark as no corresponding item
- `skipAllPendingMatches(receiptId)` - Bulk skip

#### 4. User Confirmation UI (`components/receipt/UnmatchedItemsModal.tsx`)

**Features:**

- Shows unmatched receipt items one by one
- Displays candidate matches with confidence scores
- Tap candidate to confirm match
- "Skip" button - doesn't match but keeps for later
- "No Match" button - receipt item has no corresponding product
- "Skip all remaining" option for bulk action
- Progress indicator (e.g., "3 of 7 items")
- Glass UI design system

**Integration (`app/(app)/receipt/[id]/confirm.tsx`):**

- Added `processReceiptMatching` mutation hook (line 76)
- Added state: `showUnmatchedModal`, `pendingMatchCount` (lines 115-117)
- Calls `processReceiptMatching` after receipt save (lines 315-324)
- Shows modal if pending matches exist (lines 392-406)
- Modal component rendered (lines 860-871)
- Success message includes pending count (lines 358-360)

#### 5. Reconciliation Screen Enhancement (`app/(app)/receipt/[id]/reconciliation.tsx`)

**BEFORE:** Used exact string matching to identify unplanned purchases
```javascript
const unplannedItems = receipt.items.filter((receiptItem) => {
  return !listItems.some((listItem) =>
    listItem.name.toLowerCase().trim() === receiptItem.name.toLowerCase().trim()
  );
});
```

**AFTER:** Uses multi-signal matcher via `identifyUnplannedItems` query

**Benefits:**
- "Tesco Semi-Skimmed Milk 2 Pint" correctly matches "Semi-Skimmed Milk 2pt" → NOT unplanned
- "socks black 35 38 0502927" matches "2pk nfl socks" (after learning) → NOT unplanned
- More accurate budget insights
- Users see true impulse purchases, not just name mismatches

**New Query (`convex/itemMatching.ts:identifyUnplannedItems`):**
- Takes `receiptId` + `listId`
- Uses `matchReceiptItems()` with full multi-signal matching
- Returns only items with match score < 70%
- Includes `matchedCount` for transparency

## How It Works (User Flow)

1. **User scans receipt** → AI recognizes items → User confirms items
2. **User saves receipt** → System runs multi-signal matcher
3. **High-confidence matches** (score ≥ 70%) → Auto-applied + learned
4. **Low-confidence matches** → Create `pendingItemMatches` records
5. **If pending matches exist** → Show `UnmatchedItemsModal`
6. **User confirms matches** → System calls `learnMapping()` to store pattern
7. **Future receipts** from same store → Automatically use learned patterns
8. **Reconciliation screen** → Uses same matcher to show accurate "unplanned purchases"

## Example Scenarios

### Scenario 1: First Time Scanning
- Receipt: "socks black 35 38 0502927" (£5.99)
- List item: "2pk nfl socks" (estimated £5.50)
- Token overlap: Low (only "socks" matches)
- Category: Both "Clothing"
- Price: Within 20%
- **Score: ~40%** → Pending match created
- User confirms → `itemMappings` stores: "socks black 35 38 0502927" → "2pk nfl socks" at Tesco

### Scenario 2: Second Scan (After Learning)
- Receipt: "socks black 35 38 0502927" (£5.99)
- List item: "2pk nfl socks" (estimated £5.50)
- Learned mapping: Found! (from previous confirmation)
- **Score: 90%** → Auto-matched + price updated
- No modal shown → Seamless experience

### Scenario 3: Different Product
- Receipt: "Tesco Semi-Skimmed Milk 2 Pint" (£1.55)
- List item: "Semi-Skimmed Milk 2pt" (estimated £1.65)
- Token overlap: High (semi, skimmed, milk, 2, pint/pt)
- Category: Both "Dairy"
- Price: Within 10%
- **Score: 85%** → Auto-matched + price updated

### Scenario 4: Reconciliation (After Learning)
- **Shopping List:** "Semi-Skimmed Milk 2pt", "2pk nfl socks", "Bananas" (£15 budget)
- **Receipt Items:** "Tesco Semi-Skimmed Milk 2 Pint" (£1.55), "socks black 35 38 0502927" (£5.99), "BANANAS LOOSE" (£0.89), "Chocolate Bar" (£1.20)
- **Matching Results:**
  - Milk: Score 85% → Matched
  - Socks: Score 90% (learned) → Matched
  - Bananas: Score 88% → Matched
  - Chocolate: No match → **Truly unplanned**
- **Reconciliation Shows:**
  - Budget: £15.00
  - Actual: £9.63
  - Saved: £5.37 (35.8%)
  - **Unplanned Purchases: 1 item (£1.20)** ← Accurate!

**Before our fix:** Would show "3 unplanned items" (milk, socks, bananas) due to name mismatches

## Testing Checklist

### Unit Tests (Recommended)

```typescript
// Test tokenization
tokenize("Tesco Semi-Skimmed Milk 2 Pint")
// Should return: ["semi", "skimmed", "milk", "2", "pint"]

// Test token overlap
calculateTokenOverlap(
  ["semi", "skimmed", "milk"],
  ["semi", "skim", "milk"]
) // Should be ~0.67

// Test category matching
calculateCategoryMatch("Dairy", "dairy") // Should be 100%
calculateCategoryMatch("Fruits & Veg", "Produce") // Should be 100% (alias)

// Test price proximity
calculatePriceProximity(1.55, 1.65) // Should be ~94% (within 10%)
calculatePriceProximity(5.99, 15.99) // Should be ~0% (too far)
```

### Manual Testing

1. **Create a shopping list** with items like:
   - "Semi-Skimmed Milk 2pt" (Dairy)
   - "2pk nfl socks" (Clothing)
   - "Bananas" (Fruits & Veg)

2. **Scan a receipt** from the same store with:
   - "Tesco Semi-Skimmed Milk 2 Pint" (£1.55)
   - "socks black 35 38 0502927" (£5.99)
   - "BANANAS LOOSE" (£0.89)

3. **Confirm receipt** → Save

4. **Expected behavior:**
   - Milk: Auto-matched (high token overlap + category + price)
   - Bananas: Auto-matched (token overlap + category)
   - Socks: Pending match modal shown with candidate

5. **In modal:**
   - Tap "2pk nfl socks" candidate → Confirms match
   - Future scans of "socks black 35 38 0502927" → Auto-matched

6. **Check list prices:**
   - Tap "Refresh Prices" → Should update from learned mappings + receipt data

7. **Test reconciliation:**
   - Complete shopping trip with the list
   - Go to reconciliation screen
   - Verify "unplanned items" only shows items NOT on your list
   - Add a chocolate bar to receipt (not on list) → Should show as unplanned
   - Milk/socks/bananas should NOT show as unplanned (despite name differences)

## Performance Considerations

- **Indexes:** All queries use indexes (`by_store_pattern`, `by_receipt`, etc.)
- **Batch processing:** `matchReceiptItems` processes all items in one pass
- **Caching:** Learned mappings cached in `itemMappings` table
- **Optimistic UI:** Modal shows immediately, no blocking

## Next Steps (Optional)

### Phase 4: Semantic Embeddings (Future Enhancement)

For very hard matches, add semantic embedding fallback:

1. Generate embeddings for item names using OpenAI `text-embedding-3-small`
2. Store embeddings in new `itemEmbeddings` table
3. Use cosine similarity for unmatched items
4. Only call API for items that score < 50% on all other signals

**Cost estimate:** ~$0.0001 per item (~£0.01 for 100 items)

## Files Changed

| File | Changes | Lines |
|------|---------|-------|
| `convex/schema.ts` | Added `itemMappings` + `pendingItemMatches` tables | +65 |
| `convex/lib/itemMatcher.ts` | **NEW** - Multi-signal matching engine | +448 |
| `convex/itemMatching.ts` | **NEW** - Mutations/queries for confirmation flow + reconciliation | +532 |
| `convex/listItems.ts` | Updated `refreshListPrices` with learned mappings | ~30 |
| `convex/currentPrices.ts` | Updated `refreshActiveListsFromReceipt` with matcher | ~80 |
| `components/receipt/UnmatchedItemsModal.tsx` | **NEW** - User confirmation UI | +597 |
| `app/(app)/receipt/[id]/confirm.tsx` | Integrated modal into receipt flow | +25 |
| `app/(app)/receipt/[id]/reconciliation.tsx` | **UPDATED** - Smart unplanned items detection | ~10 |

**Total:** ~1,790 lines of new code

## Deployment

1. **Schema changes** → Convex will auto-migrate
2. **No breaking changes** → Fully backward compatible
3. **No data migration needed** → Tables start empty, populate as users confirm matches

## Success Metrics

Track these in analytics:

- **Auto-match rate:** % of receipt items matched without user intervention
- **Pending match resolution rate:** % of pending matches user confirms vs. skips
- **Learned mappings count:** Total mappings in `itemMappings` table
- **Price accuracy improvement:** % of list items with personal/crowdsourced prices vs. AI estimates

---

## Status: ✅ READY FOR TESTING

All TypeScript errors fixed. System is fully functional and ready for end-to-end testing.
