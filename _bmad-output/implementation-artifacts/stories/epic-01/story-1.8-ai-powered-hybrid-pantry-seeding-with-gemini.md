### Story 1.8: AI-Powered Hybrid Pantry Seeding with Gemini

As a **new user**,
I want **200 pantry items automatically generated based on my location AND cuisine preferences**,
So that **I get realistic local items plus cultural foods I actually cook**.

**Acceptance Criteria:**

**Given** I selected my location and cuisines in the previous step
**When** the AI seeding screen loads
**Then** I see a loading animation with a message: "Generating your personalized pantry..."
**And** A Gemini LLM call generates 200 hybrid items: 60% local staples (based on country) + 40% cultural items (based on selected cuisines)

**Given** Gemini is generating items for a UK user who selected Nigerian + Indian cuisines
**When** the LLM responds
**Then** 120 items are UK/universal staples (milk, bread, eggs, butter, tea, potatoes, Heinz beans, cheddar, etc.)
**And** 40 items are Nigerian items (egusi, palm oil, plantain, fufu flour, etc.)
**And** 40 items are Indian items (cumin, turmeric, basmati rice, ghee, etc.)
**And** Each item includes: name, category, typical stockLevel

**Given** the AI generation completes successfully
**When** the items are received
**Then** they are temporarily stored (not yet saved to database)
**And** I am redirected to the seed item review screen

**Given** the AI generation fails
**When** an error occurs
**Then** I see a friendly error message
**And** I can retry the generation
**Or** I can skip and start with an empty pantry

**Technical Requirements:**
- `convex/actions.ts` with Gemini API integration
- Action: `generateHybridSeedItems(country: string, cuisines: string[])` returns 200 items
- Hybrid prompt: 60% local/universal items (based on country) + 40% cultural items (split by cuisine count)
- Loading screen with animation
- Error handling with retry option
- FR16, GF8

---

