### Story 2.5: Auto-Add "Out" Items to Shopping List

As a **user**,
I want **items marked "Out" to automatically appear on my shopping list**,
So that **I don't forget to buy them**.

**Acceptance Criteria:**

**Given** I mark an item as "Out" (via swipe or picker)
**When** the stock level changes to "Out"
**Then** the item flies off the screen with an animation toward the "Lists" tab
**And** The item is automatically added to my active shopping list in Convex
**And** I see a toast message: "Added [item name] to shopping list"
**And** I feel a success haptic

**Given** I don't have an active shopping list
**When** an item becomes "Out"
**Then** a new shopping list is created called "Shopping List [date]"
**And** The item is added to this new list

**Given** the item is already on my shopping list
**When** I mark it "Out" again
**Then** the quantity is incremented (or nothing happens if quantity = 1)
**And** I see a toast: "[item name] already on list"

**Given** I mark multiple items as "Out" quickly
**When** several items reach "Out" status
**Then** each item flies to the Lists tab sequentially (not all at once)
**And** A batch toast appears: "Added 3 items to shopping list"

**Technical Requirements:**
- Fly-off animation using React Native Reanimated
- Convex mutation: `addToShoppingList(pantryItemId, userId)`
- Toast notification component
- Handle edge case: no active list (create one)
- FR13

---

