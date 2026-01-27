### Story 5.6: Auto-Restock Pantry from Receipt

As a **user**,
I want **my pantry to auto-update when I scan receipts**,
So that **my stock levels stay accurate without manual updates**.

**Acceptance Criteria:**

**Given** I scan a receipt with items that exist in my pantry
**When** the receipt is saved
**Then** matching pantry items are automatically updated to "Stocked" level
**And** I see a toast: "Pantry updated: 8 items restocked"

**Given** a receipt item matches a pantry item by name
**When** the auto-restock happens
**Then** the pantry item's stockLevel changes to "Stocked"
**And** the lastUpdated timestamp is updated

**Given** a receipt item is close but not exact match (e.g., "Whole Milk" vs "Milk")
**When** the system detects similarity (>80% match)
**Then** I see a confirmation: "Restock 'Milk' from receipt item 'Whole Milk'?"
**And** I can approve or skip

**Given** a receipt item doesn't exist in my pantry
**When** the auto-restock runs
**Then** I see a prompt: "Add '[item]' to your pantry?"
**And** If I approve, it's added with stockLevel: "Stocked"

**Given** I don't want auto-restock for certain items
**When** I go to settings
**Then** I can disable auto-restock globally or for specific items

**Technical Requirements:**
- String similarity matching (Levenshtein distance or fuzzy match)
- Convex mutation: `autoRestockFromReceipt(receiptId, userId)`
- Confirmation prompts for fuzzy matches
- Settings toggle for auto-restock
- FR56, FR57, FR58

---

## Epic 6: Insights, Gamification & Progress

