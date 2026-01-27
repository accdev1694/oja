### Story 2.3: Stock Level Management (Tap-and-Hold Picker)

As a **user**,
I want **to update stock levels with a tap-and-hold picker**,
So that **I can quickly mark items as Stocked, Good, Low, or Out**.

**Acceptance Criteria:**

**Given** I want to update an item's stock level
**When** I tap and hold on an item card
**Then** a picker appears with 4 options: 🟢 Stocked, 🟡 Good, 🟠 Low, 🔴 Out
**And** The current stock level is pre-selected
**And** I feel a haptic feedback when the picker appears

**Given** the picker is open
**When** I drag my finger to a different stock level
**Then** the option highlights
**And** I feel a selection haptic for each level I pass over

**Given** I release my finger on a stock level
**When** I lift my finger
**Then** the item's stock level is updated in Convex
**And** The item card reflects the new color-coded indicator
**And** I feel a success haptic
**And** The picker closes with a smooth animation

**Given** I tap and hold but release outside the picker
**When** I lift my finger
**Then** no changes are made (cancelled)
**And** The picker closes

**Technical Requirements:**
- Tap-and-hold gesture recognizer (500ms threshold)
- Radial picker UI with 4 stock levels
- Haptic feedback for picker open, selection change, and confirm
- Optimistic update (instant UI update, then Convex sync)
- FR10, FR11

---

