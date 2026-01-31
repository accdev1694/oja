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

### 4.3 Bidirectional Approval Workflow (DONE)
- [x] **Backend**: Add `approveItem(listItemId)` mutation that sets `approvalStatus: "approved"` and creates notification
- [x] **Backend**: Add `rejectItem(listItemId, reason?)` mutation
- [x] **List Detail UI**: Show approval status badge (ApprovalBadge) on every list item
- [x] **List Detail UI**: Group pending items at top with "X items need approval" banner
- [x] **List Detail UI**: Dim/gray pending items that haven't been approved yet
- [x] **List Detail UI**: Show ApprovalActions (approve/reject buttons) for items pending the current user's approval
- [x] **List Detail UI**: Auto-set `approvalStatus: "pending"` when partner adds item to approver-gated list
- [x] **Haptics**: Trigger success haptic on approve, warning on reject

### 4.4 Comments (DONE — contest workflow removed, replaced by chat)
- [x] ~~Contest UI~~ REMOVED — overengineered; comment thread handles item disputes
- [x] **Comments**: Add comment icon + count badge on each list item
- [x] **Comments**: Wire CommentThread modal open on comment icon tap
- [x] **Comments**: Create notification when new comment is added
- [x] **Comments**: Real-time comment updates via Convex subscription

### 4.5 Notifications (DONE)
- [x] **Backend**: Flesh out `convex/notifications.ts` — create, getByUser, markAsRead, markAllAsRead, getUnreadCount
- [x] **Notification triggers**: Create notification on — item approved, item rejected, item contested, contest resolved, new comment, partner joined, partner left
- [x] **NotificationBell**: Wire into list detail header + tab bar
- [x] **NotificationDropdown**: Show notification list, tap to navigate to relevant screen
- [x] **Unread badge**: Show count on NotificationBell component
- [x] **Mark as read**: Auto-mark when user taps notification

---

## Epic 6: Insights & Gamification

### 6.1 Weekly Digest & Monthly Trends (DONE)
- [x] **Backend**: Flesh out `getMonthlyTrends()` — query receipts grouped by month, return spending + item counts + category breakdown
- [x] **Trends Chart**: Add line chart (react-native-chart-kit) showing monthly spending over last 6 months
- [x] **Category Breakdown**: Category breakdown bars showing spend by category (top 6)
- [x] **Budget Adherence**: Show under/over budget counts + success rate percentage
- [x] **Trend Arrows**: Up/down arrows with green/red coloring for month-over-month change
- [x] **Weekly Digest Card**: Polish existing card — add sparkline mini-chart

### 6.2 Gamification — Streaks, Savings Jar, Challenges (DONE)
- [x] **Backend**: Implement `getStreaks()` — calculate current budget streak (consecutive under-budget trips)
- [x] **Backend**: Implement `updateStreak()` — call after each trip reconciliation to increment or reset
- [x] **Backend**: Add `weeklyChallenges` table to schema (type, target, progress, startDate, endDate, reward)
- [x] **Backend**: Implement `getActiveChallenge()` and `updateChallengeProgress()` mutations
- [x] **Backend**: Implement `unlockAchievement()` — check conditions and insert into achievements table
- [x] **Streak UI**: Show current streak count with flame icon + "longest streak" record
- [x] **Savings Jar UI**: Big number + milestone progress bar with next milestone target
- [x] **Savings Milestones**: Confetti cannon wired up for milestone celebrations
- [x] **Challenge Card**: Show active weekly challenge with progress bar + generate new challenge button
- [x] **Achievement Badges**: Grid of unlockable badges with icon circles + count badge
- [x] **Achievement Unlock Toast**: Show celebratory toast + confetti when badge unlocked

### 6.3 Personal Bests & Surprise Delight (DONE)
- [x] **Backend**: Implement `getPersonalBests()` — lowest weekly spend, most items in one trip, longest streak, biggest single-trip saving
- [x] **Personal Bests Card**: Show top 4 personal bests with colored icon circles
- [x] **New Record Detection**: After trip reconciliation, check if any personal best was broken → show toast
- [x] **Surprise Delight**: Random positive toast messages on mundane actions (e.g., "You're a budgeting star!" on 5th list check-off)

---

## Epic 7: Subscriptions, Payments & Loyalty

### 7.1 Stripe Integration (DONE)
- [x] **Backend**: Create `convex/stripe.ts` action — `createCheckoutSession(planId)` using Stripe API
- [x] **Backend**: Create `convex/stripe.ts` action — `createPortalSession()` for subscription management
- [x] **Backend**: Create `convex/http.ts` HTTP endpoint for Stripe webhook receiver
- [x] **Webhook Handler**: Process events — `checkout.session.completed`, `customer.subscription.updated`, `customer.subscription.deleted`, `invoice.payment_failed`
- [x] **Webhook**: On successful payment → update subscriptions table (status: "active", stripeSubscriptionId, current_period_end)
- [x] **Webhook**: On cancellation → update status to "cancelled", set cancelAt date
- [x] **Webhook**: On payment failure → update status to "past_due", create in-app notification
- [x] **Subscription Screen**: Replace "Start Trial" with Stripe Checkout flow for paid plans
- [x] **Subscription Screen**: Add "Manage Subscription" button → opens Stripe Customer Portal
- [x] **Paywall**: After trial expires, show paywall modal blocking premium features (insights, unlimited receipts)
- [x] **Feature Gating**: Add `requirePremium()` helper — check subscription status before premium actions

### 7.2 Loyalty Points System (DONE)
- [x] **Integration**: Call `earnPoints()` in receipt reconciliation flow — award points per receipt scanned
- [x] **First Receipt Bonus**: Award +20 bonus points on user's very first receipt scan
- [x] **Weekly Streak Bonus**: Award +10 bonus points for 3+ receipts in one week
- [x] **Daily Cap**: Enforce max 5 receipt scans per day for point earning (free tier)
- [x] **Point Expiry**: Add scheduled Convex cron job to expire points older than 12 months
- [x] **Tier Calculation**: Ensure tier (bronze/silver/gold/platinum) recalculates on every point earn/redeem
- [x] **Discount Application**: On checkout, show available discount based on tier (10%/25%/50%)
- [x] **Points History UI**: Polish point history list — show earn vs redeem with icons

### 7.3 Subscription Management (DONE)
- [x] **Cancel Flow**: Add "Cancel Subscription" button → confirmation modal → call Stripe cancel
- [x] **Plan Change**: Add upgrade/downgrade flow — Monthly ↔ Annual
- [x] **Trial Banner**: Show "X days left in trial" banner on subscription screen
- [x] **Expired State**: Show "Your trial has ended" with CTA to subscribe

---

## Epic 8: Admin Dashboard & Operations

### 8.1 Admin Auth & Dashboard (DONE)
- [x] **2FA Gate**: Use `expo-local-authentication` (biometric) before showing admin screen
- [x] **Access Denied UI**: Show 403 screen if non-admin tries to access /admin
- [x] **Dashboard Metrics**: Implement real DAU/WAU/MAU calculations in `getAnalytics()`
- [x] **Dashboard Metrics**: Implement real MRR/ARR from subscriptions table in `getRevenueReport()`
- [x] **System Health**: Calculate real receipt processing success rate, average processing time
- [x] **Audit Logging**: Log all admin actions (user toggle, receipt delete, etc.) to adminLogs table

### 8.2 User Management (DONE)
- [x] **User Search Filters**: Add filters by plan type, signup date range, active/inactive status
- [x] **User Detail View**: Tap user → see full profile (subscription history, receipts, lists, points)
- [x] **Trial Extension**: Add mutation to manually extend a user's trial by N days
- [x] **Complimentary Access**: Add mutation to grant free premium access to a user
- [x] **User Suspension**: Add ability to suspend/unsuspend user accounts

### 8.3 Analytics & Reporting (DONE)
- [x] **Analytics Charts**: Add line chart for DAU/WAU/MAU over time (react-native-chart-kit)
- [x] **Revenue Chart**: Add bar chart for MRR over last 12 months
- [x] **Retention Cohorts**: Calculate week-1/week-4 retention from user activity
- [x] **ARPU & LTV**: Calculate average revenue per user and lifetime value
- [x] **Churn Rate**: Track monthly subscription cancellation rate
- [x] **CSV Export**: Add "Export to CSV" button for analytics data (generate + share via expo-sharing)

### 8.4 Receipt & Price Moderation (DONE)
- [x] **Receipt Queue**: Show flagged/low-confidence receipts for manual review
- [x] **Receipt Detail**: View receipt image + parsed data side-by-side, edit parsed values
- [x] **Bulk Actions**: Select multiple receipts → approve/reject/delete
- [x] **Price Anomaly Detection**: Flag prices that deviate >50% from average in currentPrices
- [x] **Price Override**: Manually edit/delete entries in currentPrices table

### 8.5 Product Catalog & System Health (DONE)
- [x] **Category Manager**: CRUD for pantry item categories
- [x] **Store Normalization**: UI to merge duplicate store names (e.g., "Tescos" → "Tesco")
- [x] **Item Canonicalization**: UI to merge duplicate item names
- [x] **System Health Dashboard**: Real-time Convex function latency, error rates, storage usage
- [x] **Feature Flags**: Simple key-value feature flag system (stored in Convex) for toggling features
- [x] **Announcements**: Create/schedule in-app announcement banners for all users

---

## Test Infrastructure

### Setup & Configuration (DONE)
- [x] Create `__tests__/setup.ts` — global test setup with mocks for Convex, Clerk, Expo modules
- [x] Create `__tests__/factories/` — test data factories for users, lists, items, receipts, subscriptions
- [x] Create `__tests__/mocks/convex.ts` — mock Convex client (useQuery, useMutation stubs)
- [x] Add coverage thresholds to jest.config.js (60% minimum for new code)

### Epic 4 Tests (DONE)
- [x] `__tests__/partners/approval-workflow.test.ts` — test approve/reject/pending state transitions
- [x] `__tests__/partners/contest-flow.test.ts` — test contest + resolve flow
- [x] `__tests__/partners/comments.test.ts` — test comment creation + retrieval
- [x] `__tests__/partners/permissions.test.ts` — test role-based access (viewer can't edit, etc.)
- [x] `__tests__/partners/notifications.test.ts` — test notification creation on partner actions

### Epic 6 Tests (DONE)
- [x] `__tests__/insights/streaks.test.ts` — test streak increment, reset, longest tracking
- [x] `__tests__/insights/achievements.test.ts` — test unlock conditions for each badge
- [x] `__tests__/insights/trends.test.ts` — test monthly aggregation calculations
- [x] `__tests__/insights/challenges.test.ts` — test challenge progress + completion

### Epic 7 Tests (DONE)
- [x] `__tests__/subscriptions/stripe-webhook.test.ts` — test webhook event processing
- [x] `__tests__/subscriptions/points-earning.test.ts` — test point award rules + daily cap
- [x] `__tests__/subscriptions/tier-calculation.test.ts` — test tier thresholds + discount mapping
- [x] `__tests__/subscriptions/point-expiry.test.ts` — test 12-month rolling expiry logic

### Epic 8 Tests (DONE)
- [x] `__tests__/admin/analytics.test.ts` — test DAU/WAU/MAU calculations
- [x] `__tests__/admin/user-management.test.ts` — test search, filter, suspend flows
- [x] `__tests__/admin/audit-logging.test.ts` — test log creation on admin actions

### Component Tests (DONE)
- [x] `__tests__/components/ApprovalBadge.test.ts` — renders correct status
- [x] `__tests__/components/ContestModal.test.ts` — reason selection + submit
- [x] `__tests__/components/NotificationBell.test.ts` — shows unread count
- [x] `__tests__/components/GlassCard.test.ts` — renders children with glass styles

### CI/CD (DONE)
- [x] Create `.github/workflows/ci.yml` — run lint + typecheck + tests on push/PR
- [x] Add test coverage reporting to CI
- [x] Add build verification step (expo export)

---

## Progress Summary

| Area | Total Items | Completed | Percentage |
|------|------------|-----------|------------|
| Phase 0: Setup | 5 | 5 | 100% |
| Epic 4 | 30 | 30 | 100% |
| Epic 6 | 22 | 22 | 100% |
| Epic 7 | 21 | 21 | 100% |
| Epic 8 | 23 | 23 | 100% |
| Tests | 23 | 23 | 100% |
| **TOTAL** | **124** | **124** | **100%** |

---

*Last updated: 2026-01-31*
