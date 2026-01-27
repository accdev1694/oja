### Story 6.2: Gamification (Streaks, Savings Jar, Challenges)

As a **user**,
I want **gamification features to keep me motivated**,
So that **saving money feels rewarding and fun**.

**Acceptance Criteria:**

**Given** I complete multiple shopping trips under budget
**When** I view my profile
**Then** I see a "Budget Streak" with 🔥 fire emoji
**And** The streak count shows how many consecutive under-budget trips I've made

**Given** I break my budget streak
**When** I go over budget
**Then** the streak resets to 0
**And** I see a motivational message: "No worries! Start a new streak next time."

**Given** I save money on shopping trips
**When** I complete reconciliation under budget
**Then** my savings are added to a "Savings Jar" visualization
**And** The jar fills up with animated coins
**And** I see total lifetime savings: "You've saved £127 so far!"

**Given** I reach savings milestones (£50, £100, £200)
**When** the jar reaches a milestone
**Then** I see a celebration animation with confetti
**And** I unlock an achievement badge

**Given** the app presents a weekly challenge
**When** the week starts
**Then** I see a challenge like: "Complete 2 shopping trips under budget this week"
**And** Progress is tracked in real-time
**And** Completing it unlocks a special badge

**Technical Requirements:**
- Streak calculation logic (consecutive under-budget trips)
- Animated savings jar component
- Challenge system with weekly rotation
- Achievement badges stored in user profile
- FR45, FR46, FR47, FR48

---

