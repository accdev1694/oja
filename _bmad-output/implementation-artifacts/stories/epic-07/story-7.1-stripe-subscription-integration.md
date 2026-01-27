### Story 7.1: Stripe Subscription Integration

As a **user**,
I want **to subscribe to the premium plan**,
So that **I can unlock full features**.

**Acceptance Criteria:**

**Given** I'm on a free trial (7 days)
**When** I view my profile
**Then** I see: "Free Trial: 5 days remaining"
**And** A "Subscribe Now" button

**Given** I tap "Subscribe Now"
**When** I open the subscription screen
**Then** I see two plans:
  - **Monthly**: £2.99/mo
  - **Annual**: £21.99/yr (Save 38% - £7 off!)

**Given** I select a plan
**When** I tap "Subscribe"
**Then** I'm redirected to Stripe Checkout
**And** After successful payment, my subscription is activated
**And** I see a confirmation: "Welcome to Premium! 🎉"

**Given** my free trial expires without subscribing
**When** the trial ends
**Then** I see a paywall blocking premium features
**And** Core features (pantry, basic lists) still work
**And** Advanced features (partner mode, receipt scanning, AI suggestions) are locked

**Given** I have an active subscription
**When** I view my profile
**Then** I see: "Premium Member since [date]"
**And** Options to manage my subscription (change plan, cancel)

**Technical Requirements:**
- Stripe integration for subscriptions
- Convex webhook handlers for payment events
- Trial period tracking (7 days from signup)
- Feature gating based on subscription status
- `convex/subscriptions.ts` with queries and mutations
- FR63, FR64, FR65, FR66

---

