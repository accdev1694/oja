### Story 3.7: Mid-Shop Add Flow (3 Options)

As a **user**,
I want **3 options when adding items mid-shop**,
So that **I can decide how to handle unexpected items**.

**Acceptance Criteria:**

**Given** I'm shopping (list status: "shopping") and I want to add an item
**When** I tap "Add Item" while shopping
**Then** I see a modal with 3 options:
1. "Add to Budget" (increase budget by item price)
2. "Use Impulse Fund" (default, highlighted)
3. "Defer to Next Trip" (add to a "Next Time" list)

**Given** I select "Add to Budget"
**When** I confirm
**Then** the item is added to the list
**And** the budget is increased by the item's price
**And** I see a toast: "Budget increased to £55"

**Given** I select "Use Impulse Fund" (default)
**When** I confirm
**Then** the item is added using the impulse fund
**And** I see a toast: "Added [item] using impulse fund"
**And** The impulse fund remaining decreases

**Given** I select "Defer to Next Trip"
**When** I confirm
**Then** the item is added to a special "Next Time" list
**And** I see a toast: "[item] saved for next trip"
**And** The item does NOT affect the current budget

**Given** I have no impulse fund remaining
**When** I tap "Add Item"
**Then** "Use Impulse Fund" option is grayed out
**And** I can only choose "Add to Budget" or "Defer to Next Trip"

**Technical Requirements:**
- Mid-shop modal with 3 radio options
- Default selection: "Use Impulse Fund"
- Create "Next Time" list if it doesn't exist
- Budget adjustment mutation for option 1
- FR29, FR30, FR31

---

