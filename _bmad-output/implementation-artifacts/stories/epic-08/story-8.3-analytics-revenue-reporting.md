### Story 8.3: Analytics & Revenue Reporting

As an **admin**,
I want **detailed analytics and revenue reports**,
So that **I can track business health and make data-driven decisions**.

**Acceptance Criteria:**

**Given** I'm viewing the analytics screen
**When** I select a date range
**Then** I see:
  - User growth chart (new signups per day/week)
  - Retention cohort analysis
  - Churn rate and reasons
  - Feature adoption metrics

**Given** I view revenue analytics
**When** I access the revenue tab
**Then** I see:
  - MRR (Monthly Recurring Revenue)
  - ARR (Annual Recurring Revenue)
  - Revenue growth trend
  - Subscriber breakdown (monthly vs annual)
  - ARPU (Average Revenue Per User)
  - LTV estimates

**Given** I want to export data
**When** I tap "Export to CSV"
**Then** I can download analytics data for external analysis

**Technical Requirements:**
- Aggregation queries for user and revenue metrics
- Cohort analysis calculations
- CSV export functionality
- FR101-FR117, FR186-FR189

---

