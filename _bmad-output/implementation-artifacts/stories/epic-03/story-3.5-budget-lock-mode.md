### Story 3.5: Budget Lock Mode

As a **user**,
I want **to lock my budget to prevent accidentally going over**,
So that **I can shop with confidence**.

**Acceptance Criteria:**

**Given** I'm viewing a list with a budget set
**When** I tap the "Lock Budget" toggle
**Then** budget lock mode is enabled
**And** I see a lock icon next to the budget display

**Given** budget lock is enabled
**When** I try to add an item that would exceed the budget
**Then** I see a blocking modal: "Adding this item would exceed your budget. Remove items or unlock budget to continue."
**And** The item is NOT added to the list
**And** I feel an error haptic

**Given** budget lock is enabled and I'm at the limit
**When** I try to increase an item's price
**Then** I see the same blocking modal
**And** The price change is NOT saved

**Given** I want to override the lock
**When** I tap "Unlock Budget" in the modal
**Then** budget lock is disabled
**And** I can add the item that exceeded the budget

**Given** budget lock is enabled
**When** I remove an item or decrease prices
**Then** I can freely add items again (as long as I stay under budget)

**Technical Requirements:**
- Toggle switch for budget lock mode
- Validation logic: prevent actions that exceed budget
- Blocking modal with explanation
- Lock state persisted in Convex (list.budgetLocked: boolean)
- FR27

---

