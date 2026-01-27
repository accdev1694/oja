### Story 3.10: Smart Suggestions with Jina AI

As a **user**,
I want **AI-powered suggestions based on my list**,
So that **I don't forget commonly purchased items**.

**Acceptance Criteria:**

**Given** I have items on my list (e.g., pasta, tomatoes, garlic)
**When** I view the list
**Then** I see a "Suggestions" section at the bottom
**And** The suggestions show: "You might need: olive oil, parmesan, basil"

**Given** the AI suggests items
**When** the suggestions are generated
**Then** they are based on Jina AI embeddings of my current list items
**And** The suggestions match common ingredient pairings

**Given** I tap on a suggested item
**When** I select it
**Then** the item is added to my list with quantity: 1
**And** I see a toast: "Added [item] to list"

**Given** I dismiss a suggestion
**When** I swipe left on a suggestion
**Then** it's removed from the suggestions list
**And** It won't be suggested again for this list

**Given** I add a suggested item
**When** the item is added
**Then** the suggestions refresh with new recommendations
**And** The new suggestions consider the newly added item

**Technical Requirements:**
- Convex action: `generateSuggestions(listItems: string[])` using Jina AI embeddings
- Embeddings-based similarity search
- Suggestion cards with "Add" and "Dismiss" actions
- Cache suggestions to avoid repeated API calls
- FR34, FR35

---

## Epic 4: Partner Mode & Collaboration

