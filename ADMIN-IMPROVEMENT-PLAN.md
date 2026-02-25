# Admin Dashboard Improvement Plan - Trackable Implementation
**Oja Budget Shopping App - February 2025**

> **How to use this plan:** Check off items as you complete them and commit after each major checkpoint. This plan follows a priority-based approach, starting with critical security and performance fixes.

---

## 🎯 Quick Wins (1-2 days each) - DO THESE FIRST

### Auto-Refresh & Real-Time Updates
- [ ] Add auto-refresh to Overview tab (30-second interval)
- [ ] Add toggle switch to enable/disable auto-refresh
- [ ] Add "Last updated" timestamp to Overview cards
- [ ] Test auto-refresh doesn't cause memory leaks

**Files:** `app/(app)/admin.tsx` (OverviewTab component)

---

### Date Range Filtering
- [ ] Install date picker library (`@react-native-community/datetimepicker`)
- [ ] Create reusable `DateRangePicker` component
- [ ] Add date range filter to Overview tab analytics
- [ ] Add date range filter to Receipts tab
- [ ] Save selected date range to local state
- [ ] Add "This Week", "This Month", "This Year" quick filters

**Files:** `components/DateRangePicker.tsx`, `app/(app)/admin.tsx`

---

### User Table Pagination
- [ ] Replace `.take(50)` with cursor-based pagination
- [ ] Add "Previous" and "Next" buttons to Users tab
- [ ] Add "Page X of Y" indicator
- [ ] Add "Items per page" selector (25/50/100)
- [ ] Test pagination with 1000+ test users

**Files:** `convex/admin.ts` (getUsers query), `app/(app)/admin.tsx` (UsersTab)

---

### Receipt Search & Filters
- [ ] Add search bar to Receipts tab (search by store, user, amount)
- [ ] Add filter dropdowns: Status (all/failed/processing/completed)
- [ ] Add filter: Date range (use DateRangePicker)
- [ ] Add filter: Store name (dropdown of all stores)
- [ ] Clear filters button
- [ ] Show "X results" count

**Files:** `convex/admin.ts` (new searchReceipts query), `app/(app)/admin.tsx` (ReceiptsTab)

---

### Feature Flag Enhancements
- [ ] Add "Last Modified" column to feature flags table
- [ ] Add "Modified By" column (show admin name)
- [ ] Add "Created At" timestamp
- [ ] Sort flags by last modified (newest first)
- [ ] Add search filter for flag keys

**Files:** `convex/schema.ts` (featureFlags table), `convex/admin.ts` (toggleFeatureFlag), `app/(app)/admin.tsx` (SettingsTab)

---

### Announcement Editing
- [ ] Add "Edit" button to each announcement row
- [ ] Create edit modal (pre-populate existing values)
- [ ] Create `updateAnnouncement` mutation in Convex
- [ ] Add validation (title/body required)
- [ ] Add audit log entry for announcement edits
- [ ] Test editing active vs inactive announcements

**Files:** `convex/admin.ts` (new updateAnnouncement mutation), `app/(app)/admin.tsx` (SettingsTab)

---

### Receipt Image Preview
- [ ] Add "View Image" icon to each receipt row
- [ ] Create modal to display receipt image full-screen
- [ ] Add zoom in/out controls to image modal
- [ ] Add close button (X) to modal
- [ ] Handle missing images gracefully (show placeholder)
- [ ] Test with various image sizes/formats

**Files:** `app/(app)/admin.tsx` (ReceiptsTab), `components/ReceiptImageModal.tsx`

---

### Audit Log Pagination
- [ ] Change audit log limit from 10 to 50
- [ ] Add pagination (prev/next buttons)
- [ ] Add "Export to CSV" button for audit logs
- [ ] Add date range filter for audit logs
- [ ] Add filter by action type (dropdown)
- [ ] Add filter by admin user (dropdown)

**Files:** `convex/admin.ts` (getAuditLogs query), `app/(app)/admin.tsx` (OverviewTab)

---

### Fix Hard-Coded Metrics & Prices
- [ ] Create `pricingConfig` table in schema (plan, priceAmount, currency, stripePriceId)
- [ ] Seed initial pricing data (premium_monthly: 2.99, premium_annual: 21.99)
- [ ] Create `getPricingConfig` query to fetch current pricing
- [ ] Replace hard-coded `2.99` in `convex/admin.ts` line 179 with dynamic price lookup
- [ ] Replace hard-coded `21.99` in `convex/admin.ts` line 179 with dynamic price lookup
- [ ] Replace hard-coded prices in `convex/subscriptions.ts` line 259, 270, 332
- [ ] Add Stripe price sync (optional): Fetch prices from Stripe API and update config table
- [ ] Test MRR/ARR calculation with different price values
- [ ] Add admin UI to update pricing (Settings tab → Pricing section)

**Files:** `convex/schema.ts`, `convex/pricingConfig.ts`, `convex/admin.ts`, `convex/subscriptions.ts`

**Current Hard-Coded Locations:**
```typescript
// convex/admin.ts:179
const mrr = monthlyCount * 2.99 + annualCount * (21.99 / 12); // ❌ Hard-coded

// convex/subscriptions.ts:259
price: 2.99, // ❌ Hard-coded

// convex/subscriptions.ts:270
price: 21.99, // ❌ Hard-coded

// convex/subscriptions.ts:332
const basePrice = isAnnual ? 21.99 : 2.99; // ❌ Hard-coded
```

**Proposed Solution:**
```typescript
// convex/schema.ts
pricingConfig: defineTable({
  planId: v.string(), // "premium_monthly" | "premium_annual"
  displayName: v.string(), // "Premium Monthly"
  priceAmount: v.number(), // 2.99
  currency: v.string(), // "GBP"
  stripePriceId: v.optional(v.string()), // From env: STRIPE_PRICE_MONTHLY
  isActive: v.boolean(),
  updatedAt: v.number(),
}).index("by_plan", ["planId"]),

// convex/pricingConfig.ts
export const getPricing = query({
  args: {},
  handler: async (ctx) => {
    return await ctx.db.query("pricingConfig")
      .filter(q => q.eq(q.field("isActive"), true))
      .collect();
  },
});

// convex/admin.ts (updated)
const pricing = await ctx.db.query("pricingConfig").collect();
const monthlyPrice = pricing.find(p => p.planId === "premium_monthly")?.priceAmount ?? 0;
const annualPrice = pricing.find(p => p.planId === "premium_annual")?.priceAmount ?? 0;
const mrr = monthlyCount * monthlyPrice + annualCount * (annualPrice / 12);
```

---

**Checkpoint 1: Commit after completing Quick Wins** ✅
```bash
git add .
git commit -m "feat(admin): quick wins - auto-refresh, pagination, search, filters, dynamic pricing"
```

---

## 🔴 PHASE 1: Security & Performance (Week 1-2) - CRITICAL

### 1.1 Database Indexes (Performance)

#### Add Missing Indexes to Schema
- [ ] Add `by_processing_status` index to `receipts` table
- [ ] Add `by_created_at` index to `receipts` table
- [ ] Add `by_last_active` index to `users` table
- [ ] Add `by_is_admin` index to `users` table
- [ ] Add `by_current_period_end` index to `subscriptions` table
- [ ] Add `by_created_at` index to `adminLogs` table
- [ ] Add `by_action` index to `adminLogs` table
- [ ] Run `npx convex dev` to apply schema changes
- [ ] Test query performance before/after (use `console.time()`)

**Files:** `convex/schema.ts`

---

#### Replace Full Table Scans
- [ ] Fix `searchUsers()` - add search index or use Algolia
- [ ] Fix `getAnalytics()` - precompute metrics (see below)
- [ ] Fix `getFlaggedReceipts()` - use `by_processing_status` index
- [ ] Fix `getPriceAnomalies()` - add pagination + cursor-based query
- [ ] Fix `getDuplicateStores()` - cache result for 1 hour
- [ ] Add query performance logging (log queries >1s)

**Files:** `convex/admin.ts`

---

#### Precomputed Analytics
- [ ] Create `platformMetrics` table in schema
- [ ] Create `computeDailyMetrics` cron job (runs at midnight)
- [ ] Store: totalUsers, activeUsersToday, receiptsToday, newUsersToday, etc.
- [ ] Update `getAnalytics()` to read from `platformMetrics` (fast!)
- [ ] Add "as of [timestamp]" to Overview tab
- [ ] Test cron job runs correctly

**Files:** `convex/schema.ts`, `convex/crons.ts`, `convex/analytics.ts`

```typescript
// convex/schema.ts
platformMetrics: defineTable({
  date: v.string(), // "2025-02-25"
  totalUsers: v.number(),
  newUsersToday: v.number(),
  activeUsersToday: v.number(),
  totalReceipts: v.number(),
  receiptsToday: v.number(),
  totalGMV: v.number(),
  gmvToday: v.number(),
  computedAt: v.number(),
}).index("by_date", ["date"]),
```

---

### 1.2 Role-Based Access Control (RBAC)

#### Create RBAC Tables
- [ ] Create `adminRoles` table (super_admin, support, analyst, developer)
- [ ] Create `rolePermissions` table (maps roles to permissions)
- [ ] Create `userRoles` table (maps users to roles)
- [ ] Define permission constants (VIEW_USERS, EDIT_USERS, DELETE_DATA, etc.)
- [ ] Seed default roles with permissions

**Files:** `convex/schema.ts`, `convex/migrations/seedRoles.ts`

```typescript
// convex/schema.ts
adminRoles: defineTable({
  name: v.string(), // "super_admin"
  displayName: v.string(), // "Super Administrator"
  description: v.string(),
  createdAt: v.number(),
}).index("by_name", ["name"]),

rolePermissions: defineTable({
  roleId: v.id("adminRoles"),
  permission: v.string(), // "view_users", "delete_receipts"
  createdAt: v.number(),
}).index("by_role", ["roleId"]),

userRoles: defineTable({
  userId: v.id("users"),
  roleId: v.id("adminRoles"),
  grantedBy: v.id("users"),
  grantedAt: v.number(),
}).index("by_user", ["userId"]),
```

---

#### Update Admin Authorization
- [ ] Create `requirePermission(ctx, permission)` helper
- [ ] Replace `requireAdmin()` with `requirePermission()` in all mutations
- [ ] Update admin queries to check permissions
- [ ] Map permissions to UI (hide actions user can't perform)
- [ ] Test with different role types

**Files:** `convex/auth.ts`, `convex/admin.ts`, `app/(app)/admin.tsx`

```typescript
// convex/auth.ts
export async function requirePermission(ctx: any, permission: string) {
  const user = await requireCurrentUser(ctx);
  const userRole = await ctx.db.query("userRoles")
    .withIndex("by_user", q => q.eq("userId", user._id))
    .first();

  if (!userRole) throw new Error("No admin role assigned");

  const hasPermission = await ctx.db.query("rolePermissions")
    .withIndex("by_role", q => q.eq("roleId", userRole.roleId))
    .filter(q => q.eq(q.field("permission"), permission))
    .first();

  if (!hasPermission) throw new Error(`Missing permission: ${permission}`);

  return user;
}
```

---

#### Migrate Existing Admins
- [ ] Create migration: Find all users with `isAdmin: true`
- [ ] Assign them `super_admin` role
- [ ] Keep `isAdmin` flag for backward compatibility (deprecate later)
- [ ] Test migration on dev environment

**Files:** `convex/migrations/migrateAdminsToRBAC.ts`

---

### 1.3 Admin Session Tracking

#### Session Logging
- [ ] Create `adminSessions` table (userId, ipAddress, userAgent, loginAt, logoutAt)
- [ ] Log session start on admin dashboard mount
- [ ] Log session end on sign out
- [ ] Add "Active Sessions" section to Settings tab
- [ ] Show: Who's logged in now, IP, device, session duration
- [ ] Add "Force Logout" button (admin can end another admin's session)

**Files:** `convex/schema.ts`, `convex/adminSessions.ts`, `app/(app)/admin.tsx`

---

#### IP Address Tracking
- [ ] Capture IP address on admin login (use HTTP endpoint)
- [ ] Store IP in `adminSessions` table
- [ ] Add IP whitelisting feature (optional, Phase 2)
- [ ] Alert on login from new IP (email notification)

**Files:** `convex/http.ts`, `convex/adminSessions.ts`

---

### 1.4 Rate Limiting

#### Admin Rate Limits
- [ ] Create `adminRateLimits` table (userId, endpoint, requestCount, windowStart)
- [ ] Add middleware: Check rate limit before mutation execution
- [ ] Limit: 100 requests/minute per admin
- [ ] Return 429 error if exceeded
- [ ] Add rate limit status to admin header (e.g., "95/100 requests")
- [ ] Reset counter every minute

**Files:** `convex/middleware/rateLimit.ts`, `convex/admin.ts`

---

#### Bulk Operation Safeguards
- [ ] Add confirmation modal for bulk operations (>10 items)
- [ ] Show preview: "This will affect X items"
- [ ] Add "Are you sure?" checkbox
- [ ] Require admin to type "CONFIRM" for destructive bulk actions
- [ ] Add rate limit: Max 1 bulk operation per minute

**Files:** `app/(app)/admin.tsx` (ReceiptsTab, UsersTab)

---

**Checkpoint 2: Commit after completing Phase 1** ✅
```bash
git add .
git commit -m "feat(admin): RBAC, session tracking, rate limiting, performance indexes"
```

---

## 🔴 PHASE 2: Analytics & Business Intelligence (Week 3-4)

### 2.1 Advanced Analytics Dashboard

#### Cohort Retention Analysis
- [ ] Create `cohortMetrics` table (signupMonth, retentionDay7, retentionDay30, etc.)
- [ ] Create `computeCohortRetention` cron job (runs weekly)
- [ ] Create new "Analytics" tab in admin panel
- [ ] Add cohort retention table (rows = signup month, cols = retention %)
- [ ] Add retention chart (line graph)
- [ ] Add export to CSV button

**Files:** `convex/schema.ts`, `convex/analytics.ts`, `app/(app)/admin/analytics.tsx`

```typescript
// Example cohort table structure
| Signup Month | Day 7 | Day 30 | Day 90 |
|--------------|-------|--------|--------|
| Jan 2025     | 85%   | 62%    | 41%    |
| Feb 2025     | 88%   | 65%    | -      |
```

---

#### Funnel Analytics
- [ ] Create `funnelEvents` table (userId, eventName, timestamp)
- [ ] Track key events: signup → onboarding_complete → first_list → first_receipt → paid
- [ ] Create funnel query: Count users at each stage
- [ ] Add funnel visualization to Analytics tab (funnel chart)
- [ ] Calculate conversion rates between stages
- [ ] Add date range filter for funnel

**Files:** `convex/schema.ts`, `convex/analytics.ts`, `app/(app)/admin/analytics.tsx`

---

#### Churn Analysis
- [ ] Create `churnMetrics` table (month, churnedUsers, churnRate, reasons)
- [ ] Define churn: No activity in 30 days OR subscription canceled
- [ ] Compute monthly churn rate (cron job)
- [ ] Add churn chart to Analytics tab (line graph)
- [ ] Add churn reasons breakdown (pie chart)
- [ ] Add "at-risk" user count (no activity in 14+ days)

**Files:** `convex/schema.ts`, `convex/analytics.ts`, `app/(app)/admin/analytics.tsx`

---

#### Lifetime Value (LTV) Calculation
- [ ] Create `ltvMetrics` table (cohort, avgLTV, avgRevenuePerUser)
- [ ] Calculate LTV: Sum of all subscription revenue per user
- [ ] Group by cohort (signup month)
- [ ] Add LTV chart to Analytics tab (bar graph)
- [ ] Calculate Customer Acquisition Cost (CAC) - manual input for now
- [ ] Add LTV:CAC ratio indicator (target: >3)

**Files:** `convex/analytics.ts`, `app/(app)/admin/analytics.tsx`

---

### 2.2 User Segmentation

#### Segment Definitions
- [ ] Create `userSegments` table (userId, segmentType, assignedAt)
- [ ] Define segments: power_user, at_risk, dormant, new_user, trial_ending
- [ ] Create `computeUserSegments` cron job (runs daily)
- [ ] Rules:
  - `power_user`: 10+ receipts scanned + 5+ lists created
  - `at_risk`: No activity in 14+ days
  - `dormant`: No activity in 30+ days
  - `new_user`: Signed up <7 days ago
  - `trial_ending`: Trial ends in <3 days

**Files:** `convex/schema.ts`, `convex/segments.ts`

---

#### Segment Viewer
- [ ] Add "Segments" subtab under Users tab
- [ ] Show segment breakdown (card for each segment with count)
- [ ] Click segment → view users in that segment
- [ ] Add "Export Segment" button (CSV with user emails)
- [ ] Add manual segment assignment (admin can tag users)

**Files:** `app/(app)/admin.tsx` (new SegmentsTab)

---

### 2.3 Data Exports

#### CSV Export System
- [ ] Install `papaparse` library
- [ ] Create `exportUsers` mutation (returns CSV string)
- [ ] Create `exportReceipts` mutation
- [ ] Create `exportSubscriptions` mutation
- [ ] Add date range filter to all exports
- [ ] Add "Download CSV" button to each admin tab
- [ ] Generate filename: `oja-users-2025-02-25.csv`

**Files:** `convex/exports.ts`, `app/(app)/admin.tsx`

---

#### Export History
- [ ] Create `exportLogs` table (adminUserId, exportType, rowCount, timestamp)
- [ ] Log every export with row count
- [ ] Add "Export History" section to Settings tab
- [ ] Show last 20 exports with download link (if cached)
- [ ] Auto-delete exports older than 7 days

**Files:** `convex/schema.ts`, `convex/exports.ts`

---

### 2.4 Financial Reporting

#### Failed Payments Tracking
- [ ] Add Stripe webhook handler for `invoice.payment_failed`
- [ ] Create `failedPayments` table (userId, subscriptionId, amount, reason, timestamp)
- [ ] Add "Failed Payments" card to Revenue section
- [ ] Show count + total lost revenue
- [ ] Add "Retry Payment" action (sends email to user)
- [ ] Add filter: Failed in last 7 days, 30 days, all time

**Files:** `convex/stripe.ts`, `convex/http.ts`, `app/(app)/admin.tsx`

---

#### Refund Management
- [ ] Create `refunds` table (userId, subscriptionId, amount, reason, status, timestamp)
- [ ] Add "Issue Refund" button in user detail modal
- [ ] Process refund via Stripe API
- [ ] Update subscription status in Convex
- [ ] Log refund in audit logs
- [ ] Add "Refunds" section to Revenue tab (table view)

**Files:** `convex/schema.ts`, `convex/refunds.ts`, `app/(app)/admin.tsx`

---

#### Revenue Reconciliation
- [ ] Create `reconciliationReports` table (date, stripeRevenue, convexRevenue, discrepancy)
- [ ] Create reconciliation cron job (runs weekly)
- [ ] Fetch Stripe revenue for date range
- [ ] Compare with Convex subscription records
- [ ] Flag discrepancies >£5
- [ ] Add "Reconciliation" tab under Revenue
- [ ] Show discrepancy alerts

**Files:** `convex/schema.ts`, `convex/reconciliation.ts`, `app/(app)/admin/revenue.tsx`

---

**Checkpoint 3: Commit after completing Phase 2** ✅
```bash
git add .
git commit -m "feat(admin): advanced analytics, segmentation, exports, financial reporting"
```

---

## 🟡 PHASE 3: Support & Operations (Week 5-6)

### 3.1 Support Ticket System

#### Ticket Schema & Backend
- [ ] Create `supportTickets` table (userId, subject, description, status, priority, assignedTo, createdAt)
- [ ] Status: open, in_progress, waiting_on_user, resolved, closed
- [ ] Priority: low, medium, high, urgent
- [ ] Create `ticketMessages` table (ticketId, senderId, message, timestamp)
- [ ] Create `createTicket` mutation (user-facing)
- [ ] Create `updateTicket` mutation (admin-only)
- [ ] Create `addTicketMessage` mutation

**Files:** `convex/schema.ts`, `convex/support.ts`

---

#### User-Facing Support Form
- [ ] Create "Contact Support" screen in app
- [ ] Add navigation link in Profile screen
- [ ] Form fields: Subject, Description, Priority, Attachments (optional)
- [ ] Submit → creates ticket in Convex
- [ ] Show confirmation message with ticket ID
- [ ] Add "My Tickets" section (user can view their ticket status)

**Files:** `app/(app)/support.tsx`, `app/(app)/(tabs)/profile.tsx`

---

#### Admin Ticket Dashboard
- [ ] Add "Support" tab to admin panel
- [ ] Show ticket queue: Inbox (open), Assigned (in_progress), Resolved
- [ ] Click ticket → open detail modal
- [ ] Ticket detail: Show user info, conversation thread, status
- [ ] Add "Assign to Me" button
- [ ] Add "Reply" input (sends message to user)
- [ ] Add status dropdown (change status)
- [ ] Add priority dropdown
- [ ] Add "Close Ticket" button

**Files:** `app/(app)/admin/support.tsx`

---

#### Ticket Notifications
- [ ] Send push notification to user when admin replies
- [ ] Send email to user when ticket is resolved
- [ ] Send push notification to assigned admin when user replies
- [ ] Add unread badge to "Support" tab (count open tickets)

**Files:** `convex/support.ts`, `convex/notifications.ts`

---

### 3.2 User Impersonation (Debug Mode)

#### Impersonation Token System
- [ ] Create `impersonationTokens` table (userId, tokenValue, createdBy, expiresAt)
- [ ] Create `generateImpersonationToken` mutation (admin-only)
- [ ] Token expires after 1 hour
- [ ] Log every impersonation in audit logs
- [ ] Add "View as User" button in user detail modal

**Files:** `convex/schema.ts`, `convex/impersonation.ts`, `app/(app)/admin.tsx`

---

#### App-Side Impersonation Handling
- [ ] Add deep link handler: `oja://impersonate?token=abc123`
- [ ] Validate token in Convex
- [ ] Store impersonation state in React context
- [ ] Show banner at top of app: "🔍 Viewing as [User Name] (Admin Mode)"
- [ ] Add "Exit Impersonation" button in banner
- [ ] Clear impersonation on app close

**Files:** `app/_layout.tsx`, `contexts/ImpersonationContext.tsx`

---

#### Impersonation Safeguards
- [ ] Block destructive actions in impersonation mode (can't delete account)
- [ ] Log all actions performed during impersonation
- [ ] Require admin to re-authenticate before impersonation
- [ ] Show warning modal: "This will log you in as [User]. Continue?"

**Files:** `convex/impersonation.ts`, `app/_layout.tsx`

---

### 3.3 Bulk Operations

#### User Selection UI
- [ ] Add checkbox column to user table
- [ ] Add "Select All" checkbox in header
- [ ] Show selected count: "5 users selected"
- [ ] Add bulk action dropdown: Send Email, Extend Trial, Apply Tag, Export
- [ ] Show preview modal before executing bulk action
- [ ] Require confirmation for >10 items

**Files:** `app/(app)/admin.tsx` (UsersTab)

---

#### Bulk Actions Backend
- [ ] Create `bulkExtendTrial` mutation
- [ ] Create `bulkSendEmail` mutation
- [ ] Create `bulkApplyTag` mutation (new tag system, see below)
- [ ] Add rate limit: Max 100 users per bulk operation
- [ ] Add progress indicator (process in batches of 10)
- [ ] Log all bulk actions in audit logs

**Files:** `convex/bulkOperations.ts`

---

#### User Tagging System
- [ ] Create `userTags` table (userId, tag, createdBy, createdAt)
- [ ] Common tags: VIP, Beta Tester, Support, Refunded
- [ ] Add "Tags" column to user table (show as badges)
- [ ] Add tag filter dropdown in Users tab
- [ ] Add/remove tags in user detail modal
- [ ] Add tag in bulk operations

**Files:** `convex/schema.ts`, `convex/userTags.ts`, `app/(app)/admin.tsx`

---

### 3.4 User Activity Timeline

#### Activity Event Tracking
- [ ] Create `activityEvents` table (userId, eventType, metadata, timestamp)
- [ ] Track events: login, signup, create_list, scan_receipt, complete_list, subscribe, cancel
- [ ] Auto-track events in existing mutations (add event logging)
- [ ] Add index: `by_user_timestamp`

**Files:** `convex/schema.ts`, `convex/activityEvents.ts`, all relevant mutations

---

#### Timeline UI
- [ ] Add "Activity" tab to user detail modal
- [ ] Show timeline: Date → Event → Details
- [ ] Group by date (Today, Yesterday, Feb 23, etc.)
- [ ] Add event icons (login = 🔓, scan = 📷, etc.)
- [ ] Add pagination (show 50 events, load more button)
- [ ] Add filter by event type (dropdown)

**Files:** `app/(app)/admin.tsx` (user detail modal)

---

**Checkpoint 4: Commit after completing Phase 3** ✅
```bash
git add .
git commit -m "feat(admin): support tickets, impersonation, bulk ops, activity timeline"
```

---

## 🟠 PHASE 4: Advanced Features (Week 7-8) - OPTIONAL

### 4.1 Real-Time Monitoring

#### WebSocket Live Dashboard
- [ ] Add WebSocket connection to admin panel
- [ ] Subscribe to real-time updates (new users, new receipts, errors)
- [ ] Add "Live" indicator (🔴 blinking dot) to Overview tab
- [ ] Update metrics in real-time (no manual refresh needed)
- [ ] Add sound notification for critical events (optional)

**Files:** `app/(app)/admin.tsx`, `convex/adminRealtimeSubscriptions.ts`

---

#### Push Notifications for Admins
- [ ] Create `adminAlerts` table (alertType, message, severity, createdAt)
- [ ] Define alert triggers: receipt_failure_spike, payment_failure, system_error
- [ ] Send Expo push notification to all online admins
- [ ] Add "Alerts" section to admin panel (bell icon with badge)
- [ ] Click alert → view details and take action

**Files:** `convex/schema.ts`, `convex/monitoring.ts`, `app/(app)/admin.tsx`

---

#### SLA Tracking
- [ ] Create `slaMetrics` table (metric, target, actual, timestamp)
- [ ] Track: Receipt processing time (target: <5s), API latency (target: <500ms)
- [ ] Add SLA dashboard to Monitoring tab
- [ ] Show red/yellow/green status per metric
- [ ] Alert when SLA is breached

**Files:** `convex/schema.ts`, `convex/slaTracking.ts`, `app/(app)/admin/monitoring.tsx`

---

### 4.2 A/B Testing Framework

#### Experiment Schema
- [ ] Create `experiments` table (name, description, startDate, endDate, status)
- [ ] Create `experimentVariants` table (experimentId, variantName, allocationPercent)
- [ ] Create `experimentAssignments` table (userId, experimentId, variantName)
- [ ] Status: draft, running, paused, completed
- [ ] Create `assignUserToExperiment` mutation (random allocation)

**Files:** `convex/schema.ts`, `convex/experiments.ts`

---

#### Conversion Tracking
- [ ] Create `experimentEvents` table (userId, experimentId, eventName, timestamp)
- [ ] Track goal events (e.g., "trial_to_paid_conversion")
- [ ] Create `getExperimentResults` query (calculate conversion rate per variant)
- [ ] Calculate statistical significance (Chi-square test)
- [ ] Add "Experiments" tab to admin panel

**Files:** `convex/experiments.ts`, `app/(app)/admin/experiments.tsx`

---

#### Experiment Management UI
- [ ] List all experiments (table view)
- [ ] Create new experiment (form: name, variants, goal event)
- [ ] Start/pause/stop experiment buttons
- [ ] View results (table: Variant, Users, Conversions, Rate, Significance)
- [ ] Declare winner (apply winning variant to 100%)

**Files:** `app/(app)/admin/experiments.tsx`

---

### 4.3 Automated Workflows

#### Workflow Engine
- [ ] Create `automationWorkflows` table (name, trigger, actions, enabled)
- [ ] Triggers: subscription_canceled, trial_ending, user_inactive_30d, payment_failed
- [ ] Actions: send_email, send_push, suspend_user, apply_tag
- [ ] Create cron job to check triggers daily
- [ ] Execute actions for matched users

**Files:** `convex/schema.ts`, `convex/workflows.ts`, `convex/crons.ts`

---

#### Pre-Built Workflows
- [ ] Workflow 1: Trial ending in 3 days → Send email reminder
- [ ] Workflow 2: Payment failed 3x → Suspend subscription
- [ ] Workflow 3: No activity 30 days → Send re-engagement email
- [ ] Workflow 4: Scan credit earned → Send congrats push notification
- [ ] Add "Automations" tab to Settings (enable/disable workflows)

**Files:** `convex/workflows.ts`, `app/(app)/admin/settings.tsx`

---

### 4.4 Content Management System

#### Help Articles Schema
- [ ] Create `helpArticles` table (title, slug, content, category, publishedAt)
- [ ] Create `helpCategories` table (name, slug, icon, order)
- [ ] Support markdown content
- [ ] Add versioning (track edits)

**Files:** `convex/schema.ts`, `convex/cms.ts`

---

#### CMS Editor
- [ ] Add "Content" tab to admin panel
- [ ] List all help articles (table view)
- [ ] Create/edit article form (markdown editor)
- [ ] Live preview panel
- [ ] Publish/unpublish toggle
- [ ] Drag-to-reorder categories

**Files:** `app/(app)/admin/content.tsx`, use library: `react-native-markdown-editor`

---

#### User-Facing Help Center
- [ ] Create "Help" screen in app
- [ ] List categories as cards
- [ ] Click category → list articles
- [ ] Click article → view content (rendered markdown)
- [ ] Add search bar (search article titles/content)

**Files:** `app/(app)/help.tsx`

---

**Checkpoint 5: Commit after completing Phase 4** ✅
```bash
git add .
git commit -m "feat(admin): real-time monitoring, A/B testing, workflows, CMS"
```

---

## 📊 Progress Tracking

### Overall Completion

- [ ] Quick Wins (9 items)
- [ ] Phase 1: Security & Performance (4 sections)
- [ ] Phase 2: Analytics & Business Intelligence (4 sections)
- [ ] Phase 3: Support & Operations (4 sections)
- [ ] Phase 4: Advanced Features (4 sections)

---

### Completion Percentages (Auto-calculated)

**Quick Wins:** 0/9 (0%)
**Phase 1:** 0/4 (0%)
**Phase 2:** 0/4 (0%)
**Phase 3:** 0/4 (0%)
**Phase 4:** 0/4 (0%)

**TOTAL:** 0/29 (0%)

---

## 🎯 Priority Recommendations

### Week 1 Focus (Critical)
1. ✅ Quick Wins (all 9 items) - **High ROI, low effort**
2. ✅ Phase 1.1: Database Indexes - **Prevents scaling issues**
3. ✅ Phase 1.2: RBAC - **Security foundation**

### Week 2 Focus (Critical)
4. ✅ Phase 1.3: Session Tracking - **Security audit trail**
5. ✅ Phase 1.4: Rate Limiting - **Prevents abuse**
6. ✅ Phase 2.1: Advanced Analytics (cohorts, funnels) - **Business insights**

### Week 3-4 Focus (High Value)
7. ✅ Phase 2.2: User Segmentation - **Targeted marketing**
8. ✅ Phase 2.3: Data Exports - **Data portability**
9. ✅ Phase 2.4: Financial Reporting - **Revenue visibility**

### Week 5-6 Focus (Operational Efficiency)
10. ✅ Phase 3.1: Support Tickets - **Customer success**
11. ✅ Phase 3.2: User Impersonation - **Debug efficiency**
12. ✅ Phase 3.3: Bulk Operations - **Admin productivity**

### Week 7-8 Focus (Nice-to-Have)
13. ✅ Phase 4.1: Real-Time Monitoring - **Proactive ops**
14. ✅ Phase 4.2: A/B Testing - **Product optimization**
15. ✅ Phase 4.3-4.4: Workflows & CMS - **Automation & self-service**

---

## ✅ End-to-End Feature Verification

> **Purpose:** Ensure every admin feature is fully functional from UI → Backend → Database → UI response. Test each feature thoroughly before marking complete.

### Overview Tab Features

#### System Health Monitoring
- [ ] Verify health status displays correctly (healthy/degraded)
- [ ] Verify receipt processing metrics update in real-time
- [ ] Verify success rate calculation is accurate
- [ ] Test with failed receipts - status should change to "degraded" when >10 failures
- [ ] Verify "Last updated" timestamp updates correctly

**Test Steps:**
1. Open Overview tab
2. Check system health card shows current status
3. Create a failed receipt → verify failed count increments
4. Create 11+ failed receipts → verify status changes to "degraded"
5. Refresh page → verify data persists

---

#### Analytics Cards
- [ ] Verify "Total Users" count matches actual user count in database
- [ ] Verify "New (Week)" shows users created in last 7 days
- [ ] Verify "Active (Week)" shows users with activity in last 7 days
- [ ] Verify "Total Lists" count is accurate
- [ ] Verify "Completed" lists count is accurate
- [ ] Verify "Receipts" total count is accurate
- [ ] Verify "Total GMV" calculation is correct (sum of all receipt totals)

**Test Steps:**
1. Run database query to count actual users: `ctx.db.query("users").collect()`
2. Compare with displayed "Total Users" count
3. Create new user → verify "New (Week)" increments
4. Create new list and mark completed → verify both counters update
5. Upload receipt → verify "Receipts" and "GMV" update

---

#### Revenue Reporting
- [ ] Verify MRR calculation uses dynamic pricing (not hard-coded)
- [ ] Verify ARR = MRR × 12
- [ ] Verify monthly subscriber count is accurate
- [ ] Verify annual subscriber count is accurate
- [ ] Verify trial count shows only active trials (not expired)

**Test Steps:**
1. Update pricing in `pricingConfig` table
2. Verify MRR recalculates with new price
3. Create trial subscription → verify "trials" count increments
4. Expire trial → verify count decrements
5. Create paid subscription → verify monthly/annual count increments

---

#### Audit Logs
- [ ] Verify last 10 admin actions are displayed
- [ ] Verify admin name is shown (not just ID)
- [ ] Verify timestamp format is readable
- [ ] Verify action details are descriptive
- [ ] Test pagination (if implemented) - shows 50 per page

**Test Steps:**
1. Perform admin action (e.g., toggle admin for user)
2. Refresh Overview tab
3. Verify action appears in audit log with your name
4. Check timestamp is correct
5. Verify action details explain what was done

---

### Users Tab Features

#### User Search
- [ ] Verify search requires minimum 2 characters
- [ ] Verify search finds users by name (case-insensitive)
- [ ] Verify search finds users by email
- [ ] Verify partial matches work (e.g., "joh" finds "John")
- [ ] Verify search results clear when input is cleared
- [ ] Verify "No results" message when no matches

**Test Steps:**
1. Type "a" → verify no search happens (too short)
2. Type "ad" → verify search executes
3. Search for partial email "gmail" → verify finds all Gmail users
4. Search for non-existent user → verify "No results" shown
5. Clear search → verify full user list returns

---

#### User Detail Modal
- [ ] Verify modal opens when clicking user row
- [ ] Verify user name and email display correctly
- [ ] Verify receipt count is accurate
- [ ] Verify list count is accurate
- [ ] Verify "Total Spent" sum is correct
- [ ] Verify lifetime scans count is accurate
- [ ] Verify subscription status shows correct plan and status
- [ ] Verify modal closes when clicking X

**Test Steps:**
1. Click any user in list
2. Verify modal shows correct user data
3. Manually count user's receipts in database
4. Compare with displayed receipt count
5. Check subscription status matches database record

---

#### Toggle Admin Privilege
- [ ] Verify shield icon shows current admin status (filled = admin, outline = not)
- [ ] Verify clicking shield toggles admin status
- [ ] Verify success haptic feedback triggers
- [ ] Verify admin badge appears/disappears immediately
- [ ] Verify action is logged in audit logs
- [ ] Verify error handling if toggle fails

**Test Steps:**
1. Click shield icon for non-admin user
2. Verify icon changes to filled shield
3. Verify "Admin" badge appears next to user name
4. Check database: `isAdmin` field should now be `true`
5. Check audit logs for "grant_admin" action
6. Click shield again → verify admin status removed

---

#### Extend Trial
- [ ] Verify "+14d Trial" button opens confirmation modal
- [ ] Verify modal shows user name
- [ ] Verify clicking "Extend" adds 14 days to trial
- [ ] Verify success notification appears
- [ ] Verify action is logged in audit logs
- [ ] Verify "Cancel" closes modal without changes

**Test Steps:**
1. Open user detail for trial user
2. Click "+14d Trial" button
3. Verify confirmation modal appears
4. Click "Extend"
5. Check database: `trialEndsAt` should be +14 days
6. Verify audit log entry created

---

#### Grant Complimentary Access
- [ ] Verify "Free Premium" button opens confirmation
- [ ] Verify confirmation explains 1-year premium access
- [ ] Verify clicking "Grant" creates/updates subscription
- [ ] Verify plan is set to "premium_annual"
- [ ] Verify status is set to "active"
- [ ] Verify period end is 365 days from now
- [ ] Verify action is logged in audit logs

**Test Steps:**
1. Select user with no subscription
2. Click "Free Premium"
3. Confirm action
4. Check database: subscription record should exist with plan = "premium_annual"
5. Verify `currentPeriodEnd` is ~365 days in future
6. Open user profile in app → verify shows "Premium"

---

#### Suspend User
- [ ] Verify "Suspend" button shows warning color (red)
- [ ] Verify confirmation modal appears
- [ ] Verify warning haptic feedback on click
- [ ] Verify suspension toggles on/off (unsuspend button)
- [ ] Verify suspended users cannot log in (test in app)
- [ ] Verify action is logged in audit logs

**Test Steps:**
1. Click "Suspend" for active user
2. Confirm action
3. Check database: `suspended` field should be `true`
4. Try to log in as that user in app → verify blocked
5. Click "Suspend" again → verify unsuspends
6. User should now be able to log in

---

### Receipts Tab Features

#### Flagged Receipts
- [ ] Verify only shows receipts with `processingStatus: "failed"` or `total: 0`
- [ ] Verify count badge is accurate
- [ ] Verify user name is displayed (not just ID)
- [ ] Verify store name and total are shown
- [ ] Verify processing status is displayed
- [ ] Verify "Delete" icon appears on hover/tap

**Test Steps:**
1. Create receipt with `processingStatus: "failed"`
2. Verify appears in "Flagged Receipts" section
3. Create receipt with `total: 0`
4. Verify also appears in flagged section
5. Fix receipt status → verify disappears from flagged

---

#### Delete Receipt
- [ ] Verify clicking delete icon shows confirmation
- [ ] Verify confirmation shows receipt details
- [ ] Verify "Delete" button is destructive style (red)
- [ ] Verify clicking "Delete" removes receipt from database
- [ ] Verify success haptic feedback
- [ ] Verify action is logged in audit logs
- [ ] Verify associated price data is handled correctly

**Test Steps:**
1. Note total receipt count
2. Click delete on any receipt
3. Confirm deletion
4. Verify receipt removed from list
5. Check database: receipt document should be deleted
6. Verify audit log entry created with receipt details

---

#### Bulk Approve Receipts
- [ ] Verify "Approve All" button shows count (e.g., "Approve All (5)")
- [ ] Verify clicking button processes all flagged receipts
- [ ] Verify receipts change status to "completed"
- [ ] Verify receipts move out of flagged section
- [ ] Verify success notification
- [ ] Verify action is logged in audit logs with count

**Test Steps:**
1. Create 5 failed receipts
2. Verify "Approve All (5)" button appears
3. Click button
4. Verify all 5 receipts status changed to "completed"
5. Verify flagged section now shows 0 receipts
6. Check audit log for bulk action entry

---

#### Price Anomalies
- [ ] Verify shows items with >50% deviation from average
- [ ] Verify displays: item name, price, store, average, deviation %
- [ ] Verify limited to 50 anomalies max
- [ ] Verify "Delete" icon removes price entry
- [ ] Verify deleted price entry is removed from database

**Test Steps:**
1. Create price entry: Milk at Tesco = £1.00
2. Create price entry: Milk at Tesco = £5.00 (500% deviation)
3. Verify £5.00 entry appears in anomalies
4. Click delete on anomaly
5. Verify removed from anomalies list
6. Check database: price entry should be deleted

---

#### Recent Receipts
- [ ] Verify shows last 20 receipts by creation date
- [ ] Verify displays: store name, total, user name, purchase date
- [ ] Verify status badge shows correct color (green = completed, yellow = processing)
- [ ] Verify receipts are sorted newest first

**Test Steps:**
1. Create 25 receipts
2. Verify only 20 shown
3. Verify most recent receipt is at top
4. Check dates are in descending order
5. Verify status badges match database status

---

### Catalog Tab Features

#### Duplicate Store Detection
- [ ] Verify finds store name variants (case differences, spacing)
- [ ] Verify suggests canonical name (usually first alphabetically)
- [ ] Verify shows all variants in list
- [ ] Verify count badge shows number of duplicate groups

**Test Steps:**
1. Create prices with stores: "Tesco", "TESCO", "tesco", "Tesco Express"
2. Verify duplicate detection shows these as variants
3. Verify suggested name is consistent
4. Count should show "1 group" or similar

---

#### Merge Store Names
- [ ] Verify "Merge" button shows confirmation
- [ ] Verify confirmation shows variant names and target name
- [ ] Verify merge updates all affected price records
- [ ] Verify merge count is accurate (shows "updated X records")
- [ ] Verify action is logged in audit logs
- [ ] Verify merged variants disappear from duplicates list

**Test Steps:**
1. Note price records count for "TESCO"
2. Click "Merge" for Tesco variants
3. Confirm merge to "Tesco"
4. Check database: all variants should now be "Tesco"
5. Verify duplicates section no longer shows Tesco
6. Verify audit log entry shows merge details

---

#### Categories Inventory
- [ ] Verify shows all unique pantry categories
- [ ] Verify count next to each category is accurate
- [ ] Verify categories are sorted alphabetically
- [ ] Verify empty categories (0 items) are hidden

**Test Steps:**
1. Count pantry items in "Dairy" category in database
2. Compare with displayed count in Categories section
3. Create new pantry item with new category
4. Refresh → verify new category appears
5. Delete all items in a category → verify category disappears

---

### Settings Tab Features

#### Feature Flags - Toggle
- [ ] Verify all feature flags are listed
- [ ] Verify current value shows correct on/off state (switch)
- [ ] Verify toggling switch updates database immediately
- [ ] Verify description is displayed (if present)
- [ ] Verify success haptic feedback on toggle
- [ ] Verify action is logged in audit logs

**Test Steps:**
1. Toggle any feature flag on
2. Check database: `value` field should be `true`
3. Check audit log for "toggle_feature_flag" action
4. Toggle off
5. Verify database updated to `false`
6. Refresh page → verify state persists

---

#### Feature Flags - Create New
- [ ] Verify text input accepts flag key name
- [ ] Verify "+" button creates new flag
- [ ] Verify new flag appears in list
- [ ] Verify new flag defaults to `true`
- [ ] Verify validation prevents empty keys
- [ ] Verify action is logged in audit logs

**Test Steps:**
1. Type "test_new_feature" in input
2. Click "+" button
3. Verify new flag appears in list with switch on
4. Check database: new featureFlag document exists
5. Try to create flag with empty key → verify blocked
6. Check audit log entry

---

#### Feature Flags - Metadata (After Enhancement)
- [ ] Verify "Last Modified" shows timestamp
- [ ] Verify "Modified By" shows admin name (not ID)
- [ ] Verify "Created At" shows creation timestamp
- [ ] Verify flags sorted by last modified (newest first)
- [ ] Verify search filter works

**Test Steps:**
1. Create new feature flag
2. Verify "Created At" shows current timestamp
3. Toggle flag → verify "Last Modified" updates
4. Verify "Modified By" shows your admin name
5. Search for flag key → verify filter works

---

#### Announcements - Create
- [ ] Verify "New Announcement" button opens form
- [ ] Verify title and body inputs accept text
- [ ] Verify type selector (info/warning/promo) works
- [ ] Verify "Create" button creates announcement
- [ ] Verify new announcement appears in list
- [ ] Verify announcement is active by default
- [ ] Verify action is logged in audit logs

**Test Steps:**
1. Click "New Announcement"
2. Fill in title: "Test Announcement"
3. Fill in body: "This is a test"
4. Select type: "info"
5. Click "Create"
6. Verify announcement appears in list below
7. Check database: announcement document exists with `active: true`

---

#### Announcements - Toggle Active
- [ ] Verify switch shows current active state
- [ ] Verify toggling switch updates database
- [ ] Verify inactive announcements are visually dimmed (opacity 0.5)
- [ ] Verify active announcements are fully visible
- [ ] Verify action is logged in audit logs
- [ ] Verify users only see active announcements in app

**Test Steps:**
1. Create active announcement
2. Toggle switch to off
3. Check database: `active` should be `false`
4. Open app as regular user → verify announcement NOT shown
5. Toggle switch back on
6. Verify announcement now appears in app

---

#### Announcements - Scheduling (Optional Feature)
- [ ] Verify `startsAt` and `endsAt` can be set
- [ ] Verify announcement not shown before `startsAt`
- [ ] Verify announcement not shown after `endsAt`
- [ ] Verify announcement shown between start and end dates

**Test Steps:**
1. Create announcement with `startsAt` = tomorrow
2. Check app today → announcement should NOT appear
3. Change `startsAt` to yesterday
4. Check app → announcement should appear
5. Set `endsAt` to yesterday
6. Check app → announcement should NOT appear

---

#### Announcements - Edit (After Enhancement)
- [ ] Verify "Edit" button opens edit modal
- [ ] Verify modal pre-populates existing values
- [ ] Verify changes save to database
- [ ] Verify action is logged in audit logs

**Test Steps:**
1. Click "Edit" on any announcement
2. Change title to "Updated Title"
3. Click "Save"
4. Verify title updated in list
5. Check database: title should be "Updated Title"
6. Check audit log for edit action

---

### Cross-Feature Integration Tests

#### User Lifecycle
- [ ] Create user → verify appears in Users tab
- [ ] User creates list → verify count updates in user detail
- [ ] User scans receipt → verify receipt count increments
- [ ] User subscribes → verify subscription shown in detail modal
- [ ] Suspend user → verify cannot log in
- [ ] Unsuspend user → verify can log in again
- [ ] Delete user (dev tool) → verify all data cleaned up

**Test Steps:**
1. Sign up new user in app
2. Verify appears in admin Users tab immediately
3. Create shopping list in app
4. Refresh admin → verify list count = 1
5. Scan receipt → verify receipt count increments
6. Subscribe → verify subscription details appear
7. Test full lifecycle end-to-end

---

#### Receipt Processing Flow
- [ ] Receipt uploaded → appears in "Recent Receipts"
- [ ] Receipt fails processing → appears in "Flagged Receipts"
- [ ] Admin deletes receipt → removed from all sections
- [ ] Receipt creates price entries → appear in Catalog
- [ ] Price anomaly detected → appears in anomalies section
- [ ] Admin deletes anomaly → removed from database

**Test Steps:**
1. Upload receipt in app
2. Check admin Receipts tab → verify appears in Recent
3. Manually set status to "failed" in database
4. Refresh admin → verify moves to Flagged section
5. Delete receipt → verify removed everywhere
6. Check associated prices are handled correctly

---

#### Subscription & Revenue Flow
- [ ] User starts trial → "trials" count increments
- [ ] Trial counts toward MRR calculation (£0)
- [ ] User converts to paid → MRR updates with subscription price
- [ ] Admin extends trial → trial end date updates
- [ ] Admin grants free premium → subscription created, MRR doesn't change
- [ ] User cancels → MRR decrements
- [ ] Failed payment → appears in failed payments (if implemented)

**Test Steps:**
1. Create trial subscription for user
2. Check Overview → verify trial count = 1
3. Convert trial to paid monthly
4. Verify MRR increases by monthly price (e.g., £2.99)
5. Cancel subscription
6. Verify MRR decreases

---

#### Admin Actions Audit Trail
- [ ] Every admin mutation logs to `adminLogs` table
- [ ] Audit log includes: adminUserId, action, targetType, targetId, details, createdAt
- [ ] Admin name is resolved and shown (not just ID)
- [ ] Timestamp is human-readable
- [ ] Details field is descriptive

**Test Steps:**
1. Perform various admin actions: toggle admin, delete receipt, merge stores
2. After each action, check `adminLogs` table
3. Verify entry created with correct admin ID
4. Verify action name matches mutation
5. Verify details field explains what happened
6. Check Overview tab → verify action appears in audit log list

---

#### Feature Flags Integration
- [ ] Feature flag created → available to query in app
- [ ] Flag toggled on → feature enabled in app
- [ ] Flag toggled off → feature disabled in app
- [ ] New flag shows in app without code deployment

**Test Steps:**
1. Create feature flag "test_feature" = true
2. Add conditional in app code: `if (featureFlag === true)`
3. Verify feature is enabled in app
4. Toggle flag to false in admin
5. Refresh app → verify feature disabled
6. No code change needed

---

#### Announcements Integration
- [ ] Active announcement shown in app
- [ ] Inactive announcement hidden in app
- [ ] Multiple announcements shown (stacked or carousel)
- [ ] Type badge displays correctly (info/warning/promo colors)

**Test Steps:**
1. Create active announcement in admin
2. Open app → verify announcement appears (e.g., on home screen)
3. Toggle announcement inactive in admin
4. Refresh app → verify announcement disappears
5. Create multiple active announcements
6. Verify all shown in app

---

### Performance Tests

#### Load Testing
- [ ] Test with 100 users → UI remains responsive
- [ ] Test with 1,000 receipts → queries return in <2s
- [ ] Test with 10,000 price entries → anomaly detection completes
- [ ] Test pagination handles large datasets

**Test Steps:**
1. Seed database with 100 users
2. Open Users tab → measure load time
3. Seed 1,000 receipts
4. Open Receipts tab → verify loads in <2s
5. Test pagination → verify smooth navigation

---

#### Database Query Performance
- [ ] getUsers query uses indexes (no full table scan)
- [ ] searchUsers query completes in <500ms
- [ ] getAnalytics uses precomputed metrics (after Phase 1)
- [ ] getFlaggedReceipts uses status index
- [ ] getPriceAnomalies limited to 50 results

**Test Steps:**
1. Check Convex dashboard for query times
2. Run queries manually in Convex Functions tab
3. Verify execution time < 1s for most queries
4. Check query plan uses indexes (not full scan)

---

### Security Tests

#### Authentication
- [ ] Non-admin users cannot access admin panel
- [ ] API returns `null` or `[]` for non-admin queries
- [ ] Attempting admin mutation as non-admin throws error
- [ ] Admin flag persists across sessions

**Test Steps:**
1. Log in as regular user (non-admin)
2. Navigate to `/admin` → verify "Access Denied" screen
3. Try to call `getUsers` query → verify returns `[]`
4. Try to call `toggleAdmin` mutation → verify throws error
5. Log in as admin → verify full access

---

#### Authorization (After RBAC Implementation)
- [ ] Super admin can perform all actions
- [ ] Support role can view but not delete
- [ ] Analyst role can view analytics but not modify users
- [ ] Developer role can access feature flags only

**Test Steps:**
1. Create user with "support" role
2. Verify can view users but "Delete" button disabled
3. Create user with "analyst" role
4. Verify can view Overview tab but not Users tab
5. Test each role's permissions thoroughly

---

#### Audit Trail
- [ ] All destructive actions are logged
- [ ] Logs are immutable (cannot be deleted via UI)
- [ ] Logs include IP address (after Phase 1)
- [ ] Sensitive data is redacted in logs

**Test Steps:**
1. Perform destructive action (delete receipt)
2. Verify audit log entry created
3. Try to delete audit log entry → verify not possible
4. Check log includes all required fields

---

### Error Handling Tests

#### Network Errors
- [ ] Failed mutation shows error toast
- [ ] Loading states display during async operations
- [ ] Retry mechanism works for transient failures
- [ ] Offline mode shows "No connection" message

**Test Steps:**
1. Disable network
2. Try to toggle admin status
3. Verify error message appears
4. Re-enable network
5. Retry action → verify succeeds

---

#### Validation Errors
- [ ] Empty search input doesn't crash
- [ ] Invalid date range shows error
- [ ] Duplicate feature flag key shows error
- [ ] Missing required fields show validation message

**Test Steps:**
1. Try to create feature flag with empty key
2. Verify error message: "Key is required"
3. Try to create announcement with empty title
4. Verify validation prevents creation
5. Enter invalid date range → verify error shown

---

#### Edge Cases
- [ ] Deleting last receipt in flagged section doesn't crash
- [ ] Viewing user with no data shows "0" counts (not null/undefined)
- [ ] Searching with special characters doesn't break search
- [ ] Extremely long announcement body is truncated or scrollable

**Test Steps:**
1. Delete all flagged receipts → verify section shows "No flagged receipts"
2. View brand new user (0 receipts, 0 lists)
3. Verify shows "0" for all counts
4. Search for user with special chars: "O'Brien"
5. Verify search works correctly

---

### Mobile Responsiveness Tests (if applicable)

#### Layout
- [ ] Tab bar is scrollable on small screens
- [ ] Cards stack vertically on narrow screens
- [ ] Modals fit within screen bounds
- [ ] Text is readable without zooming
- [ ] Buttons are large enough to tap (min 44x44)

**Test Steps:**
1. Open admin panel on phone
2. Verify all tabs accessible via horizontal scroll
3. Verify user detail modal fits on screen
4. Test all interactive elements are tappable

---

## 📋 Verification Checklist Summary

### Current Features (Must All Pass)
- [ ] **Overview Tab:** System health, analytics, revenue, audit logs
- [ ] **Users Tab:** Search, detail modal, toggle admin, extend trial, grant access, suspend
- [ ] **Receipts Tab:** Flagged receipts, delete, bulk approve, anomalies, recent
- [ ] **Catalog Tab:** Duplicate stores, merge stores, categories
- [ ] **Settings Tab:** Feature flags (toggle, create), announcements (create, toggle)

### Integration Tests
- [ ] **User Lifecycle:** Create → Activity → Subscribe → Suspend → Delete
- [ ] **Receipt Flow:** Upload → Process → Flag → Moderate → Delete
- [ ] **Subscription Flow:** Trial → Paid → Extend → Cancel
- [ ] **Audit Trail:** All actions logged with details
- [ ] **Feature Flags:** Create → Toggle → App reflects change
- [ ] **Announcements:** Create → Activate → App displays → Deactivate

### Performance & Security
- [ ] **Performance:** All queries <2s, pagination works, no full table scans
- [ ] **Security:** Non-admins blocked, admin flag persists, audit immutable
- [ ] **Error Handling:** Network errors handled, validation works, edge cases covered

### Testing Sign-Off
- [ ] All current features verified end-to-end
- [ ] All integration points tested
- [ ] Performance acceptable under load
- [ ] Security checks passed
- [ ] Error handling comprehensive
- [ ] Mobile responsive (if applicable)

**Sign-Off:** _________________________ Date: _____________

---

## 🚀 Getting Started

1. **Read `ADMIN-ANALYSIS-2025.md`** for full context
2. **Verify all current features work** - Complete "End-to-End Feature Verification" section above
3. **Start with Quick Wins** (easiest, fastest ROI)
4. **Complete Phase 1 before moving forward** (security is critical)
5. **Test each feature end-to-end** after implementation (use verification checklist)
6. **Commit after each checkpoint** (see checkpoint markers above)
7. **Update this file** as you go (check off completed items)

### Testing Protocol
- **Before starting new features:** Complete current feature verification (ensure baseline works)
- **After each Quick Win:** Run relevant verification tests
- **After each Phase:** Run full integration tests
- **Before production deploy:** Complete entire verification checklist + sign-off

---

**Last Updated:** 2025-02-25 (Added E2E verification section + hard-coded pricing fix)
**Next Review:** After completing current feature verification
