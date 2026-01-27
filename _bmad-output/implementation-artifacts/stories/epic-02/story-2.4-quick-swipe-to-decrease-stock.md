### Story 2.4: Quick Swipe to Decrease Stock

As a **user**,
I want **to swipe left on an item to decrease its stock level**,
So that **I can quickly update stock as I use items**.

**Acceptance Criteria:**

**Given** an item is at "Stocked" level
**When** I swipe left on the item
**Then** it changes to "Good"
**And** I feel a light haptic feedback
**And** The color indicator updates immediately

**Given** an item is at "Good" level
**When** I swipe left
**Then** it changes to "Low"
**And** I feel a light haptic feedback

**Given** an item is at "Low" level
**When** I swipe left
**Then** it changes to "Out"
**And** I feel a warning haptic feedback
**And** The item triggers the auto-add to shopping list flow (Story 2.5)

**Given** an item is already "Out"
**When** I swipe left
**Then** nothing happens (already at minimum)

**Given** I accidentally swipe
**When** I immediately swipe right
**Then** the item returns to the previous stock level
**And** This works within 3 seconds (undo window)

**Technical Requirements:**
- Swipe gesture recognizer (horizontal only)
- Smooth animation for stock level change
- Undo functionality (3-second window)
- Optimistic update with Convex sync
- FR12

---

