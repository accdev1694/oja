# Feature Rules

> **Purpose:** This file defines the expected behavior of each feature in Oja.
> It serves as a contract — new features and changes MUST NOT break the rules defined here.
> Before modifying any feature, read its section below and verify compliance after implementation.

---

## How to Use This File

1. **Before implementing:** Read the relevant feature section(s) to understand existing behavior
2. **During implementation:** Verify your changes do not violate any rules listed here
3. **After implementation:** Test against every rule in the affected section(s)
4. **Adding new features:** Add a new section following the template at the bottom

---

## Table of Contents

<!-- Update this list as new features are added -->

1. [Scan Product to Add to List](#1-scan-product-to-add-to-list)
2. [Item Display Naming](#2-item-display-naming)

---

<!-- ============================================================ -->
<!-- FEATURE SECTIONS GO BELOW - Follow the template for each one -->
<!-- ============================================================ -->

## 1. Scan Product to Add to List

> Quick-add items to a shopping list by scanning the product label instead of typing. The camera reads the label to extract the item name and size/weight, then adds it to the list with a price.

**Owner files:**
- `convex/ai/vision.ts` (`scanProduct`) - AI vision extraction
- `hooks/scanner/useImageProcessor.ts` - Image upload + AI pipeline
- `hooks/scanner/useScannerQueue.ts` - Scanned product queue
- `hooks/scanner/dedupHelpers.ts` - Client-side duplicate detection
- `components/scan/ProductMode.tsx` - Scan preview display
- `components/scan/EditScannedItemModal.tsx` - Edit before adding
- `app/(app)/(tabs)/scan.tsx` - Scan tab UI + add-to-list orchestration
- `convex/listItems/core.ts` (`addBatchFromScan`) - Backend item creation
- `convex/lib/itemNameParser.ts` - Name/size/unit cleaning
- `convex/lib/priceValidator.ts` (`getEmergencyPriceEstimate`) - Price fallback
- `components/list/ShoppingListItem.tsx` - List item display

**Expected Behavior:**

1. User scans the **product label** showing the item name and size/weight
2. AI extracts **three separate fields** — name, size, and unit:
   - **name** — brand + product type ONLY, MAX 25 chars, no size/weight/marketing copy (e.g. `"Cantu Leave-In Conditioner"`, `"Semi-Skimmed Milk"`)
   - **size** — ONE metric measurement from label (e.g. `"2kg"`, `"500ml"`, `"4 pack"`). If label shows both imperial and metric, use metric only
   - **unit** — measurement unit extracted from size (e.g. `"kg"`, `"ml"`, `"pack"`)
3. Name, size, unit are stored as **separate DB fields** — never concatenated in storage
4. Display is always **`{size} {name}`** (e.g. `2kg Yams`) via `formatItemDisplay()` — used in both the scan preview and shopping list (see [Item Display Naming](#2-item-display-naming))
5. If no price is captured, `addBatchFromScan` calls `getEmergencyPriceEstimate()` — no item may have a blank price (`priceConfidence: 0.3` for emergency fallback)
6. User can review and edit scanned items before adding; the edit modal runs `cleanItemForStorage()` on confirm so edited sizes get valid units
7. Duplicate detection (92% name similarity + size match) prevents the same product being queued twice

**Constraints:**

- AI prompt MUST ask for `name`, `size`, and `unit` as separate fields and MUST instruct the AI not to embed size in the name
- AI prompt MUST enforce: name is brand + product type only (MAX 25 chars), size is ONE metric unit, never both imperial and metric
- `scan.tsx` MUST pass `unit` alongside `name` and `size` to the backend — never drop it
- All scanned items MUST pass through `cleanItemForStorage()` before DB insertion (`addBatchFromScan`) and before returning from the edit modal (`EditScannedItemModal`)
- Size without a valid unit is **rejected entirely** — both become `undefined`
- Valid UK units only: `ml`, `l`, `g`, `kg`, `pt`, `pint`, `pack`, `pk`, `x`, `oz`
- Vague sizes (`"per item"`, `"each"`, `"unit"`, `"piece"`) are filtered out
- Display format is always `"{size} {name}"` — never `"{name} {size}"`
- `ProductMode.tsx` MUST use `formatItemDisplay()` so the scan preview matches the list display

**Validation:**

- Scan a labelled product → name and size extracted as separate fields, unit derived from size
- Scan preview shows `"{size} {name}"` (e.g. `2kg Yams`), matching the list display
- Product with no price on label → price auto-filled via emergency estimate, not blank
- Product with no visible size → added with name only, no invalid size stored
- Product with dual measurements (e.g. `"8 FL OZ / 237 mL"`) → AI returns metric only (`"237ml"`)
- Edit size in modal to a new value (e.g. `"1L"`) → unit re-parsed to `"L"`, not frozen as original
- Edit size to something invalid → backend rejects, item saved with name only

---

## 2. Item Display Naming

> Controls how item names appear across the entire app — shopping lists, scan previews, suggestions, and any UI that shows an item. All display flows through `formatItemDisplay()` and all storage flows through `cleanItemForStorage()`.

**Owner files:**
- `convex/lib/itemNameParser.ts` - Core parser: `formatItemDisplay()`, `cleanItemForStorage()`, `parseItemNameAndSize()`, `isValidSize()`
- `components/list/ShoppingListItem.tsx` - Shopping list item display
- `components/scan/ProductMode.tsx` - Scan preview display
- `components/scan/EditScannedItemModal.tsx` - Edit modal pre-save cleaning
- `__tests__/lib/itemNameParser.test.ts` - Unit tests (23 cases)

**Expected Behavior:**

1. Display format is always **`{size} {name}`** — e.g. `"500ml Milk"`, `"2kg Yams"`, never `"Milk 500ml"`
2. Total display string is capped at **40 characters** (`MAX_DISPLAY_CHARS`). If exceeded, the **name** is truncated with ellipsis — size is never truncated
3. Name should be **concise**: brand + product type only (e.g. `"Cantu Leave-In Conditioner"`, not `"Cantu Shea Butter for Natural Hair Leave-In Conditioning Repair Cream Treatment"`)
4. Size must be a **single metric measurement** — prefer `ml`, `l`, `g`, `kg`, `pints`, `pack`. Dual-unit strings are cleaned automatically:
   - `"227g (8oz)"` → `"227g"` (parenthetical imperial stripped)
   - `"347ml/12 fl oz"` → `"347ml"` (slash imperial stripped)
   - `"8 FL OZ / 237 mL"` → `"237ml"` (imperial-first, metric extracted)
5. Size and unit are **always paired** — if unit cannot be derived, both become `undefined` and the item displays name only
6. Items with no valid size display **name only** — no empty size prefix, no vague labels

**Constraints:**

- Every item creation/update in the entire codebase MUST call `cleanItemForStorage()` before DB write
- Every item display in the entire codebase MUST call `formatItemDisplay()` for the visible name
- `cleanDuplicateUnits()` handles metric-first AND imperial-first dual-unit patterns via `METRIC_EXTRACT` regex
- `stripDualUnitFromName()` catches dual-unit prefixes the AI embeds in the name field (e.g. `"8 FL OZ / 237 mL Leave-in Conditioner"` → name: `"Leave-in Conditioner"`, size: `"237ml"`)
- Size extraction priority: start of name (`SIZE_PATTERN`) → dual-unit prefix (`stripDualUnitFromName`) → end of name (`SIZE_END_PATTERN`)
- Valid UK units only: `ml`, `l`, `g`, `kg`, `pt`, `pint`, `pints`, `pack`, `pk`, `x`, `oz`
- Vague sizes (`"per item"`, `"each"`, `"unit"`, `"piece"`) are filtered out and treated as no-size
- `formatItemDisplay()` also cleans size and name at display time as a safety net for old DB data that wasn't cleaned at storage time
- Size without unit is **UNACCEPTABLE** — `cleanItemForStorage()` throws if this invariant is violated

**Validation:**

- `"500ml Milk"` displays as `"500ml Milk"` — size before name
- `"Milk 500ml"` displays as `"500ml Milk"` — end-of-name size moves to front
- Name longer than ~34 chars with a 5-char size → truncated with ellipsis at 40 total chars
- Dual-unit size `"8 FL OZ / 237 mL"` → cleaned to `"237ml"` in both storage and display
- Dual-unit prefix in name `"8 FL OZ / 237 mL Product Name"` → name becomes `"Product Name"`, size becomes `"237ml"`
- Size `"large"` with no valid unit → rejected, item displays name only
- `cleanItemForStorage("Butter", "227g (8oz)", "g")` → `{ name: "Butter", size: "227g", unit: "g" }`
- All 23 tests in `itemNameParser.test.ts` pass

---

<!-- ============================================================ -->
<!-- TEMPLATE (copy this when adding a new feature)               -->
<!--                                                              -->
<!-- ## Feature Name                                              -->
<!--                                                              -->
<!-- **Owner files:**                                             -->
<!-- - `path/to/main/file.ts`                                    -->
<!-- - `path/to/supporting/file.ts`                              -->
<!--                                                              -->
<!-- **Expected Behavior:**                                       -->
<!-- 1. Rule or behavior description                              -->
<!-- 2. Another rule                                              -->
<!--                                                              -->
<!-- **Constraints:**                                             -->
<!-- - What MUST NOT happen                                       -->
<!-- - Edge cases to preserve                                     -->
<!--                                                              -->
<!-- **Validation:**                                              -->
<!-- - How to verify this feature still works                     -->
<!-- ============================================================ -->
