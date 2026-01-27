### Story 7.3: Subscription Management

As a **user**,
I want **to manage my subscription easily**,
So that **I can upgrade, downgrade, or cancel anytime**.

**Acceptance Criteria:**

**Given** I have an active monthly subscription
**When** I tap "Manage Subscription"
**Then** I see options: "Change Plan", "Cancel Subscription", "Billing History"

**Given** I tap "Change Plan"
**When** I select "Switch to Annual"
**Then** I see the pro-rated price adjustment
**And** After confirming, I'm switched to annual billing
**And** I receive a confirmation email

**Given** I want to cancel
**When** I tap "Cancel Subscription"
**Then** I see: "Sorry to see you go! Your access continues until [end of billing period]"
**And** After confirming, my subscription is set to cancel at period end

**Given** my subscription is canceled
**When** the billing period ends
**Then** I lose access to premium features
**And** My data is retained for 90 days
**And** I can reactivate anytime

**Given** I want to view billing history
**When** I tap "Billing History"
**Then** I see all past charges with dates, amounts, and receipts
**And** I can download invoices

**Technical Requirements:**
- Stripe subscription management API
- Pro-rated billing calculations
- Cancel at period end (don't delete immediately)
- Billing history retrieval from Stripe
- FR6 (manage subscription status)

---

## Epic 8: Admin Dashboard & Operations

