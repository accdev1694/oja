### Epic 7: Subscription, Payments & Loyalty

**Goal:** Users can subscribe to premium tier, earn loyalty points from receipts, and reduce subscription cost up to 50%

**Key Capabilities:**
- Stripe Checkout integration
- Monthly plan (£2.99/mo)
- Annual plan (£21.99/yr - 38% savings)
- 7-day free trial with full access
- Loyalty points system (earn from valid receipt scans)
- Points earning rules (10 pts/receipt, +20 first receipt bonus, weekly streak bonus)
- Discount tiers (10%, 20%, 35%, 50% max → as low as £1.49/mo)
- Daily receipt scan cap (5 receipts/day)
- Point expiry (12 months rolling)
- Feature limits for expired free tier (1 list, no scan, no sync)
- Subscription management (view status, cancel, update payment method)
- Payment webhook handling (idempotent Stripe webhook processing)
- Subscription lifecycle events

**FRs Covered:** FR5-FR6 (from Epic 1), FR65-FR74 (12 FRs total)

**Additional Requirements:** None (uses AR3 Stripe integration)

**Dependencies:** Epic 1 (auth), Epic 5 (receipts for earning points)

---

