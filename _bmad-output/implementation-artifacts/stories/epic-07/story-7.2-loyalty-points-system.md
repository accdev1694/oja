### Story 7.2: Loyalty Points System

As a **user**,
I want **to earn loyalty points from receipt scans**,
So that **I can reduce my subscription cost**.

**Acceptance Criteria:**

**Given** I scan a receipt successfully
**When** the receipt is saved
**Then** I earn 10 loyalty points
**And** I see a toast: "+10 points earned! Total: 150 points"
**And** I feel a success haptic

**Given** I reach 100 points
**When** my point balance hits 100
**Then** I unlock a 10% discount on my next subscription renewal
**And** I see a notification: "100 points! Unlocked 10% off next month! 🎉"

**Given** I accumulate points to various milestones
**When** I view the loyalty rewards screen
**Then** I see the discount tiers:
  - 100 points = 10% off (£2.69/mo)
  - 200 points = 20% off (£2.39/mo)
  - 300 points = 30% off (£2.09/mo)
  - 400 points = 40% off (£1.79/mo)
  - 500 points = 50% off (£1.49/mo - minimum price)

**Given** I have points and my subscription renews
**When** the renewal processes
**Then** my earned discount is automatically applied
**And** My points are deducted based on discount used
**And** I see: "Subscription renewed: £2.39 (20% loyalty discount applied)"

**Given** my points are unused for 12 months
**When** points expire
**Then** I receive a warning 30 days before expiry
**And** After 12 months, expired points are removed

**Given** I scan more than 5 receipts in one day
**When** I try to scan the 6th receipt
**Then** I see: "Daily receipt limit reached (5/day). Come back tomorrow!"
**And** Points aren't earned for additional scans

**Technical Requirements:**
- `convex/loyaltyPoints.ts` with points tracking
- Points earned: 10 per receipt scan
- Daily cap: 5 receipt scans
- Point expiry: 12 months from earning date
- Discount calculation and application to Stripe
- FR67, FR68, FR69, FR70, FR71, FR72, FR73, FR74

---

