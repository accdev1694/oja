### Story 1.9: Seed Item Review & Customization

As a **new user**,
I want **to review and remove unwanted items from the AI-generated list**,
So that **my pantry only contains items I actually use**.

**Acceptance Criteria:**

**Given** I receive 200 AI-generated items
**When** the review screen loads
**Then** I see all 200 items in a scrollable grid grouped by category
**And** Each item shows: name, category, checkmark (selected by default)
**And** I see counts: "Local: 120 items | Cultural: 80 items"

**Given** I see an item I don't use
**When** I tap the item
**Then** it is deselected (checkmark removed)
**And** A subtle haptic feedback confirms the action

**Given** I accidentally deselect an item
**When** I tap it again
**Then** it is re-selected (checkmark appears)

**Given** I finish reviewing items
**When** I tap "Save to Pantry"
**Then** all selected items are saved to my pantry in Convex
**And** Each item gets: userId, name, category, stockLevel: "full", createdAt
**And** I see a success animation (cascade effect)
**And** I am redirected to the budget setup step

**Given** I remove all items
**When** I tap "Save to Pantry"
**Then** I see a warning: "You haven't selected any items. Start with an empty pantry?"
**And** If I confirm, I proceed with an empty pantry

**Technical Requirements:**
- `app/onboarding/seed-review.tsx` screen
- Grid view with checkboxes grouped by category
- Show local vs cultural item counts
- Convex mutation: `bulkCreatePantryItems(userId, items[])`
- Cascade animation for items being saved
- FR16, FR87

---

## Epic 2: Pantry Stock Tracker

