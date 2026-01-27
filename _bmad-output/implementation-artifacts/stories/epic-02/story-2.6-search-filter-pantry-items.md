### Story 2.6: Search & Filter Pantry Items

As a **user**,
I want **to search and filter my pantry items**,
So that **I can quickly find specific items in a large pantry**.

**Acceptance Criteria:**

**Given** I have many pantry items
**When** I pull down on the pantry screen
**Then** a search bar appears at the top

**Given** I type in the search bar
**When** I enter text (e.g., "milk")
**Then** the pantry grid filters in real-time to show matching items
**And** Matching is case-insensitive and matches partial names
**And** Items are highlighted that match the search term

**Given** I have filtered items
**When** I clear the search bar
**Then** all items reappear grouped by category

**Given** I want to filter by stock level
**When** I tap the filter icon
**Then** I see checkboxes for: Stocked, Good, Low, Out
**And** I can select multiple stock levels
**And** Only items matching the selected levels are shown

**Given** I have both search and filter active
**When** I use both simultaneously
**Then** items must match BOTH the search term AND the selected stock levels

**Technical Requirements:**
- Search bar component with debounced input (300ms)
- Filter modal with multi-select checkboxes
- Real-time filtering (no re-fetch, filter on client side)
- Highlight matching text in search results
- FR8 (implicit search/filter requirement)

---

## Epic 3: Shopping Lists with Budget Control

