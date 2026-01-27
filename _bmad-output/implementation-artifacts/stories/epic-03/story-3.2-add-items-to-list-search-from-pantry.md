### Story 3.2: Add Items to List (Search from Pantry)

As a **user**,
I want **to add items from my pantry to a shopping list**,
So that **I can quickly build my list from items I know I need**.

**Acceptance Criteria:**

**Given** I'm viewing a shopping list
**When** I tap "Add Item"
**Then** I see a search interface showing all my pantry items

**Given** I search for an item in the search bar
**When** I type (e.g., "milk")
**Then** pantry items matching the search appear in real-time
**And** Each item shows: name, category, current stock level

**Given** I tap on a pantry item
**When** I select it
**Then** it's added to the shopping list with: name (from pantry), quantity: 1, price: null (to be filled later)
**And** I see a success toast: "Added [item] to list"
**And** I feel a success haptic

**Given** I want to add an item not in my pantry
**When** I tap "Add Custom Item"
**Then** I can enter: name, price (optional), quantity
**And** After submitting, it's added to the list

**Given** an item is already on the list
**When** I try to add it again
**Then** the quantity is incremented instead of creating a duplicate
**And** I see a toast: "[item] quantity updated to 2"

**Technical Requirements:**
- Search interface with real-time pantry item filtering
- Convex mutation: `addItemToList(listId, pantryItemId, quantity)`
- Handle custom items (not linked to pantry)
- Prevent duplicates (increment quantity instead)
- FR21, FR22, FR23

---

