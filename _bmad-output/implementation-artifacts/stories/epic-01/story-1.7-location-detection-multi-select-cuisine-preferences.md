### Story 1.7: Location Detection & Multi-Select Cuisine Preferences

As a **new user**,
I want **the app to detect my location and let me select cuisines I cook**,
So that **my pantry is seeded with realistic items I'll actually use**.

**Acceptance Criteria:**

**Given** I complete sign-up and reach onboarding
**When** the location/cuisine screen loads
**Then** the app attempts to auto-detect my country based on device location (if permission granted)
**And** The detected country and currency are shown (e.g., "You're in the UK - prices in GBP")

**Given** I grant location permission
**When** the app detects my location
**Then** my country is stored in my user profile
**And** The currency is auto-detected (e.g., UK → GBP, USA → USD)

**Given** I deny location permission
**When** the location/cuisine screen loads
**Then** I can manually select my country from a list
**And** The currency defaults based on country selection

**Given** I see the cuisine selection options
**When** I review the 12+ cuisine options
**Then** I see: British, Nigerian, Indian, Chinese, Italian, Pakistani, Caribbean, Mexican, Middle Eastern, Japanese, Korean, Thai, Vietnamese, Ethiopian, etc.
**And** Each cuisine has a representative icon/emoji

**Given** I select multiple cuisines
**When** I tap on cuisine options
**Then** they are highlighted with a checkmark
**And** I feel subtle haptic feedback for each selection
**And** I can select as many cuisines as I want (multi-select)

**Given** I finish selecting cuisines
**When** I tap "Continue"
**Then** my country, currency, and cuisine preferences are saved to Convex
**And** I proceed to the AI pantry seeding step

**Technical Requirements:**
- `app/onboarding/cuisine-selection.tsx` screen
- Location permission request using Expo Location
- Country detection via device location or IP fallback
- Currency auto-detection logic
- 12+ cuisine options with icons
- Multi-select with checkmarks and haptics
- FR75, FR76, FR86, FR89

---

