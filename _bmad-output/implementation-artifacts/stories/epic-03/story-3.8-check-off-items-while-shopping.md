### Story 3.8: Check Off Items While Shopping

As a **user**,
I want **to check off items as I shop**,
So that **I can track what I've already grabbed**.

**Acceptance Criteria:**

**Given** I'm viewing a shopping list
**When** I tap the checkbox next to an item
**Then** the item is marked as checked with a strikethrough
**And** I feel a light haptic feedback

**Given** I accidentally check an item
**When** I tap the checkbox again
**Then** the item is unchecked (strikethrough removed)

**Given** I check off all items
**When** the last item is checked
**Then** I see a celebration animation (confetti)
**And** I see a modal: "All done! Complete this trip?"
**And** If I confirm, the list status changes to "completed"

**Given** I'm shopping and check off items
**When** I view the list
**Then** checked items move to the bottom of the list
**And** Unchecked items stay at the top (priority order)

**Given** I complete a trip under budget
**When** the list is completed
**Then** I see a special celebration: "Amazing! You saved £5!"
**And** I see a savings animation

**Technical Requirements:**
- Checkbox component with strikethrough styling
- Convex mutation: `toggleItemChecked(listItemId)`
- Confetti animation when all items checked
- Completion modal with savings calculation
- FR32, FR93 (celebration)

---

