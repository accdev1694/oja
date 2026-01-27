### Story 5.4: Price History Tracking

As a **user**,
I want **to see price history for items I buy**,
So that **I can spot good deals and price trends**.

**Acceptance Criteria:**

**Given** I've scanned multiple receipts with the same item
**When** I view an item's detail page
**Then** I see a price history chart showing price changes over time
**And** Each data point shows: date, price, store

**Given** I view price history
**When** I see the chart
**Then** I see the average price, lowest price, and highest price
**And** The lowest price is highlighted in green

**Given** an item's price dropped significantly
**When** I scan a new receipt
**Then** I see a notification: "Great deal! [Item] is 20% cheaper than usual"

**Given** an item's price increased significantly
**When** I scan a new receipt
**Then** I see a notification: "[Item] price went up 15% since last purchase"

**Given** I view a shopping list item with price history
**When** I look at the item
**Then** I see a small icon showing the trend: ⬆️ (increasing), ⬇️ (decreasing), ➡️ (stable)
**And** Tapping it opens the full price history

**Technical Requirements:**
- `convex/schema.ts`: `priceHistory` table with itemName, price, store, date, userId
- Price trend calculation (last 3 months)
- Chart component (line chart with React Native SVG)
- Price alert logic (>15% change triggers notification)
- FR39, FR40, FR41, FR42

---

