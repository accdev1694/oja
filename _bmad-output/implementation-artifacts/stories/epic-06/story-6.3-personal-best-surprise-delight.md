### Story 6.3: Personal Best & Surprise Delight

As a **user**,
I want **to track personal bests and get surprise moments**,
So that **the app feels delightful and celebrates my wins**.

**Acceptance Criteria:**

**Given** I complete a shopping trip with record low spending
**When** the reconciliation finishes
**Then** I see: "New Personal Best! Lowest grocery bill ever: £32! 🎉"
**And** The personal best is saved to my profile

**Given** I have personal bests tracked
**When** I view my profile
**Then** I see "Personal Bests" section showing:
  - Lowest total spend on a trip
  - Biggest savings on a trip
  - Longest budget streak

**Given** I perform mundane actions (like marking items as Out)
**When** I do routine tasks
**Then** occasionally (10% chance) I see a random toast with emoji:
  - "Nice! Staying organized! 🎯"
  - "Look at you go! ✨"
  - "You're on fire! 🔥"
**And** These appear randomly to add delight

**Given** I reach significant milestones
**When** I complete my 10th shopping trip
**Then** I see a celebration: "10 trips completed! You're a shopping pro! 🏆"

**Technical Requirements:**
- Personal best tracking in user profile
- Random delight message system (10% trigger rate)
- Milestone detection (10th, 25th, 50th, 100th trip)
- Celebration animations for milestones
- FR49, FR50

---

## Epic 7: Subscription, Payments & Loyalty

