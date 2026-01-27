### Story 2.2: Pantry Grid View with Categories

As a **user**,
I want **to see my pantry items in a categorized grid**,
So that **I can quickly find what I'm looking for**.

**Acceptance Criteria:**

**Given** I have pantry items in multiple categories
**When** I open the Pantry screen
**Then** I see items grouped by category in collapsible sections
**And** Each section shows the category name and item count (e.g., "Produce (12)")

**Given** I tap on a category header
**When** the section is collapsed
**Then** it expands to show all items in that category
**And** I feel a subtle haptic feedback

**Given** I see an item in the grid
**When** I look at the item card
**Then** I see: item name, stock level indicator (color-coded circle: 🟢 Stocked, 🟡 Good, 🟠 Low, 🔴 Out)
**And** The card uses AdaptiveCard component for platform styling

**Given** I have no items in a category
**When** I view that category
**Then** I see an empty state: "No items yet. Tap + to add."

**Technical Requirements:**
- Grid layout with 2-3 columns (responsive to device width)
- Group items by category with collapsible sections
- Color-coded stock indicators
- Use `<AdaptiveCard>` for item cards
- FR8, FR14

---

