### Story 5.5: Reconciliation View (Planned vs Actual)

As a **user**,
I want **to compare what I planned to spend vs what I actually spent**,
So that **I can see how well I stuck to my budget**.

**Acceptance Criteria:**

**Given** I completed a shopping trip with a list that had a budget
**When** I save the receipt
**Then** I see a reconciliation screen comparing planned vs actual

**Given** I view the reconciliation
**When** the screen loads
**Then** I see:
  - **Budget**: £50
  - **Actual Spent**: £48
  - **Difference**: £2 saved (in green)
  - **Items Planned**: 10
  - **Items Purchased**: 12 (2 unplanned)

**Given** I stayed under budget
**When** the reconciliation shows savings
**Then** I see a celebration: "Amazing! You saved £2! 🎉"
**And** I feel a success haptic
**And** The savings are added to my "Total Saved" gamification stat

**Given** I went over budget
**When** the reconciliation shows overspend
**Then** I see: "Went over by £5. No worries, it happens!"
**And** I see which unplanned items caused the overage

**Given** I bought unplanned items
**When** the reconciliation loads
**Then** I see a section: "Unplanned Purchases (2)" with the items listed
**And** Each shows: name, price, and whether it was from impulse fund

**Given** I finish reviewing the reconciliation
**When** I tap "Complete Trip"
**Then** the list status changes to "completed"
**And** The receipt is linked to the completed list

**Technical Requirements:**
- Reconciliation calculation logic
- Compare list items vs receipt items
- Identify unplanned purchases
- Link receipt to shopping list (receiptId ↔ listId)
- Update user's "Total Saved" stat
- FR53, FR54, FR55

---

