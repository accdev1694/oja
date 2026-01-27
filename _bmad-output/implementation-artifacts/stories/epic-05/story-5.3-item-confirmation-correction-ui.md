### Story 5.3: Item Confirmation & Correction UI

As a **user**,
I want **to review and correct AI-parsed items**,
So that **my price history is accurate**.

**Acceptance Criteria:**

**Given** the AI parsed my receipt
**When** I see the confirmation screen
**Then** I see all extracted items in an editable list
**And** Each item shows: name, price, quantity

**Given** an item name is incorrect
**When** I tap on it
**Then** I can edit the name
**And** Auto-suggestions from my pantry items appear as I type

**Given** a price is incorrect
**When** I tap the price
**Then** I can edit it with a numeric keypad

**Given** the AI missed an item
**When** I tap "Add Missing Item"
**Then** I can manually add: name, price, quantity

**Given** the AI detected a non-grocery item (e.g., "Gift Card")
**When** I see it
**Then** I can swipe left to delete it
**And** I see a toast: "Item removed"

**Given** I finish reviewing items
**When** I tap "Save Receipt"
**Then** all items are saved to Convex with: userId, receiptId, itemName, price, store, date
**And** I see a success animation
**And** I'm redirected to the reconciliation view (Story 5.5)

**Technical Requirements:**
- Editable item list component
- Auto-suggestions from pantry items
- Swipe-to-delete for items
- Convex mutation: `saveReceipt(userId, receiptData)`
- Store receipt in `receipts` table and items in `receiptItems` table
- FR38

---

