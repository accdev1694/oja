
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

