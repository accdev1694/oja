---
stepsCompleted: ['step-01-validate-prerequisites', 'step-02-design-epics']
inputDocuments:
  - '_bmad-output/planning-artifacts/prd.md'
  - '_bmad-output/planning-artifacts/architecture-v2-expo-convex.md'
  - '_bmad-output/planning-artifacts/ux-design-specification.md'
  - '_bmad-output/planning-artifacts/coding-conventions-expo.md'
  - '_bmad-output/planning-artifacts/security-guidelines-expo.md'
  - '_bmad-output/planning-artifacts/product-brief.md'
  - 'guidelines.md'
requirementsSummary:
  totalFunctionalRequirements: 206
  totalNonFunctionalRequirements: 54
  totalAdditionalRequirements: 62
  grandTotal: 322
---

# oja - Epic Breakdown

## Overview

This document provides the complete epic and story breakdown for oja, decomposing the requirements from the PRD, UX Design, Architecture v2 (Expo + Convex + Clerk), Coding Conventions, and Security Guidelines into implementable stories.

## Requirements Inventory

### Functional Requirements

**User Account Management:**
- FR1: Users can create an account with email and password
- FR2: Users can sign in to their existing account
- FR3: Users can sign out from any device
- FR4: Users can reset their password via email
- FR5: New users receive a 7-day free trial with full access
- FR6: Users can view and manage their subscription status
- FR7: Users can delete their account and all associated data

**Pantry / Stock Tracking:**
- FR8: Users can view all tracked stock items in a pantry grid
- FR9: Users can add new items to their pantry
- FR10: Users can set stock level for any item (Stocked, Good, Low, Out)
- FR11: Users can change stock level via tap-and-hold interaction
- FR12: Users can quick-decrease stock level via swipe gesture
- FR13: System auto-adds "Out" items to the next shopping list
- FR14: Users can assign categories to stock items
- FR15: Users can remove items from their pantry
- FR16: New users see pre-seeded items in their pantry (hybrid: location-based + multi-cuisine preferences)

**Shopping List Management:**
- FR17: Users can create new shopping lists
- FR18: Users can view all their shopping lists
- FR19: Users can add items to a shopping list
- FR20: Users can remove items from a shopping list
- FR21: Users can search and add items from their pantry to a list
- FR22: Users can check off items as they shop
- FR23: Users can uncheck items if needed
- FR24: Users can set priority for items (must-have vs nice-to-have)
- FR25: Users can change item priority via swipe gesture
- FR26: Users can edit estimated price for any list item
- FR27: Users can edit actual price when checking off items
- FR28: Users can view running total of their shopping list
- FR29: Users can archive completed shopping lists
- FR30: Users can view archived shopping lists (trip history)
- FR31: System auto-updates pantry stock to "Stocked" when list is completed

**Budget Control:**
- FR32: Users can set a total budget for each shopping list
- FR33: Users can enable Budget Lock Mode (hard cap)
- FR34: System warns user before adding items that exceed budget
- FR35: Users can set a separate Impulse Fund budget
- FR36: Users can add impulse items charged against impulse fund
- FR37: Users can view Safe Zone indicator showing budget status
- FR38: System suggests removing nice-to-have items when over budget
- FR39: Users can see real-time budget status while shopping

**Receipt Processing:**
- FR40: Users can capture receipt photos using device camera
- FR41: System performs OCR on captured receipts
- FR42: System extracts structured data from receipt text (store, date, items, prices, total)
- FR43: Users can review and correct AI-parsed receipt data
- FR44: Users can manually add missing items to parsed receipt
- FR45: Users can view reconciliation of planned vs actual spending
- FR46: System identifies items bought but not on list ("missed items")
- FR47: System identifies items on list but not bought ("skipped items")
- FR48: Users can save receipt without points if validation fails
- FR49: System validates receipt freshness (≤3 days from purchase date)
- FR50: System validates receipt legibility (≥60% OCR confidence)
- FR51: System detects duplicate receipts (same store+date+total)

**Price Intelligence:**
- FR52: System maintains personal price history per user
- FR53: System provides price estimates when adding items to lists
- FR54: System contributes validated prices to crowdsourced database
- FR55: System shows price confidence level for estimates
- FR56: Users can view price history for specific items
- FR57: System filters crowdsourced prices by recency (weighted average)

**Insights & Analytics:**
- FR58: Users can view weekly spending digest
- FR59: Users can view monthly trend reports
- FR60: Users can view category breakdown of spending
- FR61: Users can view budget adherence statistics (trips under/over budget)
- FR62: Users can view total savings achieved
- FR63: System displays progress indicators (trips under budget, streaks)
- FR64: Users can view their price contribution count

**Subscription & Payments:**
- FR65: Users can subscribe to monthly plan (£2.99/mo)
- FR66: Users can subscribe to annual plan (£21.99/yr - 38% savings)
- FR67: Users can cancel their subscription
- FR68: System enforces feature limits for expired free tier
- FR69: Users can earn loyalty points for valid receipt scans
- FR70: System applies loyalty point discounts to subscription (up to 50%)
- FR71: Users can view their loyalty point balance
- FR72: Users can view point earning history
- FR73: System enforces daily receipt scan cap (5/day)
- FR74: System expires unused points after 12 months

**Location & Store Intelligence:**
- FR75: System auto-detects user's country
- FR76: System auto-detects user's currency based on location
- FR77: Users can manually set their preferred currency
- FR78: System can detect when user is in a known store (optional)
- FR79: Users can associate shopping lists with specific stores

**Cross-Device & Offline:**
- FR80: Users can access their data from multiple devices
- FR81: System syncs data across devices in real-time
- FR82: Users can use core features while offline
- FR83: System queues changes made offline for sync when online
- FR84: System resolves sync conflicts gracefully

**Onboarding:**
- FR85: New users see animated welcome experience
- FR86: New users can select cuisine preferences (multi-select from 12+ cuisines)
- FR87: New users can customize seeded products (remove unwanted items)
- FR88: New users can set default weekly budget
- FR89: Users can optionally grant location permission
- FR90: Users can skip optional onboarding steps

**Feedback & Celebrations:**
- FR91: System plays subtle sounds for key actions (configurable)
- FR92: System provides haptic feedback for interactions (configurable)
- FR93: System displays celebration when trip completed under budget
- FR94: Users can enable/disable sounds
- FR95: Users can enable/disable haptics
- FR96: System can auto-mute in detected store locations

**Admin Dashboard - Access & Security:**
- FR97: Admins can sign in to a separate admin interface with enhanced security
- FR98: Admin accounts require two-factor authentication
- FR99: System logs all admin actions in an audit trail
- FR100: Super-admins can create and manage other admin accounts
- FR101: Admins have role-based permissions (viewer, support, manager, super-admin)

**Admin Dashboard - Business Analytics:**
- FR102: Admins can view real-time user count (total, active, new today)
- FR103: Admins can view DAU/WAU/MAU metrics with trends
- FR104: Admins can view user retention cohort analysis
- FR105: Admins can view onboarding funnel completion rates
- FR106: Admins can view trial-to-paid conversion rate
- FR107: Admins can view churn rate and churn reasons
- FR108: Admins can view feature adoption metrics (% using each feature)
- FR109: Admins can filter analytics by date range
- FR110: Admins can compare metrics period-over-period

**Admin Dashboard - Revenue & Financial:**
- FR111: Admins can view Monthly Recurring Revenue (MRR)
- FR112: Admins can view Annual Recurring Revenue (ARR)
- FR113: Admins can view revenue growth trends
- FR114: Admins can view subscriber breakdown (monthly vs annual)
- FR115: Admins can view average revenue per user (ARPU)
- FR116: Admins can view customer lifetime value (LTV) estimates
- FR117: Admins can view loyalty point discount impact on revenue
- FR118: Admins can view total loyalty points liability (outstanding points)

**Admin Dashboard - Stripe Integration:**
- FR119: Admins can view all payment transactions
- FR120: Admins can view failed payment attempts
- FR121: Admins can view payment retry status
- FR122: Admins can issue refunds for specific transactions
- FR123: Admins can view subscription lifecycle events
- FR124: Admins can view upcoming renewals
- FR125: Admins can view revenue by payment method
- FR126: System syncs payment data from Stripe webhooks in real-time
- FR127: Admins can manually reconcile payment discrepancies

**Admin Dashboard - User Management:**
- FR128: Admins can search users by email, name, or ID
- FR129: Admins can view detailed user profile
- FR130: Admins can view user's subscription history
- FR131: Admins can view user's loyalty point history
- FR132: Admins can view user's receipt scan history
- FR133: Admins can extend user's trial period
- FR134: Admins can grant complimentary subscription
- FR135: Admins can add loyalty points manually
- FR136: Admins can reset user's password
- FR137: Admins can deactivate user account
- FR138: Admins can reactivate previously deactivated accounts
- FR139: Admins can view user's activity timeline

**Admin Dashboard - Receipt & Price Management:**
- FR140: Admins can view receipt scan volume metrics
- FR141: Admins can view OCR success rate metrics
- FR142: Admins can view AI parsing accuracy metrics
- FR143: Admins can view rejected receipts and rejection reasons
- FR144: Admins can review flagged/suspicious receipts
- FR145: Admins can manually approve or reject flagged receipts
- FR146: Admins can view crowdsourced price database
- FR147: Admins can search prices by item, store, or region
- FR148: Admins can edit incorrect crowdsourced prices
- FR149: Admins can delete spam or fraudulent price entries
- FR150: Admins can view price outlier reports
- FR151: Admins can bulk approve/reject price entries

**Admin Dashboard - Product & Content:**
- FR152: Admins can view and manage seeded products
- FR153: Admins can add new seeded products
- FR154: Admins can edit seeded product details
- FR155: Admins can remove seeded products
- FR156: Admins can manage product categories
- FR157: Admins can manage store name normalization rules
- FR158: Admins can view and edit item name canonicalization rules

**Admin Dashboard - System Health:**
- FR159: Admins can view system uptime metrics
- FR160: Admins can view API response time metrics
- FR161: Admins can view error rate trends
- FR162: Admins can view recent error logs
- FR163: Admins can view third-party service status
- FR164: Admins can view database storage usage
- FR165: Admins can view sync queue status
- FR166: Admins can view background job status
- FR167: System sends alerts to admins when error thresholds exceeded

**Admin Dashboard - Customer Support:**
- FR168: Admins can view support ticket queue
- FR169: Admins can impersonate user view (read-only)
- FR170: Admins can view user's recent shopping lists
- FR171: Admins can view user's stock tracker state
- FR172: Admins can trigger password reset email for user
- FR173: Admins can export user's data (GDPR request)
- FR174: Admins can permanently delete user's data (GDPR request)

**Admin Dashboard - Communication:**
- FR175: Admins can create in-app announcements
- FR176: Admins can schedule announcements for future dates
- FR177: Admins can target announcements to user segments
- FR178: Admins can view announcement read/dismiss rates
- FR179: Admins can create email campaigns (future)

**Admin Dashboard - Configuration:**
- FR180: Admins can toggle feature flags on/off
- FR181: Admins can enable features for specific user segments
- FR182: Admins can configure loyalty point earning rules
- FR183: Admins can configure receipt validation thresholds
- FR184: Admins can configure subscription pricing
- FR185: Admins can configure trial period length
- FR186: Admins can configure daily receipt scan cap

**Admin Dashboard - Reporting:**
- FR187: Admins can export user list to CSV
- FR188: Admins can export revenue reports to CSV
- FR189: Admins can export analytics data to CSV
- FR190: Admins can schedule automated weekly reports via email
- FR191: Admins can export audit logs

**Partner Mode (Multi-User Lists):**
- FR192: Users can invite partners to a shopping list via email or share code
- FR193: Users can assign partner roles (viewer, approver, editor)
- FR194: Partners with "viewer" role can see the list in real-time
- FR195: Partners with "approver" role can add items (owner must approve) and must approve owner's items (bidirectional approval)
- FR196: Partners with "editor" role can add/remove items freely (no approval required)
- FR197: Users can see pending approval status on list items (⏳ hourglass indicator)
- FR198: Partners can approve items with ✅ green checkmark
- FR199: Partners can contest items with reason (🔴 red badge)
- FR200: Users can add comments to any list item (💬 speech bubble)
- FR201: Users can view comment threads on contested items
- FR202: System sends push notifications when partner approves/contests/comments
- FR203: System provides haptic feedback for partner actions (partnerApproved, partnerContested, partnerCommented)
- FR204: Users can accept partner invitations via 6-character invite code
- FR205: Users can remove partners from lists
- FR206: List owner can resolve contested items (keep or remove)

### Non-Functional Requirements

**Performance:**
- NFR-P1: App cold start to usable <2 seconds
- NFR-P2: Budget bar update on item change <100ms
- NFR-P3: List item check/uncheck <50ms visual response
- NFR-P4: Receipt camera to preview <1 second
- NFR-P5: Receipt OCR processing <5 seconds
- NFR-P6: AI receipt parsing <3 seconds (API call)
- NFR-P7: Animation frame rate 60fps consistent
- NFR-P8: Offline mode activation <500ms detection
- NFR-P9: Search/filter response <200ms
- NFR-P10: Lighthouse Performance score >90

**Security:**
- NFR-S1: Data encryption at rest (AES-256)
- NFR-S2: Data encryption in transit (TLS 1.3)
- NFR-S3: Authentication tokens (JWT with SecureStore)
- NFR-S4: Password requirements (Min 8 chars, complexity check)
- NFR-S5: Session timeout (30 days remember me / 24hr default)
- NFR-S6: Admin 2FA required for all admin accounts
- NFR-S7: Payment data handling (Never store card data, Stripe handles)
- NFR-S8: Receipt photo storage (Encrypted, user-owned, deletable)
- NFR-S9: Rate limiting (100 requests/min per user)
- NFR-S10: GDPR data export (<48 hours fulfillment)
- NFR-S11: GDPR data deletion (<30 days complete removal)
- NFR-S12: Audit logging (All admin actions logged with timestamp)

**Scalability:**
- NFR-SC1: Initial capacity (1,000 concurrent users)
- NFR-SC2: 12-month capacity (10,000 concurrent users)
- NFR-SC3: Database growth (Handle 1M+ price records)
- NFR-SC4: Receipt storage (100GB+ image storage)
- NFR-SC5: Graceful degradation (Core features work if non-critical services down)
- NFR-SC6: Horizontal scaling (Auto-scales on demand)
- NFR-SC7: Database connection pooling (Managed by Convex)

**Reliability:**
- NFR-R1: System uptime 99.5% (excl. planned maintenance)
- NFR-R2: Offline functionality (100% core features: stock, list, budget)
- NFR-R3: Data sync reliability (Zero data loss on sync)
- NFR-R4: Conflict resolution (Last-write-wins with merge for lists)
- NFR-R5: Crash-free sessions 99.5%+
- NFR-R6: Receipt processing retry (Auto-retry 3x on failure)
- NFR-R7: Payment webhook reliability (Idempotent processing)
- NFR-R8: Backup frequency (Daily database backups)
- NFR-R9: Recovery point objective (RPO) <24 hours
- NFR-R10: Recovery time objective (RTO) <4 hours

**Accessibility:**
- NFR-A1: WCAG compliance Level AA
- NFR-A2: Screen reader support (Full navigation and actions)
- NFR-A3: Color contrast ratio 4.5:1 minimum (text)
- NFR-A4: Touch target size 44x44px minimum
- NFR-A5: Keyboard navigation (Full functionality)
- NFR-A6: Reduced motion support (Respect prefers-reduced-motion)
- NFR-A7: Font scaling (Support up to 200%)
- NFR-A8: Error messaging (Clear, actionable error states)

**Integration:**
- NFR-I1: Stripe webhook latency (Process within 5 seconds)
- NFR-I2: Convex Realtime (<1 second sync propagation)
- NFR-I3: Gemini API fallback (Graceful degradation if unavailable)
- NFR-I4: Google Places timeout (3 second timeout, fallback to manual)
- NFR-I5: Third-party monitoring (Alert on integration failures)
- NFR-I6: API versioning (Support deprecated APIs for 6 months)

**Mobile-Native:**
- NFR-M1: Native feel (Platform-adaptive UI: Liquid Glass iOS / Material You Android)
- NFR-M2: Offline-first (All critical routes work offline)
- NFR-M3: Install prompt (Show after 2 sessions)
- NFR-M4: Local storage (<50MB typical usage for offline data)
- NFR-M5: Cache invalidation (Version-based, max 7-day stale)
- NFR-M6: Background sync queue (Persist across app restarts)

### Additional Requirements

**Architecture Requirements (Expo + Convex + Clerk):**

- AR1: **Starter Template** - Initialize project with Expo SDK 55+ and TypeScript strict mode
- AR2: **Convex Backend** - Deploy real-time database with serverless functions
- AR3: **Clerk Authentication** - Integrate with JWT issuer and SecureStore token caching
- AR4: **File Storage** - Implement Convex file storage for receipt photos
- AR5: **Vector Search** - Configure Jina AI embeddings (jina-embeddings-v3) with Convex vector indexes
- AR6: **Platform-Adaptive UI** - Implement Liquid Glass (iOS) and Material You (Android) component variants
- AR7: **Haptics System** - Comprehensive haptic feedback for all user actions via Expo Haptics
- AR8: **Animations** - React Native Reanimated for smooth 60fps native animations
- AR9: **Expo Router** - File-based routing with native navigation patterns
- AR10: **Optimistic Updates** - Client-side mutations with automatic rollback on failure

**Gamification Features (v2 Architecture):**

- GF1: **Budget Streak** - Track consecutive trips under budget with fire emoji counter
- GF2: **Savings Jar** - Animated jar filling based on cumulative savings
- GF3: **Weekly Challenge** - Single random goal per week with confetti on completion
- GF4: **Smart Suggestions** - AI-powered "You might need..." recommendations via Jina embeddings
- GF5: **Personal Best** - Track and celebrate lowest weekly/monthly spend
- GF6: **Surprise Delight** - Random toast messages with emojis for mundane actions
- GF7: **Partner Mode** - Multi-user lists with real-time sync, 3 role types (viewer/approver/editor), approve/contest flow with comments, push notifications, haptic feedback (see FR191-FR205)
- GF8: **Hybrid Pantry Seeding** - Generate 200 items via Gemini LLM: 60% local/universal staples (based on country of residence) + 40% cultural items (based on multi-select cuisine preferences from 12+ cuisines)
- GF9: **Daily Stock Reminder** - Configurable push notifications for pantry updates
- GF10: **Mid-Shop Add Flow** - Choose to add to budget, impulse fund, or defer to next trip
- GF11: **Stock Check Streak** - Track daily pantry update consistency

**Security Requirements:**

- SR1: **Clerk + SecureStore** - Use SecureStore for token caching (never AsyncStorage)
- SR2: **User Ownership Verification** - Every Convex mutation must verify user owns resource
- SR3: **Protected Routes** - Implement auth guard via Expo Router layouts
- SR4: **Helper Functions** - Create `requireCurrentUser()` and `requireOwnership()` utilities

**Coding Convention Requirements:**

- CR1: **File Naming** - PascalCase for components, camelCase for hooks/utils
- CR2: **Component Structure** - Imports, types, component, styles (in that order)
- CR3: **Barrel Exports** - Use index.ts for component folders
- CR4: **Path Aliases** - Configure `@/` alias for absolute imports

**UX Requirements:**

- UX1: **Safe Zone Glow** - Budget indicator with color transitions (green/amber/red)
- UX2: **Liquid Drain Animation** - Stock level changes animate like containers draining
- UX3: **Shopping Mode** - Larger touch targets and simplified UI when actively shopping
- UX4: **Mature Celebrations** - Brief confetti (1 second, muted colors, fades quickly)
- UX5: **Quiet Sounds** - Subtle, professional audio feedback (not childish/gamey)
- UX6: **Offline Confidence** - No loading spinners for offline operations
- UX7: **Progressive Disclosure** - Simple for new users, powerful for experts
- UX8: **Instant Feedback** - <100ms response for all interactions

**Graceful Degradation Requirements:**

- GD1: **3-Tier Device System** - Premium (iOS 15+), Enhanced (iOS 13-14 / mid-range Android), Baseline (older devices)
- GD2: **Device Capability Detection** - Detect OS version, device year, RAM for tiering
- GD3: **Tier-Aware Design Tokens** - Platform and tier-specific styling values
- GD4: **UI Fallbacks** - BlurView → LinearGradient → solid View progression
- GD5: **Safe Haptics Wrapper** - Triple-check safety (device + preference + try-catch)
- GD6: **useDeviceCapabilities Hook** - Cached capabilities with design tokens
- GD7: **Animation Scaling** - Tier-based durations (300ms → 200ms → 150ms)
- GD8: **Platform-Specific Shadows** - Android elevation vs iOS shadowRadius

**Development Tooling & AI-Assisted Workflow:**

> **🚨 CRITICAL WORKFLOW RULE:**
> **ALWAYS deploy Expo Skills and Context7 MCP at the START of EVERY implementation session to fetch the latest documentation. This prevents unnecessary bugs, outdated API usage, and wasted time going in circles. Documentation changes frequently - fresh context is non-negotiable.**

- DT1: **MCP Server - Clerk** - Use Clerk MCP (URL-based) for authentication SDK snippets, user management queries, and auth pattern examples
- DT2: **MCP Server - Convex** - Use Convex MCP (CLI-based) for deployment queries, table schema inspection, function metadata, and backend debugging
- DT3: **MCP Server - Stripe** - Use Stripe MCP (URL-based) for payment integration, customer management, invoice handling, subscription workflows
- DT4: **MCP Server - GitHub** - Use GitHub MCP (CLI-based) for repo management, PR creation, issue tracking, code review workflows
- DT5: **Expo Skills** - Leverage Expo agent skills for SDK upgrades, dependency management, build configuration, and EAS deployment workflows
- DT6: **MCP Configuration** - Maintain claude_desktop_config.json with all MCP server configurations and restart Claude Desktop after changes
- DT7: **Context7 MCP** - Use Context7 for retrieving up-to-date library documentation (Expo, React Native, Convex, Clerk, etc.) **BEFORE implementing any feature**
- DT8: **Neon MCP** - Database management via Neon MCP (if using Neon instead of/alongside Convex for certain features)
- DT9: **Playwright MCP** - E2E testing and browser automation for web admin dashboard or PWA fallback testing
- DT10: **Documentation-First Implementation** - MANDATORY: Query Context7 and Expo Skills for latest docs BEFORE writing code for any library integration to avoid deprecated APIs, breaking changes, and implementation bugs

### FR Coverage Map

**Epic 1: Foundation & Authentication**
- FR1: Create account with email/password
- FR2: Sign in to existing account
- FR3: Sign out from any device
- FR4: Reset password via email
- FR5: 7-day free trial with full access
- FR6: View and manage subscription status
- FR7: Delete account and all data
- FR16: Pre-seeded pantry items (hybrid: location + multi-cuisine)
- FR75: Auto-detect user's country
- FR76: Auto-detect currency based on location
- FR77: Manually set preferred currency
- FR85: Animated welcome experience
- FR86: Select cuisine preferences (multi-select from 12+ cuisines)
- FR87: Customize seeded products (remove unwanted items)
- FR88: Set default weekly budget
- FR89: Optionally grant location permission
- FR90: Skip optional onboarding steps

**Epic 2: Pantry Stock Tracker**
- FR8: View all tracked stock items in pantry grid
- FR9: Add new items to pantry
- FR10: Set stock level (Stocked, Good, Low, Out)
- FR11: Change stock level via tap-and-hold
- FR12: Quick-decrease stock via swipe gesture
- FR13: Auto-add "Out" items to next shopping list
- FR14: Assign categories to stock items
- FR15: Remove items from pantry
- FR80: Access data from multiple devices (sync)
- FR81: Real-time sync across devices
- FR82: Use core features offline
- FR83: Queue offline changes for sync
- FR84: Resolve sync conflicts gracefully
- FR90: Subtle sounds for key actions
- FR91: Haptic feedback for interactions
- FR92: Celebration when trip under budget
- FR93: Enable/disable sounds
- FR94: Enable/disable haptics
- FR95: Auto-mute in detected store locations

**Epic 3: Shopping Lists with Budget Control**
- FR17: Create new shopping lists
- FR18: View all shopping lists
- FR19: Add items to shopping list
- FR20: Remove items from shopping list
- FR21: Search and add from pantry
- FR22: Check off items while shopping
- FR23: Uncheck items if needed
- FR24: Set item priority (must-have vs nice-to-have)
- FR25: Change priority via swipe gesture
- FR26: Edit estimated price for list items
- FR27: Edit actual price when checking off
- FR28: View running total of shopping list
- FR29: Archive completed shopping lists
- FR30: View archived lists (trip history)
- FR31: Auto-update pantry stock when list completed
- FR32: Set total budget for each list
- FR33: Enable Budget Lock Mode (hard cap)
- FR34: Warn before adding items exceeding budget
- FR35: Set separate Impulse Fund budget
- FR36: Add impulse items charged against impulse fund
- FR37: View Safe Zone indicator (budget status)
- FR38: Suggest removing nice-to-haves when over budget
- FR39: Real-time budget status while shopping
- FR78: Detect when user is in known store
- FR79: Associate shopping lists with specific stores

**Epic 4: Partner Mode & Collaboration**
- FR192: Invite partners via email or share code
- FR193: Assign partner roles (viewer, approver, editor)
- FR194: Partners with "viewer" role see list real-time
- FR195: Partners with "approver" can add items (bidirectional approval with owner)
- FR196: Partners with "editor" can add/remove items freely
- FR197: See pending approval status (⏳ hourglass)
- FR198: Partners approve items (✅ checkmark)
- FR199: Partners contest items with reason (🔴 badge)
- FR200: Add comments to any list item (💬 bubble)
- FR201: View comment threads on contested items
- FR202: Push notifications for partner actions
- FR203: Haptic feedback for partner actions
- FR204: Accept partner invitations via 6-char code
- FR205: Remove partners from lists
- FR206: List owner resolves contested items

**Epic 5: Receipt Intelligence & Price History**
- FR40: Capture receipt photos using camera
- FR41: OCR on captured receipts
- FR42: Extract structured data (store, date, items, prices)
- FR43: Review and correct AI-parsed data
- FR44: Manually add missing items to receipt
- FR45: View reconciliation of planned vs actual
- FR46: Identify items bought but not on list
- FR47: Identify items on list but not bought
- FR48: Save receipt without points if validation fails
- FR49: Validate receipt freshness (≤3 days)
- FR50: Validate receipt legibility (≥60% OCR confidence)
- FR51: Detect duplicate receipts
- FR52: Maintain personal price history
- FR53: Provide price estimates when adding items
- FR54: Contribute validated prices to crowdsourced DB
- FR55: Show price confidence level
- FR56: View price history for specific items
- FR57: Filter crowdsourced prices by recency

**Epic 6: Insights, Gamification & Progress**
- FR58: View weekly spending digest
- FR59: View monthly trend reports
- FR60: View category breakdown of spending
- FR61: View budget adherence statistics
- FR62: View total savings achieved
- FR63: Display progress indicators (trips, streaks)
- FR64: View price contribution count

**Epic 7: Subscription, Payments & Loyalty**
- FR65: Subscribe to monthly plan (£2.99/mo)
- FR66: Subscribe to annual plan (£21.99/yr)
- FR67: Cancel subscription
- FR68: Enforce feature limits for expired free tier
- FR69: Earn loyalty points for valid receipt scans
- FR70: Apply loyalty point discounts (up to 50%)
- FR71: View loyalty point balance
- FR72: View point earning history
- FR73: Enforce daily receipt scan cap (5/day)
- FR74: Expire unused points after 12 months

**Epic 8: Admin Dashboard & Operations**
- FR96: Admin sign-in with enhanced security
- FR97: Admin 2FA required
- FR98: Audit trail for all admin actions
- FR100: Super-admins manage other admin accounts
- FR100: Role-based permissions (viewer, support, manager, super-admin)
- FR101: View real-time user count
- FR103: View DAU/WAU/MAU metrics with trends
- FR104: View user retention cohort analysis
- FR105: View onboarding funnel completion rates
- FR106: View trial-to-paid conversion rate
- FR107: View churn rate and reasons
- FR108: View feature adoption metrics
- FR109: Filter analytics by date range
- FR110: Compare metrics period-over-period
- FR111: View Monthly Recurring Revenue (MRR)
- FR112: View Annual Recurring Revenue (ARR)
- FR113: View revenue growth trends
- FR114: View subscriber breakdown (monthly vs annual)
- FR115: View average revenue per user (ARPU)
- FR116: View customer lifetime value (LTV)
- FR117: View loyalty point discount impact on revenue
- FR118: View total loyalty points liability
- FR119: View all payment transactions
- FR120: View failed payment attempts
- FR121: View payment retry status
- FR122: Issue refunds for transactions
- FR123: View subscription lifecycle events
- FR124: View upcoming renewals
- FR125: View revenue by payment method
- FR126: Sync payment data from Stripe webhooks
- FR127: Manually reconcile payment discrepancies
- FR128: Search users by email, name, or ID
- FR129: View detailed user profile
- FR130: View user's subscription history
- FR131: View user's loyalty point history
- FR132: View user's receipt scan history
- FR133: Extend user's trial period
- FR134: Grant complimentary subscription
- FR135: Add loyalty points manually
- FR136: Reset user's password
- FR137: Deactivate user account
- FR138: Reactivate deactivated accounts
- FR139: View user's activity timeline
- FR140: View receipt scan volume metrics
- FR141: View OCR success rate metrics
- FR142: View AI parsing accuracy metrics
- FR143: View rejected receipts and reasons
- FR144: Review flagged/suspicious receipts
- FR145: Manually approve/reject flagged receipts
- FR146: View crowdsourced price database
- FR147: Search prices by item, store, or region
- FR148: Edit incorrect crowdsourced prices
- FR149: Delete spam/fraudulent price entries
- FR150: View price outlier reports
- FR151: Bulk approve/reject price entries
- FR152: View and manage seeded products
- FR153: Add new seeded products
- FR154: Edit seeded product details
- FR155: Remove seeded products
- FR156: Manage product categories
- FR157: Manage store name normalization rules
- FR158: View/edit item name canonicalization rules
- FR159: View system uptime metrics
- FR160: View API response time metrics
- FR161: View error rate trends
- FR162: View recent error logs
- FR163: View third-party service status
- FR164: View database storage usage
- FR165: View sync queue status
- FR166: View background job status
- FR167: Send alerts when error thresholds exceeded
- FR168: View support ticket queue
- FR169: Impersonate user view (read-only)
- FR170: View user's recent shopping lists
- FR171: View user's stock tracker state
- FR172: Trigger password reset email for user
- FR173: Export user's data (GDPR request)
- FR174: Permanently delete user's data (GDPR)
- FR175: Create in-app announcements
- FR176: Schedule announcements for future dates
- FR177: Target announcements to user segments
- FR178: View announcement read/dismiss rates
- FR179: Create email campaigns (future)
- FR180: Toggle feature flags on/off
- FR181: Enable features for specific user segments
- FR182: Configure loyalty point earning rules
- FR183: Configure receipt validation thresholds
- FR184: Configure subscription pricing
- FR185: Configure trial period length
- FR186: Configure daily receipt scan cap
- FR187: Export user list to CSV
- FR188: Export revenue reports to CSV
- FR189: Export analytics data to CSV
- FR190: Schedule automated weekly reports
- FR191: Export audit logs

**Non-Functional & Additional Requirements** are addressed across all epics as cross-cutting concerns (performance, security, scalability, accessibility, graceful degradation, development tooling).

## Epic List

### Epic 1: Foundation & Authentication

**Goal:** Users can sign up, authenticate securely, and complete culturally-aware onboarding with 200 hybrid pantry items (local + cultural)

**Key Capabilities:**
- Clerk authentication with email/password, password reset, secure sessions
- SecureStore token caching (JWT)
- Convex backend integration with real-time sync
- Platform-adaptive UI foundation (Liquid Glass iOS / Material You Android)
- 3-tier graceful degradation system (Premium/Enhanced/Baseline)
- Safe haptics wrapper with device detection
- Tier-aware design tokens
- Onboarding flow with location detection + multi-select cuisine preferences
- Hybrid LLM seeding: 60% local staples (residence) + 40% cultural (12+ cuisines)
- 12+ cuisine options: British, Nigerian, Indian, Chinese, Italian, Pakistani, Caribbean, Mexican, Middle Eastern, Japanese, Korean, Thai
- Location/currency auto-detection
- MCP servers configured (Clerk, Convex, Stripe, GitHub, Context7, Neon, Playwright)
- Expo Skills ready for SDK management

**FRs Covered:** FR1-FR7, FR16, FR75-FR77, FR85-FR90 (21 FRs)

**Additional Requirements:** AR1-AR10, CR1-CR4, SR1-SR4, DT1-DT10, GD1-GD8, GF8

**Dependencies:** None (foundation epic)

---

### Epic 2: Pantry Stock Tracker

**Goal:** Users can track household stock levels, see what's running low, and have items auto-add to shopping lists

**Key Capabilities:**
- Pantry grid view with categories
- 4 stock levels (Stocked, Good, Low, Out)
- Tap-and-hold interaction with liquid drain animation
- Swipe gesture for quick stock decrease
- Auto-add "Out" items to next shopping list with fly animation
- Add/edit/delete pantry items
- Real-time cross-device sync
- Offline-first with optimistic updates
- Stock check streak gamification
- Daily stock reminder push notifications (configurable times)
- Haptic feedback for all stock interactions
- Mature sounds (subtle, professional)

**FRs Covered:** FR8-FR15, FR80-FR84, FR90-FR95 (20 FRs)

**Additional Requirements:** GF11, GF9, UX2, UX6

**Dependencies:** Epic 1 (authentication, user identity)

---

### Epic 3: Shopping Lists with Budget Control

**Goal:** Users can create shopping lists with budgets, see real-time totals, and stay within budget using Safe Zone indicators

**Key Capabilities:**
- Create/view/archive shopping lists
- Add items manually or from pantry
- Check off items with haptic feedback
- Set priority (must-have vs nice-to-have) via swipe gesture
- Edit estimated/actual prices
- Real-time running total (<100ms update)
- Budget setting per list
- Budget Lock Mode (hard cap with warnings)
- Impulse Fund (separate flex budget)
- Safe Zone indicator (green/amber/red glow)
- Auto-suggest removing nice-to-haves when over budget
- Shopping Mode (larger touch targets)
- Mid-shop add flow (budget / impulse / defer)
- Auto-update pantry stock when list completed
- Store association

**FRs Covered:** FR17-FR39, FR78-FR79 (25 FRs)

**Additional Requirements:** UX1, UX3, UX8, GF10

**Dependencies:** Epic 1 (auth), Epic 2 (pantry items for adding to lists)

---

### Epic 4: Partner Mode & Collaboration

**Goal:** Users can share lists with partners, approve/contest items together, and communicate via comments

**Key Capabilities:**
- Invite partners via email or 6-character share code
- 3 role types (viewer, approver, editor)
- Real-time list sharing with Convex sync
- Pending approval status (⏳ hourglass indicator)
- Approve items (✅ green checkmark + success haptic)
- Contest items (🔴 red badge + reason + warning haptic)
- Comment threads on items (💬 speech bubble)
- Push notifications for partner actions
- Haptic feedback (partnerApproved, partnerContested, partnerCommented)
- List owner resolution powers (keep/remove contested items)
- Remove partners from lists

**FRs Covered:** FR191-FR205 (15 FRs)

**Additional Requirements:** GF7

**Dependencies:** Epic 1 (auth), Epic 3 (shopping lists)

---

### Epic 5: Receipt Intelligence & Price History

**Goal:** Users can scan receipts, reconcile planned vs actual spending, and build personal price history

**Key Capabilities:**
- Camera capture with auto-detect
- Client-side OCR processing (Tesseract.js)
- AI parsing via Gemini 1.5 Flash (structured data extraction)
- User confirmation/correction step
- Planned vs Actual reconciliation view
- Identify missed items (bought but not on list)
- Identify skipped items (on list but not bought)
- Personal price history per user
- Crowdsourced price database contributions
- Receipt validation (freshness ≤3 days, legibility ≥60%, duplicate detection)
- Save receipt without points if validation fails
- Price estimates when adding items to lists
- Price confidence levels
- Store-specific price tracking
- Convex file storage for receipt photos

**FRs Covered:** FR40-FR57 (18 FRs)

**Additional Requirements:** None (uses AR5 for file storage, AR6 for AI)

**Dependencies:** Epic 1 (auth), Epic 3 (shopping lists for reconciliation)

---

### Epic 6: Insights, Gamification & Progress

**Goal:** Users see spending patterns, budget streaks, savings, and get quiet motivation to stay on track

**Key Capabilities:**
- Weekly spending digest
- Monthly trend reports with charts
- Category breakdown analytics
- Budget adherence statistics (trips under/over budget)
- Total savings calculation
- Budget streak 🔥 (consecutive under-budget trips with fire emoji)
- Savings jar 💰 (animated jar filling based on cumulative savings)
- Weekly challenge 🏆 (random goal per week with confetti on completion)
- Smart suggestions 🔮 (AI "You might need..." via Jina embeddings + vector search)
- Personal best 📈 (track lowest weekly/monthly spend)
- Surprise delight 🎁 (random toast messages for mundane actions)
- Mature celebrations (brief confetti, warm sounds, no childish badges)
- Progress indicators (personal milestones, not competition)
- Price contribution count visibility

**FRs Covered:** FR58-FR64 (7 FRs)

**Additional Requirements:** GF1-GF6, UX4-UX5, UX7

**Dependencies:** Epic 1-3 (auth, pantry, lists for data sources)

---

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

### Epic 8: Admin Dashboard & Operations

**Goal:** Admins can monitor business metrics, manage users, moderate content, and configure system settings

**Key Capabilities:**
- Admin authentication with mandatory 2FA
- Role-based permissions (viewer, support, manager, super-admin)
- Comprehensive audit logging
- Business analytics dashboard (DAU/WAU/MAU, retention, funnels, cohorts)
- Revenue dashboard (MRR, ARR, ARPU, LTV, churn analysis, point liability)
- Stripe payment management (transactions, refunds, failed payments, reconciliation)
- User management (search, profiles, subscription history, trial extensions, complimentary subs)
- Receipt moderation (review flagged, OCR accuracy, AI parsing metrics, bulk approve/reject)
- Price database management (edit/delete prices, outlier detection, spam removal)
- Product catalog management (seeded items, categories, store normalization, item canonicalization)
- System health monitoring (uptime, API response times, error rates, service status, storage usage)
- Customer support tools (read-only impersonation, password reset triggers, GDPR exports/deletion)
- In-app announcements (create, schedule, segment targeting, read/dismiss tracking)
- Feature flags and configuration (toggle features, segment rollouts, loyalty rules, receipt thresholds)
- Automated reporting (CSV exports for users/revenue/analytics, scheduled weekly email reports)

**FRs Covered:** FR96-FR190 (95 FRs)

**Additional Requirements:** None (consumes data from all previous epics)

**Dependencies:** Epic 1-7 (all user data to manage and monitor)

---

## Epic Summary

| Epic | Title | User Value | FR Count | Standalone |
|------|-------|------------|----------|------------|
| **1** | Foundation & Authentication | Users can sign up and onboard with hybrid pantry | 21 FRs | ✅ Yes |
| **2** | Pantry Stock Tracker | Users track stock and auto-populate lists | 20 FRs | ✅ Yes (uses Epic 1) |
| **3** | Shopping Lists & Budget | Users create lists and stay under budget | 25 FRs | ✅ Yes (uses Epic 1-2) |
| **4** | Partner Mode | Users collaborate on lists together | 15 FRs | ✅ Yes (uses Epic 1, 3) |
| **5** | Receipt Intelligence | Users scan receipts and build price history | 18 FRs | ✅ Yes (uses Epic 1, 3) |
| **6** | Insights & Gamification | Users see progress and stay motivated | 7 FRs | ✅ Yes (uses Epic 1-3) |
| **7** | Subscription & Loyalty | Users subscribe and earn discounts | 12 FRs | ✅ Yes (uses Epic 1, 5) |
| **8** | Admin Dashboard | Admins manage and monitor system | 95 FRs | ✅ Yes (uses Epic 1-7) |

**Total: 212 Functional Requirements** mapped across 8 epics
**All 54 NFRs** addressed as cross-cutting concerns
**All 62 Additional Requirements** integrated throughout


---

# Epic Stories

## Epic 1: Foundation & Authentication

### Story 1.1: Project Foundation & Routing Setup

As a **developer**,
I want **a fully configured Expo project with TypeScript and file-based routing**,
So that **I have a solid foundation to build the app with type safety and modern navigation**.

**Acceptance Criteria:**

**Given** I have Node.js and npm installed
**When** I run `npx expo start`
**Then** the Expo development server starts successfully
**And** TypeScript compilation works without errors
**And** The file-based routing structure is in place (app/ directory)
**And** Path aliases (@/) work correctly
**And** All required dependencies are installed (Expo 55+, React Native Reanimated, etc.)

**Given** the app launches
**When** I navigate between screens
**Then** Expo Router handles navigation correctly
**And** TypeScript provides intellisense for all imports

**Technical Requirements:**
- Expo SDK 55+ with TypeScript strict mode
- `app/` directory structure for Expo Router
- Babel configured with Reanimated plugin
- Path aliases configured in tsconfig.json
- React Native Reanimated 3+ installed and configured

---

### Story 1.2: Clerk Authentication Integration

As a **new user**,
I want **to sign up with email or social providers**,
So that **I can securely access my account across devices**.

**Acceptance Criteria:**

**Given** I open the app for the first time
**When** I am not authenticated
**Then** I see the sign-in screen
**And** I can choose between email/password, Google, or Apple sign-in

**Given** I choose email/password sign-up
**When** I enter valid email and password
**Then** I receive a verification email
**And** After clicking the verification link, my account is activated
**And** I am redirected to the onboarding flow

**Given** I choose Google OAuth
**When** I complete Google authentication
**Then** my account is automatically created and verified
**And** I am redirected to the onboarding flow

**Given** I already have an account
**When** I sign in with correct credentials
**Then** I am redirected to the main app (Pantry screen)

**Technical Requirements:**
- Clerk SDK integrated with ClerkProvider
- Sign-in screen with email/password form
- Sign-up screen with email verification flow
- OAuth buttons for Google and Apple
- JWT token management with Convex
- FR1, FR2, FR3, FR85 (animated welcome)

---

### Story 1.3: Convex Backend & User Schema

As a **developer**,
I want **a Convex backend with user schema and authentication**,
So that **user data is stored securely and synced in real-time**.

**Acceptance Criteria:**

**Given** Clerk authentication is configured
**When** a user signs up or signs in
**Then** their user record is automatically created in Convex
**And** The user's Clerk ID is stored in the database
**And** The user's email and profile data are synced

**Given** a user exists in Convex
**When** I query the `users` table
**Then** I can retrieve the user by their ID
**And** The user record includes: clerkId, email, name, profilePicture, country, currency, cuisinePreferences, createdAt

**Given** a user updates their profile in Clerk
**When** the webhook fires
**Then** the Convex user record is automatically updated

**Technical Requirements:**
- `convex/schema.ts` with `users` table
- User fields: clerkId, email, name, profilePicture, country, currency, cuisinePreferences (array), createdAt
- `convex/users.ts` with queries: `getCurrent`, `getByClerkId`
- `convex/users.ts` with mutations: `getOrCreate`, `update`, `setOnboardingData`
- Clerk JWT issuer configured in Convex
- `convex/auth.config.ts` with Clerk domain
- FR1, FR2, FR3

---

### Story 1.4: Device Capabilities & Graceful Degradation

As a **developer**,
I want **a device tier detection system**,
So that **the app adapts to different device capabilities automatically**.

**Acceptance Criteria:**

**Given** the app launches on any device
**When** the device capabilities are detected
**Then** the system assigns a tier: Premium, Enhanced, or Baseline
**And** The tier is based on: OS version, blur support, haptic support, animation support

**Given** the app runs on iPhone 14+ with iOS 16+
**When** capabilities are checked
**Then** the device is assigned Premium tier
**And** Liquid Glass blur effects are enabled

**Given** the app runs on Android 12+ or older iOS
**When** capabilities are checked
**Then** the device is assigned Enhanced tier
**And** Gradient fallbacks replace blur effects

**Given** the app runs on older devices
**When** capabilities are checked
**Then** the device is assigned Baseline tier
**And** Solid colors replace gradients and blur

**Technical Requirements:**
- `lib/capabilities/deviceTier.ts` with tier detection logic
- `hooks/useDeviceCapabilities.ts` hook
- Support for 3 tiers: Premium, Enhanced, Baseline
- Detect: OS version, blur support, haptic support
- GD1-GD8 requirements

---

### Story 1.5: Adaptive UI Components & Design System

As a **developer**,
I want **platform-adaptive UI components with tier-based styling**,
So that **the app looks premium on capable devices and works well on all devices**.

**Acceptance Criteria:**

**Given** I use the `<AdaptiveCard>` component on a Premium iOS device
**When** the component renders
**Then** it displays with Liquid Glass blur effect
**And** The blur intensity is configurable

**Given** I use the `<AdaptiveCard>` component on an Enhanced device
**When** the component renders
**Then** it displays with gradient background
**And** The gradient mimics the blur appearance

**Given** I use the `<AdaptiveCard>` component on a Baseline device
**When** the component renders
**Then** it displays with solid background color
**And** The shadow is appropriate for the platform

**Given** I need design tokens
**When** I use `useDeviceCapabilities()` hook
**Then** I receive tier-appropriate tokens for: borderRadius, shadow, spacing, colors

**Technical Requirements:**
- `components/ui/AdaptiveCard.tsx` component
- `lib/design/tokens.ts` with tier-based tokens
- Support for iOS Liquid Glass and Android Material You
- Export from `components/ui/index.ts`
- NFR1, NFR2, NFR3 (performance, responsiveness, accessibility)

---

### Story 1.6: Haptic Feedback System

As a **user**,
I want **tactile feedback when I interact with the app**,
So that **the experience feels responsive and satisfying**.

**Acceptance Criteria:**

**Given** I tap a button on a device with haptic support
**When** the button is pressed
**Then** I feel a light haptic feedback

**Given** I complete an action (like adding an item)
**When** the action succeeds
**Then** I feel a success haptic (medium impact)

**Given** I encounter an error or warning
**When** the error appears
**Then** I feel a notification haptic

**Given** the app runs on a device without haptic support
**When** I interact with the app
**Then** no errors occur (graceful degradation)
**And** The app functions normally without haptics

**Technical Requirements:**
- `lib/utils/safeHaptics.ts` wrapper
- Detect haptic support per device tier
- Haptic types: light, medium, heavy, success, warning, error, selection
- Safe wrapper that doesn't crash on unsupported devices
- GD4 (haptics graceful degradation)

---

### Story 1.7: Location Detection & Multi-Select Cuisine Preferences

As a **new user**,
I want **the app to detect my location and let me select cuisines I cook**,
So that **my pantry is seeded with realistic items I'll actually use**.

**Acceptance Criteria:**

**Given** I complete sign-up and reach onboarding
**When** the location/cuisine screen loads
**Then** the app attempts to auto-detect my country based on device location (if permission granted)
**And** The detected country and currency are shown (e.g., "You're in the UK - prices in GBP")

**Given** I grant location permission
**When** the app detects my location
**Then** my country is stored in my user profile
**And** The currency is auto-detected (e.g., UK → GBP, USA → USD)

**Given** I deny location permission
**When** the location/cuisine screen loads
**Then** I can manually select my country from a list
**And** The currency defaults based on country selection

**Given** I see the cuisine selection options
**When** I review the 12+ cuisine options
**Then** I see: British, Nigerian, Indian, Chinese, Italian, Pakistani, Caribbean, Mexican, Middle Eastern, Japanese, Korean, Thai, Vietnamese, Ethiopian, etc.
**And** Each cuisine has a representative icon/emoji

**Given** I select multiple cuisines
**When** I tap on cuisine options
**Then** they are highlighted with a checkmark
**And** I feel subtle haptic feedback for each selection
**And** I can select as many cuisines as I want (multi-select)

**Given** I finish selecting cuisines
**When** I tap "Continue"
**Then** my country, currency, and cuisine preferences are saved to Convex
**And** I proceed to the AI pantry seeding step

**Technical Requirements:**
- `app/onboarding/cuisine-selection.tsx` screen
- Location permission request using Expo Location
- Country detection via device location or IP fallback
- Currency auto-detection logic
- 12+ cuisine options with icons
- Multi-select with checkmarks and haptics
- FR75, FR76, FR86, FR89

---

### Story 1.8: AI-Powered Hybrid Pantry Seeding with Gemini

As a **new user**,
I want **200 pantry items automatically generated based on my location AND cuisine preferences**,
So that **I get realistic local items plus cultural foods I actually cook**.

**Acceptance Criteria:**

**Given** I selected my location and cuisines in the previous step
**When** the AI seeding screen loads
**Then** I see a loading animation with a message: "Generating your personalized pantry..."
**And** A Gemini LLM call generates 200 hybrid items: 60% local staples (based on country) + 40% cultural items (based on selected cuisines)

**Given** Gemini is generating items for a UK user who selected Nigerian + Indian cuisines
**When** the LLM responds
**Then** 120 items are UK/universal staples (milk, bread, eggs, butter, tea, potatoes, Heinz beans, cheddar, etc.)
**And** 40 items are Nigerian items (egusi, palm oil, plantain, fufu flour, etc.)
**And** 40 items are Indian items (cumin, turmeric, basmati rice, ghee, etc.)
**And** Each item includes: name, category, typical stockLevel

**Given** the AI generation completes successfully
**When** the items are received
**Then** they are temporarily stored (not yet saved to database)
**And** I am redirected to the seed item review screen

**Given** the AI generation fails
**When** an error occurs
**Then** I see a friendly error message
**And** I can retry the generation
**Or** I can skip and start with an empty pantry

**Technical Requirements:**
- `convex/actions.ts` with Gemini API integration
- Action: `generateHybridSeedItems(country: string, cuisines: string[])` returns 200 items
- Hybrid prompt: 60% local/universal items (based on country) + 40% cultural items (split by cuisine count)
- Loading screen with animation
- Error handling with retry option
- FR16, GF8

---

### Story 1.9: Seed Item Review & Customization

As a **new user**,
I want **to review and remove unwanted items from the AI-generated list**,
So that **my pantry only contains items I actually use**.

**Acceptance Criteria:**

**Given** I receive 200 AI-generated items
**When** the review screen loads
**Then** I see all 200 items in a scrollable grid grouped by category
**And** Each item shows: name, category, checkmark (selected by default)
**And** I see counts: "Local: 120 items | Cultural: 80 items"

**Given** I see an item I don't use
**When** I tap the item
**Then** it is deselected (checkmark removed)
**And** A subtle haptic feedback confirms the action

**Given** I accidentally deselect an item
**When** I tap it again
**Then** it is re-selected (checkmark appears)

**Given** I finish reviewing items
**When** I tap "Save to Pantry"
**Then** all selected items are saved to my pantry in Convex
**And** Each item gets: userId, name, category, stockLevel: "full", createdAt
**And** I see a success animation (cascade effect)
**And** I am redirected to the budget setup step

**Given** I remove all items
**When** I tap "Save to Pantry"
**Then** I see a warning: "You haven't selected any items. Start with an empty pantry?"
**And** If I confirm, I proceed with an empty pantry

**Technical Requirements:**
- `app/onboarding/seed-review.tsx` screen
- Grid view with checkboxes grouped by category
- Show local vs cultural item counts
- Convex mutation: `bulkCreatePantryItems(userId, items[])`
- Cascade animation for items being saved
- FR16, FR87

---

## Epic 2: Pantry Stock Tracker

### Story 2.1: Pantry Schema & Basic CRUD Operations

As a **user**,
I want **to add, view, edit, and delete pantry items**,
So that **I can maintain an accurate list of what's in my kitchen**.

**Acceptance Criteria:**

**Given** I am a logged-in user
**When** I access the Pantry tab
**Then** I can see all my pantry items from Convex in real-time

**Given** I want to add a new item
**When** I tap the "+" button
**Then** I see a form with fields: name, category, initialStockLevel
**And** I can select from predefined categories (Produce, Dairy, Meat, Pantry Staples, Frozen, Beverages, Condiments, Snacks)
**And** After submitting, the item is saved to Convex with userId, name, category, stockLevel, lastUpdated, createdAt

**Given** I want to edit an existing item
**When** I long-press on an item
**Then** I see options: Edit, Delete
**And** If I tap Edit, I can modify the name and category
**And** Changes are saved in real-time to Convex

**Given** I want to delete an item
**When** I long-press and select Delete
**Then** I see a confirmation dialog
**And** After confirming, the item is removed from Convex
**And** I feel a haptic feedback

**Technical Requirements:**
- `convex/schema.ts`: `pantryItems` table with userId, name, category, stockLevel, lastUpdated, createdAt
- `convex/pantryItems.ts`: queries (`getByUser`, `getById`) and mutations (`create`, `update`, `delete`, `updateStockLevel`)
- `app/(app)/(tabs)/index.tsx`: Pantry screen with real-time Convex query
- Form validation for required fields
- FR8, FR9, FR15

---

### Story 2.2: Pantry Grid View with Categories

As a **user**,
I want **to see my pantry items in a categorized grid**,
So that **I can quickly find what I'm looking for**.

**Acceptance Criteria:**

**Given** I have pantry items in multiple categories
**When** I open the Pantry screen
**Then** I see items grouped by category in collapsible sections
**And** Each section shows the category name and item count (e.g., "Produce (12)")

**Given** I tap on a category header
**When** the section is collapsed
**Then** it expands to show all items in that category
**And** I feel a subtle haptic feedback

**Given** I see an item in the grid
**When** I look at the item card
**Then** I see: item name, stock level indicator (color-coded circle: 🟢 Stocked, 🟡 Good, 🟠 Low, 🔴 Out)
**And** The card uses AdaptiveCard component for platform styling

**Given** I have no items in a category
**When** I view that category
**Then** I see an empty state: "No items yet. Tap + to add."

**Technical Requirements:**
- Grid layout with 2-3 columns (responsive to device width)
- Group items by category with collapsible sections
- Color-coded stock indicators
- Use `<AdaptiveCard>` for item cards
- FR8, FR14

---

### Story 2.3: Stock Level Management (Tap-and-Hold Picker)

As a **user**,
I want **to update stock levels with a tap-and-hold picker**,
So that **I can quickly mark items as Stocked, Good, Low, or Out**.

**Acceptance Criteria:**

**Given** I want to update an item's stock level
**When** I tap and hold on an item card
**Then** a picker appears with 4 options: 🟢 Stocked, 🟡 Good, 🟠 Low, 🔴 Out
**And** The current stock level is pre-selected
**And** I feel a haptic feedback when the picker appears

**Given** the picker is open
**When** I drag my finger to a different stock level
**Then** the option highlights
**And** I feel a selection haptic for each level I pass over

**Given** I release my finger on a stock level
**When** I lift my finger
**Then** the item's stock level is updated in Convex
**And** The item card reflects the new color-coded indicator
**And** I feel a success haptic
**And** The picker closes with a smooth animation

**Given** I tap and hold but release outside the picker
**When** I lift my finger
**Then** no changes are made (cancelled)
**And** The picker closes

**Technical Requirements:**
- Tap-and-hold gesture recognizer (500ms threshold)
- Radial picker UI with 4 stock levels
- Haptic feedback for picker open, selection change, and confirm
- Optimistic update (instant UI update, then Convex sync)
- FR10, FR11

---

### Story 2.4: Quick Swipe to Decrease Stock

As a **user**,
I want **to swipe left on an item to decrease its stock level**,
So that **I can quickly update stock as I use items**.

**Acceptance Criteria:**

**Given** an item is at "Stocked" level
**When** I swipe left on the item
**Then** it changes to "Good"
**And** I feel a light haptic feedback
**And** The color indicator updates immediately

**Given** an item is at "Good" level
**When** I swipe left
**Then** it changes to "Low"
**And** I feel a light haptic feedback

**Given** an item is at "Low" level
**When** I swipe left
**Then** it changes to "Out"
**And** I feel a warning haptic feedback
**And** The item triggers the auto-add to shopping list flow (Story 2.5)

**Given** an item is already "Out"
**When** I swipe left
**Then** nothing happens (already at minimum)

**Given** I accidentally swipe
**When** I immediately swipe right
**Then** the item returns to the previous stock level
**And** This works within 3 seconds (undo window)

**Technical Requirements:**
- Swipe gesture recognizer (horizontal only)
- Smooth animation for stock level change
- Undo functionality (3-second window)
- Optimistic update with Convex sync
- FR12

---

### Story 2.5: Auto-Add "Out" Items to Shopping List

As a **user**,
I want **items marked "Out" to automatically appear on my shopping list**,
So that **I don't forget to buy them**.

**Acceptance Criteria:**

**Given** I mark an item as "Out" (via swipe or picker)
**When** the stock level changes to "Out"
**Then** the item flies off the screen with an animation toward the "Lists" tab
**And** The item is automatically added to my active shopping list in Convex
**And** I see a toast message: "Added [item name] to shopping list"
**And** I feel a success haptic

**Given** I don't have an active shopping list
**When** an item becomes "Out"
**Then** a new shopping list is created called "Shopping List [date]"
**And** The item is added to this new list

**Given** the item is already on my shopping list
**When** I mark it "Out" again
**Then** the quantity is incremented (or nothing happens if quantity = 1)
**And** I see a toast: "[item name] already on list"

**Given** I mark multiple items as "Out" quickly
**When** several items reach "Out" status
**Then** each item flies to the Lists tab sequentially (not all at once)
**And** A batch toast appears: "Added 3 items to shopping list"

**Technical Requirements:**
- Fly-off animation using React Native Reanimated
- Convex mutation: `addToShoppingList(pantryItemId, userId)`
- Toast notification component
- Handle edge case: no active list (create one)
- FR13

---

### Story 2.6: Search & Filter Pantry Items

As a **user**,
I want **to search and filter my pantry items**,
So that **I can quickly find specific items in a large pantry**.

**Acceptance Criteria:**

**Given** I have many pantry items
**When** I pull down on the pantry screen
**Then** a search bar appears at the top

**Given** I type in the search bar
**When** I enter text (e.g., "milk")
**Then** the pantry grid filters in real-time to show matching items
**And** Matching is case-insensitive and matches partial names
**And** Items are highlighted that match the search term

**Given** I have filtered items
**When** I clear the search bar
**Then** all items reappear grouped by category

**Given** I want to filter by stock level
**When** I tap the filter icon
**Then** I see checkboxes for: Stocked, Good, Low, Out
**And** I can select multiple stock levels
**And** Only items matching the selected levels are shown

**Given** I have both search and filter active
**When** I use both simultaneously
**Then** items must match BOTH the search term AND the selected stock levels

**Technical Requirements:**
- Search bar component with debounced input (300ms)
- Filter modal with multi-select checkboxes
- Real-time filtering (no re-fetch, filter on client side)
- Highlight matching text in search results
- FR8 (implicit search/filter requirement)

---

## Epic 3: Shopping Lists with Budget Control

### Story 3.1: Shopping List Schema & Basic CRUD

As a **user**,
I want **to create, view, edit, and delete shopping lists**,
So that **I can organize my shopping trips**.

**Acceptance Criteria:**

**Given** I am logged in
**When** I tap the "Lists" tab
**Then** I see all my shopping lists ordered by creation date (newest first)

**Given** I want to create a new list
**When** I tap the "+" button
**Then** I see a form with fields: name, budget (optional)
**And** After submitting, the list is created in Convex with: userId, name, budget, createdAt, status: "planning"

**Given** I want to edit a list
**When** I tap on a list and then tap "Edit"
**Then** I can modify the name and budget
**And** Changes save in real-time to Convex

**Given** I want to delete a list
**When** I swipe left on a list and tap "Delete"
**Then** I see a confirmation dialog
**And** After confirming, the list and all its items are removed from Convex

**Given** I tap on a list
**When** I select it
**Then** I navigate to the list detail screen showing all items on that list

**Technical Requirements:**
- `convex/schema.ts`: `shoppingLists` table with userId, name, budget, totalCost, status, createdAt
- `convex/schema.ts`: `listItems` table with listId, pantryItemId, name, price, quantity, priority, isChecked, addedAt
- `convex/shoppingLists.ts`: queries (`getByUser`, `getById`) and mutations (`create`, `update`, `delete`)
- `app/(app)/(tabs)/lists.tsx`: Lists screen
- `app/(app)/list/[id].tsx`: List detail screen
- FR17, FR18, FR19, FR20

---

### Story 3.2: Add Items to List (Search from Pantry)

As a **user**,
I want **to add items from my pantry to a shopping list**,
So that **I can quickly build my list from items I know I need**.

**Acceptance Criteria:**

**Given** I'm viewing a shopping list
**When** I tap "Add Item"
**Then** I see a search interface showing all my pantry items

**Given** I search for an item in the search bar
**When** I type (e.g., "milk")
**Then** pantry items matching the search appear in real-time
**And** Each item shows: name, category, current stock level

**Given** I tap on a pantry item
**When** I select it
**Then** it's added to the shopping list with: name (from pantry), quantity: 1, price: null (to be filled later)
**And** I see a success toast: "Added [item] to list"
**And** I feel a success haptic

**Given** I want to add an item not in my pantry
**When** I tap "Add Custom Item"
**Then** I can enter: name, price (optional), quantity
**And** After submitting, it's added to the list

**Given** an item is already on the list
**When** I try to add it again
**Then** the quantity is incremented instead of creating a duplicate
**And** I see a toast: "[item] quantity updated to 2"

**Technical Requirements:**
- Search interface with real-time pantry item filtering
- Convex mutation: `addItemToList(listId, pantryItemId, quantity)`
- Handle custom items (not linked to pantry)
- Prevent duplicates (increment quantity instead)
- FR21, FR22, FR23

---

### Story 3.3: Running Total & Budget Display

As a **user**,
I want **to see my running total and remaining budget**,
So that **I know how much I'm spending in real-time**.

**Acceptance Criteria:**

**Given** I set a budget for my list (e.g., £50)
**When** I view the list
**Then** I see at the top: "Budget: £50 | Spent: £0 | Remaining: £50"

**Given** I add items with prices
**When** I enter prices for items (e.g., milk £1.20, bread £0.90)
**Then** the running total updates in real-time
**And** The display shows: "Budget: £50 | Spent: £2.10 | Remaining: £47.90"

**Given** my total exceeds the budget
**When** the running total goes over (e.g., Spent: £52)
**Then** the "Remaining" shows negative in red: "Remaining: -£2" in red text
**And** I see a warning icon

**Given** I haven't set a budget
**When** I view the list
**Then** I only see: "Spent: £2.10"
**And** No budget or remaining amount is shown

**Given** I edit an item's price
**When** I change a price (e.g., milk £1.20 → £1.50)
**Then** the running total updates immediately

**Technical Requirements:**
- Real-time calculation of total from all list items
- Budget display component at top of list
- Color coding: green (under budget), yellow (approaching budget), red (over budget)
- Convex query to sum all item prices
- FR24, FR25

---

### Story 3.4: Safe Zone Indicator (Color Glow)

As a **user**,
I want **to see a color glow indicating my budget safety**,
So that **I know at a glance if I'm on track**.

**Acceptance Criteria:**

**Given** my total is under 75% of budget (e.g., £30 of £50)
**When** I view the list
**Then** the list card has a green glow/border
**And** The safe zone indicator shows: "Safe Zone: £7.50 remaining buffer"

**Given** my total is between 75% and 100% of budget (e.g., £42 of £50)
**When** I view the list
**Then** the list card has a yellow/orange glow
**And** The safe zone indicator shows: "Approaching Budget Limit"

**Given** my total exceeds 100% of budget (e.g., £52 of £50)
**When** I view the list
**Then** the list card has a red glow
**And** The safe zone indicator shows: "Over Budget: £2"

**Given** I add an item that pushes me over 75% threshold
**When** the total crosses 75%
**Then** the glow transitions from green → yellow with smooth animation
**And** I feel a warning haptic

**Technical Requirements:**
- Border glow component with 3 states: green, yellow, red
- 75% threshold calculation
- Smooth color transition animations
- Haptic feedback on threshold crossing
- FR26

---

### Story 3.5: Budget Lock Mode

As a **user**,
I want **to lock my budget to prevent accidentally going over**,
So that **I can shop with confidence**.

**Acceptance Criteria:**

**Given** I'm viewing a list with a budget set
**When** I tap the "Lock Budget" toggle
**Then** budget lock mode is enabled
**And** I see a lock icon next to the budget display

**Given** budget lock is enabled
**When** I try to add an item that would exceed the budget
**Then** I see a blocking modal: "Adding this item would exceed your budget. Remove items or unlock budget to continue."
**And** The item is NOT added to the list
**And** I feel an error haptic

**Given** budget lock is enabled and I'm at the limit
**When** I try to increase an item's price
**Then** I see the same blocking modal
**And** The price change is NOT saved

**Given** I want to override the lock
**When** I tap "Unlock Budget" in the modal
**Then** budget lock is disabled
**And** I can add the item that exceeded the budget

**Given** budget lock is enabled
**When** I remove an item or decrease prices
**Then** I can freely add items again (as long as I stay under budget)

**Technical Requirements:**
- Toggle switch for budget lock mode
- Validation logic: prevent actions that exceed budget
- Blocking modal with explanation
- Lock state persisted in Convex (list.budgetLocked: boolean)
- FR27

---

### Story 3.6: Impulse Fund (10% Buffer)

As a **user**,
I want **a 10% impulse fund as a buffer**,
So that **I can grab spontaneous items without guilt**.

**Acceptance Criteria:**

**Given** I set a budget of £50
**When** I view the list
**Then** I see: "Budget: £50 | Impulse Fund: £5 (10%)"
**And** The impulse fund is calculated automatically

**Given** my total is £48 (within budget)
**When** I check the impulse fund
**Then** I see: "Impulse Fund: £7 remaining" (£50 + £5 - £48)
**And** The impulse fund shows in green

**Given** I've spent my main budget (£50) but not the impulse fund
**When** my total is £52
**Then** I see: "Budget Exceeded | Impulse Fund: £3 remaining"
**And** The main budget shows red, but impulse fund shows yellow

**Given** I've spent my main budget AND impulse fund
**When** my total is £56 (over £55 limit)
**Then** I see: "Over Budget + Impulse Fund: £1"
**And** Both budgets show red

**Given** budget lock is enabled
**When** I reach my main budget (£50)
**Then** I can still add items up to the impulse fund limit (£55 total)
**And** I only get blocked at £55

**Technical Requirements:**
- Calculate impulse fund as 10% of budget
- Display impulse fund separately from main budget
- Color coding for fund states
- Budget lock respects impulse fund (allows up to budget + 10%)
- FR28

---

### Story 3.7: Mid-Shop Add Flow (3 Options)

As a **user**,
I want **3 options when adding items mid-shop**,
So that **I can decide how to handle unexpected items**.

**Acceptance Criteria:**

**Given** I'm shopping (list status: "shopping") and I want to add an item
**When** I tap "Add Item" while shopping
**Then** I see a modal with 3 options:
1. "Add to Budget" (increase budget by item price)
2. "Use Impulse Fund" (default, highlighted)
3. "Defer to Next Trip" (add to a "Next Time" list)

**Given** I select "Add to Budget"
**When** I confirm
**Then** the item is added to the list
**And** the budget is increased by the item's price
**And** I see a toast: "Budget increased to £55"

**Given** I select "Use Impulse Fund" (default)
**When** I confirm
**Then** the item is added using the impulse fund
**And** I see a toast: "Added [item] using impulse fund"
**And** The impulse fund remaining decreases

**Given** I select "Defer to Next Trip"
**When** I confirm
**Then** the item is added to a special "Next Time" list
**And** I see a toast: "[item] saved for next trip"
**And** The item does NOT affect the current budget

**Given** I have no impulse fund remaining
**When** I tap "Add Item"
**Then** "Use Impulse Fund" option is grayed out
**And** I can only choose "Add to Budget" or "Defer to Next Trip"

**Technical Requirements:**
- Mid-shop modal with 3 radio options
- Default selection: "Use Impulse Fund"
- Create "Next Time" list if it doesn't exist
- Budget adjustment mutation for option 1
- FR29, FR30, FR31

---

### Story 3.8: Check Off Items While Shopping

As a **user**,
I want **to check off items as I shop**,
So that **I can track what I've already grabbed**.

**Acceptance Criteria:**

**Given** I'm viewing a shopping list
**When** I tap the checkbox next to an item
**Then** the item is marked as checked with a strikethrough
**And** I feel a light haptic feedback

**Given** I accidentally check an item
**When** I tap the checkbox again
**Then** the item is unchecked (strikethrough removed)

**Given** I check off all items
**When** the last item is checked
**Then** I see a celebration animation (confetti)
**And** I see a modal: "All done! Complete this trip?"
**And** If I confirm, the list status changes to "completed"

**Given** I'm shopping and check off items
**When** I view the list
**Then** checked items move to the bottom of the list
**And** Unchecked items stay at the top (priority order)

**Given** I complete a trip under budget
**When** the list is completed
**Then** I see a special celebration: "Amazing! You saved £5!"
**And** I see a savings animation

**Technical Requirements:**
- Checkbox component with strikethrough styling
- Convex mutation: `toggleItemChecked(listItemId)`
- Confetti animation when all items checked
- Completion modal with savings calculation
- FR32, FR93 (celebration)

---

### Story 3.9: Item Priority with Swipe Gestures

As a **user**,
I want **to set item priority with swipe gestures**,
So that **I know what to buy first if I'm near my budget**.

**Acceptance Criteria:**

**Given** I have items on my list
**When** I swipe right on an item
**Then** it's marked as "High Priority" with a 🔴 red indicator
**And** I feel a medium haptic feedback

**Given** an item is High Priority
**When** I swipe right again
**Then** it's marked as "Must Have" with a 🔴🔴 double red indicator
**And** I feel a heavy haptic feedback

**Given** I swipe left on an item
**When** I swipe left
**Then** it's marked as "Nice to Have" with a 🟡 yellow indicator
**And** I feel a light haptic feedback

**Given** I view my list
**When** items have different priorities
**Then** they are sorted: Must Have → High Priority → Normal → Nice to Have
**And** Each priority section is visually separated

**Given** I'm near my budget and have "Nice to Have" items
**When** my total reaches 90% of budget
**Then** "Nice to Have" items are grayed out with a note: "Remove these if needed"

**Technical Requirements:**
- Swipe gesture recognizer (left and right)
- Priority levels: Must Have (2), High (1), Normal (0), Nice (-1)
- Automatic sorting by priority
- Visual indicators (color dots)
- Haptic feedback per priority level
- FR33

---

### Story 3.10: Smart Suggestions with Jina AI

As a **user**,
I want **AI-powered suggestions based on my list**,
So that **I don't forget commonly purchased items**.

**Acceptance Criteria:**

**Given** I have items on my list (e.g., pasta, tomatoes, garlic)
**When** I view the list
**Then** I see a "Suggestions" section at the bottom
**And** The suggestions show: "You might need: olive oil, parmesan, basil"

**Given** the AI suggests items
**When** the suggestions are generated
**Then** they are based on Jina AI embeddings of my current list items
**And** The suggestions match common ingredient pairings

**Given** I tap on a suggested item
**When** I select it
**Then** the item is added to my list with quantity: 1
**And** I see a toast: "Added [item] to list"

**Given** I dismiss a suggestion
**When** I swipe left on a suggestion
**Then** it's removed from the suggestions list
**And** It won't be suggested again for this list

**Given** I add a suggested item
**When** the item is added
**Then** the suggestions refresh with new recommendations
**And** The new suggestions consider the newly added item

**Technical Requirements:**
- Convex action: `generateSuggestions(listItems: string[])` using Jina AI embeddings
- Embeddings-based similarity search
- Suggestion cards with "Add" and "Dismiss" actions
- Cache suggestions to avoid repeated API calls
- FR34, FR35

---

## Epic 4: Partner Mode & Collaboration

### Story 4.1: Partner Invite System (Email & Share Code)

As a **list owner**,
I want **to invite partners to my shopping list**,
So that **we can collaborate on our grocery shopping**.

**Acceptance Criteria:**

**Given** I'm viewing a shopping list I own
**When** I tap the "Share" button
**Then** I see two invite options: "Invite by Email" and "Share Code"

**Given** I choose "Invite by Email"
**When** I enter a partner's email address
**Then** an invite is sent via email with a link to accept
**And** The invite includes: list name, my name, and an "Accept Invite" button
**And** I see a toast: "Invite sent to [email]"

**Given** I choose "Share Code"
**When** I tap it
**Then** I see a 6-character code (e.g., "A3B9K7")
**And** I can copy the code or share it via any app
**And** The code is valid for 24 hours

**Given** a partner receives my invite
**When** they click "Accept Invite" or enter the share code
**Then** they are added to the list with "viewer" role (default)
**And** I receive a notification: "[Partner] joined your list"

**Given** I want to revoke access
**When** I tap "Manage Partners"
**Then** I see all partners on the list
**And** I can tap "Remove" to revoke their access
**And** They receive a notification: "You've been removed from [List Name]"

**Technical Requirements:**
- `convex/schema.ts`: `listPartners` table with listId, userId, role, invitedBy, invitedAt
- `convex/schema.ts`: `inviteCodes` table with code, listId, expiresAt
- Convex mutation: `invitePartner(listId, email)` and `generateShareCode(listId)`
- Email service integration (or use Clerk's email API)
- 6-character code generator (alphanumeric, case-insensitive)
- FR191, FR203, FR204

---

### Story 4.2: Role Management (Viewer, Approver, Editor)

As a **list owner**,
I want **to assign different roles to partners**,
So that **I can control what they can do with the list**.

**Acceptance Criteria:**

**Given** I have partners on my list
**When** I tap "Manage Partners"
**Then** I see each partner with their current role

**Given** I want to change a partner's role
**When** I tap on a partner
**Then** I see 3 role options: Viewer, Approver, Editor
**And** Each role has a description:
  - **Viewer**: "Can see the list in real-time but cannot edit"
  - **Approver**: "Can add items (you must approve) and must approve your items (bidirectional approval)"
  - **Editor**: "Can add, edit, and remove items freely (no approval needed)"

**Given** I select "Viewer" role
**When** I confirm
**Then** the partner can see the list but all edit buttons are disabled for them
**And** They see a message: "You have view-only access to this list"

**Given** I select "Approver" role
**When** I confirm
**Then** items I add show as "Pending Approval" to them with ⏳ hourglass
**And** Items they add show as "Pending Approval" to me with ⏳ hourglass
**And** Both parties must approve each other's additions (bidirectional)

**Given** I select "Editor" role
**When** I confirm
**Then** the partner can add, edit, and remove items freely
**And** No approval workflow is required

**Given** a partner has "Viewer" role and tries to edit
**When** they tap an edit button
**Then** they see a toast: "You don't have permission to edit this list"
**And** No changes are made

**Technical Requirements:**
- Role field in `listPartners` table: "viewer" | "approver" | "editor"
- Role-based permissions enforcement in Convex mutations
- UI disables edit buttons for viewers
- Role change notification sent to partner
- FR192, FR193, FR194, FR195

---

### Story 4.3: Bidirectional Approval Workflow

As a **user with an approver partner**,
I want **items added by either party to require approval from the other**,
So that **we both have oversight on what's being purchased**.

**Acceptance Criteria:**

**Given** I have a partner with "Approver" role
**When** I add an item to the list
**Then** the item shows with ⏳ hourglass indicator and status: "Pending Approval"
**And** The item appears dimmed/grayed out
**And** My partner receives a push notification: "[Your name] added [item] - approval needed"

**Given** my partner views the list
**When** they see pending items
**Then** each item has two buttons: ✅ "Approve" and 🔴 "Contest"

**Given** my partner approves an item
**When** they tap ✅ "Approve"
**Then** the item status changes to "Approved"
**And** The ⏳ hourglass is replaced with ✅ green checkmark
**And** The item is no longer dimmed
**And** I receive a notification: "[Partner] approved [item]"
**And** Both of us feel a success haptic

**Given** my partner contests an item
**When** they tap 🔴 "Contest"
**Then** they are prompted to enter a reason
**And** The item flows to Story 4.4 (Contest Workflow)

**Given** I have multiple pending items
**When** my partner views the list
**Then** pending items are grouped at the top with a badge: "3 items need your approval"

**Given** my partner (approver) adds an item to the list
**When** they add it
**Then** the item shows with ⏳ hourglass indicator for me (owner)
**And** I receive a push notification: "[Partner] added [item] - approval needed"
**And** I can approve or contest their addition

**Given** my partner and I want to discuss an item before approving
**When** either of us taps 💬 on a pending item
**Then** we can add comments to discuss it
**And** Both receive notifications for new comments
**And** After discussion, either party can approve or contest

**Technical Requirements:**
- Add `approvalStatus` field to `listItems`: "pending" | "approved" | "contested"
- Convex mutation: `approveItem(listItemId, approverId)`
- Push notification service integration
- Haptic feedback for approval actions
- FR194, FR196, FR197

---

### Story 4.4: Contest Workflow with Comments

As an **approver partner**,
I want **to contest items and explain why**,
So that **the list owner understands my concern**.

**Acceptance Criteria:**

**Given** I see an item I don't agree with
**When** I tap 🔴 "Contest"
**Then** I see a modal: "Why are you contesting this item?"
**And** I can enter a reason (e.g., "Too expensive", "Already have this", "Healthier alternative available")
**And** I can select from quick reasons or write custom text

**Given** I submit a contest
**When** I confirm
**Then** the item shows a 🔴 red badge with "Contested"
**And** The item displays my reason below it
**And** The list owner receives a notification: "[Partner] contested [item]: [reason]"
**And** Both of us feel a warning haptic

**Given** the list owner views a contested item
**When** they see it
**Then** they have two options: "Keep Item" or "Remove Item"
**And** They can also add a comment to discuss

**Given** the list owner keeps a contested item
**When** they tap "Keep Item"
**Then** the item status changes to "Approved (Overridden)"
**And** The 🔴 badge changes to ⚠️ yellow warning badge
**And** My reason is still visible

**Given** anyone wants to comment on an item
**When** they tap 💬 speech bubble icon
**Then** they see a comment thread with all previous comments
**And** They can add a new comment
**And** All partners receive notifications for new comments

**Given** I view an item with comments
**When** comments exist
**Then** I see a 💬 badge with comment count (e.g., "💬 3")
**And** Tapping it opens the full comment thread

**Technical Requirements:**
- `convex/schema.ts`: `itemComments` table with listItemId, userId, text, createdAt
- Convex mutation: `contestItem(listItemId, reason)` and `resolveContest(listItemId, decision)`
- Comment thread component
- Contest reason templates + custom text input
- FR198, FR199, FR200, FR201, FR202, FR205

---

### Story 4.5: Real-time Sync & Notifications

As a **partner on a shared list**,
I want **to see changes in real-time**,
So that **everyone stays on the same page**.

**Acceptance Criteria:**

**Given** I'm viewing a shared list
**When** another partner adds an item
**Then** I see the item appear instantly (no refresh needed)
**And** I see a subtle toast: "[Partner] added [item]"
**And** I feel a light haptic feedback

**Given** I'm viewing a shared list
**When** another partner checks off an item
**Then** the item strikethrough appears instantly
**And** If we both check off the last item simultaneously, only one celebration shows

**Given** I receive a partner action notification
**When** my partner approves, contests, or comments
**Then** I receive a push notification even if the app is closed
**And** Tapping the notification opens the list directly

**Given** I'm offline and a partner makes changes
**When** I come back online
**Then** I see all changes sync automatically
**And** If there's a conflict (e.g., we both edited the same item), the latest change wins

**Given** multiple partners are editing simultaneously
**When** we all make changes
**Then** everyone sees each other's changes in real-time
**And** Convex handles conflict resolution automatically

**Given** I leave a shared list
**When** I tap "Leave List"
**Then** I'm removed as a partner
**And** The list owner receives a notification: "[Partner] left your list"
**And** I no longer see the list in my Lists tab

**Technical Requirements:**
- Convex real-time queries automatically sync changes
- Push notification service (Expo Notifications)
- Notification handlers for: approval, contest, comment, item added/removed
- Optimistic updates for instant UI feedback
- Conflict resolution (last-write-wins)
- FR193, FR201, FR202

---

## Epic 5: Receipt Intelligence & Price History

### Story 5.1: Camera Receipt Capture

As a **user**,
I want **to capture my receipt with my phone camera**,
So that **I can digitize my shopping trip**.

**Acceptance Criteria:**

**Given** I completed a shopping trip
**When** I tap the "Scan" tab
**Then** I see a camera interface with guidance: "Position receipt within frame"

**Given** the camera is open
**When** I position my receipt in the viewfinder
**Then** I see corner detection highlights showing the receipt boundaries
**And** The app auto-detects when the receipt is in focus

**Given** the receipt is properly positioned
**When** I tap the capture button (or it auto-captures)
**Then** the photo is taken and saved temporarily
**And** I see a preview with options: "Retake" or "Use This Photo"

**Given** I choose "Use This Photo"
**When** I confirm
**Then** the image is uploaded to Convex file storage
**And** I'm redirected to the processing screen with a loading animation
**And** The AI parsing begins (Story 5.2)

**Given** the photo is blurry or unreadable
**When** the app detects poor quality
**Then** I see a warning: "Receipt may be hard to read. Retake for better results?"
**And** I can choose to retake or proceed anyway

**Technical Requirements:**
- Expo Camera API for receipt capture
- Image quality detection (blur, lighting)
- Corner detection for receipt boundary
- Convex file storage for receipt images
- Compress images before upload (reduce bandwidth)
- FR36

---

### Story 5.2: Gemini AI Receipt Parsing

As a **user**,
I want **AI to extract items and prices from my receipt**,
So that **I don't have to manually enter everything**.

**Acceptance Criteria:**

**Given** I uploaded a receipt photo
**When** the AI processing starts
**Then** I see a loading screen: "Reading your receipt... This may take 10-15 seconds"
**And** A progress indicator shows the status

**Given** Gemini AI processes the receipt
**When** the OCR completes
**Then** the system extracts: store name, date, all items (name + price), subtotal, tax, total
**And** Each item is parsed into: name, price, quantity (if detectable)

**Given** the AI successfully parses the receipt
**When** processing finishes
**Then** I see the extracted items in a list
**And** I'm redirected to the confirmation screen (Story 5.3)

**Given** the AI has low confidence on some items
**When** confidence is below 70%
**Then** those items are marked with a ⚠️ warning icon
**And** I'm prompted to review them carefully

**Given** the AI fails to parse the receipt
**When** an error occurs (blurry image, non-receipt image, etc.)
**Then** I see an error message: "Couldn't read this receipt. Please try again with better lighting."
**And** I can retake the photo

**Technical Requirements:**
- Convex action: `parseReceipt(fileStorageId)` calling Gemini Vision API
- Parse: store, date, items[], subtotal, tax, total
- Confidence scoring for each extracted field
- Error handling for failed OCR
- Store parsed data temporarily (not yet saved to DB)
- FR37

---

### Story 5.3: Item Confirmation & Correction UI

As a **user**,
I want **to review and correct AI-parsed items**,
So that **my price history is accurate**.

**Acceptance Criteria:**

**Given** the AI parsed my receipt
**When** I see the confirmation screen
**Then** I see all extracted items in an editable list
**And** Each item shows: name, price, quantity

**Given** an item name is incorrect
**When** I tap on it
**Then** I can edit the name
**And** Auto-suggestions from my pantry items appear as I type

**Given** a price is incorrect
**When** I tap the price
**Then** I can edit it with a numeric keypad

**Given** the AI missed an item
**When** I tap "Add Missing Item"
**Then** I can manually add: name, price, quantity

**Given** the AI detected a non-grocery item (e.g., "Gift Card")
**When** I see it
**Then** I can swipe left to delete it
**And** I see a toast: "Item removed"

**Given** I finish reviewing items
**When** I tap "Save Receipt"
**Then** all items are saved to Convex with: userId, receiptId, itemName, price, store, date
**And** I see a success animation
**And** I'm redirected to the reconciliation view (Story 5.5)

**Technical Requirements:**
- Editable item list component
- Auto-suggestions from pantry items
- Swipe-to-delete for items
- Convex mutation: `saveReceipt(userId, receiptData)`
- Store receipt in `receipts` table and items in `receiptItems` table
- FR38

---

### Story 5.4: Price History Tracking

As a **user**,
I want **to see price history for items I buy**,
So that **I can spot good deals and price trends**.

**Acceptance Criteria:**

**Given** I've scanned multiple receipts with the same item
**When** I view an item's detail page
**Then** I see a price history chart showing price changes over time
**And** Each data point shows: date, price, store

**Given** I view price history
**When** I see the chart
**Then** I see the average price, lowest price, and highest price
**And** The lowest price is highlighted in green

**Given** an item's price dropped significantly
**When** I scan a new receipt
**Then** I see a notification: "Great deal! [Item] is 20% cheaper than usual"

**Given** an item's price increased significantly
**When** I scan a new receipt
**Then** I see a notification: "[Item] price went up 15% since last purchase"

**Given** I view a shopping list item with price history
**When** I look at the item
**Then** I see a small icon showing the trend: ⬆️ (increasing), ⬇️ (decreasing), ➡️ (stable)
**And** Tapping it opens the full price history

**Technical Requirements:**
- `convex/schema.ts`: `priceHistory` table with itemName, price, store, date, userId
- Price trend calculation (last 3 months)
- Chart component (line chart with React Native SVG)
- Price alert logic (>15% change triggers notification)
- FR39, FR40, FR41, FR42

---

### Story 5.5: Reconciliation View (Planned vs Actual)

As a **user**,
I want **to compare what I planned to spend vs what I actually spent**,
So that **I can see how well I stuck to my budget**.

**Acceptance Criteria:**

**Given** I completed a shopping trip with a list that had a budget
**When** I save the receipt
**Then** I see a reconciliation screen comparing planned vs actual

**Given** I view the reconciliation
**When** the screen loads
**Then** I see:
  - **Budget**: £50
  - **Actual Spent**: £48
  - **Difference**: £2 saved (in green)
  - **Items Planned**: 10
  - **Items Purchased**: 12 (2 unplanned)

**Given** I stayed under budget
**When** the reconciliation shows savings
**Then** I see a celebration: "Amazing! You saved £2! 🎉"
**And** I feel a success haptic
**And** The savings are added to my "Total Saved" gamification stat

**Given** I went over budget
**When** the reconciliation shows overspend
**Then** I see: "Went over by £5. No worries, it happens!"
**And** I see which unplanned items caused the overage

**Given** I bought unplanned items
**When** the reconciliation loads
**Then** I see a section: "Unplanned Purchases (2)" with the items listed
**And** Each shows: name, price, and whether it was from impulse fund

**Given** I finish reviewing the reconciliation
**When** I tap "Complete Trip"
**Then** the list status changes to "completed"
**And** The receipt is linked to the completed list

**Technical Requirements:**
- Reconciliation calculation logic
- Compare list items vs receipt items
- Identify unplanned purchases
- Link receipt to shopping list (receiptId ↔ listId)
- Update user's "Total Saved" stat
- FR53, FR54, FR55

---

### Story 5.6: Auto-Restock Pantry from Receipt

As a **user**,
I want **my pantry to auto-update when I scan receipts**,
So that **my stock levels stay accurate without manual updates**.

**Acceptance Criteria:**

**Given** I scan a receipt with items that exist in my pantry
**When** the receipt is saved
**Then** matching pantry items are automatically updated to "Stocked" level
**And** I see a toast: "Pantry updated: 8 items restocked"

**Given** a receipt item matches a pantry item by name
**When** the auto-restock happens
**Then** the pantry item's stockLevel changes to "Stocked"
**And** the lastUpdated timestamp is updated

**Given** a receipt item is close but not exact match (e.g., "Whole Milk" vs "Milk")
**When** the system detects similarity (>80% match)
**Then** I see a confirmation: "Restock 'Milk' from receipt item 'Whole Milk'?"
**And** I can approve or skip

**Given** a receipt item doesn't exist in my pantry
**When** the auto-restock runs
**Then** I see a prompt: "Add '[item]' to your pantry?"
**And** If I approve, it's added with stockLevel: "Stocked"

**Given** I don't want auto-restock for certain items
**When** I go to settings
**Then** I can disable auto-restock globally or for specific items

**Technical Requirements:**
- String similarity matching (Levenshtein distance or fuzzy match)
- Convex mutation: `autoRestockFromReceipt(receiptId, userId)`
- Confirmation prompts for fuzzy matches
- Settings toggle for auto-restock
- FR56, FR57, FR58

---

## Epic 6: Insights, Gamification & Progress

### Story 6.1: Weekly Digest & Monthly Trends

As a **user**,
I want **to see my spending patterns over time**,
So that **I can understand my shopping habits and improve**.

**Acceptance Criteria:**

**Given** I've been using the app for at least a week
**When** I tap the "Profile" tab
**Then** I see a "Weekly Digest" section showing:
  - Total spent this week
  - Number of shopping trips
  - Average trip cost
  - Top 3 categories by spend

**Given** I've been using the app for at least a month
**When** I view monthly trends
**Then** I see a chart showing weekly spending over the last 4 weeks
**And** I see trend indicators: ⬆️ (spending increased), ⬇️ (spending decreased), ➡️ (stable)

**Given** I tap on a category in the digest
**When** I select it
**Then** I see detailed breakdown of items in that category
**And** Price trends for those items

**Technical Requirements:**
- Aggregation queries in Convex for weekly/monthly stats
- Chart component for trend visualization
- Category breakdown calculations
- FR43, FR44

---

### Story 6.2: Gamification (Streaks, Savings Jar, Challenges)

As a **user**,
I want **gamification features to keep me motivated**,
So that **saving money feels rewarding and fun**.

**Acceptance Criteria:**

**Given** I complete multiple shopping trips under budget
**When** I view my profile
**Then** I see a "Budget Streak" with 🔥 fire emoji
**And** The streak count shows how many consecutive under-budget trips I've made

**Given** I break my budget streak
**When** I go over budget
**Then** the streak resets to 0
**And** I see a motivational message: "No worries! Start a new streak next time."

**Given** I save money on shopping trips
**When** I complete reconciliation under budget
**Then** my savings are added to a "Savings Jar" visualization
**And** The jar fills up with animated coins
**And** I see total lifetime savings: "You've saved £127 so far!"

**Given** I reach savings milestones (£50, £100, £200)
**When** the jar reaches a milestone
**Then** I see a celebration animation with confetti
**And** I unlock an achievement badge

**Given** the app presents a weekly challenge
**When** the week starts
**Then** I see a challenge like: "Complete 2 shopping trips under budget this week"
**And** Progress is tracked in real-time
**And** Completing it unlocks a special badge

**Technical Requirements:**
- Streak calculation logic (consecutive under-budget trips)
- Animated savings jar component
- Challenge system with weekly rotation
- Achievement badges stored in user profile
- FR45, FR46, FR47, FR48

---

### Story 6.3: Personal Best & Surprise Delight

As a **user**,
I want **to track personal bests and get surprise moments**,
So that **the app feels delightful and celebrates my wins**.

**Acceptance Criteria:**

**Given** I complete a shopping trip with record low spending
**When** the reconciliation finishes
**Then** I see: "New Personal Best! Lowest grocery bill ever: £32! 🎉"
**And** The personal best is saved to my profile

**Given** I have personal bests tracked
**When** I view my profile
**Then** I see "Personal Bests" section showing:
  - Lowest total spend on a trip
  - Biggest savings on a trip
  - Longest budget streak

**Given** I perform mundane actions (like marking items as Out)
**When** I do routine tasks
**Then** occasionally (10% chance) I see a random toast with emoji:
  - "Nice! Staying organized! 🎯"
  - "Look at you go! ✨"
  - "You're on fire! 🔥"
**And** These appear randomly to add delight

**Given** I reach significant milestones
**When** I complete my 10th shopping trip
**Then** I see a celebration: "10 trips completed! You're a shopping pro! 🏆"

**Technical Requirements:**
- Personal best tracking in user profile
- Random delight message system (10% trigger rate)
- Milestone detection (10th, 25th, 50th, 100th trip)
- Celebration animations for milestones
- FR49, FR50

---

## Epic 7: Subscription, Payments & Loyalty

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

### Story 8.1: Admin Authentication & Dashboard Overview

As an **admin**,
I want **secure access to the admin dashboard**,
So that **I can monitor and manage the system**.

**Acceptance Criteria:**

**Given** I'm an admin user
**When** I navigate to `/admin`
**Then** I'm prompted for 2FA authentication
**And** After successful 2FA, I access the admin dashboard

**Given** I successfully authenticate
**When** the dashboard loads
**Then** I see key metrics at a glance:
  - Total users (active, trial, paying)
  - DAU/WAU/MAU
  - MRR/ARR
  - Recent activity feed

**Given** I'm a non-admin user
**When** I try to access `/admin`
**Then** I see a 403 Forbidden error
**And** The attempt is logged in the audit trail

**Technical Requirements:**
- Admin role checking in Convex
- 2FA requirement for admin access
- Audit logging for all admin actions
- Dashboard metrics aggregation
- FR96, FR97, FR98

---

### Story 8.2: User Management

As an **admin**,
I want **to search and manage user accounts**,
So that **I can provide support and handle edge cases**.

**Acceptance Criteria:**

**Given** I'm on the admin dashboard
**When** I use the user search
**Then** I can search by email, name, or user ID
**And** Results show: name, email, subscription status, join date

**Given** I select a user
**When** I view their profile
**Then** I see:
  - Account details (email, name, join date)
  - Subscription status and history
  - Loyalty points balance
  - Recent shopping lists
  - Receipt scan history

**Given** a user needs trial extension
**When** I tap "Extend Trial"
**Then** I can add days to their trial period
**And** The user receives a notification

**Given** a user requests account deletion (GDPR)
**When** I tap "Delete User Data"
**Then** I see a confirmation warning
**And** After confirming, all user data is permanently deleted
**And** The action is logged in audit trail

**Technical Requirements:**
- User search with fuzzy matching
- Read-only user impersonation for support
- Trial extension mutation
- GDPR deletion function (cascades all user data)
- FR127-FR138, FR171-FR173

---

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

### Story 8.4: Receipt & Price Moderation

As an **admin**,
I want **to review flagged receipts and moderate prices**,
So that **data quality remains high**.

**Acceptance Criteria:**

**Given** a receipt is flagged as suspicious
**When** I view the moderation queue
**Then** I see flagged receipts with reasons (duplicate, fake, spam)
**And** I can approve or reject each receipt

**Given** I review a flagged receipt
**When** I examine the details
**Then** I see the original image, parsed items, and flag reason
**And** I can manually correct items or delete the receipt

**Given** I view the price database
**When** I access price management
**Then** I see all crowdsourced prices with outlier detection
**And** I can edit incorrect prices or delete spam entries

**Given** a price is significantly different from average
**When** the system detects an outlier (>50% deviation)
**Then** it's automatically flagged for review

**Technical Requirements:**
- Flagging system for suspicious receipts
- Price outlier detection algorithm
- Manual correction UI for receipts
- Bulk approve/reject for price entries
- FR139-FR150

---

### Story 8.5: Product Catalog & System Health

As an **admin**,
I want **to manage seeded products and monitor system health**,
So that **the app runs smoothly and data stays current**.

**Acceptance Criteria:**

**Given** I access product catalog management
**When** I view seeded products
**Then** I see all items used in onboarding seed generation
**And** I can add, edit, or remove products by category and cuisine

**Given** I add a new seeded product
**When** I submit it
**Then** it becomes available in future onboarding flows
**And** Users can choose to include it in their pantry

**Given** I monitor system health
**When** I view the system dashboard
**Then** I see:
  - API response times
  - Error rates (last 24h, 7d, 30d)
  - Database storage usage
  - Third-party service status (Stripe, Gemini, Clerk)

**Given** error rates exceed threshold (>5%)
**When** the alert triggers
**Then** I receive an email and push notification
**And** The alert is logged in the dashboard

**Technical Requirements:**
- CRUD operations for seeded product catalog
- System metrics aggregation
- Error monitoring and alerting
- Third-party API status checks
- FR151-FR166

---
