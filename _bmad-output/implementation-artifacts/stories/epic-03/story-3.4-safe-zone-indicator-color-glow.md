### Story 3.4: Safe Zone Indicator (Color Glow)

As a **user**,
I want **to see a color glow indicating my budget safety**,
So that **I know at a glance if I'm on track**.

**Acceptance Criteria:**

**Given** my total is under 75% of budget (e.g., £30 of £50)
**When** I view the list
**Then** the list card has a green glow/border
**And** The safe zone indicator shows: "Safe Zone: £7.50 remaining buffer"

**Given** my total is between 75% and 100% of budget (e.g., £42 of £50)
**When** I view the list
**Then** the list card has a yellow/orange glow
**And** The safe zone indicator shows: "Approaching Budget Limit"

**Given** my total exceeds 100% of budget (e.g., £52 of £50)
**When** I view the list
**Then** the list card has a red glow
**And** The safe zone indicator shows: "Over Budget: £2"

**Given** I add an item that pushes me over 75% threshold
**When** the total crosses 75%
**Then** the glow transitions from green → yellow with smooth animation
**And** I feel a warning haptic

**Technical Requirements:**
- Border glow component with 3 states: green, yellow, red
- 75% threshold calculation
- Smooth color transition animations
- Haptic feedback on threshold crossing
- FR26

---

