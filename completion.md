# Oja - Epic Completion Tracker

> Master checklist for completing Epics 4, 6, 7, 8 + Test Infrastructure.
> Check off items as they are implemented and pushed.

---

## Phase 0: Dependencies & Setup

- [x] Install `react-native-chart-kit` + `react-native-svg` (charts for Epic 6 & 8)
- [x] Install `react-native-confetti-cannon` (celebrations for Epic 6)
- [x] Install `@stripe/stripe-react-native` (payments for Epic 7)
- [x] Add Stripe publishable key to `app.config` / env
- [x] Verify all new deps build (`tsc --noEmit` clean + modules resolve)

---

## Epic 4: Partner Mode & Collaboration

### 4.1 Invite & Join (DONE)
- [x] `convex/partners.ts` — createInviteCode, acceptInvite, declineInvite
- [x] `app/(app)/partners.tsx` — invite UI, partner list
- [x] `app/(app)/join-list.tsx` — join via share code screen
- [x] `convex/schema.ts` — listPartners, inviteCodes tables

### 4.2 Role Management (DONE)
- [x] Schema: viewer / editor / approver roles
- [x] `updateRole` mutation in partners.ts
- [x] Role badge + change UI in partners.tsx

### 4.3 Bidirectional Approval Workflow
- [ ] **Backend**: Add `approveItem(listItemId)` mutation that sets `approvalStatus: "approved"` and creates notification
- [ ] **Backend**: Add `rejectItem(listItemId, reason?)` mutation
- [ ] **List Detail UI**: Show approval status badge (ApprovalBadge) on every list item
- [ ] **List Detail UI**: Group pending items at top with "X items need approval" banner
- [ ] **List Detail UI**: Dim/gray pending items that haven't been approved yet
- [ ] **List Detail UI**: Show ApprovalActions (approve/reject buttons) for items pending the current user's approval
- [ ] **List Detail UI**: Auto-set `approvalStatus: "pending"` when partner adds item to approver-gated list
- [ ] **Haptics**: Trigger success haptic on approve, warning on reject

### 4.4 Contest Workflow + Comments
- [ ] **List Detail UI**: Add contest icon button on each approved/pending item
- [ ] **List Detail UI**: Wire ContestModal open on contest icon tap
- [ ] **List Detail UI**: Show contested items with orange highlight border
- [ ] **Owner Resolution UI**: Show "Resolve" button on contested items for list owner
- [ ] **Owner Resolution UI**: Resolution options — "Keep" (approve) or "Remove" (delete item)
- [ ] **Comments**: Add comment icon + count badge on each list item
- [ ] **Comments**: Wire CommentThread modal open on comment icon tap
- [ ] **Comments**: Create notification when new comment is added
- [ ] **Comments**: Real-time comment updates via Convex subscription

### 4.5 Notifications
- [ ] **Backend**: Flesh out `convex/notifications.ts` — create, getByUser, markAsRead, markAllAsRead, getUnreadCount
- [ ] **Notification triggers**: Create notification on — item approved, item rejected, item contested, contest resolved, new comment, partner joined, partner left
- [ ] **NotificationBell**: Wire into list detail header + tab bar
- [ ] **NotificationDropdown**: Show notification list, tap to navigate to relevant screen
- [ ] **Unread badge**: Show count on NotificationBell component
- [ ] **Mark as read**: Auto-mark when user taps notification

---

## Epic 6: Insights & Gamification

### 6.1 Weekly Digest & Monthly Trends
- [ ] **Backend**: Flesh out `getMonthlyTrends()` — query receipts grouped by month, return spending + item counts + category breakdown
- [ ] **Trends Chart**: Add line chart (react-native-chart-kit) showing monthly spending over last 6 months
- [ ] **Category Breakdown**: Add pie/donut chart showing spend by category (groceries, household, etc.)
- [ ] **Budget Adherence**: Show % of trips under budget vs over budget
- [ ] **Trend Arrows**: Up/down arrows with green/red coloring for month-over-month change
- [ ] **Weekly Digest Card**: Polish existing card — add sparkline mini-chart

### 6.2 Gamification — Streaks, Savings Jar, Challenges
- [ ] **Backend**: Implement `getStreaks()` — calculate current budget streak (consecutive under-budget trips)
- [ ] **Backend**: Implement `updateStreak()` — call after each trip reconciliation to increment or reset
- [ ] **Backend**: Add `weeklyChallenges` table to schema (type, target, progress, startDate, endDate, reward)
- [ ] **Backend**: Implement `getActiveChallenge()` and `updateChallengeProgress()` mutations
- [ ] **Backend**: Implement `unlockAchievement()` — check conditions and insert into achievements table
- [ ] **Streak UI**: Show current streak count with flame icon + "longest streak" record
- [ ] **Savings Jar UI**: Animated jar fill level based on cumulative savings (use Reanimated)
- [ ] **Savings Milestones**: Trigger confetti at £50, £100, £200, £500 milestones
- [ ] **Challenge Card**: Show active weekly challenge with progress bar (e.g., "Buy 3 items on sale — 1/3")
- [ ] **Achievement Badges**: Grid of unlockable badges (first receipt, 5 trips, 10 trips, £100 saved, etc.)
- [ ] **Achievement Unlock Toast**: Show celebratory toast + confetti when badge unlocked

### 6.3 Personal Bests & Surprise Delight
- [ ] **Backend**: Implement `getPersonalBests()` — lowest weekly spend, most items in one trip, longest streak, biggest single-trip saving
- [ ] **Personal Bests Card**: Show top 3 personal bests with trophy icons
- [ ] **New Record Detection**: After trip reconciliation, check if any personal best was broken → show toast
- [ ] **Surprise Delight**: Random positive toast messages on mundane actions (e.g., "You're a budgeting star!" on 5th list check-off)

---

## Epic 7: Subscriptions, Payments & Loyalty

### 7.1 Stripe Integration
- [ ] **Backend**: Create `convex/stripe.ts` action — `createCheckoutSession(planId)` using Stripe API
- [ ] **Backend**: Create `convex/stripe.ts` action — `createPortalSession()` for subscription management
- [ ] **Backend**: Create `convex/http.ts` HTTP endpoint for Stripe webhook receiver
- [ ] **Webhook Handler**: Process events — `checkout.session.completed`, `customer.subscription.updated`, `customer.subscription.deleted`, `invoice.payment_failed`
- [ ] **Webhook**: On successful payment → update subscriptions table (status: "active", stripeSubscriptionId, current_period_end)
- [ ] **Webhook**: On cancellation → update status to "cancelled", set cancelAt date
- [ ] **Webhook**: On payment failure → update status to "past_due", create in-app notification
- [ ] **Subscription Screen**: Replace "Start Trial" with Stripe Checkout flow for paid plans
- [ ] **Subscription Screen**: Add "Manage Subscription" button → opens Stripe Customer Portal
- [ ] **Paywall**: After trial expires, show paywall modal blocking premium features (insights, unlimited receipts)
- [ ] **Feature Gating**: Add `requirePremium()` helper — check subscription status before premium actions

### 7.2 Loyalty Points System
- [ ] **Integration**: Call `earnPoints()` in receipt reconciliation flow — award points per receipt scanned
- [ ] **First Receipt Bonus**: Award +20 bonus points on user's very first receipt scan
- [ ] **Weekly Streak Bonus**: Award +10 bonus points for 3+ receipts in one week
- [ ] **Daily Cap**: Enforce max 5 receipt scans per day for point earning (free tier)
- [ ] **Point Expiry**: Add scheduled Convex cron job to expire points older than 12 months
- [ ] **Tier Calculation**: Ensure tier (bronze/silver/gold/platinum) recalculates on every point earn/redeem
- [ ] **Discount Application**: On checkout, show available discount based on tier (10%/25%/50%)
- [ ] **Points History UI**: Polish point history list — show earn vs redeem with icons

### 7.3 Subscription Management
- [ ] **Cancel Flow**: Add "Cancel Subscription" button → confirmation modal → call Stripe cancel
- [ ] **Plan Change**: Add upgrade/downgrade flow — Monthly ↔ Annual
- [ ] **Trial Banner**: Show "X days left in trial" banner on subscription screen
- [ ] **Expired State**: Show "Your trial has ended" with CTA to subscribe

---

## Epic 8: Admin Dashboard & Operations

### 8.1 Admin Auth & Dashboard
- [ ] **2FA Gate**: Use `expo-local-authentication` (biometric) before showing admin screen
- [ ] **Access Denied UI**: Show 403 screen if non-admin tries to access /admin
- [ ] **Dashboard Metrics**: Implement real DAU/WAU/MAU calculations in `getAnalytics()`
- [ ] **Dashboard Metrics**: Implement real MRR/ARR from subscriptions table in `getRevenueReport()`
- [ ] **System Health**: Calculate real receipt processing success rate, average processing time
- [ ] **Audit Logging**: Log all admin actions (user toggle, receipt delete, etc.) to adminLogs table

### 8.2 User Management
- [ ] **User Search Filters**: Add filters by plan type, signup date range, active/inactive status
- [ ] **User Detail View**: Tap user → see full profile (subscription history, receipts, lists, points)
- [ ] **Trial Extension**: Add mutation to manually extend a user's trial by N days
- [ ] **Complimentary Access**: Add mutation to grant free premium access to a user
- [ ] **User Suspension**: Add ability to suspend/unsuspend user accounts

### 8.3 Analytics & Reporting
- [ ] **Analytics Charts**: Add line chart for DAU/WAU/MAU over time (react-native-chart-kit)
- [ ] **Revenue Chart**: Add bar chart for MRR over last 12 months
- [ ] **Retention Cohorts**: Calculate week-1/week-4 retention from user activity
- [ ] **ARPU & LTV**: Calculate average revenue per user and lifetime value
- [ ] **Churn Rate**: Track monthly subscription cancellation rate
- [ ] **CSV Export**: Add "Export to CSV" button for analytics data (generate + share via expo-sharing)

### 8.4 Receipt & Price Moderation
- [ ] **Receipt Queue**: Show flagged/low-confidence receipts for manual review
- [ ] **Receipt Detail**: View receipt image + parsed data side-by-side, edit parsed values
- [ ] **Bulk Actions**: Select multiple receipts → approve/reject/delete
- [ ] **Price Anomaly Detection**: Flag prices that deviate >50% from average in currentPrices
- [ ] **Price Override**: Manually edit/delete entries in currentPrices table

### 8.5 Product Catalog & System Health
- [ ] **Category Manager**: CRUD for pantry item categories
- [ ] **Store Normalization**: UI to merge duplicate store names (e.g., "Tescos" → "Tesco")
- [ ] **Item Canonicalization**: UI to merge duplicate item names
- [ ] **System Health Dashboard**: Real-time Convex function latency, error rates, storage usage
- [ ] **Feature Flags**: Simple key-value feature flag system (stored in Convex) for toggling features
- [ ] **Announcements**: Create/schedule in-app announcement banners for all users

---

## Test Infrastructure

### Setup & Configuration
- [ ] Create `__tests__/setup.ts` — global test setup with mocks for Convex, Clerk, Expo modules
- [ ] Create `__tests__/factories/` — test data factories for users, lists, items, receipts, subscriptions
- [ ] Create `__tests__/mocks/convex.ts` — mock Convex client (useQuery, useMutation stubs)
- [ ] Add coverage thresholds to jest.config.js (60% minimum for new code)

### Epic 4 Tests
- [ ] `__tests__/partners/approval-workflow.test.ts` — test approve/reject/pending state transitions
- [ ] `__tests__/partners/contest-flow.test.ts` — test contest + resolve flow
- [ ] `__tests__/partners/comments.test.ts` — test comment creation + retrieval
- [ ] `__tests__/partners/permissions.test.ts` — test role-based access (viewer can't edit, etc.)
- [ ] `__tests__/partners/notifications.test.ts` — test notification creation on partner actions

### Epic 6 Tests
- [ ] `__tests__/insights/streaks.test.ts` — test streak increment, reset, longest tracking
- [ ] `__tests__/insights/achievements.test.ts` — test unlock conditions for each badge
- [ ] `__tests__/insights/trends.test.ts` — test monthly aggregation calculations
- [ ] `__tests__/insights/challenges.test.ts` — test challenge progress + completion

### Epic 7 Tests
- [ ] `__tests__/subscriptions/stripe-webhook.test.ts` — test webhook event processing
- [ ] `__tests__/subscriptions/points-earning.test.ts` — test point award rules + daily cap
- [ ] `__tests__/subscriptions/tier-calculation.test.ts` — test tier thresholds + discount mapping
- [ ] `__tests__/subscriptions/point-expiry.test.ts` — test 12-month rolling expiry logic

### Epic 8 Tests
- [ ] `__tests__/admin/analytics.test.ts` — test DAU/WAU/MAU calculations
- [ ] `__tests__/admin/user-management.test.ts` — test search, filter, suspend flows
- [ ] `__tests__/admin/audit-logging.test.ts` — test log creation on admin actions

### Component Tests
- [ ] `__tests__/components/ApprovalBadge.test.tsx` — renders correct status
- [ ] `__tests__/components/ContestModal.test.tsx` — reason selection + submit
- [ ] `__tests__/components/NotificationBell.test.tsx` — shows unread count
- [ ] `__tests__/components/GlassCard.test.tsx` — renders children with glass styles

### CI/CD
- [ ] Create `.github/workflows/ci.yml` — run lint + typecheck + tests on push/PR
- [ ] Add test coverage reporting to CI
- [ ] Add build verification step (expo export)

---

## Progress Summary

| Area | Total Items | Completed | Percentage |
|------|------------|-----------|------------|
| Phase 0: Setup | 5 | 5 | 100% |
| Epic 4 | 26 | 10 | 38% |
| Epic 6 | 22 | 0 | 0% |
| Epic 7 | 21 | 0 | 0% |
| Epic 8 | 23 | 0 | 0% |
| Tests | 23 | 0 | 0% |
| **TOTAL** | **120** | **15** | **13%** |

---

*Last updated: 2026-01-31*
