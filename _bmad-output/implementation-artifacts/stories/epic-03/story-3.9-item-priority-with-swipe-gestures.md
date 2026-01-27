### Story 3.9: Item Priority with Swipe Gestures

As a **user**,
I want **to set item priority with swipe gestures**,
So that **I know what to buy first if I'm near my budget**.

**Acceptance Criteria:**

**Given** I have items on my list
**When** I swipe right on an item
**Then** it's marked as "High Priority" with a 🔴 red indicator
**And** I feel a medium haptic feedback

**Given** an item is High Priority
**When** I swipe right again
**Then** it's marked as "Must Have" with a 🔴🔴 double red indicator
**And** I feel a heavy haptic feedback

**Given** I swipe left on an item
**When** I swipe left
**Then** it's marked as "Nice to Have" with a 🟡 yellow indicator
**And** I feel a light haptic feedback

**Given** I view my list
**When** items have different priorities
**Then** they are sorted: Must Have → High Priority → Normal → Nice to Have
**And** Each priority section is visually separated

**Given** I'm near my budget and have "Nice to Have" items
**When** my total reaches 90% of budget
**Then** "Nice to Have" items are grayed out with a note: "Remove these if needed"

**Technical Requirements:**
- Swipe gesture recognizer (left and right)
- Priority levels: Must Have (2), High (1), Normal (0), Nice (-1)
- Automatic sorting by priority
- Visual indicators (color dots)
- Haptic feedback per priority level
- FR33

---

