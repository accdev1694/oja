### Story 3.3: Running Total & Budget Display

As a **user**,
I want **to see my running total and remaining budget**,
So that **I know how much I'm spending in real-time**.

**Acceptance Criteria:**

**Given** I set a budget for my list (e.g., £50)
**When** I view the list
**Then** I see at the top: "Budget: £50 | Spent: £0 | Remaining: £50"

**Given** I add items with prices
**When** I enter prices for items (e.g., milk £1.20, bread £0.90)
**Then** the running total updates in real-time
**And** The display shows: "Budget: £50 | Spent: £2.10 | Remaining: £47.90"

**Given** my total exceeds the budget
**When** the running total goes over (e.g., Spent: £52)
**Then** the "Remaining" shows negative in red: "Remaining: -£2" in red text
**And** I see a warning icon

**Given** I haven't set a budget
**When** I view the list
**Then** I only see: "Spent: £2.10"
**And** No budget or remaining amount is shown

**Given** I edit an item's price
**When** I change a price (e.g., milk £1.20 → £1.50)
**Then** the running total updates immediately

**Technical Requirements:**
- Real-time calculation of total from all list items
- Budget display component at top of list
- Color coding: green (under budget), yellow (approaching budget), red (over budget)
- Convex query to sum all item prices
- FR24, FR25

---

