# Story 2.10: Subscription Status Management

Status: review

## Story

As a **user**,
I want **to view and manage my subscription status**,
So that **I know what features I have access to**.

## Acceptance Criteria

1. **Settings > Subscription** section displays current plan (Trial, Free, Monthly, Annual)
2. **Trial days remaining** shown if applicable
3. **Feature availability** displayed (what's available vs restricted)
4. **Upgrade navigation** available from subscription section
5. **Plan details** show billing cycle and next renewal date (if subscribed)
6. **Graceful handling** for users without subscription data

## Tasks / Subtasks

- [x] **Task 1: Create Subscription Types and Constants** (AC: #1, #3)
  - [x] Create `src/lib/types/subscription.ts`
  - [x] Define SubscriptionPlan enum (trial, free, monthly, annual)
  - [x] Define SubscriptionStatus interface
  - [x] Define feature flags per plan

- [x] **Task 2: Create SubscriptionStatus Component** (AC: #1, #2, #3, #4, #5)
  - [x] Create `src/components/subscription/SubscriptionStatus.tsx`
  - [x] Display current plan with visual badge
  - [x] Show trial countdown if applicable
  - [x] List available/restricted features
  - [x] "Upgrade" button linking to upgrade page

- [x] **Task 3: Create Subscription Storage Utilities** (AC: #6)
  - [x] Create `src/lib/utils/subscriptionStorage.ts`
  - [x] Functions to get/set subscription status in localStorage
  - [x] Default to trial plan for new users
  - [x] Calculate trial days remaining

- [x] **Task 4: Update Settings Page** (AC: #1, #4)
  - [x] Add Subscription section to settings page
  - [x] Display SubscriptionStatus component
  - [x] Link to upgrade page (placeholder)

- [x] **Task 5: Add Tests** (AC: all)
  - [x] Unit tests for SubscriptionStatus component (23 tests)
  - [x] Unit tests for subscription utilities (22 tests)
  - [x] Unit tests for subscription types (19 tests)
  - [x] Test trial countdown logic
  - [x] Test feature flag display

- [x] **Task 6: Run build and verify** - All 377 tests passing, build successful

## Dev Notes

### Architecture Compliance

**From Architecture Document:**
- Types in `src/lib/types/` directory
- Utilities in `src/lib/utils/` directory
- Components organized by feature
- localStorage as placeholder for Supabase integration

### Subscription Tiers (from PRD)

```typescript
enum SubscriptionPlan {
  TRIAL = 'trial',      // 14-day trial with full features
  FREE = 'free',        // Limited features after trial
  MONTHLY = 'monthly',  // £2.99/month
  ANNUAL = 'annual',    // £24.99/year (save 30%)
}
```

### Feature Flags by Plan

```typescript
interface PlanFeatures {
  maxPantryItems: number;       // Free: 20, Paid: unlimited
  maxShoppingLists: number;     // Free: 2, Paid: unlimited
  receiptScanning: boolean;     // Free: 3/month, Paid: unlimited
  priceHistory: boolean;        // Free: false, Paid: true
  insights: boolean;            // Free: basic, Paid: full
  exportData: boolean;          // Free: false, Paid: true
}
```

### SubscriptionStatus Interface

```typescript
interface SubscriptionStatus {
  plan: SubscriptionPlan;
  trialStartDate: string | null;  // ISO date
  trialEndDate: string | null;    // ISO date
  subscriptionStartDate: string | null;
  subscriptionEndDate: string | null;
  isActive: boolean;
}
```

### localStorage Keys

```typescript
const SUBSCRIPTION_STATUS_KEY = 'oja_subscription_status';
```

### Trial Logic

- 14-day trial starts on first app launch
- After trial: auto-downgrade to free tier
- Trial days remaining = trialEndDate - today

### File Structure

```
src/
├── components/
│   └── subscription/
│       ├── SubscriptionStatus.tsx    # NEW
│       ├── __tests__/
│       │   └── SubscriptionStatus.test.tsx # NEW
│       └── index.ts                  # NEW
├── lib/
│   ├── types/
│   │   └── subscription.ts           # NEW
│   └── utils/
│       └── subscriptionStorage.ts    # NEW
├── app/
│   └── (app)/
│       └── settings/
│           └── page.tsx              # UPDATE
```

### Previous Story Learnings (2-9)

- localStorage utilities pattern established in onboardingStorage.ts
- Settings page already exists at `src/app/(app)/settings/page.tsx`
- Use consistent styling with existing components

### References

- [Source: epics.md#Story-2.10] - Acceptance criteria
- [Source: prd.md] - Subscription tier details
- [Source: stories/2-9-onboarding-completion.md] - localStorage patterns

## Dev Agent Record

### Agent Model Used

Claude Opus 4.5

### Debug Log References

### Completion Notes List

- Created comprehensive subscription types with 4 plan tiers (Trial, Free, Monthly, Annual)
- SubscriptionPlan enum, PlanFeatures interface, and FEATURES array for display
- Plan pricing: Free £0, Monthly £2.99, Annual £24.99 (30% savings)
- 14-day trial with full premium features, auto-downgrades to Free on expiry
- SubscriptionStatus component shows plan badge, trial countdown, and feature limits
- Different banners for trial (blue), free (amber), and paid (green) states
- Feature list shows limits for free users, "Unlimited" for premium users
- Settings page updated with subscription section at top
- Created placeholder upgrade page with plan comparison cards
- localStorage-based storage as placeholder for Supabase integration
- 64 new tests across types, utilities, and component
- All 377 tests passing, production build successful

### File List

- `src/lib/types/subscription.ts` (NEW)
- `src/lib/types/__tests__/subscription.test.ts` (NEW)
- `src/lib/utils/subscriptionStorage.ts` (NEW)
- `src/lib/utils/__tests__/subscriptionStorage.test.ts` (NEW)
- `src/components/subscription/SubscriptionStatus.tsx` (NEW)
- `src/components/subscription/__tests__/SubscriptionStatus.test.tsx` (NEW)
- `src/components/subscription/index.ts` (NEW)
- `src/app/(app)/settings/page.tsx` (UPDATED - added subscription section)
- `src/app/(app)/upgrade/page.tsx` (NEW)

