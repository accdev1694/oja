### Story 6.1: Weekly Digest & Monthly Trends

As a **user**,
I want **to see my spending patterns over time**,
So that **I can understand my shopping habits and improve**.

**Acceptance Criteria:**

**Given** I've been using the app for at least a week
**When** I tap the "Profile" tab
**Then** I see a "Weekly Digest" section showing:
  - Total spent this week
  - Number of shopping trips
  - Average trip cost
  - Top 3 categories by spend

**Given** I've been using the app for at least a month
**When** I view monthly trends
**Then** I see a chart showing weekly spending over the last 4 weeks
**And** I see trend indicators: ⬆️ (spending increased), ⬇️ (spending decreased), ➡️ (stable)

**Given** I tap on a category in the digest
**When** I select it
**Then** I see detailed breakdown of items in that category
**And** Price trends for those items

**Technical Requirements:**
- Aggregation queries in Convex for weekly/monthly stats
- Chart component for trend visualization
- Category breakdown calculations
- FR43, FR44

---

