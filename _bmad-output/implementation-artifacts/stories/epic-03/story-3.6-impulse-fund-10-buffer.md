### Story 3.6: Impulse Fund (10% Buffer)

As a **user**,
I want **a 10% impulse fund as a buffer**,
So that **I can grab spontaneous items without guilt**.

**Acceptance Criteria:**

**Given** I set a budget of £50
**When** I view the list
**Then** I see: "Budget: £50 | Impulse Fund: £5 (10%)"
**And** The impulse fund is calculated automatically

**Given** my total is £48 (within budget)
**When** I check the impulse fund
**Then** I see: "Impulse Fund: £7 remaining" (£50 + £5 - £48)
**And** The impulse fund shows in green

**Given** I've spent my main budget (£50) but not the impulse fund
**When** my total is £52
**Then** I see: "Budget Exceeded | Impulse Fund: £3 remaining"
**And** The main budget shows red, but impulse fund shows yellow

**Given** I've spent my main budget AND impulse fund
**When** my total is £56 (over £55 limit)
**Then** I see: "Over Budget + Impulse Fund: £1"
**And** Both budgets show red

**Given** budget lock is enabled
**When** I reach my main budget (£50)
**Then** I can still add items up to the impulse fund limit (£55 total)
**And** I only get blocked at £55

**Technical Requirements:**
- Calculate impulse fund as 10% of budget
- Display impulse fund separately from main budget
- Color coding for fund states
- Budget lock respects impulse fund (allows up to budget + 10%)
- FR28

---

