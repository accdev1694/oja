# Admin Dashboard Feature Completeness Analysis

**Date:** February 26, 2026
**Analyst:** Agent 5 - Feature Completeness Specialist
**Scope:** Oja Admin Dashboard vs. Industry Leaders (2025 Standards)

---

## Executive Summary

**Current State:** ⭐⭐⭐ (3/5 stars) - **Functional MVP**
**Target State:** ⭐⭐⭐⭐⭐ (5/5 stars) - **Industry-Leading**

**Critical Gaps:** 17 major missing features
**Redundant Features:** 3 areas of over-engineering
**Shallow Features:** 12 features that exist but lack depth

---

## 1. MISSING CRITICAL FEATURES (Industry Standard in 2025)

### 1.1 User Impersonation & Debugging Tools

**Status:** ⚠️ **PARTIALLY IMPLEMENTED (50%)**

**What Exists:**
- Backend mutation `generateImpersonationToken` (convex/impersonation.ts - not shown but referenced)
- UI trigger in admin.tsx line 596-604 (handleImpersonate)
- Token generation works

**What's Missing:**
- No actual impersonation session activation
- No secure one-click login as user
- No session recording/replay during impersonation
- No audit trail showing what admin did during impersonation
- No auto-logout after impersonation ends
- No visual indicator that you're impersonating

**Industry Benchmark:**
- **Stripe Dashboard:** One-click "Log in as customer" with 15-min auto-logout, full audit trail
- **Shopify Admin:** "View as customer" mode with warning banner, all actions logged
- **Intercom:** Customer context panel with live session replay

**User Story:**
> As a support admin, when I receive a ticket "My receipts aren't uploading", I want to log in as that user and reproduce the issue in their account context, so I can see exactly what they see and debug faster.

**Priority:** 🔴 **MUST-HAVE**
**Complexity:** ⚙️⚙️⚙️ **MEDIUM** (3-5 days)

**Implementation Notes:**
- Create `impersonationSessions` table (sessionId, adminId, targetUserId, startedAt, expiresAt, actions[])
- UI: Show floating warning banner "🔴 IMPERSONATING {userName} • Exit Impersonation"
- Auto-logout after 15 minutes
- All actions during impersonation logged to `adminLogs` with special `impersonation_action` type
- Add Convex middleware to inject impersonation context into auth

---

### 1.2 Real-Time Monitoring & Alerting

**Status:** ❌ **MISSING (10% exists)**

**What Exists:**
- Basic system health check (convex/admin.ts line 1231-1237) - STATIC, no real metrics
- Returns hardcoded `{ status: "healthy", successRate: 100 }` - NOT REAL DATA
- "Monitoring" tab exists (admin.tsx line 239) but shows skeleton data

**What's Missing:**
- No active monitoring of critical metrics
- No real-time alerts for issues
- No webhook notifications (Slack, email, SMS)
- No uptime tracking
- No error rate monitoring
- No performance degradation detection
- No automated incident creation

**Industry Benchmark:**
- **Vercel Dashboard:** Real-time error tracking, performance monitoring, automatic alerts
- **Stripe:** Webhook delivery monitoring, API error rate alerts, downtime notifications
- **Datadog/New Relic:** Full APM, anomaly detection, multi-channel alerting

**User Story:**
> As a platform admin, when receipt processing success rate drops below 90% or API latency exceeds 2s, I want to receive an immediate Slack alert with a link to the admin dashboard, so I can investigate and fix issues before users complain.

**Priority:** 🔴 **MUST-HAVE**
**Complexity:** ⚙️⚙️⚙️⚙️ **HIGH** (7-10 days)

**Implementation Approach:**
```typescript
// Convex scheduled function (runs every 5 minutes)
export const monitorSystemHealth = internalMutation({
  handler: async (ctx) => {
    const metrics = await computeRealMetrics(ctx);

    // Check thresholds
    if (metrics.receiptSuccessRate < 90) {
      await createAlert({
        severity: "high",
        type: "receipt_processing_degraded",
        message: `Receipt success rate: ${metrics.receiptSuccessRate}%`,
        threshold: 90,
        actual: metrics.receiptSuccessRate,
      });

      // Send Slack webhook
      await sendSlackAlert(metrics);
    }

    // Store metric snapshot
    await ctx.db.insert("slaMetrics", {
      metricType: "receipt_success_rate",
      value: metrics.receiptSuccessRate,
      status: metrics.receiptSuccessRate >= 95 ? "pass" : "fail",
      timestamp: Date.now(),
    });
  }
});
```

**Tables Needed:**
- `adminAlerts` (already exists - line 977)
- `slaMetrics` (already exists - line 982)
- `monitoringRules` (NEW) - Define alert rules and thresholds
- `notificationChannels` (NEW) - Slack webhooks, email addresses, SMS numbers

---

### 1.3 Cohort Analysis & Retention Curves

**Status:** ⚠️ **PARTIALLY IMPLEMENTED (30%)**

**What Exists:**
- `cohortMetrics` table defined (schema.ts, not shown but referenced in admin.ts line 772)
- Query `getCohortMetrics` (line 771-777)
- UI displays cohort retention table (admin.tsx line 983-1046)

**What's Missing:**
- **No data actually being computed** - table is likely empty
- No cohort creation logic (group users by signup week/month)
- No retention calculation (D1, D7, D14, D30, D60, D90)
- No cohort comparison (Q1 2026 vs Q4 2025)
- No behavioral cohorts (power users vs casual users)
- No LTV by cohort
- No churn prediction by cohort

**Industry Benchmark:**
- **Mixpanel:** Cohort builder with custom event-based cohorts, retention curves, LTV analysis
- **Amplitude:** Behavioral cohorts, cohort comparison, predictive analytics
- **Instacart Internal:** Cohort retention by acquisition channel, geographic cohorts, promotional cohorts

**User Story:**
> As a product manager, I want to compare the retention of users who signed up in January 2026 (with new onboarding) vs December 2025 (old onboarding), so I can measure the impact of our onboarding improvements.

**Priority:** 🟡 **SHOULD-HAVE**
**Complexity:** ⚙️⚙️⚙️⚙️ **HIGH** (5-7 days)

**Implementation Approach:**
```typescript
// Nightly cron job (12:00 AM UTC)
export const computeCohorts = internalMutation({
  handler: async (ctx) => {
    const weekStart = getWeekStart(Date.now());

    // Find all users who signed up this week
    const cohortUsers = await ctx.db
      .query("users")
      .withIndex("by_created")
      .filter(q => q.gte(q.field("createdAt"), weekStart))
      .collect();

    if (cohortUsers.length === 0) return;

    // Create cohort record
    const cohortId = await ctx.db.insert("cohortMetrics", {
      cohortWeek: formatWeek(weekStart),
      cohortDate: weekStart,
      totalUsers: cohortUsers.length,
      retentionD1: 0,
      retentionD7: 0,
      retentionD14: 0,
      retentionD30: 0,
      retentionD60: 0,
      retentionD90: 0,
      computedAt: Date.now(),
    });

    // Schedule retention calculations (run D+1, D+7, D+14, etc.)
    await scheduleRetentionCalculation(cohortId, cohortUsers.map(u => u._id));
  }
});
```

**Required Enhancements:**
- Add `funnelEvents` table population (currently empty)
- Track user activity events: login, list_created, receipt_scanned, etc.
- Retention definition: "active" = created a list or scanned a receipt in the period
- Add comparison UI: side-by-side cohort curves

---

### 1.4 Churn Prediction & Prevention

**Status:** ❌ **MISSING (5% exists)**

**What Exists:**
- `churnMetrics` table (referenced line 817)
- Query `getChurnMetrics` (line 817-821)
- Table likely empty

**What's Missing:**
- No churn definition (e.g., "no activity for 30 days")
- No churn scoring/prediction
- No at-risk user identification
- No win-back campaigns
- No churn reason collection
- No cancellation flow analytics

**Industry Benchmark:**
- **Netflix:** Predictive churn models, personalized win-back offers
- **Spotify:** Engagement-based churn prediction, targeted retention campaigns
- **SaaS Industry Standard:** Churn emails at 14/21/30 days inactive, exit surveys

**User Story:**
> As a growth lead, I want to see a list of users who haven't opened the app in 21+ days (high churn risk), so I can send them a personalized "We miss you" email with a special offer to re-engage.

**Priority:** 🟡 **SHOULD-HAVE**
**Complexity:** ⚙️⚙️⚙️ **MEDIUM** (4-6 days)

**Implementation:**
```typescript
export const identifyAtRiskUsers = query({
  handler: async (ctx) => {
    const now = Date.now();
    const risk21d = now - 21 * 24 * 60 * 60 * 1000;
    const risk30d = now - 30 * 24 * 60 * 60 * 1000;

    const atRisk = await ctx.db
      .query("users")
      .withIndex("by_last_active")
      .filter(q => q.lte(q.field("lastActiveAt"), risk21d))
      .collect();

    return atRisk.map(u => ({
      userId: u._id,
      name: u.name,
      email: u.email,
      lastActiveAt: u.lastActiveAt,
      daysSinceActive: Math.floor((now - u.lastActiveAt!) / (24*60*60*1000)),
      riskLevel: u.lastActiveAt! < risk30d ? "high" : "medium",
      subscriptionStatus: "...", // fetch from subscriptions
    }));
  }
});
```

---

### 1.5 Lifetime Value (LTV) Analysis

**Status:** ⚠️ **PARTIALLY IMPLEMENTED (20%)**

**What Exists:**
- `ltvMetrics` table (line 825)
- Query `getLTVMetrics` (line 825-829)
- Table likely has some data but no computed LTV

**What's Missing:**
- No per-user LTV calculation
- No LTV by acquisition channel
- No LTV:CAC ratio tracking
- No payback period analysis
- No LTV forecasting
- No segment-based LTV (power users vs casual)

**Industry Benchmark:**
- **Shopify:** Merchant LTV dashboard, LTV by plan tier, churn-adjusted LTV
- **Stripe:** Revenue waterfall, LTV cohort analysis, expansion revenue tracking
- **DoorDash:** Dasher/Merchant/Customer LTV separately, LTV by market

**User Story:**
> As a CFO, I want to know the average LTV of users acquired through Instagram ads vs Google ads, so I can optimize our marketing spend toward higher-LTV channels.

**Priority:** 🟡 **SHOULD-HAVE**
**Complexity:** ⚙️⚙️⚙️ **MEDIUM** (3-5 days)

**Implementation:**
```typescript
// Nightly computation
export const computeUserLTV = internalMutation({
  handler: async (ctx) => {
    const allUsers = await ctx.db.query("users").collect();

    for (const user of allUsers) {
      // Get all subscriptions
      const subs = await ctx.db
        .query("subscriptions")
        .withIndex("by_user", q => q.eq("userId", user._id))
        .collect();

      // Calculate total revenue
      const totalRevenue = subs.reduce((sum, sub) => {
        const months = getMonthsActive(sub);
        const monthlyPrice = sub.plan === "premium_monthly" ? 2.99 : 21.99/12;
        return sum + (months * monthlyPrice);
      }, 0);

      // Calculate LTV metrics
      const daysSinceSignup = (Date.now() - user.createdAt) / (24*60*60*1000);
      const ltv = totalRevenue;
      const ltvPerDay = ltv / daysSinceSignup;

      // Store or update
      await ctx.db.insert("ltvMetrics", {
        userId: user._id,
        ltv,
        ltvPerDay,
        totalRevenue,
        subscriptionMonths: subs.length,
        cohortWeek: getWeekStart(user.createdAt),
        computedAt: Date.now(),
      });
    }
  }
});
```

---

### 1.6 Advanced Search & Filtering

**Status:** ⚠️ **BASIC (40% coverage)**

**What Exists:**
- User search by name/email (admin.ts line 453-463)
- Receipt search (admin.ts line 1032-1088)
- Basic date range filtering

**What's Missing:**
- No multi-field search (name AND email AND location)
- No fuzzy matching
- No saved searches
- No search history
- No advanced filters (subscription status, LTV range, activity level)
- No bulk selection via search
- No export filtered results
- No search analytics (what admins search for)

**Industry Benchmark:**
- **Intercom:** Advanced user search with 20+ filters, boolean logic, saved segments
- **Stripe:** Multi-dimensional search (customer + subscription + payment method), search operators
- **Linear:** Type-ahead search with instant results, keyboard shortcuts

**User Story:**
> As a support admin, I want to search for "users who signed up in January 2026, have premium monthly subscription, last active >14 days ago, AND have scanned fewer than 5 receipts", so I can target them with a retention campaign.

**Priority:** 🟡 **SHOULD-HAVE**
**Complexity:** ⚙️⚙️⚙️⚙️ **HIGH** (5-7 days)

**Implementation:**
- Add `savedSearches` table
- Add query builder UI (filter chips, boolean operators)
- Backend: dynamic query construction based on filters
- Pagination + caching for large result sets

---

### 1.7 Support Ticket System Integration

**Status:** ⚠️ **PARTIALLY IMPLEMENTED (60%)**

**What Exists:**
- `supportTickets` table (schema.ts, referenced)
- Query `getAdminTickets` (admin.ts line 854-881)
- Query `getAdminSupportSummary` (line 883-901)
- Support tab in UI (admin.tsx line 238)

**What's Missing:**
- No ticket creation from admin panel
- No assignment workflow
- No SLA tracking (response time, resolution time)
- No ticket prioritization
- No canned responses
- No internal notes vs customer-facing notes
- No ticket merging/splitting
- No integration with email (tickets created from support@oja.app emails)

**Industry Benchmark:**
- **Zendesk:** Full ticketing system, SLA tracking, macros, triggers
- **Intercom:** Unified inbox, team assignment, smart routing, help center integration
- **Linear:** Issue tracking, team workflows, automation rules

**User Story:**
> As a support admin, when a user emails support@oja.app with "My receipt upload failed", I want a ticket auto-created in the admin dashboard, assigned to me, and linked to that user's account, so I can respond without switching tools.

**Priority:** 🟡 **SHOULD-HAVE**
**Complexity:** ⚙️⚙️⚙️⚙️ **HIGH** (7-10 days)

**Implementation:**
- Email webhook → Convex HTTP endpoint → create ticket
- Add ticket assignment logic (round-robin, skill-based)
- Add SLA timers (countdown to response deadline)
- Add ticket conversation thread (messages[] array)
- Add canned responses table

---

### 1.8 A/B Testing & Experimentation Platform

**Status:** ⚠️ **PARTIALLY IMPLEMENTED (30%)**

**What Exists:**
- `experiments` table (referenced)
- Query `getExperiments` (admin.ts line 996-1002)
- Mutation `createExperiment` (line 1728-1787) - DETAILED IMPLEMENTATION
- `experimentVariants` table
- Variant allocation logic

**What's Missing:**
- No user assignment to variants (no allocation happening)
- No goal tracking (conversions, revenue)
- No statistical significance calculation
- No experiment results dashboard
- No winner declaration
- No gradual rollout (10% → 50% → 100%)
- No multi-variate testing

**Industry Benchmark:**
- **Optimizely:** Full A/B testing platform, audience targeting, stats engine
- **LaunchDarkly:** Feature flags + experimentation, gradual rollouts
- **Google Optimize:** WYSIWYG editor, goals, auto-winner selection

**User Story:**
> As a product manager, I want to run an A/B test where 50% of new users see the new onboarding flow (variant A) and 50% see the old flow (variant B), track "completed onboarding" as the goal event, and automatically declare a winner when statistical significance is reached.

**Priority:** 🟢 **NICE-TO-HAVE**
**Complexity:** ⚙️⚙️⚙️⚙️⚙️ **VERY HIGH** (10-14 days)

**Implementation:**
```typescript
// Assign user to variant
export const getExperimentVariant = query({
  args: { userId: v.id("users"), experimentName: v.string() },
  handler: async (ctx, args) => {
    const experiment = await ctx.db
      .query("experiments")
      .filter(q => q.eq(q.field("name"), args.experimentName))
      .first();

    if (!experiment || experiment.status !== "running") {
      return null; // No active experiment
    }

    // Check if user already assigned
    const existing = await ctx.db
      .query("experimentAssignments")
      .withIndex("by_user_experiment", q =>
        q.eq("userId", args.userId).eq("experimentId", experiment._id)
      )
      .first();

    if (existing) return existing.variantName;

    // Assign to variant based on allocation percentages
    const variants = await ctx.db
      .query("experimentVariants")
      .withIndex("by_experiment", q => q.eq("experimentId", experiment._id))
      .collect();

    const variant = assignVariant(args.userId, variants); // Deterministic hash-based

    await ctx.db.insert("experimentAssignments", {
      userId: args.userId,
      experimentId: experiment._id,
      variantName: variant.variantName,
      assignedAt: Date.now(),
    });

    return variant.variantName;
  }
});
```

---

### 1.9 Revenue Analytics & Financial Dashboard

**Status:** ⚠️ **BASIC (50% coverage)**

**What Exists:**
- MRR/ARR calculation (admin.ts line 686-728)
- Revenue report (subscription counts, trial counts)
- Financial report with estimated tax/COGS/margin (line 731-769)

**What's Missing:**
- No revenue breakdown by plan (monthly vs annual contribution)
- No expansion revenue tracking (upgrades)
- No contraction revenue tracking (downgrades)
- No payment failure tracking
- No refund analytics
- No dunning management
- No revenue forecasting
- No cohort revenue analysis

**Industry Benchmark:**
- **Stripe Dashboard:** Complete revenue analytics, cohort revenue, churn revenue, expansion MRR
- **ChartMogul:** SaaS metrics dashboard, MRR movements, customer segmentation
- **Baremetrics:** Real-time MRR, LTV, churn, forecasting

**User Story:**
> As a CFO, I want to see a monthly revenue waterfall chart showing: starting MRR + new subscriptions + expansions - downgrades - churn = ending MRR, so I can understand what's driving revenue growth.

**Priority:** 🟡 **SHOULD-HAVE**
**Complexity:** ⚙️⚙️⚙️ **MEDIUM** (4-6 days)

**Implementation:**
- Add `revenueMovements` table (tracks MRR changes: new, expansion, contraction, churn)
- Stripe webhook handlers populate this table
- Dashboard shows waterfall chart

---

### 1.10 Bulk Operations & Batch Actions

**Status:** ⚠️ **LIMITED (30% coverage)**

**What Exists:**
- Bulk receipt delete/approve (admin.ts line 1177-1201)
- Bulk trial extension (line 930-964)
- Rate-limited (10 actions/min for sensitive operations)

**What's Missing:**
- No bulk user actions (suspend, grant access, change plan)
- No CSV import/export for bulk operations
- No dry-run mode (preview changes before applying)
- No undo/rollback
- No bulk operation history
- No scheduled bulk operations
- No progress tracking for long-running operations

**Industry Benchmark:**
- **Shopify Admin:** Bulk edit products, CSV import/export, progress bars
- **Stripe:** Bulk update subscriptions, dry-run mode, operation logs
- **Intercom:** Bulk send messages, segment targeting, scheduled sends

**User Story:**
> As a growth admin, I want to upload a CSV of 500 user emails, preview the changes (grant 30-day trial extension), see a confirmation modal showing "500 users will be affected", and track progress as the operation runs (250/500 completed), so I can safely execute large-scale retention campaigns.

**Priority:** 🟡 **SHOULD-HAVE**
**Complexity:** ⚙️⚙️⚙️⚙️ **HIGH** (5-7 days)

**Implementation:**
- Add `bulkOperations` table (operationId, type, status, progress, results)
- Background job queue for long-running operations
- Real-time progress updates via Convex reactive queries
- Rollback mechanism: store original values before changes

---

### 1.11 Activity Feed & User Timeline

**Status:** ⚠️ **PARTIALLY IMPLEMENTED (60%)**

**What Exists:**
- `activityEvents` table (referenced)
- Query `getUserTimeline` (admin.ts line 904-916)
- UI component `ActivityTimeline` (admin.tsx line 483-521)
- Event types: login, signup, first_list, first_receipt, etc.

**What's Missing:**
- No event recording (table likely empty - no insertions)
- No system events (password change, email verified, etc.)
- No cross-reference to related objects (e.g., which list was created)
- No filtering by event type
- No export timeline
- No anomaly detection (unusual activity patterns)

**Industry Benchmark:**
- **Stripe:** Full event log per customer, filterable, searchable, downloadable
- **Intercom:** Complete user timeline with all interactions (conversations, page views, events)
- **Auth0:** Security event timeline (logins, failed attempts, IP changes)

**User Story:**
> As a support admin investigating a user's issue, I want to see their complete activity timeline (signups, logins, lists created, receipts scanned, payments) in chronological order, so I can understand their user journey and identify where things went wrong.

**Priority:** 🟡 **SHOULD-HAVE**
**Complexity:** ⚙️⚙️ **LOW** (2-3 days)

**Implementation:**
```typescript
// Add event tracking throughout app
export const trackEvent = internalMutation({
  args: {
    userId: v.id("users"),
    eventType: v.string(),
    metadata: v.optional(v.any()),
  },
  handler: async (ctx, args) => {
    await ctx.db.insert("activityEvents", {
      userId: args.userId,
      eventType: args.eventType,
      metadata: args.metadata,
      timestamp: Date.now(),
    });
  }
});

// Call from various mutations:
// - createList → trackEvent({ userId, eventType: "list_created", metadata: { listId } })
// - uploadReceipt → trackEvent({ userId, eventType: "receipt_scanned", metadata: { receiptId } })
// - completeOnboarding → trackEvent({ userId, eventType: "onboarding_complete" })
```

---

### 1.12 Role-Based Access Control (RBAC)

**Status:** ✅ **IMPLEMENTED (90%)**

**What Exists:**
- `adminRoles` table (referenced)
- `userRoles` table (referenced)
- `rolePermissions` table (referenced)
- Permission check functions (admin.ts line 243-306)
- Query `getMyPermissions` (line 315-365)
- Granular permissions: view_analytics, edit_users, delete_receipts, etc.

**What's Missing:**
- No UI for creating custom roles
- No permission inheritance (role hierarchies)
- No temporary permission grants (time-limited access)
- No permission request workflow

**Industry Benchmark:**
- **Stripe:** Team roles with custom permissions, read-only vs full access
- **Shopify:** Staff permissions at page/feature level, time-limited access
- **AWS IAM:** Policy-based permissions, role assumption, temporary credentials

**User Story:**
> As a super admin, I want to create a "Support Tier 1" role with permissions [view_users, view_receipts] but NOT [edit_users, delete_receipts], and assign 3 team members to this role, so they can help users without accidentally breaking things.

**Priority:** 🟢 **NICE-TO-HAVE** (already 90% complete)
**Complexity:** ⚙️⚙️ **LOW** (2-3 days to add UI)

---

### 1.13 Data Export & Reporting

**Status:** ⚠️ **LIMITED (40% coverage)**

**What Exists:**
- CSV export action `exportDataToCSV` (admin.ts line 1573-1608)
- Export types: users, receipts, prices, analytics
- Basic CSV generation

**What's Missing:**
- No scheduled reports (weekly email with key metrics)
- No custom report builder
- No Excel export (.xlsx with formatting)
- No PDF reports
- No data warehouse integration (BigQuery, Snowflake)
- No chart/graph exports
- No report templates

**Industry Benchmark:**
- **Google Analytics:** Scheduled email reports, custom dashboards, PDF export
- **Stripe:** Custom report builder, scheduled exports to S3, Data Pipeline integration
- **Looker:** Self-service reporting, dashboard sharing, scheduled delivery

**User Story:**
> As a CEO, I want to receive a weekly email every Monday at 9 AM with a PDF report showing: total users, MRR growth, top 10 stores by GMV, and churn rate, so I can review business health without logging into the admin panel.

**Priority:** 🟢 **NICE-TO-HAVE**
**Complexity:** ⚙️⚙️⚙️ **MEDIUM** (4-5 days)

**Implementation:**
- Add report templates (JSON config defining metrics, charts, layout)
- Scheduled Convex cron job generates report
- Email via SendGrid/Resend
- PDF generation via Puppeteer/Playwright

---

### 1.14 Performance Optimization Tools

**Status:** ⚠️ **BASIC (30% coverage)**

**What Exists:**
- Performance logging wrapper `measureQueryPerformance` (admin.ts line 27-44)
- Warns if query >1000ms
- Basic query caching (line 5-22)

**What's Missing:**
- No slow query dashboard
- No index usage analysis
- No N+1 query detection
- No performance regression tracking
- No automated index suggestions
- No query explain plans

**Industry Benchmark:**
- **Datadog APM:** Query performance tracking, slow query alerts, index recommendations
- **MongoDB Atlas:** Performance Advisor, index suggestions, query profiling
- **Postgres:** pg_stat_statements for query analysis

**User Story:**
> As a platform engineer, I want to see a dashboard of the slowest admin queries in the last 24 hours, with execution time, frequency, and suggested indexes, so I can optimize database performance.

**Priority:** 🟢 **NICE-TO-HAVE**
**Complexity:** ⚙️⚙️⚙️ **MEDIUM** (3-5 days)

---

### 1.15 Changelog & Release Notes

**Status:** ❌ **MISSING**

**What Exists:**
- Nothing

**What's Missing:**
- No changelog for admin dashboard updates
- No release notes for new features
- No version tracking
- No "What's New" modal

**Industry Benchmark:**
- **Linear:** In-app changelog, version history, feature announcements
- **Notion:** "What's New" modal on login, detailed changelog
- **Stripe:** Dashboard changelog with search and filters

**User Story:**
> As an admin, when I log into the dashboard and see a new "Analytics" tab that wasn't there yesterday, I want to click a "What's New" badge and see release notes explaining the new features, so I'm not confused by UI changes.

**Priority:** 🟢 **NICE-TO-HAVE**
**Complexity:** ⚙️ **VERY LOW** (1-2 days)

---

### 1.16 IP Whitelisting & Security Controls

**Status:** ❌ **MISSING**

**What Exists:**
- Admin session tracking (line 378-439)
- IP address logged (line 381, 400)

**What's Missing:**
- No IP whitelisting
- No MFA (multi-factor authentication)
- No session timeouts
- No concurrent session limits
- No IP-based access blocking
- No VPN requirement

**Industry Benchmark:**
- **Stripe:** MFA required, IP whitelist, session limits
- **AWS Console:** MFA, temporary credentials, IP restrictions
- **Auth0:** Context-aware security, anomaly detection

**User Story:**
> As a security admin, I want to require MFA for all admin logins and restrict admin access to our office IP range (203.0.113.0/24), so unauthorized users can't access sensitive data even if they steal credentials.

**Priority:** 🔴 **MUST-HAVE** (for compliance)
**Complexity:** ⚙️⚙️⚙️⚙️ **HIGH** (5-7 days)

---

### 1.17 Webhook Management

**Status:** ❌ **MISSING**

**What Exists:**
- Incoming webhooks from Stripe (convex/http.ts)

**What's Missing:**
- No outgoing webhooks (admin events → external systems)
- No webhook configuration UI
- No webhook logs/debugging
- No retry logic visibility
- No webhook signature verification

**Industry Benchmark:**
- **Stripe:** Webhook dashboard, retry logs, test mode, signature verification
- **Shopify:** Webhook configuration UI, delivery status, payload inspector
- **GitHub:** Webhook delivery logs, redeliver failed webhooks

**User Story:**
> As an integration admin, I want to configure a webhook that sends a POST to our CRM (https://crm.oja.app/webhook) whenever a user upgrades to premium, so our sales team is notified automatically.

**Priority:** 🟢 **NICE-TO-HAVE**
**Complexity:** ⚙️⚙️⚙️ **MEDIUM** (4-5 days)

---

## 2. REDUNDANT FEATURES (Over-Engineering)

### 2.1 Dual Authentication Paths (Legacy + RBAC)

**Location:** convex/admin.ts line 98-124

**Problem:**
- Both `isAdmin` flag (legacy) AND RBAC system coexist
- `requireAdmin()` checks both systems
- Confusion about which system is authoritative
- Maintenance burden

**Recommendation:**
- ⚠️ **Migrate all users from isAdmin flag to RBAC**
- Remove `isAdmin` field after migration
- Simplify auth checks to RBAC only

**Impact:** 🟡 **MEDIUM** - Code complexity, security confusion

---

### 2.2 Multiple GMV Filters on Overview Tab

**Location:** admin.tsx line 265, 372-398

**Problem:**
- GMV displayed with 4 filter options (week/month/year/lifetime)
- Analytics query already returns all 4 values
- User can't compare periods (only see one at a time)
- UI complexity

**Recommendation:**
- Show all 4 GMV values side-by-side (no filter needed)
- Add sparkline trends for visual comparison

**Impact:** 🟢 **LOW** - Minor UX improvement

---

### 2.3 Separate Date Range Filtering Per Tab

**Location:** admin.tsx line 264 (Overview), line 1032 (Receipts)

**Problem:**
- Date range picker exists but resets when switching tabs
- No global date range context
- User has to re-select dates on each tab

**Recommendation:**
- Create global `DateRangeContext` that persists across tabs
- One date picker affects all tabs

**Impact:** 🟢 **LOW** - UX consistency

---

## 3. SHALLOW FEATURES (Exist But Lack Depth)

### 3.1 User Detail Modal

**Current State:** admin.tsx line 710-822

**Depth Assessment:** ⭐⭐⭐ (3/5 stars)

**What's Good:**
- Basic user info (name, email)
- Receipt/list/spent counts
- Admin actions (extend trial, grant access, suspend)
- User tagging (line 729-748)
- Activity timeline tab (line 751-819)
- Impersonation link (line 719-721)

**What's Missing:**
- No subscription history (when subscribed, when canceled, plan changes)
- No payment history (invoices, payment methods)
- No device info (iOS/Android, app version, last login)
- No location data (country, region, timezone)
- No referral source (how did they sign up)
- No customer health score
- No related users (referrals, family sharing)

**Industry Benchmark:**
- **Stripe Customer Detail:** Complete payment history, subscriptions, invoices, payment methods, tax IDs, metadata
- **Intercom User Profile:** 360° view - conversations, events, attributes, tags, segments, notes
- **Shopify Customer Detail:** Orders, addresses, lifetime value, tags, notes, timeline

**Depth Goal:** ⭐⭐⭐⭐⭐ (5/5 stars)

**Improvement Plan:**
1. Add subscription timeline (visual timeline of plan changes)
2. Add payment method cards (last 4 digits, expiration)
3. Add device info section
4. Add customer notes (internal admin notes)
5. Add related receipts preview (top 5 recent)
6. Add health score calculation (engagement + payment + support tickets)

**Complexity:** ⚙️⚙️⚙️ **MEDIUM** (3-4 days)

---

### 3.2 Receipt Moderation

**Current State:** admin.tsx line 1273-1492

**Depth Assessment:** ⭐⭐⭐ (3/5 stars)

**What's Good:**
- Flagged receipts query (failed processing or $0 total)
- Bulk approve/delete
- Price anomaly detection (>50% deviation)
- Recent receipts view with search
- Date range filtering
- Status filtering

**What's Missing:**
- No receipt image preview in list view
- No OCR confidence scores shown
- No item-level editing (fix wrong price/quantity inline)
- No duplicate detection (same receipt uploaded twice)
- No quality score visualization
- No AI reprocessing (retry failed OCR)
- No community reporting (users flag bad data)

**Industry Benchmark:**
- **Instacart Internal:** Receipt review queue, image zoom, item corrections, fraud detection
- **Uber Eats:** Receipt verification, price matching, dispute resolution
- **Expensify:** Receipt approval workflow, policy violations, merchant matching

**Depth Goal:** ⭐⭐⭐⭐⭐ (5/5 stars)

**Improvement Plan:**
1. Add receipt image thumbnails in list (click to fullscreen modal)
2. Add OCR confidence badge (green >90%, yellow 70-90%, red <70%)
3. Add inline item editor (spreadsheet-style grid)
4. Add duplicate detection algorithm (fingerprint matching)
5. Add "Reprocess Receipt" button (re-run OCR)
6. Add quality scoring (image clarity, completeness, accuracy)

**Complexity:** ⚙️⚙️⚙️⚙️ **HIGH** (5-7 days)

---

### 3.3 Store Catalog Management

**Current State:** admin.tsx line 1494-1656

**Depth Assessment:** ⭐⭐⭐ (3/5 stars)

**What's Good:**
- Duplicate store detection (case variants)
- Store name merging (consolidates duplicates)
- Category inventory (pantry categories + counts)

**What's Missing:**
- No store CRUD (create, edit, delete stores)
- No store metadata (logo, colors, brand colors already defined in stores.ts but not editable)
- No store status (active/inactive)
- No regional variants (Tesco UK vs Tesco Ireland)
- No store hierarchy (Tesco > Tesco Express > Tesco Metro)
- No product catalog management
- No price catalog upload (bulk import store prices)

**Industry Benchmark:**
- **Instacart Admin:** Store catalog management, product matching, price updates
- **Shopify Admin:** Product catalog, variants, collections, inventory
- **DoorDash Merchant Portal:** Menu management, pricing, availability

**Depth Goal:** ⭐⭐⭐⭐ (4/5 stars)

**Improvement Plan:**
1. Add store CRUD UI (create new store, edit existing)
2. Add store metadata fields (logo URL, brand color override)
3. Add store hierarchy (parent store dropdown)
4. Add bulk price import (CSV upload: item, store, price)
5. Add store status toggle (active/inactive affects price matching)

**Complexity:** ⚙️⚙️⚙️ **MEDIUM** (4-5 days)

---

### 3.4 Feature Flags

**Current State:** admin.tsx line 1658-1756

**Depth Assessment:** ⭐⭐⭐ (3/5 stars)

**What's Good:**
- List all feature flags
- Toggle on/off
- Create new flags
- Last updated by + timestamp

**What's Missing:**
- No percentage rollouts (enable for 10% of users)
- No user targeting (enable for specific user IDs)
- No environment separation (dev/staging/prod flags)
- No flag history/audit trail
- No flag dependencies (flag A requires flag B)
- No scheduled flag changes (auto-enable at specific time)
- No A/B test integration

**Industry Benchmark:**
- **LaunchDarkly:** Percentage rollouts, user targeting, flag scheduling, environments
- **Unleash:** Strategy-based targeting, gradual rollouts, metrics integration
- **Split.io:** Feature flags + A/B testing combined

**Depth Goal:** ⭐⭐⭐⭐⭐ (5/5 stars)

**Improvement Plan:**
1. Add percentage rollout slider (0-100%)
2. Add user targeting (comma-separated user IDs)
3. Add flag scheduling (enable at specific date/time)
4. Add flag change history (who changed, when, old→new value)
5. Add flag dependencies (requires other flags)

**Complexity:** ⚙️⚙️⚙️⚙️ **HIGH** (5-6 days)

---

### 3.5 Announcements

**Current State:** admin.tsx line 1758-1867

**Depth Assessment:** ⭐⭐⭐ (3/5 stars)

**What's Good:**
- Create announcements
- Edit announcements (line 1809-1845)
- Toggle active/inactive
- Type selection (info/warning/promo)
- Title + body + type

**What's Missing:**
- No scheduling (start date, end date)
- No targeting (show only to specific user segments)
- No impression tracking (how many users saw it)
- No click tracking (how many clicked CTA)
- No rich text formatting
- No preview mode
- No localization (multiple languages)

**Industry Benchmark:**
- **Intercom:** Targeted in-app messages, scheduling, A/B testing, analytics
- **ProductBoard:** Feature announcements, user segmentation, engagement tracking
- **Beamer:** Changelog + announcements, reactions, comments

**Depth Goal:** ⭐⭐⭐⭐ (4/5 stars)

**Improvement Plan:**
1. Add scheduling fields (startsAt, endsAt) - ALREADY EXISTS in schema.ts but not in UI
2. Add user targeting (segment dropdown: all users, premium only, free tier, etc.)
3. Add impression/click counters
4. Add rich text editor (bold, links, bullet points)
5. Add preview mode (see how it looks before publishing)

**Complexity:** ⚙️⚙️⚙️ **MEDIUM** (3-4 days)

---

### 3.6 Pricing Config

**Current State:** admin.tsx line 1869-1931

**Depth Assessment:** ⭐⭐ (2/5 stars)

**What's Good:**
- Dynamic pricing (not hard-coded)
- Update price mutation (line 1423-1461 in admin.ts)
- Validation (£0 < price ≤ £10,000)

**What's Missing:**
- No UI for pricing config (mutation exists but no UI to call it)
- No price history (when did we change from £2.99 to £3.49)
- No A/B price testing
- No regional pricing (UK vs Ireland)
- No promotional pricing (limited-time discounts)
- No coupon management
- No referral credits

**Industry Benchmark:**
- **Stripe:** Price management, coupons, promotions, regional pricing
- **Shopify:** Discount codes, automatic discounts, price rules
- **Paddle:** Localized pricing, tax handling, coupon management

**Depth Goal:** ⭐⭐⭐⭐ (4/5 stars)

**Improvement Plan:**
1. Add pricing config UI (Settings tab)
2. Add price change history table
3. Add coupon/promo code management
4. Add regional pricing (currency + tax handling)
5. Add pricing experiments (test £2.99 vs £3.49)

**Complexity:** ⚙️⚙️⚙️ **MEDIUM** (4-5 days)

---

### 3.7 Audit Logs

**Current State:** admin.tsx line 446-472

**Depth Assessment:** ⭐⭐⭐⭐ (4/5 stars)

**What's Good:**
- Comprehensive logging (all admin actions)
- Pagination (load more)
- Date range filtering
- Shows admin name, action, details, timestamp
- Indexed for performance

**What's Missing:**
- No filtering by action type
- No filtering by admin user
- No export audit logs
- No search
- No retention policy (logs forever?)

**Industry Benchmark:**
- **AWS CloudTrail:** Complete audit trail, search, download, retention policies
- **Auth0 Logs:** Search, filter by event type, export
- **Stripe Logs:** Event history with filters, search, download

**Depth Goal:** ⭐⭐⭐⭐⭐ (5/5 stars)

**Improvement Plan:**
1. Add action type filter dropdown
2. Add admin user filter dropdown
3. Add search bar (search by details text)
4. Add CSV export
5. Add retention policy (archive logs >90 days)

**Complexity:** ⚙️⚙️ **LOW** (2-3 days)

---

### 3.8 System Health

**Current State:** admin.tsx line 336-352

**Depth Assessment:** ⭐ (1/5 stars) - **FAKE DATA**

**What's Good:**
- Health indicator (green/yellow/red dot)

**What's BAD:**
- **Returns HARDCODED data** (admin.ts line 1231-1237)
- Always shows "healthy", 100% success rate, 0 failed
- Not real monitoring

**What's Missing:**
- Real receipt processing metrics
- Real error rates
- Real latency monitoring
- Database health
- API health
- Third-party service health (Stripe, Clerk, OpenAI)

**Industry Benchmark:**
- **Datadog:** Real-time service health, uptime monitoring, alert history
- **AWS CloudWatch:** Metrics, dashboards, alarms
- **Vercel:** Deployment status, edge network health, incident history

**Depth Goal:** ⭐⭐⭐⭐⭐ (5/5 stars)

**Improvement Plan:**
1. **URGENT:** Replace fake health check with real metrics
2. Add receipt processing success rate (failed / total)
3. Add API latency (p50, p95, p99)
4. Add error rate (errors / requests)
5. Add third-party service status checks
6. Add uptime percentage (99.9% target)

**Complexity:** ⚙️⚙️⚙️⚙️ **HIGH** (5-7 days)

---

### 3.9 Analytics Tab

**Current State:** admin.tsx line 892-1070

**Depth Assessment:** ⭐⭐⭐ (3/5 stars)

**What's Good:**
- Funnel analytics visualization
- User segments summary
- Cohort retention table
- Export buttons

**What's Missing:**
- **Most tables are EMPTY** (cohortMetrics, funnelEvents, churnMetrics, ltvMetrics, userSegments - no data population)
- No time series charts (trend over time)
- No comparisons (this month vs last month)
- No drill-down (click a segment to see users)
- No custom date ranges
- No saved views

**Industry Benchmark:**
- **Mixpanel:** Complete analytics suite, cohorts, funnels, retention, custom reports
- **Amplitude:** Behavioral analytics, user journeys, predictive analytics
- **Google Analytics:** Comprehensive dashboards, custom reports, real-time data

**Depth Goal:** ⭐⭐⭐⭐⭐ (5/5 stars)

**Improvement Plan:**
1. **CRITICAL:** Populate empty analytics tables (add event tracking throughout app)
2. Add time series charts (Chart.js or Recharts)
3. Add comparison mode (period-over-period)
4. Add drill-down links
5. Add custom date range selector
6. Add dashboard templates

**Complexity:** ⚙️⚙️⚙️⚙️⚙️ **VERY HIGH** (10-14 days)

---

### 3.10 Support Tab

**Current State:** admin.tsx line 1072-1184

**Depth Assessment:** ⭐⭐⭐ (3/5 stars)

**What's Good:**
- Ticket list with status filtering
- Support summary (open/in_progress/resolved counts)
- User info shown (name, email)

**What's Missing:**
- No ticket detail view
- No reply to ticket
- No assignment
- No SLA timers
- No priority levels
- No internal notes
- No ticket creation from admin

**Industry Benchmark:**
- **Zendesk:** Full ticketing system
- **Intercom:** Unified inbox, conversations, macros
- **Freshdesk:** Ticket management, SLA tracking, automation

**Depth Goal:** ⭐⭐⭐⭐⭐ (5/5 stars)

**Improvement Plan:**
1. Add ticket detail modal (conversation thread)
2. Add reply UI (text input + send)
3. Add assignment dropdown
4. Add SLA countdown timer
5. Add priority dropdown (low/medium/high/urgent)
6. Add internal notes section
7. Add create ticket button

**Complexity:** ⚙️⚙️⚙️⚙️ **HIGH** (6-8 days)

---

### 3.11 Monitoring Tab

**Current State:** admin.tsx line 1186-1271

**Depth Assessment:** ⭐⭐ (2/5 stars)

**What's Good:**
- Alert list (active alerts)
- SLA status indicator
- Resolve alert button

**What's Missing:**
- **Alerts table is likely EMPTY** (no alert creation logic exists)
- No alert configuration
- No notification channels (email, Slack, SMS)
- No metric dashboards
- No uptime history
- No incident management

**Industry Benchmark:**
- **PagerDuty:** Incident management, on-call scheduling, escalation policies
- **Datadog:** Monitoring + alerting, dashboards, anomaly detection
- **Sentry:** Error tracking, release tracking, performance monitoring

**Depth Goal:** ⭐⭐⭐⭐⭐ (5/5 stars)

**Improvement Plan:**
1. **CRITICAL:** Add alert creation logic (scheduled job checks thresholds)
2. Add alert rules UI (configure thresholds)
3. Add notification channels (Slack webhook, email)
4. Add metric dashboards (Charts showing key metrics over time)
5. Add incident timeline
6. Add on-call scheduling

**Complexity:** ⚙️⚙️⚙️⚙️⚙️ **VERY HIGH** (10-14 days)

---

### 3.12 Admin Sessions

**Current State:** admin.ts line 378-439

**Depth Assessment:** ⭐⭐⭐⭐ (4/5 stars)

**What's Good:**
- Session tracking (login, logout, last seen)
- Active sessions query
- Force logout capability
- IP + user agent logging
- Heartbeat mechanism (5-min intervals)

**What's Missing:**
- No session timeout (should auto-expire after 8 hours)
- No concurrent session limits
- No session history (past sessions)
- No geographic location (IP → city/country)
- No device fingerprinting

**Industry Benchmark:**
- **Auth0:** Session management, device tracking, suspicious activity detection
- **Okta:** Session policies, timeout settings, concurrent session limits
- **Google Workspace:** Active sessions, device management, remote logout

**Depth Goal:** ⭐⭐⭐⭐⭐ (5/5 stars)

**Improvement Plan:**
1. Add session timeout (expire after 8 hours inactive)
2. Add concurrent session limit (max 3 active sessions)
3. Add session history table (past 30 days)
4. Add IP geolocation (use ipapi.co or similar)
5. Add device fingerprinting (browser, OS, screen size)

**Complexity:** ⚙️⚙️⚙️ **MEDIUM** (3-4 days)

---

## 4. FEATURE COMPARISON MATRIX

| Feature | Oja (Current) | Stripe | Shopify | Linear | Instacart | Priority |
|---------|---------------|--------|---------|--------|-----------|----------|
| **User Management** | ⭐⭐⭐ 60% | ⭐⭐⭐⭐⭐ | ⭐⭐⭐⭐⭐ | ⭐⭐⭐⭐ | ⭐⭐⭐⭐⭐ | 🔴 MUST |
| User Search | ✅ Basic | ✅ Advanced | ✅ Advanced | ✅ Fuzzy | ✅ Advanced | 🟡 SHOULD |
| User Detail | ⭐⭐⭐ 60% | ⭐⭐⭐⭐⭐ | ⭐⭐⭐⭐⭐ | ⭐⭐⭐⭐ | ⭐⭐⭐⭐⭐ | 🟡 SHOULD |
| Impersonation | ⚠️ Token only | ✅ Full | ✅ Full | ❌ N/A | ✅ Full | 🔴 MUST |
| Bulk Actions | ⭐⭐ 30% | ⭐⭐⭐⭐ | ⭐⭐⭐⭐⭐ | ⭐⭐⭐⭐ | ⭐⭐⭐⭐ | 🟡 SHOULD |
| User Tags | ✅ Basic | ✅ Advanced | ✅ Advanced | ✅ Labels | ✅ Segments | 🟢 NICE |
| **Analytics** | ⭐⭐ 30% | ⭐⭐⭐⭐⭐ | ⭐⭐⭐⭐ | ⭐⭐⭐ | ⭐⭐⭐⭐⭐ | 🔴 MUST |
| Basic Metrics | ✅ Good | ✅ | ✅ | ✅ | ✅ | ✅ DONE |
| Cohort Analysis | ❌ No data | ✅ Full | ✅ Full | ❌ N/A | ✅ Full | 🟡 SHOULD |
| Funnel Analytics | ❌ No data | ✅ Full | ✅ Full | ❌ N/A | ✅ Full | 🟡 SHOULD |
| Retention Curves | ❌ No data | ✅ Full | ✅ Full | ❌ N/A | ✅ Full | 🟡 SHOULD |
| LTV Analysis | ❌ No data | ✅ Full | ✅ Full | ❌ N/A | ✅ Full | 🟡 SHOULD |
| Churn Prediction | ❌ Missing | ✅ Full | ✅ Full | ❌ N/A | ✅ Full | 🟡 SHOULD |
| Custom Reports | ❌ Missing | ✅ Full | ✅ Full | ✅ Insights | ✅ Full | 🟢 NICE |
| **Revenue** | ⭐⭐⭐ 50% | ⭐⭐⭐⭐⭐ | ⭐⭐⭐⭐⭐ | ❌ N/A | ⭐⭐⭐⭐⭐ | 🔴 MUST |
| MRR/ARR | ✅ Basic | ✅ Full | ✅ Full | ❌ N/A | ✅ Full | ✅ DONE |
| Revenue Breakdown | ❌ Missing | ✅ Full | ✅ Full | ❌ N/A | ✅ Full | 🟡 SHOULD |
| Expansion/Churn | ❌ Missing | ✅ Full | ✅ Full | ❌ N/A | ✅ Full | 🟡 SHOULD |
| Refund Analytics | ❌ Missing | ✅ Full | ✅ Full | ❌ N/A | ✅ Full | 🟢 NICE |
| Forecasting | ❌ Missing | ✅ Full | ✅ Full | ❌ N/A | ✅ Full | 🟢 NICE |
| **Support** | ⭐⭐⭐ 60% | ⭐⭐⭐⭐ | ⭐⭐⭐⭐ | ⭐⭐⭐⭐⭐ | ⭐⭐⭐⭐ | 🔴 MUST |
| Ticket System | ⚠️ List only | ✅ Full | ✅ Full | ✅ Full | ✅ Full | 🟡 SHOULD |
| Assignment | ❌ Missing | ✅ | ✅ | ✅ | ✅ | 🟡 SHOULD |
| SLA Tracking | ❌ Missing | ✅ | ✅ | ✅ SLA | ✅ | 🟡 SHOULD |
| Activity Timeline | ✅ Good | ✅ Full | ✅ Full | ✅ Full | ✅ Full | ✅ DONE |
| **Monitoring** | ⭐ 10% | ⭐⭐⭐⭐⭐ | ⭐⭐⭐⭐ | ⭐⭐⭐⭐ | ⭐⭐⭐⭐⭐ | 🔴 MUST |
| Real-time Alerts | ❌ Fake | ✅ Full | ✅ Full | ❌ N/A | ✅ Full | 🔴 MUST |
| Health Checks | ❌ Hardcoded | ✅ Real | ✅ Real | ✅ Status | ✅ Real | 🔴 MUST |
| Performance Metrics | ⚠️ Logs only | ✅ Full APM | ✅ Full | ✅ Full | ✅ Full | 🟡 SHOULD |
| Incident Mgmt | ❌ Missing | ✅ | ✅ | ✅ Full | ✅ | 🟢 NICE |
| **Security** | ⭐⭐⭐⭐ 70% | ⭐⭐⭐⭐⭐ | ⭐⭐⭐⭐⭐ | ⭐⭐⭐⭐⭐ | ⭐⭐⭐⭐⭐ | 🔴 MUST |
| RBAC | ✅ Good | ✅ Full | ✅ Full | ✅ Full | ✅ Full | ✅ DONE |
| MFA | ❌ Missing | ✅ | ✅ | ✅ | ✅ | 🔴 MUST |
| IP Whitelisting | ❌ Missing | ✅ | ✅ | ✅ | ✅ | 🔴 MUST |
| Session Mgmt | ✅ Good | ✅ Full | ✅ Full | ✅ Full | ✅ Full | ✅ DONE |
| Audit Logs | ✅ Good | ✅ Full | ✅ Full | ✅ Full | ✅ Full | ✅ DONE |
| **Feature Flags** | ⭐⭐⭐ 60% | ⭐⭐⭐⭐⭐ | ⭐⭐⭐⭐ | ⭐⭐⭐ | ⭐⭐⭐⭐⭐ | 🟡 SHOULD |
| Toggle Flags | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ DONE |
| Percentage Rollout | ❌ Missing | ✅ | ✅ | ❌ | ✅ | 🟡 SHOULD |
| User Targeting | ❌ Missing | ✅ | ✅ | ❌ | ✅ | 🟡 SHOULD |
| A/B Testing | ⚠️ Shell | ✅ Full | ✅ Full | ❌ | ✅ Full | 🟢 NICE |
| **Data Export** | ⭐⭐ 40% | ⭐⭐⭐⭐⭐ | ⭐⭐⭐⭐⭐ | ⭐⭐⭐⭐ | ⭐⭐⭐⭐⭐ | 🟡 SHOULD |
| CSV Export | ✅ Basic | ✅ Full | ✅ Full | ✅ | ✅ Full | ✅ DONE |
| Scheduled Reports | ❌ Missing | ✅ | ✅ | ❌ | ✅ | 🟢 NICE |
| API Access | ❌ Missing | ✅ Full | ✅ Full | ✅ GraphQL | ✅ API | 🟢 NICE |

---

## 5. PRIORITY CLASSIFICATION

### 🔴 MUST-HAVE (13 features)

**Critical for production readiness, compliance, or competitive parity**

1. **User Impersonation** - Complete the partially-built feature
2. **Real-time Monitoring & Alerting** - Replace fake health checks
3. **MFA + IP Whitelisting** - Security compliance
4. **Cohort Analysis (Data Population)** - Fix empty tables
5. **Funnel Analytics (Data Population)** - Fix empty tables
6. **LTV Analysis (Data Population)** - Fix empty tables
7. **Receipt Moderation (Image Preview)** - Core workflow improvement
8. **System Health (Real Metrics)** - Replace hardcoded data
9. **Support Ticket Detail View** - Complete half-built feature
10. **Monitoring Alerts (Creation Logic)** - Fix empty alerts table
11. **Churn Prediction** - Retention is critical for SaaS
12. **Revenue Breakdown** - Financial transparency
13. **Activity Timeline (Event Recording)** - Fix empty events table

---

### 🟡 SHOULD-HAVE (12 features)

**High impact, clear ROI, competitive advantage**

1. **Advanced Search & Filtering** - Admin productivity
2. **Support Ticket Assignment + SLA** - Team workflows
3. **Bulk Operations (CSV Import)** - Scalability
4. **Revenue Analytics (Expansion/Churn)** - SaaS metrics
5. **Feature Flags (Percentage Rollout)** - Gradual releases
6. **Announcements (Scheduling + Targeting)** - User engagement
7. **Pricing Config UI** - Dynamic pricing control
8. **Audit Logs (Filtering + Export)** - Compliance
9. **Receipt Moderation (Inline Editing)** - Data quality
10. **Store Catalog (CRUD + Metadata)** - Data normalization
11. **User Detail (Subscription History)** - 360° view
12. **Admin Sessions (Timeout + History)** - Security hardening

---

### 🟢 NICE-TO-HAVE (9 features)

**Polish, convenience, advanced use cases**

1. **A/B Testing Platform** - Experimentation culture
2. **Webhook Management** - Integration flexibility
3. **Scheduled Reports** - Executive convenience
4. **Changelog & Release Notes** - Admin UX
5. **Custom Report Builder** - Self-service analytics
6. **Performance Optimization Tools** - Engineering efficiency
7. **RBAC UI (Custom Roles)** - Team management (already 90% done)
8. **Refund Analytics** - Edge case tracking
9. **Incident Management** - Advanced ops

---

## 6. IMPLEMENTATION ROADMAP

### Phase 1: Fix Empty Tables & Fake Data (Week 1-2)

**Goal:** Make existing features work with real data

1. ✅ Add event tracking throughout app → populate `funnelEvents`, `activityEvents`
2. ✅ Add nightly cohort computation → populate `cohortMetrics`
3. ✅ Add LTV calculation → populate `ltvMetrics`
4. ✅ Add churn detection → populate `churnMetrics`
5. ✅ Add segment assignment → populate `userSegments`
6. ✅ Replace fake health check with real receipt metrics
7. ✅ Add alert creation logic (scheduled checks)

**Impact:** Analytics tab goes from 30% → 80% complete

---

### Phase 2: Complete Half-Built Features (Week 3-4)

**Goal:** Finish features that have backend but missing UI or vice versa

1. ✅ Complete user impersonation (session activation + UI)
2. ✅ Add pricing config UI
3. ✅ Add support ticket detail view
4. ✅ Add receipt image preview
5. ✅ Complete A/B testing (user assignment + goal tracking)

**Impact:** 5 features go from 30-60% → 100%

---

### Phase 3: Security & Compliance (Week 5-6)

**Goal:** Production-ready security hardening

1. ✅ Add MFA (multi-factor authentication)
2. ✅ Add IP whitelisting
3. ✅ Add session timeouts
4. ✅ Add concurrent session limits
5. ✅ Add security audit report

**Impact:** Security score goes from 70% → 95%

---

### Phase 4: Admin Productivity (Week 7-8)

**Goal:** Make admins 10x faster

1. ✅ Advanced search & filtering
2. ✅ Bulk operations (CSV import)
3. ✅ Scheduled reports
4. ✅ Audit log filtering + export
5. ✅ Saved searches

**Impact:** Admin efficiency +300%

---

### Phase 5: Revenue & Growth (Week 9-10)

**Goal:** Business intelligence for leadership

1. ✅ Revenue breakdown (expansion/contraction)
2. ✅ Churn prediction dashboard
3. ✅ LTV:CAC ratio tracking
4. ✅ Forecasting models
5. ✅ Executive dashboard (CEO view)

**Impact:** Strategic decision-making improved

---

### Phase 6: Polish & Scale (Week 11-12)

**Goal:** Delightful admin experience

1. ✅ Changelog & release notes
2. ✅ Performance optimization tools
3. ✅ Webhook management
4. ✅ Custom report builder
5. ✅ Incident management

**Impact:** Industry-leading admin dashboard

---

## 7. COMPETITIVE POSITIONING (2025 Standards)

### Current Maturity: ⭐⭐⭐ (3/5 stars) - "Functional MVP"

**Strengths:**
- Solid RBAC foundation
- Good audit logging
- Rate limiting implemented
- Basic analytics coverage
- Clean UI (Glass design system)

**Weaknesses:**
- Empty analytics tables (no data population)
- Fake monitoring (hardcoded health checks)
- Missing critical security (MFA, IP whitelisting)
- Shallow feature depth (many half-built features)
- No real-time alerting

---

### Target Maturity: ⭐⭐⭐⭐⭐ (5/5 stars) - "Industry-Leading"

**To Achieve:**
- Real-time monitoring with multi-channel alerts
- Complete user lifecycle visibility (impersonation, timeline, tags)
- Advanced analytics (cohorts, funnels, LTV, churn prediction)
- Self-service reporting (custom dashboards, scheduled exports)
- Production-grade security (MFA, IP restrictions, session policies)
- Full-depth features (no placeholders, no hardcoded data)

---

## 8. KEY RECOMMENDATIONS

### Immediate Actions (This Week)

1. **🔥 CRITICAL:** Replace fake health check with real metrics (admin.ts line 1231)
2. **🔥 CRITICAL:** Add event tracking to populate empty analytics tables
3. **🔥 CRITICAL:** Complete user impersonation (security + UX)
4. **📊 DATA:** Run migration to populate cohorts/funnels/LTV from historical data
5. **🎯 FOCUS:** Pick ONE vertical (Users OR Analytics OR Support) and bring it to 100%

---

### Strategic Decisions

**Option A: Depth-First (Recommended)**
- Bring 3 core tabs to 100% completion (Users, Receipts, Analytics)
- Remove or hide incomplete tabs (Monitoring, Support) until ready
- Ship polished, trustworthy admin panel

**Option B: Breadth-First**
- Keep all 8 tabs
- Accept 60% average completion
- Iteratively improve all areas

**Recommendation:** **Depth-First** for credibility and trust

---

### Architecture Improvements

1. **Event Sourcing:** Implement event bus for all user actions → populate analytics automatically
2. **Cron Jobs:** Add scheduled tasks for metric computation (nightly cohorts, hourly health checks)
3. **Real-time Subscriptions:** Use Convex reactive queries for live dashboards
4. **Query Optimization:** Add indexes for admin queries (see performance analysis)

---

## 9. CONCLUSION

**Current State:** Oja's admin dashboard is a **functional MVP (3/5 stars)** with excellent RBAC, good audit logging, and a modern UI. However, it suffers from **17 missing critical features**, **12 shallow implementations**, and **empty data tables** that make analytics unusable.

**Gap Analysis:** Compared to industry leaders (Stripe, Shopify, Instacart), Oja is missing:
- Real-time monitoring & alerting
- User impersonation (incomplete)
- Cohort/funnel/LTV analytics (no data)
- Advanced search & filtering
- Support ticket workflows
- Security hardening (MFA, IP whitelisting)

**Recommended Path:** Focus on **depth over breadth**. Bring Users, Receipts, and Analytics tabs to 100% completion by:
1. Populating empty tables with real data
2. Replacing fake metrics with real monitoring
3. Completing half-built features (impersonation, A/B testing)
4. Adding security hardening (MFA, IP restrictions)

**Timeline:** 12 weeks to reach ⭐⭐⭐⭐⭐ (5/5 stars) industry-leading status.

---

**Document Status:** ✅ COMPLETE
**Next Steps:** Review with product/engineering leads → Prioritize Phase 1 tasks → Begin implementation
