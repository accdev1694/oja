---
stepsCompleted: ['step-01-validate-prerequisites']
inputDocuments:
  - '_bmad-output/planning-artifacts/prd.md'
  - '_bmad-output/planning-artifacts/architecture-v2-expo-convex.md'
  - '_bmad-output/planning-artifacts/ux-design-specification.md'
  - '_bmad-output/planning-artifacts/coding-conventions-expo.md'
  - '_bmad-output/planning-artifacts/security-guidelines-expo.md'
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
- FR16: New users see pre-seeded items in their pantry (continent-based)

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
- FR65: Users can subscribe to monthly plan (£3.99/mo)
- FR66: Users can subscribe to annual plan (£29.99/yr)
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
- FR86: New users can customize seeded products (remove unwanted items)
- FR87: New users can set default weekly budget
- FR88: Users can optionally grant location permission
- FR89: Users can skip optional onboarding steps

**Feedback & Celebrations:**
- FR90: System plays subtle sounds for key actions (configurable)
- FR91: System provides haptic feedback for interactions (configurable)
- FR92: System displays celebration when trip completed under budget
- FR93: Users can enable/disable sounds
- FR94: Users can enable/disable haptics
- FR95: System can auto-mute in detected store locations

**Admin Dashboard - Access & Security:**
- FR96: Admins can sign in to a separate admin interface with enhanced security
- FR97: Admin accounts require two-factor authentication
- FR98: System logs all admin actions in an audit trail
- FR99: Super-admins can create and manage other admin accounts
- FR100: Admins have role-based permissions (viewer, support, manager, super-admin)

**Admin Dashboard - Business Analytics:**
- FR101: Admins can view real-time user count (total, active, new today)
- FR102: Admins can view DAU/WAU/MAU metrics with trends
- FR103: Admins can view user retention cohort analysis
- FR104: Admins can view onboarding funnel completion rates
- FR105: Admins can view trial-to-paid conversion rate
- FR106: Admins can view churn rate and churn reasons
- FR107: Admins can view feature adoption metrics (% using each feature)
- FR108: Admins can filter analytics by date range
- FR109: Admins can compare metrics period-over-period

**Admin Dashboard - Revenue & Financial:**
- FR110: Admins can view Monthly Recurring Revenue (MRR)
- FR111: Admins can view Annual Recurring Revenue (ARR)
- FR112: Admins can view revenue growth trends
- FR113: Admins can view subscriber breakdown (monthly vs annual)
- FR114: Admins can view average revenue per user (ARPU)
- FR115: Admins can view customer lifetime value (LTV) estimates
- FR116: Admins can view loyalty point discount impact on revenue
- FR117: Admins can view total loyalty points liability (outstanding points)

**Admin Dashboard - Stripe Integration:**
- FR118: Admins can view all payment transactions
- FR119: Admins can view failed payment attempts
- FR120: Admins can view payment retry status
- FR121: Admins can issue refunds for specific transactions
- FR122: Admins can view subscription lifecycle events
- FR123: Admins can view upcoming renewals
- FR124: Admins can view revenue by payment method
- FR125: System syncs payment data from Stripe webhooks in real-time
- FR126: Admins can manually reconcile payment discrepancies

**Admin Dashboard - User Management:**
- FR127: Admins can search users by email, name, or ID
- FR128: Admins can view detailed user profile
- FR129: Admins can view user's subscription history
- FR130: Admins can view user's loyalty point history
- FR131: Admins can view user's receipt scan history
- FR132: Admins can extend user's trial period
- FR133: Admins can grant complimentary subscription
- FR134: Admins can add loyalty points manually
- FR135: Admins can reset user's password
- FR136: Admins can deactivate user account
- FR137: Admins can reactivate previously deactivated accounts
- FR138: Admins can view user's activity timeline

**Admin Dashboard - Receipt & Price Management:**
- FR139: Admins can view receipt scan volume metrics
- FR140: Admins can view OCR success rate metrics
- FR141: Admins can view AI parsing accuracy metrics
- FR142: Admins can view rejected receipts and rejection reasons
- FR143: Admins can review flagged/suspicious receipts
- FR144: Admins can manually approve or reject flagged receipts
- FR145: Admins can view crowdsourced price database
- FR146: Admins can search prices by item, store, or region
- FR147: Admins can edit incorrect crowdsourced prices
- FR148: Admins can delete spam or fraudulent price entries
- FR149: Admins can view price outlier reports
- FR150: Admins can bulk approve/reject price entries

**Admin Dashboard - Product & Content:**
- FR151: Admins can view and manage seeded products
- FR152: Admins can add new seeded products
- FR153: Admins can edit seeded product details
- FR154: Admins can remove seeded products
- FR155: Admins can manage product categories
- FR156: Admins can manage store name normalization rules
- FR157: Admins can view and edit item name canonicalization rules

**Admin Dashboard - System Health:**
- FR158: Admins can view system uptime metrics
- FR159: Admins can view API response time metrics
- FR160: Admins can view error rate trends
- FR161: Admins can view recent error logs
- FR162: Admins can view third-party service status
- FR163: Admins can view database storage usage
- FR164: Admins can view sync queue status
- FR165: Admins can view background job status
- FR166: System sends alerts to admins when error thresholds exceeded

**Admin Dashboard - Customer Support:**
- FR167: Admins can view support ticket queue
- FR168: Admins can impersonate user view (read-only)
- FR169: Admins can view user's recent shopping lists
- FR170: Admins can view user's stock tracker state
- FR171: Admins can trigger password reset email for user
- FR172: Admins can export user's data (GDPR request)
- FR173: Admins can permanently delete user's data (GDPR request)

**Admin Dashboard - Communication:**
- FR174: Admins can create in-app announcements
- FR175: Admins can schedule announcements for future dates
- FR176: Admins can target announcements to user segments
- FR177: Admins can view announcement read/dismiss rates
- FR178: Admins can create email campaigns (future)

**Admin Dashboard - Configuration:**
- FR179: Admins can toggle feature flags on/off
- FR180: Admins can enable features for specific user segments
- FR181: Admins can configure loyalty point earning rules
- FR182: Admins can configure receipt validation thresholds
- FR183: Admins can configure subscription pricing
- FR184: Admins can configure trial period length
- FR185: Admins can configure daily receipt scan cap

**Admin Dashboard - Reporting:**
- FR186: Admins can export user list to CSV
- FR187: Admins can export revenue reports to CSV
- FR188: Admins can export analytics data to CSV
- FR189: Admins can schedule automated weekly reports via email
- FR190: Admins can export audit logs

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
- GF7: **Partner Mode** - Share lists, approve items, contest purchases, add comments
- GF8: **Continent Seeding** - Generate 200 culturally-appropriate items via Gemini LLM (6 regions)
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

### FR Coverage Map

(Will be populated in Step 2 after epic design)

## Epic List

(Will be populated in Step 2 after epic design)
