# Oja Shopping Application -- Manual Test Strategy

**Document Identifier:** OJA-MTS-2026-001
**Version:** 1.0
**Status:** Draft
**Classification:** Internal -- QA Team
**Date:** 25 March 2026
**Author:** QA Engineering
**Approvers:** Product Owner, Engineering Lead, QA Lead

---

## Revision History

| Version | Date       | Author          | Description                        |
|---------|------------|-----------------|------------------------------------|
| 1.0     | 2026-03-25 | QA Engineering  | Initial draft -- Sections 1-3      |

---

## Table of Contents

1. [Introduction and Scope](#1-introduction-and-scope)
   1.1 [Purpose](#11-purpose)
   1.2 [Product Overview](#12-product-overview)
   1.3 [Testing Objectives](#13-testing-objectives)
   1.4 [Scope -- In Scope](#14-scope----in-scope)
   1.5 [Scope -- Out of Scope](#15-scope----out-of-scope)
   1.6 [Testing Types](#16-testing-types)
   1.7 [Risk-Based Test Prioritization](#17-risk-based-test-prioritization)
   1.8 [References](#18-references)
2. [Test Environment Setup](#2-test-environment-setup)
   2.1 [Hardware Requirements](#21-hardware-requirements)
   2.2 [Software Requirements](#22-software-requirements)
   2.3 [Network Conditions](#23-network-conditions)
   2.4 [Backend Services](#24-backend-services)
   2.5 [Third-Party Service Configuration](#25-third-party-service-configuration)
   2.6 [Environment Checklist](#26-environment-checklist)
3. [Test Data Requirements](#3-test-data-requirements)
   3.1 [Test User Accounts](#31-test-user-accounts)
   3.2 [Test Stores](#32-test-stores)
   3.3 [Test Items and Products](#33-test-items-and-products)
   3.4 [Test Receipts](#34-test-receipts)
   3.5 [Subscription States](#35-subscription-states)
   3.6 [Pantry States](#36-pantry-states)
   3.7 [Shopping List States](#37-shopping-list-states)
   3.8 [Test Data Maintenance](#38-test-data-maintenance)

---

## 1. Introduction and Scope

### 1.1 Purpose

This document defines the manual test strategy for the **Oja** mobile and web application, version 2.0. It establishes a structured, repeatable approach to manual testing that complements the existing automated test suite (46 Jest unit test files comprising 1,243 tests and 18 Playwright E2E specifications).

Manual testing is essential for this application because several core features -- receipt scanning via device camera, voice assistant interaction (Tobi), haptic feedback, cross-device real-time synchronization, and the physical act of shopping with the app -- cannot be fully validated through automation alone. This strategy ensures that human testers systematically cover the experiential, visual, and edge-case dimensions that automated suites do not reach.

This document conforms to the principles of **IEEE 829-2008** (Standard for Software and System Test Documentation) and **ISTQB Foundation Level** testing practices. It serves as the authoritative reference for all manual QA activities on the Oja product.

### 1.2 Product Overview

**Oja** is a budget-first shopping application designed for UK shoppers. It combines pantry tracking, intelligent shopping lists with real-time budget monitoring, AI-powered receipt scanning, a conversational voice assistant, gamification mechanics, and household collaboration into a single mobile-first experience.

**Technical Stack:**

| Layer            | Technology                                                      |
|------------------|-----------------------------------------------------------------|
| Framework        | Expo SDK 54, React Native 0.81, React 19.1                     |
| Language         | TypeScript 5.9                                                  |
| Backend          | Convex 1.32 (real-time, 60+ tables across 11 schema domains)   |
| Authentication   | Clerk (email, Google OAuth, Apple OAuth)                        |
| Payments         | Stripe (checkout sessions, webhooks, subscription management)   |
| AI -- Vision     | Google Gemini 2.0 Flash with OpenAI fallback                    |
| AI -- Voice      | Google Gemini 2.5 Flash Lite                                    |
| TTS              | Azure Neural Voice with expo-speech fallback                    |
| STT              | expo-speech-recognition (native module)                         |
| JS Engine        | Hermes (New Architecture enabled)                               |

**Application Structure (4 Tabs):**

| Tab      | Route               | Primary Function                                    |
|----------|----------------------|-----------------------------------------------------|
| Lists    | `(tabs)/index.tsx`   | Shopping list management, budgets, trip tracking     |
| Stock    | `(tabs)/stock.tsx`   | Pantry inventory, expiry tracking, restock alerts    |
| Scan     | `(tabs)/scan.tsx`    | Receipt scanning (OCR) and product label scanning    |
| Profile  | `(tabs)/profile.tsx` | Account settings, subscription, partner management   |

**Key Flows:** Onboarding (5 steps) > Daily shopping (lists + budgets + store tracking) > Receipt capture (AI OCR) > Pantry update > Insights and gamification > Partner sharing.

### 1.3 Testing Objectives

1. **Functional Correctness** -- Verify that all user-facing features behave according to the product specification and the behavioral contracts defined in `FEATURE-RULES.md`.
2. **Cross-Platform Consistency** -- Confirm that the application delivers an equivalent experience on Android (development build APK), iOS, and Web (Expo Web via modern browsers).
3. **Data Integrity** -- Ensure that the 3-layer price cascade (personal history > crowdsourced > AI estimate) produces correct, non-blank prices under all conditions ("Zero-Blank Prices" invariant).
4. **Real-Time Synchronization** -- Validate that Convex real-time subscriptions correctly propagate state changes between multiple clients, between partners, and between the frontend and the 34 cron jobs.
5. **AI Feature Reliability** -- Confirm that receipt scanning, product scanning, voice assistant (Tobi), health analysis, and AI price estimation produce accurate, contextually appropriate results and degrade gracefully on failure.
6. **Subscription and Payment Integrity** -- Verify that feature gating enforces tier limits (Free: 2 lists, 30 pantry items, 10 voice/month; Premium: unlimited with 200 voice/month cap), that trial expiry works correctly (7 days), and that Stripe payment flows complete end-to-end.
7. **Security and Access Control** -- Confirm that authentication boundaries hold, that admin RBAC permissions are enforced across all 10 admin tabs, and that partner data isolation prevents cross-household leakage.
8. **Accessibility** -- Verify that the Glass UI design system meets WCAG 2.1 AA standards for color contrast, touch target sizing, screen reader compatibility, and keyboard navigation (web).
9. **Performance Under Realistic Conditions** -- Assess application responsiveness on mid-range devices under varying network conditions, particularly for AI-dependent features.

### 1.4 Scope -- In Scope

The following areas are subject to manual test execution under this strategy:

**Core Feature Areas:**
- User authentication (sign-up, sign-in, sign-out, password reset) via Clerk (email, Google OAuth, Apple OAuth)
- Onboarding flow (5 steps: welcome > cuisine preferences > store selection > pantry seeding > review)
- Shopping list CRUD (create, read, update, delete, share, archive)
- List item management (add, edit, remove, check-off, reorder, batch operations)
- Budget management (set budget, budget dial, real-time tracking, store-specific budgets)
- Store tracking (tentative/confirmed stores, store switching, multi-store history)
- Pantry/Stock management (add, edit, remove, lifecycle states, auto-archiving, restock suggestions)
- Receipt scanning (camera capture, gallery upload, AI OCR extraction, item reconciliation, receipt confirmation)
- Product label scanning (camera capture, AI extraction of name/size/unit, add-to-list)
- Voice assistant Tobi (activation, speech-to-text, AI processing, text-to-speech response, context-aware actions)
- Price intelligence (3-layer cascade, price history, crowdsourced prices, AI estimation, emergency fallback)
- Item name parsing (cleanItemForStorage, formatItemDisplay, size/unit validation, dual-unit handling)
- Gamification (points accumulation, tier progression Bronze>Silver>Gold>Platinum, challenges, streaks, personal bests)
- Insights and analytics (weekly digest, monthly trends, spending analysis)
- Partner/household collaboration (invite codes, shared lists, shared pantry, partner comments)
- Subscription management (Free/Trial/Premium tiers, Stripe checkout, webhook processing, feature gating)
- Notifications (push notifications, in-app notification bell, notification preferences)
- Admin dashboard (10 tabs: Overview, Users, Analytics, Receipts, Catalog, Monitoring, Webhooks, Support, Points, Settings)
- Profile management (account settings, dietary preferences, cuisine preferences, experience level)

**Cross-Cutting Concerns:**
- Glass UI design system (29 components, animation, haptic feedback, loading states)
- Offline/degraded network behavior
- Deep linking and navigation (Expo Router)
- Error handling and error states across all features
- Empty states and first-use experiences

**Platforms:**
- Android (development build APK on physical device and emulator)
- iOS (development build on physical device and simulator)
- Web (Expo Web on Chrome, Safari, Firefox, Edge)

### 1.5 Scope -- Out of Scope

The following are explicitly excluded from this manual test strategy:

- **Automated unit tests** -- Covered by the existing Jest suite (46 files, 1,243 tests)
- **Automated E2E tests** -- Covered by the existing Playwright suite (18 specifications)
- **Convex backend function logic** -- Tested via unit tests and integration tests; manual testing covers only the user-visible behavior
- **CI/CD pipeline configuration** -- Infrastructure concern; not a manual testing target
- **Third-party service internals** -- Clerk authentication internals, Stripe payment processing internals, Gemini/OpenAI model accuracy tuning, Azure TTS engine internals
- **Load testing and stress testing** -- Requires dedicated tooling (k6, Artillery, or similar); not a manual activity
- **Penetration testing** -- Requires specialized security testing tools and expertise
- **Native build compilation** -- Build engineering responsibility; manual testing begins after a successful build is available
- **EAS Build and Update infrastructure** -- Deployment pipeline concern
- **Internationalization/Localization** -- Application currently targets UK English only; no multi-language testing required

### 1.6 Testing Types

This strategy encompasses the following testing types, each applied where most effective:

| Testing Type         | Description                                                                                         | Primary Application Areas                                              |
|----------------------|-----------------------------------------------------------------------------------------------------|------------------------------------------------------------------------|
| **Functional**       | Verify that each feature performs its specified function correctly                                   | All feature areas listed in Section 1.4                                |
| **Integration**      | Validate interaction between components and between frontend and backend                            | Clerk auth + Convex backend, Stripe webhooks, AI services + UI, voice pipeline (STT > AI > TTS) |
| **Edge Case**        | Test boundary conditions and unusual but valid inputs                                               | Item name parser (dual-unit, vague sizes), budget at zero/max, empty lists, max pantry items at tier limit |
| **Negative**         | Verify graceful handling of invalid input, unauthorized access, and error conditions                 | Invalid receipt images, malformed barcodes, expired sessions, Stripe payment failures, AI service outages |
| **Boundary**         | Test at and around defined limits                                                                   | Free tier limits (2 lists, 30 pantry, 10 voice), name length caps (25 char name, 40 char display), budget precision |
| **Security**         | Validate authentication, authorization, data isolation, and input sanitization                      | Admin RBAC (10 tabs, granular permissions), partner data isolation, Clerk session management, `requireCurrentUser`/`requireAdmin` enforcement |
| **Accessibility**    | Verify compliance with WCAG 2.1 AA for users with disabilities                                     | Glass UI contrast ratios (dark theme), touch targets (48dp minimum), screen reader labels, keyboard navigation (web), voice assistant as accessibility aid |
| **Performance**      | Assess responsiveness and resource usage under realistic conditions                                 | List scrolling (FlashList), receipt scanning latency, voice assistant round-trip time, Convex real-time update latency, app startup time |
| **Usability**        | Evaluate ease of use, intuitiveness, and user satisfaction                                          | Onboarding flow, first-use experience, scan-to-list workflow, voice assistant conversational quality |
| **Compatibility**    | Verify consistent behavior across platforms, devices, and browsers                                  | Android vs iOS vs Web, different screen sizes, browser engines (Chromium, WebKit, Gecko) |
| **Regression**       | Confirm that changes have not broken existing functionality                                         | Run after every release candidate; focused on `FEATURE-RULES.md` behavioral contracts |
| **Exploratory**      | Unscripted, experience-based testing to discover defects not anticipated by test cases              | All feature areas, with emphasis on AI features and real-world shopping scenarios |

### 1.7 Risk-Based Test Prioritization

Tests are assigned priority levels (P0-P3) based on a risk assessment combining **business impact** (revenue, user trust, data loss) and **failure likelihood** (complexity, external dependencies, change frequency). This prioritization guides test execution order, especially under time constraints.

#### P0 -- Critical (Must Test Every Release)

Failure at this level causes data loss, financial impact, security breach, or complete loss of core functionality. These tests are **release blockers**.

| Risk Area                        | Rationale                                                                | Example Test Scenarios                                     |
|----------------------------------|--------------------------------------------------------------------------|------------------------------------------------------------|
| Authentication and session       | Unauthorized access, data leakage between users                         | Sign-in, sign-out, session expiry, OAuth flows             |
| Payment and subscription         | Direct financial impact, incorrect billing, feature access errors        | Stripe checkout, webhook processing, tier enforcement      |
| Shopping list data integrity     | Core user data, loss of list items or prices erodes trust                | Create list, add items, check-off, prices resolve correctly |
| Receipt scanning accuracy        | High-complexity AI pipeline, incorrect data corrupts pantry and prices   | Scan receipt, verify items extracted, confirm prices        |
| Price cascade correctness        | "Zero-Blank Prices" invariant -- blank prices are a critical defect     | All 3 price layers, emergency fallback, display in UI      |
| Partner data isolation           | Privacy violation if one user sees another household's data              | Partner invite, shared list isolation, user switch cache    |
| Admin RBAC enforcement           | Unauthorized admin access to sensitive user data                         | Permission boundaries, role escalation prevention          |

#### P1 -- High (Must Test Every Sprint)

Failure significantly degrades user experience or affects a major feature. These are tested every sprint and before major releases.

| Risk Area                        | Rationale                                                                | Example Test Scenarios                                     |
|----------------------------------|--------------------------------------------------------------------------|------------------------------------------------------------|
| Pantry management                | Core daily-use feature, lifecycle complexity (fresh > low > expired)     | Add stock, expiry tracking, auto-archive, restock alerts   |
| Voice assistant (Tobi)           | Complex pipeline (STT > AI > TTS), multiple fallback paths              | Activate, speak command, verify response, context accuracy |
| Budget tracking                  | Primary value proposition ("budget-first"), real-time calculation        | Set budget, add priced items, verify dial, store switching |
| Onboarding flow                  | First impression, trial activation, preference seeding                   | Complete all 5 steps, verify preferences saved, trial start |
| Item name/size parsing           | Display correctness across entire app, dual-unit edge cases              | UK sizes, metric preference, vague size rejection          |
| Real-time sync                   | Convex subscriptions, multi-device consistency                           | Edit on device A, verify on device B within seconds        |
| Store tracking                   | Tentative vs confirmed logic, multi-store history, header display        | Select store, check-off item, switch store, verify header  |

#### P2 -- Medium (Test Every Major Release)

Failure causes inconvenience but has workarounds. Tested on major releases and when the affected area changes.

| Risk Area                        | Rationale                                                                | Example Test Scenarios                                     |
|----------------------------------|--------------------------------------------------------------------------|------------------------------------------------------------|
| Gamification and points          | Engagement feature, not core functionality                               | Points from receipt scan, tier progression, fraud checks   |
| Insights and analytics           | Read-only analysis, no data mutation risk                                | Weekly digest content, monthly trend accuracy               |
| Notifications                    | Informational, non-blocking                                              | Push delivery, in-app bell, preference toggles             |
| Profile and settings             | Low-frequency use, low data-loss risk                                    | Update dietary prefs, cuisine prefs, experience level      |
| Glass UI animations              | Visual polish, no functional impact if degraded                          | Stagger animations, transitions, skeleton loading states   |
| Product label scanning           | Secondary scan mode, lower usage than receipt scanning                   | Scan product, verify name/size/unit extraction             |

#### P3 -- Low (Test Quarterly or On Change)

Failure has minimal user impact or affects rarely used features.

| Risk Area                        | Rationale                                                                | Example Test Scenarios                                     |
|----------------------------------|--------------------------------------------------------------------------|------------------------------------------------------------|
| Admin dashboard (non-RBAC)       | Internal tool, small user base (admin team only)                         | Analytics display, receipt review, catalog browse           |
| Price history views              | Informational, read-only                                                 | View item price history, trend visualization               |
| Points history                   | Informational, read-only                                                 | View points earned/spent history                           |
| AI usage tracking                | Internal monitoring                                                      | View AI usage page, verify counts                          |
| Trip summary                     | Post-shopping review, low frequency                                      | Complete trip, view summary                                |
| Deep link handling               | Edge case entry points                                                   | Open app via deep link, verify correct route               |

### 1.8 References

| Document / Resource                    | Description                                                      |
|----------------------------------------|------------------------------------------------------------------|
| `CLAUDE.md`                            | Project technical reference and development conventions          |
| `FEATURE-RULES.md`                     | Behavioral contracts for features; compliance is mandatory       |
| `app.json`                             | Expo application configuration (v2.0.0)                          |
| `convex/schema/*.ts` (11 files)        | Database schema definitions across all domains                   |
| `convex/crons.ts`                      | 34 cron job definitions                                          |
| `e2e/tests/*.spec.ts` (18 files)       | Playwright E2E test specifications                               |
| `__tests__/**/*.test.ts` (46 files)    | Jest unit test suite                                             |
| IEEE 829-2008                          | Standard for Software and System Test Documentation              |
| ISTQB Foundation Level Syllabus        | International Software Testing Qualifications Board standards    |
| WCAG 2.1 AA                            | Web Content Accessibility Guidelines                             |

---

## 2. Test Environment Setup

### 2.1 Hardware Requirements

Manual testing requires the following physical devices and configurations to provide adequate cross-platform coverage.

#### 2.1.1 Android Devices

| Device Category | Specification                        | Purpose                                        | Minimum Qty |
|-----------------|--------------------------------------|-------------------------------------------------|-------------|
| Mid-Range       | 4GB RAM, Snapdragon 600-series or equivalent, Android 12+ (API 31+), 1080p display | Primary test device; represents target user demographic | 1 |
| Budget          | 3GB RAM, Android 11+ (API 30+), 720p display | Performance floor testing; ensure usable experience on lower-end hardware | 1 |
| Tablet          | 10" display, Android 12+            | Layout verification for larger form factors      | Optional    |

**Recommended models:** Samsung Galaxy A54 (mid-range), Samsung Galaxy A14 (budget), Pixel 7a (reference).

**Note:** Oja uses a **development client build** (APK), not Expo Go. The APK must be built via `npx expo run:android` or `eas build --profile development --platform android` and side-loaded onto each test device. Native modules (camera, speech recognition, haptics, notifications) will not function in Expo Go.

#### 2.1.2 iOS Devices

| Device Category | Specification                        | Purpose                                        | Minimum Qty |
|-----------------|--------------------------------------|-------------------------------------------------|-------------|
| Current Gen     | iPhone 14 or newer, iOS 17+         | Primary iOS test device                          | 1           |
| Previous Gen    | iPhone 11/12/SE, iOS 16+            | Backward compatibility and performance floor     | 1           |
| iPad            | iPad (10th gen) or iPad Air, iPadOS 17+ | Tablet layout verification (`supportsTablet: true`) | Optional |

**Note:** iOS development builds require a provisioned device with a valid development profile. Install via `eas build --profile development --platform ios` or `npx expo run:ios`.

#### 2.1.3 Web Browsers

| Browser          | Version    | Engine    | Platform        | Purpose                       |
|------------------|------------|-----------|-----------------|-------------------------------|
| Google Chrome    | Latest     | Chromium  | Windows/macOS   | Primary web test browser      |
| Safari           | Latest     | WebKit    | macOS/iOS       | WebKit rendering, iOS web     |
| Mozilla Firefox  | Latest     | Gecko     | Windows/macOS   | Gecko engine compatibility    |
| Microsoft Edge   | Latest     | Chromium  | Windows         | Windows default browser       |
| Chrome Mobile    | Latest     | Chromium  | Android         | Mobile web experience         |
| Safari Mobile    | Latest     | WebKit    | iOS             | iOS web experience            |

**Note:** Expo Web bundles via Metro (`"bundler": "metro"` in `app.json`). The web experience is tested via `npx expo start --web`.

#### 2.1.4 Development Machine

| Requirement        | Specification                                                  |
|--------------------|----------------------------------------------------------------|
| Operating System   | Windows 10/11 (primary, per project setup), macOS (for iOS builds) |
| Node.js            | v18 LTS or v20 LTS                                            |
| RAM                | 16GB minimum (Metro bundler + Convex dev server concurrently)  |
| Disk Space         | 10GB free minimum (node_modules, Android SDK, build artifacts) |
| Android SDK        | API 31+ installed via Android Studio                           |

### 2.2 Software Requirements

#### 2.2.1 Development Build Prerequisites

Before any manual testing can begin, the following must be installed and verified:

```
Prerequisite                          Verification Command
----------------------------------    ----------------------------------
Node.js (v18+ or v20+)               node --version
npm (v9+)                            npm --version
Expo CLI                             npx expo --version
Convex CLI                           npx convex --version
Android Studio + SDK (API 31+)       sdkmanager --list
Xcode 15+ (macOS, for iOS)           xcodebuild -version
Git                                  git --version
```

#### 2.2.2 Project Setup

```bash
# 1. Clone and install dependencies
git clone <repository-url>
cd oja
npm install

# 2. Start the Convex backend (required -- runs continuously)
npx convex dev

# 3. Start the Metro dev server
npx expo start

# 4. For Android: build and install the development client
npx expo run:android
# OR for remote builds:
eas build --profile development --platform android

# 5. For Web: launch the web version
npx expo start --web
```

**Windows-specific note:** The Android build uses a shortened staging directory (`android/app/build.gradle` sets `buildStagingDirectory = file("C:/b")`) to avoid the Windows 260-character path length limitation. Ensure `C:\b` is available or adjust the path before building.

#### 2.2.3 Quality Verification Tools

Before beginning manual testing, verify the codebase is in a clean state:

```bash
# Run the full automated test suite
npm test                  # Jest: expect 46 files, 1,243+ tests passing

# Run type checking
npm run typecheck         # TypeScript: expect 0 errors

# Run linting
npm run lint              # ESLint: expect 0 errors (flat config)

# Run E2E tests (optional, requires web server running)
npm run e2e               # Playwright: 18 specs
```

### 2.3 Network Conditions

Testing must cover multiple network conditions to validate the application's behavior when AI services, real-time sync, and payment processing experience latency or failure.

| Condition              | Configuration                          | Purpose                                                   |
|------------------------|----------------------------------------|-----------------------------------------------------------|
| **Fast WiFi**          | Unthrottled (50+ Mbps)                 | Baseline; normal operation                                |
| **4G Mobile**          | ~10 Mbps down, ~5 Mbps up, 50ms RTT   | Typical mobile shopping scenario                          |
| **3G Slow**            | ~1.5 Mbps down, ~750 Kbps up, 200ms RTT | Degraded conditions in stores with poor coverage         |
| **Offline**            | Airplane mode or network disabled      | Verify offline states, error messages, data persistence   |
| **Intermittent**       | Toggle network on/off during operations | Convex reconnection, partial upload recovery              |
| **High Latency**       | 500ms+ RTT                             | AI service timeout handling, UI responsiveness            |

**Tools for network simulation:**
- Android: Developer Options > Network Speed Emulation
- iOS: Network Link Conditioner (Xcode additional tools)
- Web: Chrome DevTools > Network > Throttling (custom profiles)
- Desktop: Charles Proxy or Clumsy (Windows)

**Critical network-dependent features to focus on:**
- Receipt scanning (image upload to Gemini API)
- Voice assistant (streaming STT, AI processing, TTS response)
- Convex real-time subscriptions (WebSocket connection)
- Stripe payment checkout flow
- Price resolution (AI estimation fallback)

### 2.4 Backend Services

The Oja backend consists of multiple services that must be running and properly configured for manual testing.

#### 2.4.1 Convex Backend

| Component           | Details                                                          |
|----------------------|------------------------------------------------------------------|
| Command              | `npx convex dev` (development) or deployed Convex instance       |
| Tables               | 60+ tables across 11 schema domains                              |
| Cron Jobs            | 34 scheduled jobs (daily, hourly, 15-30 min, weekly, monthly)    |
| Real-Time            | WebSocket subscriptions for live data sync                       |
| Schema Files         | `convex/schema/core.ts`, `pricing.ts`, `collaboration.ts`, `gamification.ts`, `subscriptions.ts`, `analytics.ts`, `admin.ts`, `receipts.ts`, `content.ts`, `experiments.ts`, `utils.ts` |

**Verification:** After starting `npx convex dev`, confirm the dashboard shows "Connected" at the Convex project URL. Verify tables are populated by checking the Convex Dashboard data browser.

#### 2.4.2 AI Services

| Service              | Provider        | Usage                                   | Env Variable        |
|----------------------|-----------------|-----------------------------------------|---------------------|
| Vision (Receipt/Product OCR) | Gemini 2.0 Flash | Receipt parsing, product label reading | `GEMINI_API_KEY`   |
| Voice AI             | Gemini 2.5 Flash Lite | Tobi voice assistant responses      | `GEMINI_API_KEY`    |
| Fallback AI          | OpenAI          | Vision and price estimation fallback     | `OPENAI_API_KEY`    |

**Verification:** Confirm API keys are set in the Convex Dashboard environment variables. Test by scanning a sample receipt and verifying items are extracted.

#### 2.4.3 Speech Services

| Service              | Provider          | Usage                                  | Configuration       |
|----------------------|-------------------|----------------------------------------|---------------------|
| STT                  | expo-speech-recognition | Voice input capture (native module) | Requires dev build  |
| TTS (Primary)        | Azure Neural Voice | Natural speech output for Tobi        | Azure credentials   |
| TTS (Fallback)       | expo-speech        | Fallback when Azure unavailable        | Built-in            |

### 2.5 Third-Party Service Configuration

#### 2.5.1 Clerk Authentication

| Setting              | Value / Notes                                                    |
|----------------------|------------------------------------------------------------------|
| Publishable Key      | Set via `EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY` (client-side)        |
| Secret Key           | Set via `CLERK_SECRET_KEY` (Convex server-side)                  |
| Auth Methods         | Email/password, Google OAuth, Apple OAuth                        |
| Test Accounts        | Pre-configured in Clerk dashboard (see Section 3.1)              |

**Verification:** Open the app and verify the sign-in screen loads with all three authentication options.

#### 2.5.2 Stripe Payments

| Setting              | Value / Notes                                                    |
|----------------------|------------------------------------------------------------------|
| Secret Key           | Set via `STRIPE_SECRET_KEY` (Convex server-side) -- must be **test mode** key (`sk_test_...`) |
| Merchant ID          | `merchant.com.oja.app`                                           |
| Google Pay           | Enabled (`enableGooglePay: true`)                                |
| Webhooks             | Configured in Stripe Dashboard to point at Convex webhook endpoint |
| Test Cards           | Use Stripe test card numbers (e.g., `4242 4242 4242 4242`)      |

**CRITICAL:** Never use production Stripe keys in a test environment. Always verify the key prefix is `sk_test_` before proceeding.

**Verification:** Navigate to the subscription page, initiate checkout, and confirm the Stripe test mode banner appears.

#### 2.5.3 Environment Variable Summary

| Variable                             | Location          | Purpose                          |
|--------------------------------------|-------------------|----------------------------------|
| `EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY`  | Client (.env)     | Clerk authentication             |
| `EXPO_PUBLIC_CONVEX_URL`             | Client (.env)     | Convex backend connection        |
| `GEMINI_API_KEY`                     | Convex Dashboard  | Gemini AI services               |
| `OPENAI_API_KEY`                     | Convex Dashboard  | OpenAI fallback AI               |
| `STRIPE_SECRET_KEY`                  | Convex Dashboard  | Stripe payment processing        |
| `CLERK_SECRET_KEY`                   | Convex Dashboard  | Clerk server-side verification   |
| `E2E_CLERK_USER_USERNAME`            | E2E (.env.e2e)    | E2E test automation account      |
| `E2E_CLERK_USER_PASSWORD`            | E2E (.env.e2e)    | E2E test automation password     |

### 2.6 Environment Checklist

Before commencing any manual test session, the tester must verify each item below. Mark each as PASS before proceeding.

```
[ ] Node.js and npm installed and correct version
[ ] Project dependencies installed (npm install completed without errors)
[ ] Convex dev server running and connected (npx convex dev)
[ ] Metro dev server running (npx expo start)
[ ] Development build APK installed on Android test device(s)
[ ] Development build installed on iOS test device(s) (if applicable)
[ ] Web version accessible in browser (if testing web)
[ ] Clerk authentication configured (sign-in screen loads)
[ ] Stripe test mode keys configured (sk_test_ prefix verified)
[ ] Gemini API key configured (receipt scan returns results)
[ ] OpenAI API key configured (fallback operational)
[ ] All automated tests passing (npm test)
[ ] TypeScript compilation clean (npm run typecheck)
[ ] ESLint clean (npm run lint)
[ ] Test user accounts accessible (see Section 3.1)
[ ] Network simulation tools installed and configured
[ ] Test device has camera access (for receipt/product scanning)
[ ] Test device has microphone access (for voice assistant)
[ ] Screen recording enabled (for defect reproduction evidence)
```

---

## 3. Test Data Requirements

### 3.1 Test User Accounts

Each test user account must be pre-configured in the Clerk dashboard with the specified attributes. These accounts are shared across the manual testing team and must not be modified outside of designated test data maintenance windows.

#### 3.1.1 User Account Matrix

| Account ID | Display Name     | Email                          | Auth Method | Subscription Tier | Trial Status | Partner Status | Admin Role | Purpose                              |
|------------|------------------|--------------------------------|-------------|-------------------|--------------|----------------|------------|--------------------------------------|
| TU-01      | Free User        | test-free@oja-test.com         | Email       | Free              | Expired      | None           | None       | Free tier limit validation           |
| TU-02      | Trial User       | test-trial@oja-test.com        | Email       | Trial             | Day 3 of 7   | None           | None       | Active trial feature access          |
| TU-03      | Trial Expiring   | test-trial-exp@oja-test.com    | Email       | Trial             | Day 7 of 7   | None           | None       | Trial expiry boundary testing        |
| TU-04      | Premium User     | test-premium@oja-test.com      | Email       | Premium           | N/A          | None           | None       | Unlimited feature access validation  |
| TU-05      | Premium Partner A | test-partner-a@oja-test.com   | Email       | Premium           | N/A          | Household 1    | None       | Partner collaboration (initiator)    |
| TU-06      | Premium Partner B | test-partner-b@oja-test.com   | Email       | Premium           | N/A          | Household 1    | None       | Partner collaboration (joiner)       |
| TU-07      | Free Partner     | test-free-partner@oja-test.com | Email       | Free              | Expired      | Household 2    | None       | Free tier partner limitations        |
| TU-08      | Google User      | test-google@oja-test.com       | Google OAuth| Premium           | N/A          | None           | None       | OAuth sign-in flow validation        |
| TU-09      | Apple User       | test-apple@oja-test.com        | Apple OAuth | Premium           | N/A          | None           | None       | Apple sign-in flow validation        |
| TU-10      | Admin Full       | test-admin@oja-test.com        | Email       | Premium           | N/A          | None           | Super Admin| Full admin dashboard access          |
| TU-11      | Admin Limited    | test-admin-ltd@oja-test.com    | Email       | Premium           | N/A          | None           | Support    | Limited admin permissions testing    |
| TU-12      | New User         | test-new@oja-test.com          | Email       | None              | Not started  | None           | None       | Fresh onboarding flow testing        |
| TU-13      | Heavy User       | test-heavy@oja-test.com        | Email       | Premium           | N/A          | None           | None       | Large data volume (100+ items, 20+ lists) |
| TU-14      | Voice Limit User | test-voice-limit@oja-test.com  | Email       | Free              | Expired      | None           | None       | Voice usage limit testing (10/month) |

#### 3.1.2 User Profile Attributes

Each test user account must have the following profile attributes configured after onboarding:

| Account ID | Dietary Preferences         | Cuisine Preferences          | Experience Level | Preferred Stores              |
|------------|-----------------------------|------------------------------|------------------|-------------------------------|
| TU-01      | None                        | British, Caribbean           | Beginner         | Tesco, Aldi                   |
| TU-02      | Vegetarian                  | Indian, British              | Intermediate     | Sainsbury's, Lidl             |
| TU-04      | Vegan, Gluten-Free          | West African, Caribbean      | Advanced         | Tesco, Waitrose, Morrisons    |
| TU-05      | Halal                       | West African, Middle Eastern | Advanced         | Tesco, Asda                   |
| TU-06      | None                        | Caribbean, British           | Intermediate     | Tesco, Asda                   |
| TU-13      | Kosher                      | British, Mediterranean       | Advanced         | Waitrose, Sainsbury's, M&S    |

### 3.2 Test Stores

The following UK supermarket chains must be available as selectable stores in the test environment. These represent the primary stores used by the Oja target demographic.

| Store ID | Store Name     | Category     | Price Tier | Notes                                    |
|----------|----------------|--------------|------------|------------------------------------------|
| TS-01    | Tesco          | Supermarket  | Mid-range  | Largest UK supermarket; primary test store |
| TS-02    | Aldi           | Discounter   | Budget     | Limited SKUs; budget-conscious shoppers   |
| TS-03    | Lidl           | Discounter   | Budget     | European discounter; similar to Aldi      |
| TS-04    | Sainsbury's    | Supermarket  | Mid-range  | Second largest; strong online presence    |
| TS-05    | Morrisons      | Supermarket  | Mid-range  | Strong in fresh food                      |
| TS-06    | Waitrose       | Premium      | Premium    | Premium pricing; upmarket demographic     |
| TS-07    | Asda           | Supermarket  | Budget-Mid | Walmart-backed; competitive pricing       |
| TS-08    | M&S Food       | Premium      | Premium    | Premium convenience                       |
| TS-09    | Co-op          | Convenience  | Mid-range  | Smaller format stores                     |
| TS-10    | Iceland        | Specialist   | Budget     | Frozen food specialist                    |

**Test scenarios requiring multiple stores:**
- Store switching mid-trip (tentative vs confirmed store logic)
- Multi-store price comparison on the same list
- Store-specific budget tracking
- Pipe-separated confirmed store display in list header

### 3.3 Test Items and Products

#### 3.3.1 Standard Test Items

These items cover the range of name/size/unit combinations that the item name parser must handle correctly.

| Item ID | Name                        | Size   | Unit  | Expected Display          | Category     | Approx. Price |
|---------|-----------------------------|--------|-------|---------------------------|--------------|---------------|
| TI-01   | Semi-Skimmed Milk           | 2      | l     | 2l Semi-Skimmed Milk      | Dairy        | 1.15          |
| TI-02   | Warburtons Toastie          | 800    | g     | 800g Warburtons Toastie   | Bakery       | 1.45          |
| TI-03   | Heinz Baked Beans           | 415    | g     | 415g Heinz Baked Beans    | Tinned       | 1.00          |
| TI-04   | Yam                         | 2      | kg    | 2kg Yam                   | Fresh        | 3.50          |
| TI-05   | Plantain                    | (none) | (none)| Plantain                  | Fresh        | 0.80          |
| TI-06   | Chicken Thighs              | 1      | kg    | 1kg Chicken Thighs        | Meat         | 3.20          |
| TI-07   | Scotch Bonnet Peppers       | 4      | pack  | 4 pack Scotch Bonnet Peppers | Fresh     | 0.90          |
| TI-08   | Maggi Seasoning Cubes       | 100    | g     | 100g Maggi Seasoning Cubes| Seasoning    | 1.20          |
| TI-09   | Coconut Milk                | 400    | ml    | 400ml Coconut Milk        | Tinned       | 0.85          |
| TI-10   | Palm Oil                    | 500    | ml    | 500ml Palm Oil            | Cooking Oil  | 2.50          |
| TI-11   | Guinness Punch              | 284    | ml    | 284ml Guinness Punch      | Drinks       | 1.50          |
| TI-12   | Whole Milk                  | 1      | pt    | 1pt Whole Milk            | Dairy        | 0.65          |
| TI-13   | Free Range Eggs             | 6      | pack  | 6 pack Free Range Eggs    | Dairy        | 2.10          |

#### 3.3.2 Edge Case Items (Item Name Parser Validation)

These items specifically test the `cleanItemForStorage()` and `formatItemDisplay()` logic per `FEATURE-RULES.md`.

| Item ID | Raw Input Name                                | Raw Size           | Expected Clean Name               | Expected Clean Size | Expected Display                     | Rule Tested                    |
|---------|-----------------------------------------------|--------------------|-----------------------------------|---------------------|--------------------------------------|--------------------------------|
| TE-01   | Cantu Shea Butter Leave-In Cream Treatment    | 340g (12oz)        | Cantu Leave-In Cream              | 340g                | 340g Cantu Leave-In Cream            | Dual-unit stripping, name cap  |
| TE-02   | Butter                                        | 227g (8oz)         | Butter                            | 227g                | 227g Butter                          | Parenthetical imperial removal |
| TE-03   | Olive Oil                                     | 347ml/12 fl oz     | Olive Oil                         | 347ml               | 347ml Olive Oil                      | Slash imperial removal         |
| TE-04   | 8 FL OZ / 237 mL Hair Conditioner            | (none)             | Hair Conditioner                  | 237ml               | 237ml Hair Conditioner               | Imperial-first dual-unit in name |
| TE-05   | Rice                                          | large              | Rice                              | (none)              | Rice                                 | Vague size rejection           |
| TE-06   | Bananas                                       | per item           | Bananas                           | (none)              | Bananas                              | Vague size "per item" rejection |
| TE-07   | Crisps                                        | each               | Crisps                            | (none)              | Crisps                               | Vague size "each" rejection    |
| TE-08   | Premium Organic Extra Virgin Cold Pressed Oil | 500ml              | Premium Organic Extra Virg...     | 500ml               | 500ml Premium Organic Extra Virg...  | 40-char display truncation     |
| TE-09   | Milk 500ml                                    | (none)             | Milk                              | 500ml               | 500ml Milk                           | End-of-name size extraction    |
| TE-10   | 2kg Yams                                      | (none)             | Yams                              | 2kg                 | 2kg Yams                             | Start-of-name size extraction  |

#### 3.3.3 Product Scanning Test Specimens

Physical products (or high-quality images of product labels) required for product scanning tests:

| Product | Label Must Show                              | Expected Extraction                          |
|---------|----------------------------------------------|----------------------------------------------|
| Tesco Semi-Skimmed Milk 2.272L | Product name, size in litres  | Name: "Semi-Skimmed Milk", Size: "2.272l"   |
| Heinz Baked Beans 415g         | Product name, weight in grams | Name: "Heinz Baked Beans", Size: "415g"      |
| Cantu Leave-In Conditioner 340g/12oz | Dual metric+imperial  | Name: "Cantu Leave-In Conditioner", Size: "340g" |
| Product with no visible size   | Product name only             | Name only, no invalid size stored             |
| Foreign language product       | Non-English label             | Best-effort extraction or graceful failure    |

### 3.4 Test Receipts

#### 3.4.1 Physical Receipt Specimens

Collect and preserve (or photograph) the following receipt types for scanning tests:

| Receipt ID | Store      | Items | Total   | Characteristics                                      | Test Purpose                         |
|------------|------------|-------|---------|------------------------------------------------------|--------------------------------------|
| TR-01      | Tesco      | 8-12  | ~25.00  | Standard printed receipt, clear text                  | Baseline receipt scanning            |
| TR-02      | Aldi       | 5-8   | ~15.00  | Compact format, smaller font                          | Small receipt format                 |
| TR-03      | Lidl       | 10-15 | ~30.00  | Standard format with promotional items                | Promo/discount item handling         |
| TR-04      | Sainsbury's| 15-20 | ~50.00  | Long receipt, Nectar points section                   | Large receipt, loyalty section        |
| TR-05      | Waitrose   | 5-8   | ~40.00  | Premium store, weighted items                         | Weighted/priced-per-kg items         |
| TR-06      | Any        | 3-5   | ~10.00  | Crumpled, partially faded                             | Poor quality receipt handling         |
| TR-07      | Any        | 1     | ~2.00   | Single item receipt                                   | Minimum viable receipt               |
| TR-08      | Any        | 25+   | ~80.00  | Very long receipt with multi-buy deals                | Maximum receipt complexity           |
| TR-09      | Any        | N/A   | N/A     | Non-receipt image (landscape photo, document, etc.)   | Negative: invalid image rejection    |
| TR-10      | Any        | N/A   | N/A     | Blank/overexposed image                               | Negative: unreadable image handling  |

#### 3.4.2 Receipt Data Attributes to Verify Post-Scan

For each successfully scanned receipt, the tester must verify:

- [ ] Store name correctly identified
- [ ] All line items extracted (item name, quantity, price)
- [ ] Item names cleaned via `cleanItemForStorage()` (no sizes embedded in names)
- [ ] Sizes and units correctly separated where visible on receipt
- [ ] Total price matches receipt total (within rounding tolerance)
- [ ] Points awarded correctly per tier (Bronze 150, Silver 175, Gold 200, Platinum 225 pts)
- [ ] Duplicate receipt detection works (scan the same receipt twice; second scan flagged)
- [ ] Items available for reconciliation with existing list items

### 3.5 Subscription States

Test data must represent all possible subscription lifecycle states to validate feature gating and payment flows.

| State ID | Tier    | Status    | Trial Days Remaining | Stripe State     | Feature Limits                                    |
|----------|---------|-----------|----------------------|------------------|---------------------------------------------------|
| SS-01    | Free    | Active    | 0 (expired)          | No subscription  | 2 lists, 30 pantry items, 10 voice/month          |
| SS-02    | Trial   | Active    | 7 (just started)     | No subscription  | Unlimited (trial period)                           |
| SS-03    | Trial   | Active    | 3 remaining          | No subscription  | Unlimited (trial period, mid-trial)                |
| SS-04    | Trial   | Active    | 1 remaining          | No subscription  | Unlimited (trial about to expire)                  |
| SS-05    | Trial   | Expired   | 0                    | No subscription  | Reverted to Free tier limits                       |
| SS-06    | Premium | Active    | N/A                  | `active`         | Unlimited lists, unlimited pantry, 200 voice/month |
| SS-07    | Premium | Past Due  | N/A                  | `past_due`       | Grace period behavior                              |
| SS-08    | Premium | Canceled  | N/A                  | `canceled`       | Reverted to Free tier limits at period end         |
| SS-09    | Premium | Paused    | N/A                  | `paused`         | Feature access during pause                        |

**Critical subscription test scenarios:**
- Free user hits list limit (3rd list creation blocked)
- Free user hits pantry limit (31st item blocked)
- Free user hits voice limit (11th voice command blocked in month)
- Trial expiry at exactly 7 days (cron job `checkTrialExpiry`)
- Premium user's payment fails (webhook `invoice.payment_failed`)
- Premium user cancels (webhook `customer.subscription.deleted`)
- Free user upgrades to Premium via Stripe checkout
- Trial user upgrades to Premium before trial expires

### 3.6 Pantry States

Test pantry items must cover all lifecycle states and the automatic archiving behavior.

| State     | Description                                  | Visual Indicator | Action Trigger                     |
|-----------|----------------------------------------------|------------------|------------------------------------|
| In Stock  | Item is available and not near expiry         | Green/Normal     | Default state on add               |
| Low Stock | Item quantity is below threshold              | Amber/Warning    | Manual update or consumption track |
| Out of Stock | Item is depleted                           | Red/Alert        | Manual update or consumption track |
| Expired   | Item past expiry date                         | Grey/Strikethrough | Date comparison (cron job)       |
| Archived  | Auto-archived after extended expiry/depletion | Hidden by default | Cron job (`archiveExpiredPantry`) |

**Pantry test data per user account:**
- TU-01 (Free): 28 items (near 30 limit) -- mix of In Stock, Low Stock, Out of Stock
- TU-04 (Premium): 75+ items -- all states represented, including some archived
- TU-13 (Heavy): 150+ items -- stress test for list rendering performance

### 3.7 Shopping List States

Test shopping lists must cover all lifecycle states and collaboration scenarios.

| State     | Description                                  | Items | Budget Set | Store(s)          | Shared     |
|-----------|----------------------------------------------|-------|------------|-------------------|------------|
| Empty     | Newly created, no items                       | 0     | No         | None              | No         |
| Draft     | Items added, not yet shopped                  | 5-10  | Yes (30)   | None              | No         |
| In Progress | Some items checked off                      | 10-15 | Yes (50)   | Tesco (confirmed) | No         |
| Complete  | All items checked off                         | 8     | Yes (25)   | Aldi (confirmed)  | No         |
| Multi-Store | Items from multiple stores                  | 12    | Yes (40)   | Tesco, Lidl       | No         |
| Shared    | Shared with partner                           | 8     | Yes (35)   | Sainsbury's       | TU-05, TU-06 |
| Over Budget | Total exceeds set budget                    | 10    | Yes (20)   | Waitrose          | No         |
| At Limit  | Free tier user with exactly 2 lists           | Varies| Varies     | Varies            | No         |

### 3.8 Test Data Maintenance

#### 3.8.1 Data Reset Procedures

Test data integrity is essential for repeatable test execution. The following procedures must be followed:

1. **Before each test cycle:** Verify all test user accounts exist and have correct subscription states. Reset modified data to baseline state.

2. **After destructive tests:** Tests that delete lists, clear pantry, or cancel subscriptions must restore the test data to its baseline state before the next tester uses that account.

3. **Receipt deduplication reset:** Since Oja uses receipt hashing for fraud prevention, the same physical receipt can only be scanned once per account. Maintain a log of which receipts have been scanned against which accounts. Use fresh receipts or reset receipt hashes in the database between test cycles.

4. **Points and gamification reset:** Points accumulate permanently. If gamification tests require specific point balances, either use dedicated accounts or reset points via the admin dashboard (Points tab).

5. **Subscription state management:** Use the Stripe test dashboard to manipulate subscription states (cancel, pause, create past_due). Coordinate with the test team to avoid conflicting state changes.

#### 3.8.2 Data Refresh Schedule

| Activity                          | Frequency            | Responsible Party |
|-----------------------------------|----------------------|-------------------|
| Verify test account existence     | Start of each sprint | QA Lead           |
| Reset subscription states         | Before each test cycle | QA Tester        |
| Replenish receipt test specimens  | Monthly              | QA Team           |
| Full test data rebuild            | Quarterly            | QA Lead + DevOps  |
| Archive test execution logs       | End of each sprint   | QA Lead           |

#### 3.8.3 Test Data Isolation

- **NEVER** use production user accounts for manual testing
- **NEVER** use production Stripe keys (verify `sk_test_` prefix)
- Test accounts use the `@oja-test.com` email domain to distinguish from real users
- Partner test data uses dedicated households (Household 1, Household 2) that are isolated from each other
- Admin test accounts have clearly labeled roles to prevent accidental privilege escalation testing against production

---

## 4. Test Suites

---

## SUITE 1: Authentication (TC-AUTH-001 to TC-AUTH-017)

---

**TC-AUTH-001: Sign in with valid email and password**
- **Priority**: P0
- **Category**: Functional
- **Preconditions**: User has an existing account with email "testuser@example.com" and password "SecurePass123!". Clerk is loaded.
- **Steps**:
  1. Navigate to the sign-in screen at `/(auth)/sign-in`
  2. Verify the screen displays the Oja logo, "Welcome back" title, and "Sign in to continue to Oja" subtitle
  3. Enter "testuser@example.com" in the email input field
  4. Tap the "Continue" button
  5. Wait for Clerk to resolve the identifier and detect password strategy
  6. Verify the password input field appears (step transitions from "email" to "password")
  7. Enter "SecurePass123!" in the password field
  8. Tap the "Sign In" button
  9. Wait for signIn.create to return status "complete"
- **Expected**:
  - Step 2: Logo image renders (140x97), title text "Welcome back" visible, subtitle visible
  - Step 4: Loading spinner appears on "Continue" button; button becomes disabled
  - Step 6: Password field is shown with lock-outline icon, "Forgot password?" link appears below
  - Step 8: Loading spinner appears on "Sign In" button; button disabled during request
  - Step 9: Success haptic fires (NotificationFeedbackType.Success); session is set active via `setActive`; navigation handled by `_layout.tsx` useEffect; auth method saved to AsyncStorage under key `oja_saved_auth` with value `{ email: "testuser@example.com", method: "password" }`

---

**TC-AUTH-002: Sign in with email verification code**
- **Priority**: P0
- **Category**: Functional
- **Preconditions**: User has an account that uses email_code strategy (no password set, not OAuth-only). Clerk is loaded.
- **Steps**:
  1. Navigate to `/(auth)/sign-in`
  2. Enter the user's email in the email field
  3. Tap "Continue"
  4. Wait for Clerk to detect `email_code` as the supported first factor (no password factor found)
  5. Verify the verification screen appears with title "Verify your email" and subtitle showing the entered email
  6. Verify the email-check-outline icon (48px, primary accent) renders in a circular container
  7. Enter the 6-digit verification code received via email
  8. Tap the "Verify" button
  9. Wait for `signIn.attemptFirstFactor` to return status "complete"
- **Expected**:
  - Step 4: Medium haptic fires; `signIn.prepareFirstFactor` is called with strategy "email_code" and the emailAddressId; `pendingVerification` state becomes true
  - Step 5: Verification UI renders with shield-key-outline icon on input, number-pad keyboard type
  - Step 6: Icon container is 80x80 circle with primary accent color at 20% opacity background
  - Step 8: "Verify" button shows loading state; button disabled when code is empty or loading
  - Step 9: Success haptic fires; session set active; user navigated to app; "Back to sign in" pressable is available on the verification screen

---

**TC-AUTH-003: Sign in with Google OAuth**
- **Priority**: P0
- **Category**: Functional
- **Preconditions**: User has a Google account linked to their Oja account. Device has internet access. `WebBrowser.maybeCompleteAuthSession()` has been called.
- **Steps**:
  1. Navigate to `/(auth)/sign-in`
  2. Locate the OAuth section below the "or continue with" divider
  3. Tap the "Google" OAuth button (shows google icon + "Google" text)
  4. Wait for `startOAuthFlow` with strategy `oauth_google` to launch the browser
  5. Complete the Google sign-in in the browser
  6. Return to the app with `createdSessionId`
- **Expected**:
  - Step 2: Divider has horizontal lines with text "or continue with" in tertiary color
  - Step 3: Light haptic fires; loading state activates; all buttons become disabled (opacity 0.5)
  - Step 4: External browser opens for Google OAuth
  - Step 6: Session set active via `setActiveSession`; success haptic fires; if email was entered, auth method saved to AsyncStorage as `{ email, method: "google" }`; navigation handled by layout

---

**TC-AUTH-004: Sign in with Apple OAuth (iOS only)**
- **Priority**: P1
- **Category**: Functional
- **Preconditions**: Device is running iOS (`Platform.OS === "ios"`). User has an Apple ID.
- **Steps**:
  1. Navigate to `/(auth)/sign-in`
  2. Verify the Apple OAuth button is visible in the OAuth container (only rendered on iOS)
  3. Tap the "Apple" button with apple icon
  4. Complete Apple Sign-In flow
  5. Return to the app with `createdSessionId`
- **Expected**:
  - Step 2: Apple button renders with apple icon (size 20) and "Apple" text; on Android, this button is not rendered at all
  - Step 3: Light haptic fires; loading state activates
  - Step 5: Session set active; success haptic fires; user navigated to app

---

**TC-AUTH-005: Saved auth preference restores last sign-in method (password)**
- **Priority**: P1
- **Category**: Functional
- **Preconditions**: AsyncStorage contains key `oja_saved_auth` with value `{ email: "returning@example.com", method: "password" }`. Clerk is loaded.
- **Steps**:
  1. Navigate to `/(auth)/sign-in`
  2. Wait for the useEffect to load saved auth from AsyncStorage
  3. Verify the saved account card appears showing the saved email and method
  4. Verify the email input is pre-filled with "returning@example.com"
  5. Verify the password field is immediately visible (no need to tap Continue first)
  6. Enter password and tap "Sign In"
  7. Verify "Use a different account" link is visible below the sign-in button
- **Expected**:
  - Step 3: GlassCard shows account-circle icon (28px, primary accent) in a 48x48 circle; email "returning@example.com" displayed in bodyMedium/600 weight; subtitle "Email & password" in tertiary text
  - Step 4: emailAddress state is "returning@example.com"
  - Step 5: Password input with lock-outline icon and "Forgot password?" link are shown; step is "email" but savedAuth flow bypasses the email-first flow
  - Step 7: "Use a different account" pressable clears savedAuth, emailAddress, password, error; removes `oja_saved_auth` from AsyncStorage

---

**TC-AUTH-006: Saved auth preference restores last sign-in method (Google)**
- **Priority**: P1
- **Category**: Functional
- **Preconditions**: AsyncStorage contains `oja_saved_auth` with `{ email: "google@example.com", method: "google" }`.
- **Steps**:
  1. Navigate to `/(auth)/sign-in`
  2. Wait for saved auth to load
  3. Verify saved account card shows google icon and "Google account" subtitle
  4. Verify a "Continue with Google" primary button is displayed instead of password fields
  5. Tap "Continue with Google"
  6. Verify "Use a different account" link is visible
- **Expected**:
  - Step 3: GlassCard shows google icon (28px, primary accent); email displayed; subtitle "Google account"
  - Step 4: Primary large button labeled "Continue with Google" triggers `onOAuthPress("google")`
  - Step 5: Google OAuth flow initiates with light haptic
  - Step 6: Tapping clears all saved state and removes from AsyncStorage

---

**TC-AUTH-007: Sign up new account with email and password**
- **Priority**: P0
- **Category**: Functional
- **Preconditions**: No existing account for "newuser@example.com". Clerk is loaded.
- **Steps**:
  1. Navigate to `/(auth)/sign-up`
  2. Verify screen shows logo, "Create account" title, "Start your budget-first shopping journey" subtitle
  3. Enter "Alice" in the "First name" field (optional, with account-outline icon)
  4. Enter "newuser@example.com" in the "Email" field
  5. Optionally enter a referral code in the "Referral Code (Optional)" field (gift-outline icon, autoCapitalize="characters")
  6. Enter "StrongPass456!" in the "Password" field
  7. Tap "Create Account" button
  8. Wait for `signUp.create` then `signUp.prepareEmailAddressVerification` to complete
  9. Verify verification screen appears
  10. Enter the 6-digit code
  11. Tap "Verify"
  12. Wait for `signUp.attemptEmailAddressVerification` to return status "complete"
- **Expected**:
  - Step 2: Logo (140x97), title in displaySmall, subtitle in bodyLarge/secondary
  - Step 3: firstName is optional; sending empty string causes `firstName.trim() || undefined` to pass undefined
  - Step 7: Button disabled when email or password is empty; loading state on press; medium haptic fires; pendingVerification becomes true
  - Step 8: `signUp.create` called with `{ firstName: "Alice", emailAddress: "newuser@example.com", password: "StrongPass456!" }`
  - Step 9: Verification screen shows email-check-outline icon, "Verify your email" title, subtitle with email
  - Step 12: Session set active; success haptic; if referral code entered, `applyReferralCode` mutation called (failure does not block signup); router.replace to `/onboarding/welcome`

---

**TC-AUTH-008: Forgot password flow (email reset code)**
- **Priority**: P0
- **Category**: Functional
- **Preconditions**: User has an existing account with email "forgetful@example.com". Clerk is loaded.
- **Steps**:
  1. Navigate to `/(auth)/sign-in`
  2. Enter email and tap Continue to get to password step
  3. Tap "Forgot password?" link
  4. Verify navigation to `/(auth)/forgot-password` screen
  5. Verify screen shows email-lock-outline icon (48px), "Forgot password?" title, instruction subtitle
  6. Enter "forgetful@example.com" in the email field
  7. Tap "Send Reset Code"
  8. Wait for `signIn.create` with strategy `reset_password_email_code`
  9. Verify step transitions to "reset" showing "Set new password" title
  10. Verify success message "Check your email for a reset code" appears in a bordered GlassCard with primary accent
  11. Enter the reset code in the "Reset code" field (number-pad)
  12. Enter new password in "New password" field
  13. Tap "Reset Password"
  14. Wait for `signIn.attemptFirstFactor` with strategy `reset_password_email_code`
- **Expected**:
  - Step 5: Icon in 80x80 circle with primary accent; subtitle explains the flow
  - Step 7: Button disabled when email empty or loading; loading state activates
  - Step 8: Medium haptic fires on success
  - Step 10: Success message card shown; subtitle shows "Enter the code sent to forgetful@example.com and your new password"
  - Step 13: Button disabled when code or newPassword empty or loading
  - Step 14: If status "complete": session set active, success haptic, router.replace to `/(app)/(tabs)`; if incomplete: error message "Password reset incomplete. Please try again." with error haptic

---

**TC-AUTH-009: Invalid email format rejected**
- **Priority**: P1
- **Category**: Negative
- **Preconditions**: Clerk is loaded. User is on sign-in screen.
- **Steps**:
  1. Navigate to `/(auth)/sign-in`
  2. Enter "not-an-email" in the email field
  3. Tap "Continue"
  4. Verify client-side validation catches the invalid format
  5. Enter "missing@" in the email field
  6. Tap "Continue"
  7. Enter "@nodomain.com" in the email field
  8. Tap "Continue"
- **Expected**:
  - Step 4: Error message "Please enter a valid email address." displayed in GlassCard with error accent; no network request made; regex `/^[^\s@]+@[^\s@]+\.[^\s@]+$/` fails
  - Step 6: Same error message displayed
  - Step 8: Same error message displayed; the regex requires characters before @, between @ and ., and after .

---

**TC-AUTH-010: Wrong password displays error**
- **Priority**: P1
- **Category**: Negative
- **Preconditions**: User has account with email "testuser@example.com". Clerk is loaded.
- **Steps**:
  1. Navigate to `/(auth)/sign-in`
  2. Enter email and proceed to password step
  3. Enter an incorrect password "WrongPass!"
  4. Tap "Sign In"
  5. Wait for Clerk error response
  6. Verify error message displays
  7. Enter another incorrect password
  8. Tap "Sign In" again
  9. Enter a third incorrect password
  10. Tap "Sign In" again
- **Expected**:
  - Step 5: Clerk returns error object with errors array
  - Step 6: Error displayed in GlassCard with error accent border; message is `clerkError.longMessage || clerkError.message || "Sign in failed"`; error haptic NOT explicitly fired in password flow (only in catch block generically)
  - Step 8: New error replaces previous (error state cleared before each attempt)
  - Step 10: After 3 failures, Clerk may rate-limit or lock the account depending on Clerk instance settings

---

**TC-AUTH-011: Expired verification code**
- **Priority**: P2
- **Category**: Edge Case
- **Preconditions**: User is on the verification screen after email code was sent. The code has expired (Clerk codes typically expire after 10 minutes).
- **Steps**:
  1. Reach the verification screen via sign-in email code flow
  2. Wait for the code to expire (or use an old/invalid code)
  3. Enter the expired code
  4. Tap "Verify"
  5. Verify error handling
- **Expected**:
  - Step 4: Loading state activates; request sent to `signIn.attemptFirstFactor`
  - Step 5: Clerk returns error; error message displayed (e.g., "Verification code has expired" or similar Clerk message); error haptic fires (NotificationFeedbackType.Error); user can tap "Back to sign in" to restart the flow

---

**TC-AUTH-012: Network error during authentication**
- **Priority**: P1
- **Category**: Edge Case
- **Preconditions**: User is on sign-in screen. Network connectivity will be interrupted.
- **Steps**:
  1. Navigate to `/(auth)/sign-in`
  2. Enter a valid email
  3. Disable network connectivity (airplane mode)
  4. Tap "Continue"
  5. Wait for the request to fail
  6. Re-enable network
  7. Tap "Continue" again
- **Expected**:
  - Step 4: Loading state activates
  - Step 5: Catch block catches the error; error message displayed as `clerkError?.longMessage || clerkError?.message || "Something went wrong. Please try again."`; loading state cleared via finally block
  - Step 7: Request succeeds; flow continues normally

---

**TC-AUTH-013: Session persistence across app close and reopen**
- **Priority**: P0
- **Category**: Functional
- **Preconditions**: User has successfully signed in and has an active Clerk session.
- **Steps**:
  1. Sign in successfully
  2. Verify navigation to the app (tabs)
  3. Force-close the app completely
  4. Reopen the app
  5. Verify the user is still authenticated
- **Expected**:
  - Step 2: User is in `(app)/(tabs)` route
  - Step 5: Clerk persists the session token; `_layout.tsx` checks auth state and routes to `(app)` directly without showing sign-in screen; ConvexProviderWithClerk provides authenticated context

---

**TC-AUTH-014: Sign out**
- **Priority**: P0
- **Category**: Functional
- **Preconditions**: User is signed in and on the app tabs.
- **Steps**:
  1. Navigate to the Profile tab
  2. Locate the sign-out option
  3. Tap sign out
  4. Wait for Clerk `signOut()` to complete
  5. Verify redirection to the auth screen
- **Expected**:
  - Step 4: Clerk session is terminated; all cached Convex data cleared
  - Step 5: Router navigates to `/(auth)/sign-in`; AsyncStorage `oja_saved_auth` key is preserved (for returning user experience)

---

**TC-AUTH-015: Multiple device sessions**
- **Priority**: P2
- **Category**: Integration
- **Preconditions**: User has accounts accessible on two devices (or two browser sessions).
- **Steps**:
  1. Sign in on Device A
  2. Sign in with the same account on Device B
  3. Verify both sessions are active simultaneously
  4. Perform an action on Device A (e.g., create a list)
  5. Verify the action is visible on Device B via Convex real-time sync
- **Expected**:
  - Step 2: Clerk allows concurrent sessions by default
  - Step 3: Both devices show authenticated state
  - Step 5: Convex WebSocket pushes real-time updates; the created list appears on Device B

---

**TC-AUTH-016: Clerk error handling for unknown error codes**
- **Priority**: P2
- **Category**: Negative
- **Preconditions**: Clerk is loaded. An edge-case Clerk error is triggered.
- **Steps**:
  1. Navigate to `/(auth)/sign-in`
  2. Enter an email that does not exist in Clerk
  3. Tap "Continue"
  4. Verify the specific error for `form_identifier_not_found`
  5. Trigger a `form_param_format_invalid` error
  6. Trigger a generic unknown Clerk error
- **Expected**:
  - Step 4: Error message: "No account found with this email. Check the address or sign up." (custom mapping for code `form_identifier_not_found`)
  - Step 5: Error message: "Please enter a valid email address." (custom mapping for code `form_param_format_invalid`)
  - Step 6: Fallback message: `clerkError.longMessage || clerkError.message || "Something went wrong. Please try again."`

---

**TC-AUTH-017: Deep link to sign-in screen**
- **Priority**: P3
- **Category**: Integration
- **Preconditions**: App is installed but user is not signed in.
- **Steps**:
  1. Open a deep link that targets `/(auth)/sign-in`
  2. Verify the sign-in screen loads correctly
  3. Verify all UI elements render (logo, inputs, OAuth buttons, footer link to sign-up)
  4. Verify the "Don't have an account? Sign up" footer link navigates to `/(auth)/sign-up`
- **Expected**:
  - Step 2: Auth layout renders with Stack, headerShown=false, background color matches `colors.background.primary`
  - Step 3: All elements render; SafeKeyboardAwareScrollView wraps content; keyboardShouldPersistTaps="handled"
  - Step 4: Link component with href `/(auth)/sign-up` navigates correctly

---

## SUITE 2: Onboarding (TC-ONBD-001 to TC-ONBD-018)

---

**TC-ONBD-001: Welcome screen display (logo, feature cards, name input)**
- **Priority**: P0
- **Category**: Functional
- **Preconditions**: User has just signed up and is navigated to `/onboarding/welcome`. Convex user record exists.
- **Steps**:
  1. Navigate to `/onboarding/welcome`
  2. Verify the Oja logo renders (160x112)
  3. Verify "Welcome to Oja!" title in displayMedium
  4. Verify subtitle "AI-powered shopping that learns what you love and helps you spend smarter."
  5. Verify the name input section with label "What should we call you?" and placeholder "First name"
  6. Verify exactly 4 feature cards render with correct data:
     - "Learns You" with brain icon: "AI-powered suggestions based on your favourite foods and habits"
     - "Scan & Earn" with cube-scan icon: "Snap products or receipts to earn points..."
     - "Voice Lists" with microphone-outline icon: "Create shopping lists by just speaking naturally"
     - "Rewards & Tiers" with star-shooting icon: "Level up from Bronze to Platinum..."
  7. Verify "Get Started" button at the bottom with arrow-right icon
- **Expected**:
  - Step 2: Image source is `@/assets/logo.png`, resizeMode "contain"
  - Step 5: GlassInput with account-outline iconLeft, autoCapitalize="words", autoComplete="given-name"
  - Step 6: Each FeatureCard in a GlassCard variant="standard" with 48x48 icon circle (primary accent 15% opacity background), icon size 24
  - Step 7: GlassButton variant="primary" size="lg" with icon

---

**TC-ONBD-002: Name entry (optional, skip allowed)**
- **Priority**: P1
- **Category**: Functional
- **Preconditions**: User is on the welcome screen. Convex user may or may not have a name.
- **Steps**:
  1. If the user has no real name (or a generic name per `isGenericName()`), verify name input is empty
  2. If the user has a real name in convexUser.name, verify it is pre-filled
  3. Leave the name input empty and tap "Get Started"
  4. Verify navigation proceeds to cuisine selection without saving name
  5. Go back, enter "Adebayo" in the name input
  6. Tap "Get Started"
  7. Wait for `updateUser({ name: "Adebayo" })` mutation to fire
- **Expected**:
  - Step 1: `existingName` is empty string because `isGenericName()` returned true or name was falsy
  - Step 3: `handleContinue` fires medium haptic; `isValidName("")` returns false so no mutation called; navigation proceeds to `/onboarding/cuisine-selection` (or `/onboarding/admin-setup` if user is admin)
  - Step 6: `isValidName("Adebayo")` returns true; mutation fires; saving state shows loading on button; if mutation fails, it is non-blocking (caught and ignored)
  - Step 7: Name saved to Convex; navigation continues regardless of save success/failure

---

**TC-ONBD-003: Cuisine selection (14 cuisines displayed)**
- **Priority**: P0
- **Category**: Functional
- **Preconditions**: User navigated from welcome screen. Location detection runs on mount.
- **Steps**:
  1. Navigate to `/onboarding/cuisine-selection`
  2. Wait for location detection to complete (loading screen with map-marker icon and "Detecting your location..." text)
  3. Verify exactly 14 cuisine buttons render in a flex-wrap grid:
     - British, Nigerian, Indian, Chinese, Italian, Pakistani, Caribbean, Mexican, Middle Eastern, Japanese, Korean, Thai, Vietnamese, Ethiopian
  4. Verify each cuisine button shows its flag emoji and name
  5. Tap on "Nigerian" cuisine
  6. Verify it becomes selected (bordered variant, primary accent, checkmark badge appears)
  7. Tap on "British" cuisine
  8. Verify both are selected; continue button shows "Continue (2 selected)"
  9. Tap on "Nigerian" again to deselect
  10. Verify it returns to unselected state; button shows "Continue (1 selected)"
- **Expected**:
  - Step 2: GlassScreen with loading icon container (80x80 circle, primary accent), ActivityIndicator, loading text
  - Step 4: Emoji in fontSize 32; name in bodyMedium/600 weight; grid is 48% width per button with flexGrow
  - Step 5: Light haptic fires; CuisineButton has press-in/press-out spring animation (scale 0.95 -> 1)
  - Step 6: GlassCard variant changes to "bordered" with primary accent; checkmark (24x24 circle, primary accent background, check icon size 14) appears at top-right; background tint `primary + 10%`
  - Step 8: Continue button text dynamically updates with count; button still has arrow-right icon
  - Step 9: Light haptic; selectedCuisines array removes the item; visual reverts to standard variant

---

**TC-ONBD-004: Must select at least 1 cuisine to continue**
- **Priority**: P0
- **Category**: Boundary
- **Preconditions**: User is on cuisine selection screen with 0 cuisines selected.
- **Steps**:
  1. Verify the "Continue" button text shows "Continue (0 selected)"
  2. Verify the button is disabled (disabled prop true when `selectedCuisines.length === 0`)
  3. Tap the disabled button
  4. Verify no navigation occurs
  5. If somehow handleContinue is called directly, verify the guard: `if (selectedCuisines.length === 0) { safeHaptics.warning(); return; }`
- **Expected**:
  - Step 2: GlassButton has `disabled={selectedCuisines.length === 0 || isSaving}` which evaluates to true
  - Step 3: Nothing happens; the Pressable is disabled
  - Step 5: Warning haptic fires; function returns early; no mutation called; no navigation

---

**TC-ONBD-005: Dietary restrictions selection (7 options, optional)**
- **Priority**: P1
- **Category**: Functional
- **Preconditions**: User is on cuisine selection screen, scrolled to dietary section.
- **Steps**:
  1. Scroll down to the dietary preferences section
  2. Verify header "Any dietary preferences?" with description "We'll use this to suggest healthier, suitable alternatives (optional)"
  3. Verify exactly 7 dietary buttons render in a flex-wrap grid (31% width each):
     - Vegan (leaf icon), Vegetarian (carrot), Gluten-Free (wheat-off), Dairy-Free (cow-off), Halal (star-crescent), Keto (fire), Paleo (bone)
  4. Tap "Halal"
  5. Verify it becomes selected (bordered variant, success accent color, icon color changes to success)
  6. Tap "Vegan"
  7. Verify both selected
  8. Do not select any dietary preferences and proceed (optional field)
- **Expected**:
  - Step 3: DietaryButton renders with MaterialCommunityIcons icon (size 24), name in labelSmall
  - Step 4: Light haptic; press-in scale animation (0.95)
  - Step 5: GlassCard variant "bordered" with `colors.accent.success`; icon color becomes success; name text becomes success color with fontWeight 700; background tint `success + 10%`
  - Step 8: selectedDietary can be empty array; handleContinue passes it to `setOnboardingData` mutation without issue

---

**TC-ONBD-006: Location auto-detection (country, postcode prefix, currency)**
- **Priority**: P0
- **Category**: Functional
- **Preconditions**: Device has network access. User navigated to cuisine selection screen.
- **Steps**:
  1. On entering the cuisine selection screen, observe the loading state
  2. Wait for `detectLocation()` to resolve
  3. Verify the location card shows detected country (e.g., "You're in United Kingdom")
  4. Verify currency text (e.g., "Prices shown in GBP")
  5. Verify postcode prefix is populated if detected (e.g., "Price area: CV12")
  6. Verify `getOrCreateUser({})` mutation was called during initialization
- **Expected**:
  - Step 1: `isDetecting` is true; loading screen renders
  - Step 2: `detectLocation()` returns `{ country, countryCode, currency, postcodePrefix }`
  - Step 3: GlassCard variant="bordered" with primary accent; map-marker icon (32px) in 56x56 circle; locationText in headlineSmall
  - Step 4: currencyText in bodyMedium/secondary
  - Step 5: Postcode row shows map-marker-radius icon (18px) and "Price area: CV12" text, or "Set your area for local prices" if not detected

---

**TC-ONBD-007: Manual postcode editing**
- **Priority**: P1
- **Category**: Functional
- **Preconditions**: User is on cuisine selection screen. Location detected.
- **Steps**:
  1. Find the postcode row in the location card
  2. Tap on the postcode display area (pencil icon visible)
  3. Verify a TextInput appears with autoFocus
  4. Type "SW1A" (auto-capitalized, maxLength 5)
  5. Tap outside the input (onBlur) or press return (onSubmitEditing)
  6. Verify the postcode display updates to "Price area: SW1A"
  7. Proceed through onboarding and verify `postcodePrefix: "SW1A"` is included in `setOnboardingData`
- **Expected**:
  - Step 2: Light haptic; `isEditingPostcode` becomes true
  - Step 3: TextInput with bodySmall style, primary text color, bottom border in primary accent; placeholder "e.g. CV12" in disabled color; autoCapitalize="characters"
  - Step 4: Input transforms text to uppercase and slices to max 5 chars
  - Step 5: `isEditingPostcode` becomes false; TextInput replaced by Pressable display
  - Step 7: `setOnboardingData` mutation called with `postcodePrefix: "SW1A"` (or undefined if empty)

---

**TC-ONBD-008: Store selection (recommended based on cuisine, mainstream grocers)**
- **Priority**: P0
- **Category**: Functional
- **Preconditions**: User completed cuisine selection (e.g., Nigerian, British). Navigated to `/onboarding/store-selection` with params `{ country, cuisines }`.
- **Steps**:
  1. Navigate to store selection screen
  2. Wait for stores to load (loading screen with store icon and "Loading stores..." text)
  3. Verify the query `api.stores.getForCuisines` was called with the selected cuisines
  4. Verify "Recommended for your cuisines" section appears with specialty stores
  5. Verify "UK supermarkets" section appears with mainstream grocers
  6. Verify each store button shows a color chip (40x8 pill), display name, and store type
  7. Tap on a store (e.g., "Tesco")
  8. Verify it becomes selected with brand color accent, checkmark badge, and stronger background
  9. Tap another store
  10. Verify continue button shows "Continue (2 selected)"
- **Expected**:
  - Step 2: storeData is null; loading UI renders
  - Step 3: `storeData.recommended` and `storeData.mainstream` arrays returned
  - Step 4: Section only shown if `storeData.recommended.length > 0`
  - Step 6: StoreButton has 48% width, minHeight 100, centered content; color chip uses store.color; name in bodyMedium/600; type in labelSmall/tertiary/capitalize
  - Step 7: Light haptic; press-in spring animation (scale 0.95 stiff, release 1 gentle)
  - Step 8: GlassCard bordered with store.color; name text color changes to store.color; checkmark circle (24x24) with store.color background at top-right
  - Step 10: Button text dynamically updates; pinned at bottom with absolute positioning

---

**TC-ONBD-009: Skip store selection**
- **Priority**: P1
- **Category**: Functional
- **Preconditions**: User is on store selection screen. No stores selected.
- **Steps**:
  1. Verify "Select at least one store" text on the continue button when 0 stores selected
  2. Verify the continue button is disabled when no stores selected
  3. Locate the "Skip for now" ghost button below the continue button
  4. Tap "Skip for now"
  5. Verify navigation to pantry seeding screen
- **Expected**:
  - Step 1: Button text is "Select at least one store"; button disabled
  - Step 3: GlassButton variant="ghost" size="md"
  - Step 4: Light haptic; `handleSkip` called; no `setStorePreferences` mutation
  - Step 5: Router pushes to `/onboarding/pantry-seeding` with params `{ country, cuisines }` using defaults if not in params

---

**TC-ONBD-010: Pantry seeding (AI-generated items based on cuisine + dietary)**
- **Priority**: P0
- **Category**: Functional
- **Preconditions**: User completed cuisine and store selection. Navigated to `/onboarding/pantry-seeding` with params `{ country, cuisines }`.
- **Steps**:
  1. Navigate to pantry seeding screen
  2. Observe the loading state with spinning refresh icon animation, cart icon, and "Creating your pantry..." title
  3. Verify progress card shows 3 items: "Location detected" (complete), "Cuisines analyzed" (complete), "Generating items" (loading)
  4. Wait for `api.ai.generateHybridSeedItems` action to complete with `{ country, cuisines }` args
  5. Observe the success state with check-circle icon (80px, primary accent)
  6. Verify "Pantry Ready!" title and "{N} items generated and ready for review" subtitle
  7. Wait 1 second for the auto-navigation timeout
  8. Verify navigation to `/onboarding/review-items` with items serialized as JSON params
- **Expected**:
  - Step 2: Spinning animation via Reanimated `withRepeat(withTiming(360deg, 2s, linear), infinite)`; cart icon in 80x80 circle (primary accent 20%); spinner icon in 40x40 circle at top-right with border
  - Step 3: ProgressItem component renders status icons: complete = check in primary accent circle, loading = ActivityIndicator in accent 30% circle, pending = faded icon
  - Step 4: Success haptic fires when items generated
  - Step 7: `setTimeout` with 1000ms delay before router.push
  - Step 8: Items JSON-stringified in route params

---

**TC-ONBD-011: Pantry seeding error and retry**
- **Priority**: P1
- **Category**: Edge Case
- **Preconditions**: AI generation fails (network error, API error).
- **Steps**:
  1. Trigger pantry seeding with conditions that cause `generateHybridSeedItems` to fail
  2. Verify error state renders with alert-circle-outline icon (64px, danger color)
  3. Verify "Oops!" title and error message "Failed to generate your pantry. Please try again."
  4. Verify error haptic fires
  5. Tap "Try Again" button (primary, refresh icon)
  6. Verify retry by calling `generateSeedItems()` again
  7. Tap "Skip & Start Empty" ghost button
  8. Verify navigation to `/(app)/(tabs)` via `router.replace`
- **Expected**:
  - Step 2: Error icon container is 100x100 circle with danger 20% background
  - Step 3: errorTitle in displaySmall, errorMessage in bodyMedium/secondary/center
  - Step 5: GlassButton variant="primary" size="lg" with refresh icon triggers `generateSeedItems`
  - Step 7: Light haptic; `handleSkip` calls `router.replace("/(app)/(tabs)")`; no items saved

---

**TC-ONBD-012: Bulk add pantry items on review screen**
- **Priority**: P0
- **Category**: Functional
- **Preconditions**: Pantry seeding generated items. User is on `/onboarding/review-items` with items in params.
- **Steps**:
  1. Navigate to review screen
  2. Verify header shows "Review Your Pantry" title and "Tap items to deselect, or toggle whole sections" subtitle
  3. Verify chip row shows local count, cultural count, and total selected count
  4. Verify items grouped by source (local vs cultural) with category sub-sections
  5. Verify all items are initially selected (Set contains all indices)
  6. Tap an individual item to deselect it
  7. Verify the item is deselected; counts update
  8. Tap the section toggle (source header) to deselect all items in that source group
  9. Verify all items in the section are deselected; "select all" badge changes
  10. Tap "Save to Pantry (N items)" button
  11. Wait for `bulkCreate` mutation, `completeOnboarding` mutation
  12. Verify navigation to `/(app)/(tabs)` via router.replace
- **Expected**:
  - Step 3: Three chips: local (primary accent border), cultural (#FFB088 border), total selected (secondary border)
  - Step 4: "Local Staples" section with home-outline icon (primary accent); "Cultural Favourites" section with earth icon (#FFB088)
  - Step 5: `selectedItems` Set initialized with all indices: `new Set(items.map((_, i) => i))`
  - Step 6: Light haptic; item removed from Set
  - Step 8: Medium haptic; all indices for the source group toggled; badge changes from check-all to checkbox-blank-outline
  - Step 10: Button shows loading, disabled during save
  - Step 11: `bulkCreate` called with items mapped to `{ name, category, stockLevel, estimatedPrice, hasVariants, defaultSize, defaultUnit }`; stockLevel mapped: "good" -> "stocked", "half" -> "low"; `completeOnboarding` called after; success haptic; variant generation kicked off in background (non-blocking)

---

**TC-ONBD-013: Complete onboarding triggers trial auto-start (7 days)**
- **Priority**: P0
- **Category**: Integration
- **Preconditions**: New user completing onboarding for the first time. No existing subscription.
- **Steps**:
  1. Complete the onboarding flow through to review screen
  2. Tap "Save to Pantry" (or skip to continue with empty pantry)
  3. Wait for `completeOnboarding` mutation to complete
  4. Navigate to the app and check subscription status
- **Expected**:
  - Step 3: `completeOnboarding` mutation marks user onboarding as complete; trial subscription is auto-created with status "trial", trialEndsAt set to 7 days from now
  - Step 4: User has premium access during trial period; `isEffectivelyPremium` returns true for status "trial"; unlimited lists, pantry items, etc. during trial

---

**TC-ONBD-014: Skip entire onboarding steps**
- **Priority**: P1
- **Category**: Functional
- **Preconditions**: User is at various points in the onboarding flow.
- **Steps**:
  1. On welcome screen, tap "Get Started" without entering a name
  2. On cuisine selection, select 1 cuisine and continue (minimum required)
  3. On store selection, tap "Skip for now"
  4. On pantry seeding, if error occurs tap "Skip & Start Empty"
  5. On review screen, deselect all items and tap "Save to Pantry"
  6. Verify the alert dialog appears: "No items selected" / "You haven't selected any items. Start with an empty pantry?"
  7. Tap "Continue" in the alert
  8. Verify `completeOnboarding` called and user navigated to app
- **Expected**:
  - Step 1: No mutation called (empty name fails `isValidName`); navigation proceeds
  - Step 3: No store preferences saved; navigation proceeds
  - Step 4: `router.replace("/(app)/(tabs)")` called directly
  - Step 6: GlassAlert with "Cancel" (style cancel) and "Continue" options
  - Step 7: Light haptic; `completeOnboarding` called; `router.replace("/(app)/(tabs)")`

---

**TC-ONBD-015: Back navigation during onboarding**
- **Priority**: P1
- **Category**: Functional
- **Preconditions**: User is at various points in the onboarding flow.
- **Steps**:
  1. Navigate from welcome to cuisine selection
  2. Tap the hardware/gesture back button
  3. Verify return to welcome screen with state preserved
  4. Navigate forward to cuisine, select cuisines, continue to store selection
  5. Tap back
  6. Verify return to cuisine selection with previously selected cuisines still selected
- **Expected**:
  - Step 2: Onboarding layout uses Stack with `animation: "slide_from_right"`; back gesture works
  - Step 3: Welcome screen re-renders; any name entered previously may not persist (local state)
  - Step 6: Cuisine selection screen is a new mount; previously saved onboarding data via mutation is persisted server-side, but local UI state (selectedCuisines) resets

---

**TC-ONBD-016: Resume interrupted onboarding (app killed mid-flow)**
- **Priority**: P2
- **Category**: Edge Case
- **Preconditions**: User started onboarding, completed cuisine selection (data saved via `setOnboardingData`), then app was killed.
- **Steps**:
  1. Start onboarding and complete cuisine selection (setOnboardingData mutation saved)
  2. Force-kill the app
  3. Reopen the app
  4. Verify the app detects incomplete onboarding (user record has cuisinePreferences but onboarding not marked complete)
  5. Verify the user is routed back into the onboarding flow
- **Expected**:
  - Step 4: The `_layout.tsx` root layout checks if the user's onboarding is complete via the Convex user record
  - Step 5: User resumes from the appropriate onboarding step; data already saved (cuisine preferences, name) is available server-side

---

**TC-ONBD-017: Onboarding with no network**
- **Priority**: P2
- **Category**: Edge Case
- **Preconditions**: User just signed up. Network is unavailable.
- **Steps**:
  1. Navigate to welcome screen (renders from local bundle)
  2. Enter name and tap "Get Started"
  3. On cuisine selection, `detectLocation()` fails or returns defaults
  4. `getOrCreateUser({})` mutation fails
  5. Verify error handling is graceful (errors are caught, not thrown)
  6. Select cuisines and tap Continue
  7. `setOnboardingData` mutation fails
- **Expected**:
  - Step 3: Location defaults to empty/UK defaults; detection error caught silently (`catch` in `initializeUser`)
  - Step 4: Error logged via `console.error("Failed to create user:", error)`; flow continues
  - Step 6: Attempting to save fails
  - Step 7: Error caught in try/catch; `safeHaptics.error()` fires; isSaving reset via finally block; user stays on screen

---

**TC-ONBD-018: Already-subscribed user skips trial creation**
- **Priority**: P2
- **Category**: Edge Case
- **Preconditions**: User already has an active premium subscription (e.g., restarted onboarding, or admin user).
- **Steps**:
  1. User with existing active subscription completes onboarding
  2. `completeOnboarding` mutation fires
  3. Verify that no new trial subscription is created
  4. Verify existing subscription remains unchanged
- **Expected**:
  - Step 2: Mutation marks onboarding complete
  - Step 3: `completeOnboarding` checks for existing subscription; if `status === "active"` already exists, trial creation is skipped
  - Step 4: User retains their premium subscription without disruption

---

## SUITE 3: Shopping Lists (TC-LIST-001 to TC-LIST-035)

---

**TC-LIST-001: View active lists**
- **Priority**: P0
- **Category**: Functional
- **Preconditions**: User is signed in and has 2 active shopping lists in the database.
- **Steps**:
  1. Navigate to the Lists tab (`(app)/(tabs)/index.tsx`)
  2. Wait for `api.shoppingLists.getActive` query to resolve
  3. Verify both lists appear in the active lists section
  4. Verify each list card shows: name, item count, checked count, total estimated cost, and in-progress indicator
- **Expected**:
  - Step 2: Query returns enriched list objects with `itemCount`, `checkedCount`, `totalEstimatedCost`, `isInProgress` (true if shoppingStartedAt != null and completedAt == null)
  - Step 3: Lists ordered by descending creation time
  - Step 4: Each list card displays the data; estimated cost only shown if `> 0`

---

**TC-LIST-002: View empty state (no lists)**
- **Priority**: P1
- **Category**: Functional
- **Preconditions**: User has no shopping lists.
- **Steps**:
  1. Navigate to the Lists tab
  2. Wait for query to resolve with empty array
  3. Verify empty state UI renders
- **Expected**:
  - Step 2: `getActive` returns `[]`
  - Step 3: Empty state message displayed (e.g., illustration, prompt to create first list)

---

**TC-LIST-003: Create list from scratch**
- **Priority**: P0
- **Category**: Functional
- **Preconditions**: User is signed in. Free user has < 2 active lists (or is premium).
- **Steps**:
  1. Tap the create list button on the Lists tab
  2. Enter list name "Weekly Shop"
  3. Verify grocery title case is applied: "Weekly Shop" (toGroceryTitleCase)
  4. Set budget to 75 (or accept default 50)
  5. Optionally select a store
  6. Tap create/confirm
  7. Wait for `api.shoppingLists.create` mutation
- **Expected**:
  - Step 3: `toGroceryTitleCase("Weekly Shop")` returns "Weekly Shop"
  - Step 6: Mutation called with `{ name: "Weekly Shop", budget: 75, storeName, normalizedStoreId }`
  - Step 7: Rate limit checked via `api.aiUsage.checkRateLimit` with feature "shopping_lists"; `canCreateList` checks feature gating; list inserted with status "active", default budget 50 if not specified, sequential `listNumber`; funnel event "first_list" tracked; activity tracked; list ID returned; optimistic update shows list immediately

---

**TC-LIST-004: Create list from template/past trip**
- **Priority**: P1
- **Category**: Functional
- **Preconditions**: User has a completed list in history. Templates module available.
- **Steps**:
  1. Navigate to create list flow
  2. Select "From previous trip" or template option
  3. Choose a past completed list
  4. Verify new list is created with items cloned from the template
  5. Verify the new list has status "active" and fresh timestamps
- **Expected**:
  - Step 4: Items from the template list are duplicated into the new list via `api.shoppingLists.templates` functions
  - Step 5: New list has unique ID, new createdAt/updatedAt, items have new IDs, isChecked reset to false

---

**TC-LIST-005: Create list from receipt**
- **Priority**: P1
- **Category**: Functional
- **Preconditions**: User has a scanned receipt available. Route `create-list-from-receipt.tsx` exists.
- **Steps**:
  1. Navigate to receipt-based list creation
  2. Select a receipt
  3. Verify items are extracted from receipt and populated in a new list
  4. Verify prices from receipt are used as estimatedPrice
  5. Confirm creation
- **Expected**:
  - Step 3: Items from receipt are mapped to list items using `cleanItemForStorage` for name/size/unit
  - Step 4: Receipt prices used with `priceSource: "personal"` and high confidence

---

**TC-LIST-006: Set list name (grocery title case applied)**
- **Priority**: P1
- **Category**: Functional
- **Preconditions**: User is creating or editing a list.
- **Steps**:
  1. Enter list name "my weekly groceries"
  2. Submit the name
  3. Verify `toGroceryTitleCase` transforms it
  4. Enter "TESCO RUN"
  5. Verify transformation
- **Expected**:
  - Step 3: Name stored as title-cased version (implementation-dependent, but common grocery words handled)
  - Step 5: Transformed appropriately by the title case utility

---

**TC-LIST-007: Set budget (default 50 pounds)**
- **Priority**: P0
- **Category**: Functional
- **Preconditions**: User is creating a new list.
- **Steps**:
  1. Create a new list without specifying budget
  2. Verify the default budget is 50
  3. Create another list with budget explicitly set to 120
  4. Verify the budget is 120
- **Expected**:
  - Step 2: `args.budget ?? 50` in create mutation results in budget=50
  - Step 4: Budget stored as 120

---

**TC-LIST-008: Edit list name**
- **Priority**: P1
- **Category**: Functional
- **Preconditions**: User has an active list. List is not completed or archived.
- **Steps**:
  1. Navigate to list detail
  2. Tap edit name option
  3. Change name from "Weekly Shop" to "Saturday Market"
  4. Save the change
  5. Wait for `api.shoppingLists.update` mutation
- **Expected**:
  - Step 5: Mutation called with `{ id: listId, name: "Saturday Market" }`; `requireEditableList` passes (status is "active"); `getUserListPermissions` checks `canEdit`; name transformed via `toGroceryTitleCase`; `updatedAt` set to `Date.now()`

---

**TC-LIST-009: Edit budget**
- **Priority**: P1
- **Category**: Functional
- **Preconditions**: User has an active list with budget 50.
- **Steps**:
  1. Navigate to list detail
  2. Tap edit budget
  3. Change budget from 50 to 85
  4. Save the change
- **Expected**:
  - Step 4: Mutation `api.shoppingLists.update` called with `{ id: listId, budget: 85 }`; budget dial on list detail updates to reflect new budget

---

**TC-LIST-010: Delete list (confirmation dialog)**
- **Priority**: P0
- **Category**: Functional
- **Preconditions**: User has an active list with 5 items.
- **Steps**:
  1. Navigate to list detail or list card
  2. Tap delete option
  3. Verify a confirmation dialog appears
  4. Tap "Cancel" in dialog
  5. Verify list still exists
  6. Tap delete again and confirm
  7. Wait for `api.shoppingLists.remove` mutation
- **Expected**:
  - Step 3: Confirmation dialog warns about permanent deletion
  - Step 5: List unchanged; no mutation called
  - Step 7: `requireUser` verifies auth; `getUserListPermissions` checks canEdit; all list items queried via `by_list` index and deleted one by one; then the list document itself is deleted; returns `{ success: true }`

---

**TC-LIST-011: Archive completed list**
- **Priority**: P1
- **Category**: Functional
- **Preconditions**: User has a completed list (status "completed").
- **Steps**:
  1. Find a completed list
  2. Trigger archive action
  3. Wait for `api.shoppingLists.update` with `{ id: listId, status: "archived" }`
  4. Verify list moves from active view to history
- **Expected**:
  - Step 3: Status changes from "completed" to "archived"; `requireEditableList` allows status change on completed lists (only blocks edit of fields, status change is allowed via update mutation); updatedAt set
  - Step 4: List no longer appears in `getActive` query (filters by status "active")

---

**TC-LIST-012: View history tab**
- **Priority**: P1
- **Category**: Functional
- **Preconditions**: User has completed and archived lists.
- **Steps**:
  1. Navigate to the history/completed lists section
  2. Verify completed lists appear with their completion details
  3. Verify archived lists are also accessible
- **Expected**:
  - Step 2: `getByUser` query returns all lists (including completed/archived) ordered by desc
  - Step 3: Lists filterable by status

---

**TC-LIST-013: Filter history by store/date/search**
- **Priority**: P2
- **Category**: Functional
- **Preconditions**: User has multiple completed lists across different stores and dates.
- **Steps**:
  1. Navigate to history
  2. Apply store filter (e.g., "Tesco")
  3. Verify only lists with that store are shown
  4. Apply date filter
  5. Apply search filter by list name
  6. Clear all filters
- **Expected**:
  - Step 3: Client-side or server-side filtering by `normalizedStoreId` or `storeName`
  - Step 4: Filtered by `completedAt` date range
  - Step 5: Filtered by name substring match
  - Step 6: All lists visible again

---

**TC-LIST-014: List detail screen - header with store info**
- **Priority**: P0
- **Category**: Functional
- **Preconditions**: User has an active list with store "Tesco" set and items purchased at "Tesco" and "Aldi".
- **Steps**:
  1. Navigate to `list/[id].tsx`
  2. Wait for `api.shoppingLists.getById` query
  3. Verify header displays list name
  4. Verify subtitle shows store information
  5. Verify the list returns `isInProgress` correctly based on `shoppingStartedAt` and `completedAt`
- **Expected**:
  - Step 2: Returns list document with `isInProgress: shoppingStartedAt != null && completedAt == null`
  - Step 4: Store info displayed in header subtitle area

---

**TC-LIST-015: Budget dial (spending vs budget)**
- **Priority**: P0
- **Category**: Functional
- **Preconditions**: User has a list with budget 100 and items totaling estimated cost 65.
- **Steps**:
  1. Navigate to list detail
  2. Observe the budget dial component
  3. Verify it shows the active store's spending
  4. Verify the visual indicator reflects 65/100 (65% spent)
  5. Add more items to exceed budget
  6. Verify the dial shows over-budget state
- **Expected**:
  - Step 3: Budget dial displays current total vs budget
  - Step 4: Visual shows proportional fill; remaining budget visible
  - Step 6: Over-budget visual feedback (e.g., red accent or warning indicator)

---

**TC-LIST-016: Confirmed stores display (pipe-separated)**
- **Priority**: P1
- **Category**: Functional
- **Preconditions**: User has a list where items were checked off at multiple stores. Items have `purchasedAtStoreName` values "Tesco" and "Aldi".
- **Steps**:
  1. Navigate to list detail
  2. Observe the header subtitle for confirmed stores
  3. Verify confirmed stores are shown pipe-separated: "Tesco | Aldi"
  4. These are permanent because items were checked off at those stores
- **Expected**:
  - Step 3: Stores where items have been purchased (checked off) are displayed as confirmed; derived from items' `purchasedAtStoreName` fields; shown as "Tesco | Aldi"
  - Step 4: Confirmed stores persist even if the active store changes

---

**TC-LIST-017: Tentative store (preview, replaced on switch)**
- **Priority**: P1
- **Category**: Functional
- **Preconditions**: User has a list with active store "Tesco" but no items checked off yet.
- **Steps**:
  1. Navigate to list detail
  2. Observe the store display shows "Tesco" as tentative (no items confirmed yet)
  3. Switch the store to "Aldi" via store selector
  4. Verify "Tesco" disappears and "Aldi" becomes the tentative store
  5. Check off an item at "Aldi"
  6. Verify "Aldi" becomes confirmed (permanent)
- **Expected**:
  - Step 2: Tentative store shown as a preview; visually distinct from confirmed stores
  - Step 4: `switchStore` or `switchStoreMidShop` mutation fires; list's `normalizedStoreId` and `storeName` update
  - Step 5: Item's `purchasedAtStoreId` and `purchasedAtStoreName` set to "Aldi"
  - Step 6: Aldi now appears as a confirmed store

---

**TC-LIST-018: Store selector dropdown**
- **Priority**: P1
- **Category**: Functional
- **Preconditions**: User has a list on list detail screen.
- **Steps**:
  1. Tap the store selector
  2. Verify available stores are shown (user's favorites + all known stores)
  3. Select a different store
  4. Wait for store switch mutation
  5. Verify item prices update for the new store
- **Expected**:
  - Step 3: `switchStore` mutation in `shoppingLists/misc.ts` called; `requireEditableList` checks list is active
  - Step 5: Items without `priceOverride` have their prices updated from `currentPrices` table for the new store; items with `priceOverride` keep their manual prices; sizes may change to match available sizes at new store (closest size match with 20% tolerance)

---

**TC-LIST-019: Start trip at store**
- **Priority**: P0
- **Category**: Functional
- **Preconditions**: User has an active list that hasn't started a trip yet (shoppingStartedAt is null).
- **Steps**:
  1. Navigate to list detail
  2. Select a store (e.g., "Tesco")
  3. Tap "Start Trip" or begin shopping action
  4. Wait for `api.shoppingLists.markTripStart` mutation
- **Expected**:
  - Step 4: `requireEditableList` passes; `getUserListPermissions` checks canEdit; `shoppingStartedAt` set to `Date.now()`; `activeShopperId` set to current user ID; `normalizedStoreId` and `storeName` set; initial store segment added to `storeSegments` array; `updatedAt` set; returns updated list

---

**TC-LIST-020: Switch store mid-trip**
- **Priority**: P1
- **Category**: Functional
- **Preconditions**: User is mid-trip at "Tesco" (shoppingStartedAt is set).
- **Steps**:
  1. Tap store selector during active trip
  2. Select "Aldi" as new store
  3. Wait for `api.shoppingLists.switchStoreMidShop` mutation
  4. Verify store segment is added
- **Expected**:
  - Step 3: `getStoreInfoSafe` validates the store ID; new segment `{ storeId, storeName, switchedAt }` appended to `storeSegments` array; list's `normalizedStoreId` and `storeName` updated to Aldi; `updatedAt` set
  - Step 4: Returns `{ success: true, storeName: "Aldi", storeId, segmentCount }`

---

**TC-LIST-021: Check off items (records purchasedAtStoreId)**
- **Priority**: P0
- **Category**: Functional
- **Preconditions**: User has a list with items at a store. Trip may or may not be started.
- **Steps**:
  1. Navigate to list detail with items
  2. Tap an unchecked item to check it off
  3. Wait for `api.listItems.toggleChecked` mutation
  4. Verify the item is now checked
  5. If trip not started, verify trip auto-starts
- **Expected**:
  - Step 3: `requireUser` and `getUserListPermissions` verify access; `newChecked = !item.isChecked` (becomes true)
  - Step 4: Item patched with `isChecked: true`, `checkedAt: Date.now()`, `checkedByUserId: user._id`, `purchasedAtStoreId: list.normalizedStoreId`, `purchasedAtStoreName: list.storeName`
  - Step 5: If `newChecked && list && !list.shoppingStartedAt`, the list is auto-patched with `shoppingStartedAt`, `activeShopperId`, `updatedAt`

---

**TC-LIST-022: Finish trip produces trip summary**
- **Priority**: P0
- **Category**: Functional
- **Preconditions**: User has an active trip with some items checked and some unchecked.
- **Steps**:
  1. Tap "Finish Trip" on the list
  2. Wait for `api.shoppingLists.finishTrip` mutation
  3. Verify trip summary data returned
  4. Navigate to trip summary screen
- **Expected**:
  - Step 2: `getUserListPermissions` checks canEdit; actual total calculated from checked items `(actualPrice || estimatedPrice) * quantity`; per-store breakdown computed from items' `purchasedAtStoreId`/`purchasedAtStoreName`; list status set to "completed"; `completedAt` set to now; `activeShopperId` cleared; `actualTotal` stored (if > 0)
  - Step 3: Returns list with `storeBreakdown` array: `[{ storeId, storeName, itemCount, subtotal }]`

---

**TC-LIST-023: Auto-restock pantry from trip**
- **Priority**: P1
- **Category**: Integration
- **Preconditions**: Trip completed with checked items that are linked to pantry items.
- **Steps**:
  1. Complete a trip
  2. Verify pantry items linked to checked list items are restocked
  3. Verify stock levels updated from "out" or "low" to "stocked"
- **Expected**:
  - Step 2: Items with `pantryItemId` trigger pantry restock logic
  - Step 3: Pantry item's stockLevel updated; lastPrice updated from actual purchase price

---

**TC-LIST-024: Health analysis (AI score 0-100)**
- **Priority**: P1
- **Category**: Functional
- **Preconditions**: User has a list with at least 3 items.
- **Steps**:
  1. Trigger health analysis on a list
  2. Wait for AI to analyze the items
  3. Verify health analysis result stored on the list
  4. Verify score between 0 and 100
  5. Verify strengths, weaknesses, and swap suggestions present
- **Expected**:
  - Step 3: `updateHealthAnalysis` internal mutation patches list with `healthAnalysis` object containing: `score` (number), `summary` (string), `strengths` (array), `weaknesses` (array), `swaps` (array of objects with originalName, suggestedName, reason, etc.), `itemCountAtAnalysis`, `updatedAt`
  - Step 4: Score is 0-100 inclusive
  - Step 5: Swaps include `originalId`, `suggestedName`, `suggestedCategory`, `suggestedSize`, `suggestedUnit`, `priceDelta`, `scoreImpact`, `reason`

---

**TC-LIST-025: Health swap suggestions**
- **Priority**: P1
- **Category**: Functional
- **Preconditions**: List has health analysis with swap suggestions.
- **Steps**:
  1. View health analysis on list detail
  2. Find a swap suggestion (e.g., "Replace White Bread with Wholemeal Bread")
  3. Tap "Apply Swap"
  4. Wait for `api.listItems.applyHealthSwap` mutation
  5. Verify the original item is deleted and replaced with the healthier alternative
- **Expected**:
  - Step 4: `resolveVariantWithPrice` attempts to find variant and price for suggested item; original item deleted; new item inserted with: `cleaned.name`, category (from suggestion or variant or original), quantity/priority from original, price from variant or emergency estimate, `cleanItemForStorage` applied
  - Step 5: Health analysis score updated: `Math.min(100, currentScore + scoreImpact)`; applied swap removed from swaps array

---

**TC-LIST-026: Refresh prices button**
- **Priority**: P1
- **Category**: Functional
- **Preconditions**: User has a list with items at a specific store.
- **Steps**:
  1. Tap "Refresh Prices" on list detail
  2. Wait for `api.listItems.refreshListPrices` mutation
  3. Verify prices updated for unchecked, non-overridden items
- **Expected**:
  - Step 2: Iterates all items; skips checked items and items with `priceOverride`; for each item, tries: (1) learned mapping via `findLearnedMapping` with confidence >= 50, then personal price history, (2) personal `priceHistory` by user+item, (3) `currentPrices` by item+store+region (region-specific first, fallback to any region)
  - Step 3: Returns `{ updated: N, total: M }` where N is count of items with changed prices; `recalculateListTotal` called if any updates

---

**TC-LIST-027: Shared list indicators (partner avatars)**
- **Priority**: P2
- **Category**: Functional
- **Preconditions**: List has been shared with a partner (listPartners record exists with status "accepted").
- **Steps**:
  1. View active lists
  2. Verify shared list shows partner avatars or sharing indicator
  3. Navigate to shared list detail
  4. Verify partner has view/edit access per their permission level
- **Expected**:
  - Step 2: Shared indicator visible on list card
  - Step 4: `getUserListPermissions` returns appropriate `canView`/`canEdit` for the partner

---

**TC-LIST-028: Free tier limit: max 2 lists**
- **Priority**: P0
- **Category**: Boundary
- **Preconditions**: User is on free plan (no premium, trial expired). User has 2 active lists.
- **Steps**:
  1. Attempt to create a 3rd list
  2. Wait for `api.shoppingLists.create` mutation
  3. Verify error thrown
- **Expected**:
  - Step 2: `canCreateList` queries active lists via `by_user_status` index; finds 2 active lists
  - Step 3: Returns `{ allowed: false, reason: "Free plan allows 2 active lists. Upgrade to Premium for unlimited lists.", currentCount: 2, maxCount: 2 }`; mutation throws the error; UI shows upgrade prompt

---

**TC-LIST-029: Premium: unlimited lists**
- **Priority**: P1
- **Category**: Functional
- **Preconditions**: User has active premium subscription or trial.
- **Steps**:
  1. Verify user has 5+ active lists already
  2. Create another list
  3. Verify creation succeeds
- **Expected**:
  - Step 2: `canCreateList` checks `checkFeatureAccess`; `isPremium` is true; `features.maxLists` is -1 (unlimited)
  - Step 3: Returns `{ allowed: true }`; list created successfully

---

**TC-LIST-030: Optimistic update on item check**
- **Priority**: P0
- **Category**: Functional
- **Preconditions**: User is on list detail with items.
- **Steps**:
  1. Tap an unchecked item
  2. Observe UI updates immediately before server confirms
  3. Wait for server mutation to complete
  4. Verify item state matches server
- **Expected**:
  - Step 2: Optimistic update shows checked state instantly; UI does not wait for round-trip
  - Step 3: Server confirms the toggle via `toggleChecked` mutation
  - Step 4: If server fails, optimistic update rolls back

---

**TC-LIST-031: Empty list state**
- **Priority**: P1
- **Category**: Functional
- **Preconditions**: User has a list with 0 items.
- **Steps**:
  1. Navigate to the list detail
  2. Verify empty state is displayed
  3. Verify prompt to add items (e.g., "Add your first item" or similar CTA)
- **Expected**:
  - Step 2: Items query returns empty array; empty state UI renders
  - Step 3: Add item action is prominently displayed

---

**TC-LIST-032: List with 100+ items performance**
- **Priority**: P2
- **Category**: Boundary
- **Preconditions**: User has a list with 100+ items.
- **Steps**:
  1. Navigate to the list detail
  2. Measure render time for all items
  3. Scroll through the full list
  4. Check/uncheck items
  5. Verify no UI jank or excessive re-renders
- **Expected**:
  - Step 2: List renders within acceptable time (< 2 seconds)
  - Step 3: Smooth scrolling via FlatList/VirtualizedList
  - Step 4: Item toggle is responsive; optimistic updates prevent lag

---

**TC-LIST-033: Completed list is read-only (blocks all mutations)**
- **Priority**: P0
- **Category**: Security
- **Preconditions**: User has a list with status "completed".
- **Steps**:
  1. Attempt to edit the list name via `api.shoppingLists.update`
  2. Attempt to add an item via `api.listItems.create`
  3. Attempt to delete an item
  4. Attempt to toggle an item
  5. Attempt to start a trip via `markTripStart`
- **Expected**:
  - Step 1: `requireEditableList(list)` checks `list.status === "completed"` and throws `"Cannot edit a completed list. Completed lists are read-only."`
  - Step 2: Same error from `requireEditableList` (called in list mutations that modify items)
  - Step 3: `remove` mutation does not call `requireEditableList` but checks permissions
  - Step 4: `toggleChecked` does not explicitly call `requireEditableList` -- items can be edited independently (the guard is on list-level mutations)
  - Step 5: `markTripStart` calls `requireEditableList` which throws for completed lists

---

**TC-LIST-034: Notifications dropdown on lists tab**
- **Priority**: P2
- **Category**: Functional
- **Preconditions**: User has pending notifications (e.g., shared list invitations, low stock alerts).
- **Steps**:
  1. Navigate to Lists tab
  2. Observe notification badge/indicator
  3. Tap notifications dropdown
  4. Verify notifications display correctly
- **Expected**:
  - Step 2: Badge shows count of unread notifications
  - Step 4: Notifications list renders with appropriate actions

---

**TC-LIST-035: Stats strip (history totals)**
- **Priority**: P2
- **Category**: Functional
- **Preconditions**: User has completed multiple shopping trips.
- **Steps**:
  1. Navigate to history section
  2. Observe the stats strip/summary area
  3. Verify it shows aggregate statistics (e.g., total spent, trips completed, average basket size)
- **Expected**:
  - Step 3: Stats derived from completed lists' `actualTotal`, `completedAt`, item counts

---

## SUITE 4: List Items (TC-ITEM-001 to TC-ITEM-025)

---

**TC-ITEM-001: Add item by typing name**
- **Priority**: P0
- **Category**: Functional
- **Preconditions**: User has an active list. Free tier rate limit not exceeded.
- **Steps**:
  1. Navigate to list detail
  2. Tap the add item input
  3. Type "Semi-Skimmed Milk"
  4. Submit the item with quantity 1
  5. Wait for `api.listItems.create` mutation
- **Expected**:
  - Step 5: `requireUser` verifies auth; `getUserListPermissions` checks canEdit; rate limit checked (100 items/month for free); `cleanItemForStorage(toGroceryTitleCase("Semi-Skimmed Milk"), undefined, undefined)` called; duplicate check via `findDuplicateListItem`; if no duplicate: pantry check via `findDuplicatePantryItem` (may inherit defaultSize/lastPrice); emergency price estimate if no price found; item inserted with `isChecked: false`, `priority: "should-have"`, `autoAdded: false`; `recalculateListTotal` called; returns `{ status: "added", itemId }`

---

**TC-ITEM-002: Add item with size and unit**
- **Priority**: P0
- **Category**: Functional
- **Preconditions**: User has an active list.
- **Steps**:
  1. Add an item with name "Milk", size "500ml", unit "ml"
  2. Wait for mutation
  3. Verify item stored with correct size and unit
- **Expected**:
  - Step 2: `cleanItemForStorage("Milk", "500ml", "ml")` processes the input; `parseItemNameAndSize` validates size/unit pair; `isValidSize("500ml", "ml")` returns true (has number, unit is in VALID_UNITS, unit matches)
  - Step 3: Item stored with `name: "Milk"`, `size: "500ml"`, `unit: "ml"`

---

**TC-ITEM-003: Add item from pantry (pantry pick)**
- **Priority**: P0
- **Category**: Functional
- **Preconditions**: User has pantry items. Route `pantry-pick.tsx` exists.
- **Steps**:
  1. Navigate to pantry pick screen from list detail
  2. Select multiple pantry items (e.g., 3 items)
  3. Confirm selection
  4. Wait for `api.listItems.addFromPantryBulk` mutation
  5. Verify items added to the list
- **Expected**:
  - Step 4: For each pantry item: checks if user owns it (`pantryItem.userId !== user._id` -> skip); checks for duplicates via `findDuplicateListItem` (skip if exists); `cleanItemForStorage(pantryItem.name, pantryItem.defaultSize, pantryItem.defaultUnit)` applied; item inserted with `pantryItemId` link, `estimatedPrice: pantryItem.lastPrice`, `priceSource: "personal"`, `autoAdded: true`, `priority: "should-have"`
  - Step 5: Returns `{ added: N }` count; `recalculateListTotal` called once at end

---

**TC-ITEM-004: Item name parser: cleanItemForStorage MANDATORY**
- **Priority**: P0
- **Category**: Integration
- **Preconditions**: Various item creation paths.
- **Steps**:
  1. Verify `cleanItemForStorage` is called in `listItems/core.ts` create mutation (line: `cleanItemForStorage(toGroceryTitleCase(args.name), args.size, args.unit)`)
  2. Verify it is called in `addBatchFromScan` (line: `cleanItemForStorage(item.name, item.size, item.unit)`)
  3. Verify it is called in `addItemMidShop` (line: `cleanItemForStorage(toGroceryTitleCase(args.name), undefined, undefined)`)
  4. Verify it is called in `addFromPantryBulk` (line: `cleanItemForStorage(pantryItem.name, pantryItem.defaultSize, pantryItem.defaultUnit)`)
  5. Verify it is called in `applyHealthSwap` (line: `cleanItemForStorage(args.suggestedName, size, unit)`)
- **Expected**:
  - Steps 1-5: Every item creation/update path calls `cleanItemForStorage` before inserting into the database; no path bypasses this utility

---

**TC-ITEM-005: Display format "{size} {name}" (e.g., "500ml Milk")**
- **Priority**: P0
- **Category**: Functional
- **Preconditions**: Item exists with name "Milk", size "500ml", unit "ml".
- **Steps**:
  1. Call `formatItemDisplay("Milk", "500ml", "ml")`
  2. Verify the output
  3. Call `formatItemDisplay("Rice", "2kg", "kg")`
  4. Call `formatItemDisplay("Eggs", undefined, undefined)`
  5. Call `formatItemDisplay("Eggs", "per item", "each")`
- **Expected**:
  - Step 2: Returns "500ml Milk" (size at beginning, space, name)
  - Step 3: Returns "2kg Rice"
  - Step 4: Returns "Eggs" (no size prefix)
  - Step 5: Returns "Eggs" (vague size "per item" filtered out by `isValidSize`)

---

**TC-ITEM-006: 40-char display truncation (name truncated, size never)**
- **Priority**: P1
- **Category**: Boundary
- **Preconditions**: Item with long name.
- **Steps**:
  1. Call `formatItemDisplay("Organic Extra Virgin Cold Pressed Olive Oil Premium", "500ml", "ml")`
  2. Verify the output is truncated to 40 characters max
  3. Verify the size "500ml" is preserved completely
  4. Verify the name is truncated with ellipsis character
- **Expected**:
  - Step 2: `MAX_DISPLAY_CHARS = 40`; full string would exceed 40; `maxNameLen = 40 - 5 (size) - 1 (space) = 34`; name truncated to 33 chars + ellipsis
  - Step 3: Size "500ml" is never truncated
  - Step 4: Name ends with unicode ellipsis character `\u2026`

---

**TC-ITEM-007: Size without unit = REJECTED (both become undefined)**
- **Priority**: P0
- **Category**: Negative
- **Preconditions**: Attempting to store an item with size but no unit.
- **Steps**:
  1. Call `cleanItemForStorage("Milk", "500", undefined)`
  2. Verify the result
  3. Call `cleanItemForStorage("Rice", "2", "")`
  4. Verify the result
  5. Call `isValidSize("500", undefined)`
- **Expected**:
  - Step 2: `parseItemNameAndSize` tries to extract unit from "500" but finds no valid unit; `isValidSize("500", undefined)` returns false; returns `{ name: "Milk", size: undefined, unit: undefined }`
  - Step 4: Same behavior; size "2" has no extractable unit; both size and unit become undefined
  - Step 5: Returns false immediately because `!unit` is true (both size AND unit are required)

---

**TC-ITEM-008: Valid UK units only**
- **Priority**: P0
- **Category**: Boundary
- **Preconditions**: Testing `isValidSize` with various units.
- **Steps**:
  1. Test `isValidSize("500ml", "ml")` -- valid
  2. Test `isValidSize("2l", "l")` -- valid
  3. Test `isValidSize("500g", "g")` -- valid
  4. Test `isValidSize("2kg", "kg")` -- valid
  5. Test `isValidSize("2pt", "pt")` -- valid
  6. Test `isValidSize("1pint", "pint")` -- valid
  7. Test `isValidSize("6pack", "pack")` -- valid
  8. Test `isValidSize("6pk", "pk")` -- valid
  9. Test `isValidSize("4x", "x")` -- valid
  10. Test `isValidSize("8oz", "oz")` -- valid
  11. Test `isValidSize("500lb", "lb")` -- INVALID (lb not in VALID_UNITS)
  12. Test `isValidSize("500cups", "cups")` -- INVALID
- **Expected**:
  - Steps 1-10: All return true; VALID_UNITS = `["ml", "l", "g", "kg", "pt", "pint", "pints", "pack", "pk", "x", "oz"]`
  - Step 11: Returns false; "lb" is not in VALID_UNITS
  - Step 12: Returns false; "cups" is not in VALID_UNITS

---

**TC-ITEM-009: Vague sizes filtered out**
- **Priority**: P0
- **Category**: Negative
- **Preconditions**: Testing with vague size values.
- **Steps**:
  1. Call `isValidSize("per item", "item")` -- "item" not in VALID_UNITS
  2. Call `cleanItemForStorage("Eggs", "per item", "each")`
  3. Call `cleanItemForStorage("Banana", "each", "each")`
  4. Call `cleanItemForStorage("Bread", "unit", "unit")`
  5. Call `cleanItemForStorage("Apple", "piece", "piece")`
- **Expected**:
  - Step 1: Returns false; "item" not in VALID_UNITS; also "per item" is in VAGUE_SIZES
  - Step 2: Returns `{ name: "Eggs", size: undefined, unit: undefined }`; VAGUE_SIZES = `["per item", "item", "each", "unit", "piece"]`
  - Step 3: Returns `{ name: "Banana", size: undefined, unit: undefined }`
  - Step 4: Returns `{ name: "Bread", size: undefined, unit: undefined }`
  - Step 5: Returns `{ name: "Apple", size: undefined, unit: undefined }`

---

**TC-ITEM-010: Dual-unit cleaning: "227g (8oz)" becomes "227g"**
- **Priority**: P1
- **Category**: Functional
- **Preconditions**: Item with dual-unit size string.
- **Steps**:
  1. Call `cleanItemForStorage("Butter", "227g (8oz)", undefined)`
  2. Verify the result
  3. Call `cleanItemForStorage("Juice", "347ml/12 fl oz", undefined)`
  4. Call `formatItemDisplay("Conditioner", "8 FL OZ / 237 mL", undefined)`
- **Expected**:
  - Step 2: `cleanDuplicateUnits("227g (8oz)")` strips parenthetical: "227g"; unit extracted as "g"; returns `{ name: "Butter", size: "227g", unit: "g" }`
  - Step 3: `cleanDuplicateUnits("347ml/12 fl oz")` finds metric-first before slash: "347ml"; unit "ml"; returns `{ name: "Juice", size: "347ml", unit: "ml" }`
  - Step 4: `stripDualUnitFromName` or `cleanDuplicateUnits` extracts "237ml" from the dual-unit string; displays as "237ml Conditioner"

---

**TC-ITEM-011: Duplicate detection (92% fuzzy match + size match)**
- **Priority**: P0
- **Category**: Functional
- **Preconditions**: List already has item "Semi-Skimmed Milk" with size "2l".
- **Steps**:
  1. Attempt to add "semi skimmed milk" (same item, different case) with size "2l"
  2. Wait for `findDuplicateListItem` check
  3. Verify duplicate detected via `isDuplicateItem` from `fuzzyMatch`
  4. Verify response indicates duplicate
- **Expected**:
  - Step 2: `findDuplicateListItem` queries all items in the list via `by_list` index; iterates and calls `isDuplicateItem(name, size, item.name, item.size)` for each
  - Step 3: Fuzzy match with Levenshtein similarity >= 92% plus matching size returns true
  - Step 4: Returns `{ status: "duplicate", existingItemId, existingName, existingQuantity, existingSize, isChecked }` when `force` is not set

---

**TC-ITEM-012: Duplicate found with force=true bumps quantity**
- **Priority**: P0
- **Category**: Functional
- **Preconditions**: List has "Milk" (quantity 1). User adds "Milk" again with force=true.
- **Steps**:
  1. Add item "Milk" with quantity 2 and `force: true`
  2. Wait for mutation
  3. Verify existing item's quantity increased
- **Expected**:
  - Step 1: Duplicate detected; `args.force` is true
  - Step 2: Existing item patched: `quantity: existingItem.quantity + args.quantity` (1 + 2 = 3); `updatedAt` set
  - Step 3: Returns `{ status: "bumped", itemId: existingItem._id }`; `recalculateListTotal` called

---

**TC-ITEM-013: Edit item name/quantity/price/notes**
- **Priority**: P0
- **Category**: Functional
- **Preconditions**: User has an item in an active list.
- **Steps**:
  1. Edit item name from "Milk" to "Whole Milk"
  2. Edit quantity from 1 to 3
  3. Edit estimated price from 1.50 to 1.80 (manual override)
  4. Add notes "Get the green cap one"
  5. Wait for `api.listItems.update` mutation for each change
- **Expected**:
  - Step 1: `args.name` set; `updates.name = toGroceryTitleCase("Whole Milk")`
  - Step 2: `updates.quantity = 3`
  - Step 3: `updates.estimatedPrice = 1.80`; since price changed, `updates.priceOverride = true` and `updates.priceSource = "manual"`
  - Step 4: `updates.notes = "Get the green cap one"`
  - Step 5: `updatedAt` set on each update; `recalculateListTotal` called; returns updated item

---

**TC-ITEM-014: Delete item from list**
- **Priority**: P0
- **Category**: Functional
- **Preconditions**: User has an item in an active list.
- **Steps**:
  1. Swipe or tap delete on an item
  2. Confirm deletion
  3. Wait for `api.listItems.remove` mutation
- **Expected**:
  - Step 3: `requireUser` verifies auth; item fetched; if not found, returns `{ success: true }` (idempotent); `getUserListPermissions` checks canEdit; `ctx.db.delete(args.id)` called; returns `{ success: true }`

---

**TC-ITEM-015: Toggle checked/unchecked**
- **Priority**: P0
- **Category**: Functional
- **Preconditions**: User has checked and unchecked items.
- **Steps**:
  1. Check an unchecked item
  2. Verify `purchasedAtStoreId` and `purchasedAtStoreName` are set
  3. Uncheck the item
  4. Verify `purchasedAtStoreId` and `purchasedAtStoreName` are cleared
- **Expected**:
  - Step 1: `newChecked = true`; item patched with `isChecked: true`, `checkedAt: Date.now()`, `checkedByUserId`, `purchasedAtStoreId: list.normalizedStoreId`, `purchasedAtStoreName: list.storeName`
  - Step 3: `newChecked = false`; item patched with `isChecked: false`, `checkedAt: undefined`, `checkedByUserId: undefined`, `purchasedAtStoreId: undefined`, `purchasedAtStoreName: undefined`

---

**TC-ITEM-016: Price from 3-layer cascade (personal -> crowdsourced -> AI)**
- **Priority**: P0
- **Category**: Integration
- **Preconditions**: User adds an item. Various price sources may exist.
- **Steps**:
  1. Add item "Heinz Baked Beans" where user has personal price history
  2. Verify personal price is used (priceSource: "personal")
  3. Add item "Organic Quinoa" where no personal history but crowdsourced price exists
  4. Verify crowdsourced price is used in `refreshListPrices`
  5. Add item "Rare Spice Mix" where no personal or crowdsourced price exists
  6. Verify AI/emergency estimate is used (priceSource: "ai", priceConfidence: 0.3)
- **Expected**:
  - Step 2: `findDuplicatePantryItem` finds pantry item with `lastPrice`; used as `estimatedPrice` with `priceSource: "personal"`, `priceConfidence: 0.8`
  - Step 4: `refreshListPrices` checks personal priceHistory, then currentPrices by store (region-specific first, then any region)
  - Step 6: `getEmergencyPriceEstimate(name, category)` returns fallback price; `priceSource: "ai"`, `priceConfidence: 0.3`

---

**TC-ITEM-017: Zero-blank-prices guarantee**
- **Priority**: P0
- **Category**: Functional
- **Preconditions**: Adding an item with no price information available anywhere.
- **Steps**:
  1. Add item "Unknown Product XYZ" with no price, no pantry link, no currentPrices entry
  2. Wait for mutation
  3. Verify the item has a non-null estimatedPrice
- **Expected**:
  - Step 2: In `create` mutation: `estimatedPrice === undefined` triggers `getEmergencyPriceEstimate(name, category)` which always returns a price
  - Step 3: Item stored with `estimatedPrice` from emergency estimate, `priceSource: "ai"`, `priceConfidence: 0.3`; every item ALWAYS has a price displayed

---

**TC-ITEM-018: Emergency price estimation (confidence 0.3)**
- **Priority**: P1
- **Category**: Functional
- **Preconditions**: No price available from any source.
- **Steps**:
  1. Call `getEmergencyPriceEstimate("Bread", "Bakery")`
  2. Verify it returns a price, size, and unit
  3. Verify the returned price is a reasonable estimate for the category
- **Expected**:
  - Step 2: Returns `{ price: number, size: string, unit: string }` -- all fields populated
  - Step 3: Price is category-appropriate; used with confidence 0.3 to indicate low certainty

---

**TC-ITEM-019: Item categories**
- **Priority**: P1
- **Category**: Functional
- **Preconditions**: Items being added with various categories.
- **Steps**:
  1. Add item with category "Fresh Produce"
  2. Add item with category "Frozen"
  3. Add item with category "Pantry Staples"
  4. Add item with category "Dairy"
  5. Verify categories are stored and used for grouping/display
- **Expected**:
  - Step 1-4: `category` field stored as provided in `args.category`; used for display grouping, health analysis, and emergency price estimation
  - Step 5: UI groups items by category; icons matched via `getIconForItem`

---

**TC-ITEM-020: Priority levels (must-have, should-have, nice-to-have)**
- **Priority**: P1
- **Category**: Functional
- **Preconditions**: User has an active list.
- **Steps**:
  1. Add item with priority "must-have"
  2. Add item with default priority (no priority specified)
  3. Add item with priority "nice-to-have"
  4. Update an item's priority from "should-have" to "must-have"
- **Expected**:
  - Step 1: `priority: "must-have"` stored
  - Step 2: Default applied: `args.priority ?? "should-have"`; item stored with "should-have"
  - Step 3: `priority: "nice-to-have"` stored
  - Step 4: Via `update` mutation; `updates.priority = "must-have"`; validated as union of the 3 literal types

---

**TC-ITEM-021: Batch add from scan**
- **Priority**: P1
- **Category**: Functional
- **Preconditions**: User has an active list. Product scan returned multiple items.
- **Steps**:
  1. Scan multiple products
  2. Trigger `api.listItems.addBatchFromScan` with array of items
  3. Verify each item processed: duplicates bumped, new items added
- **Expected**:
  - Step 2: `requireUser` and `getUserListPermissions` verified; iterates each item in array
  - Step 3: For each item: `findDuplicateListItem` checks for existing; if duplicate exists, quantity bumped; if new, `cleanItemForStorage` applied, zero-blank-price via `getEmergencyPriceEstimate` if no scan price; `enrichGlobalFromProductScan` called for global catalog enrichment; `recalculateListTotal` called once at end; returns `{ added: N, bumped: M }`

---

**TC-ITEM-022: Search items in list**
- **Priority**: P2
- **Category**: Functional
- **Preconditions**: User has a list with 20+ items.
- **Steps**:
  1. Tap search on list detail
  2. Type "milk"
  3. Verify items containing "milk" are filtered/highlighted
  4. Clear search
  5. Verify all items visible again
- **Expected**:
  - Step 3: Client-side filtering by item name substring match (case-insensitive)
  - Step 5: Filter cleared; full item list displayed

---

**TC-ITEM-023: Rate limit: 100 items/month (free)**
- **Priority**: P1
- **Category**: Boundary
- **Preconditions**: Free user has added 100 items this month.
- **Steps**:
  1. Attempt to add the 101st item
  2. Wait for mutation
  3. Verify rate limit error
- **Expected**:
  - Step 2: `performRateLimitCheck(ctx, user._id, "list_items", 100)` called; returns `{ allowed: false }`
  - Step 3: Mutation throws "Rate limit exceeded"; UI displays upgrade prompt

---

**TC-ITEM-024: Item with pantry link inherits defaultSize/lastPrice**
- **Priority**: P0
- **Category**: Integration
- **Preconditions**: User has pantry item "Rice" with defaultSize "2kg", defaultUnit "kg", lastPrice 3.50. Adding "Rice" to a list.
- **Steps**:
  1. Add item "Rice" to a list without specifying size or price
  2. Wait for mutation
  3. Verify the item inherits pantry data
- **Expected**:
  - Step 2: `findDuplicatePantryItem` finds the pantry item via fuzzy match; `pantryItemId` set; since `!size && existingPantry.defaultSize`, size set to "2kg" and unit set to "kg"; since `estimatedPrice === undefined && existingPantry.lastPrice != null`, estimatedPrice set to 3.50 with `priceSource: "personal"`, `priceConfidence: 0.8`
  - Step 3: Item stored with `pantryItemId`, `size: "2kg"`, `unit: "kg"`, `estimatedPrice: 3.50`, `priceSource: "personal"`, `priceConfidence: 0.8`

---

**TC-ITEM-025: Grocery title case applied to names**
- **Priority**: P1
- **Category**: Functional
- **Preconditions**: User adds items with various casing.
- **Steps**:
  1. Add item "semi-skimmed milk"
  2. Verify `toGroceryTitleCase` is applied
  3. Add item "HEINZ BAKED BEANS"
  4. Verify title case transformation
  5. Edit item name to "whole WHEAT bread"
  6. Verify title case applied on edit
- **Expected**:
  - Step 1: In `create` mutation: `cleanItemForStorage(toGroceryTitleCase(args.name), ...)` -- toGroceryTitleCase applied BEFORE cleanItemForStorage
  - Step 2: Name transformed to title case per grocery conventions
  - Step 4: All-caps transformed appropriately
  - Step 6: In `update` mutation: `updates.name = toGroceryTitleCase(args.name)` applied
---

## SUITE 5: Pantry/Stock Management (TC-PANT-001 to TC-PANT-023)

### 5.1 Pantry Overview & Display

**TC-PANT-001: View pantry overview with stock level counts**
- **Priority**: P0
- **Category**: Functional
- **Preconditions**: User is authenticated with pantry items at varying stock levels (5 stocked, 3 low, 2 out-of-stock)
- **Steps**:
  1. Navigate to the Stock tab
  2. Observe the pantry overview screen
  3. Verify that all active pantry items are displayed
  4. Check that stock level indicators are visually distinct (Stocked, Low, Out)
- **Expected**:
  - Step 1: Stock tab loads and displays the pantry grid view
  - Step 2: Items are grouped by category sections (Pantry, Frozen, Fresh, Other)
  - Step 3: All 10 active items are visible; archived items are not shown
  - Step 4: Each item displays a color-coded stock level badge -- green for Stocked, amber/orange for Low, red for Out

**TC-PANT-002: Collapsible category sections**
- **Priority**: P1
- **Category**: Functional
- **Preconditions**: User has pantry items in at least 3 categories (Pantry, Frozen, Fresh)
- **Steps**:
  1. Navigate to the Stock tab
  2. Tap the header of the "Pantry" category section to collapse it
  3. Tap the header of the "Frozen" category section to collapse it
  4. Tap the "Pantry" category header again to expand it
- **Expected**:
  - Step 1: All categories display as expanded sections with items visible
  - Step 2: The Pantry section collapses; its items are hidden; the collapse icon rotates or changes
  - Step 3: The Frozen section collapses; only Fresh and Other sections remain expanded
  - Step 4: The Pantry section re-expands showing all its items; haptic feedback fires on each tap

**TC-PANT-003: Filter between All and Attention Needed view**
- **Priority**: P0
- **Category**: Functional
- **Preconditions**: User has pantry items: 5 stocked, 3 low, 2 out-of-stock
- **Steps**:
  1. Navigate to the Stock tab (defaults to "All" view)
  2. Verify all 10 items are displayed
  3. Switch to "Attention Needed" filter view
  4. Verify only low and out-of-stock items appear
  5. Switch back to "All" view
- **Expected**:
  - Step 1: Stock tab loads with "All" filter active
  - Step 2: All 10 active pantry items are displayed across all categories
  - Step 3: Filter switches with haptic feedback; display updates immediately
  - Step 4: Exactly 5 items are shown (3 low + 2 out-of-stock); stocked items are hidden
  - Step 5: All 10 items are displayed again

**TC-PANT-004: Stock level filters (Low, Out, Stocked)**
- **Priority**: P1
- **Category**: Functional
- **Preconditions**: User has pantry items: 5 stocked, 3 low, 2 out-of-stock
- **Steps**:
  1. Navigate to the Stock tab
  2. Apply the "Low" stock level filter
  3. Verify only low-stock items are shown
  4. Apply the "Out" stock level filter
  5. Verify only out-of-stock items are shown
  6. Apply the "Stocked" filter
  7. Verify only fully stocked items are shown
- **Expected**:
  - Step 2: Filter activates with visual highlight
  - Step 3: Exactly 3 items are displayed, all with "low" stock level
  - Step 4: Filter switches; previous filter deactivates
  - Step 5: Exactly 2 items are displayed, all with "out" stock level
  - Step 6: Filter switches to "Stocked"
  - Step 7: Exactly 5 items are displayed, all with "stocked" stock level

**TC-PANT-005: Search pantry by name**
- **Priority**: P1
- **Category**: Functional
- **Preconditions**: User has pantry items including "Semi-Skimmed Milk", "Whole Milk", "Bread"
- **Steps**:
  1. Navigate to the Stock tab
  2. Tap the search field
  3. Type "milk"
  4. Verify search results
  5. Clear the search field
  6. Type "xyz123" (non-existent item)
- **Expected**:
  - Step 2: Search field gains focus; keyboard appears
  - Step 3: Search filters in real-time as characters are typed
  - Step 4: Both "Semi-Skimmed Milk" and "Whole Milk" appear; "Bread" is hidden
  - Step 5: All items are displayed again
  - Step 6: Empty state message is shown (e.g., "No items found"); no items are displayed

### 5.2 Pantry CRUD Operations

**TC-PANT-006: Add new pantry item with all fields**
- **Priority**: P0
- **Category**: Functional
- **Preconditions**: User is authenticated; pantry has fewer than 30 active items (free tier)
- **Steps**:
  1. Navigate to the Stock tab
  2. Tap the "Add Item" button
  3. Enter name: "Organic Eggs"
  4. Select category: "Fresh"
  5. Set stock level to "Stocked"
  6. Confirm the addition
- **Expected**:
  - Step 2: Add item form/modal appears with name, category, and stock level fields
  - Step 3: Name field accepts text input
  - Step 4: Category selector shows Pantry, Frozen, Fresh, Other options
  - Step 5: Stock level selector allows choosing Stocked/Low/Out
  - Step 6: Item is created via `pantryItems.create` mutation; item appears in the Fresh category section with a grocery-appropriate icon from `getIconForItem`; the name is stored in grocery title case; haptic feedback fires on success; achievements check runs via `checkPantryAchievements`

**TC-PANT-007: Edit pantry item details**
- **Priority**: P1
- **Category**: Functional
- **Preconditions**: User has a pantry item "Bread" in category "Pantry" with stock level "Stocked"
- **Steps**:
  1. Navigate to the Stock tab
  2. Long press on "Bread" to open the edit view
  3. Change the name to "Whole Wheat Bread"
  4. Change the category to "Fresh"
  5. Save the changes
- **Expected**:
  - Step 2: Edit modal/form opens pre-populated with current item data; haptic feedback fires on long press
  - Step 3: Name field updates to "Whole Wheat Bread"
  - Step 4: Category changes to "Fresh"
  - Step 5: Item is updated via `pantryItems.update` mutation; item moves to the Fresh section; name is stored in grocery title case; `nameSource` is set to "user"; `updatedAt` timestamp is refreshed

**TC-PANT-008: Delete pantry item**
- **Priority**: P1
- **Category**: Functional
- **Preconditions**: User has a pantry item "Expired Sauce" in their pantry
- **Steps**:
  1. Navigate to the Stock tab
  2. Initiate delete action on "Expired Sauce" (via swipe or edit menu)
  3. Confirm the deletion in the confirmation dialog
  4. Verify the item is removed
- **Expected**:
  - Step 2: Confirmation dialog appears asking "Are you sure you want to delete this item?"
  - Step 3: Item is permanently deleted via `pantryItems.remove` mutation (hard delete, not archival)
  - Step 4: Item no longer appears in the pantry list; the pantry count decreases by 1

**TC-PANT-009: Swipe to adjust stock level**
- **Priority**: P0
- **Category**: Functional
- **Preconditions**: User has a pantry item "Milk" with stock level "Stocked"
- **Steps**:
  1. Navigate to the Stock tab
  2. Swipe left on "Milk" to reduce stock level
  3. Verify stock level changes to "Low"
  4. Swipe left again on "Milk"
  5. Verify stock level changes to "Out"
  6. Swipe right on "Milk" to increase stock level
  7. Verify stock level changes back to "Low"
- **Expected**:
  - Step 2: Swipe gesture is recognized; stock level indicator updates
  - Step 3: Stock level displays as "Low" (amber); `updateStockLevel` mutation is called with `stockLevel: "low"`; haptic feedback fires
  - Step 4: Swipe gesture recognized again
  - Step 5: Stock level displays as "Out" (red); `updateStockLevel` mutation is called with `stockLevel: "out"`; haptic feedback fires
  - Step 6: Swipe right gesture recognized
  - Step 7: Stock level displays as "Low" (amber); `updateStockLevel` mutation is called with `stockLevel: "low"`; haptic feedback fires

**TC-PANT-010: Add pantry item to shopping list directly**
- **Priority**: P1
- **Category**: Integration
- **Preconditions**: User has a pantry item "Rice" with stock level "Low" and at least one active shopping list
- **Steps**:
  1. Navigate to the Stock tab
  2. Initiate "Add to List" action on "Rice"
  3. If multiple lists exist, select the target list
  4. Verify the item is added to the selected list
- **Expected**:
  - Step 2: If one list exists, item is added directly; if multiple, a list picker appears
  - Step 3: User selects a list from the available active lists
  - Step 4: "Rice" appears on the selected shopping list with appropriate price from the price resolver cascade; haptic feedback fires as success confirmation

### 5.3 Pinning, Archiving & Lifecycle

**TC-PANT-011: Pin item as essential**
- **Priority**: P1
- **Category**: Functional
- **Preconditions**: User has an unpinned pantry item "Milk"
- **Steps**:
  1. Navigate to the Stock tab
  2. Open the item options for "Milk"
  3. Tap "Pin as Essential"
  4. Verify the item displays a pinned indicator
- **Expected**:
  - Step 2: Item options menu/modal opens
  - Step 3: `togglePin` mutation is called; `pinned` is set to `true`; `updatedAt` is refreshed
  - Step 4: "Milk" displays a pin icon or "Essential" badge; the item will be exempt from auto-archiving

**TC-PANT-012: Unpin item**
- **Priority**: P2
- **Category**: Functional
- **Preconditions**: User has a pinned pantry item "Milk" (pinned = true)
- **Steps**:
  1. Navigate to the Stock tab
  2. Open item options for pinned "Milk"
  3. Tap "Unpin"
  4. Verify the pin indicator is removed
- **Expected**:
  - Step 2: Item options show "Unpin" option (because item is currently pinned)
  - Step 3: `togglePin` mutation is called; `pinned` is set to `false`; `updatedAt` is refreshed
  - Step 4: Pin icon or "Essential" badge is removed; item is now eligible for auto-archiving

**TC-PANT-013: Archive item manually**
- **Priority**: P1
- **Category**: Functional
- **Preconditions**: User has an active pantry item "Old Spice Jar"
- **Steps**:
  1. Navigate to the Stock tab
  2. Open item options for "Old Spice Jar"
  3. Tap "Archive"
  4. Verify the item disappears from the active pantry view
- **Expected**:
  - Step 2: Item options menu opens
  - Step 3: `archiveItem` mutation is called; `status` is set to "archived"; `archivedAt` is set to current timestamp; `pinned` is forced to `false`; `updatedAt` is refreshed
  - Step 4: Item no longer appears in the active pantry list; active item count decreases by 1

**TC-PANT-014: Unarchive item (within free tier cap)**
- **Priority**: P1
- **Category**: Functional
- **Preconditions**: User has an archived pantry item "Old Spice Jar"; user has 25 active items (under the 30-item free tier cap)
- **Steps**:
  1. Navigate to the archived items view
  2. Find "Old Spice Jar" in the archived list
  3. Tap "Unarchive" or "Restore"
  4. Verify the item returns to the active pantry view
- **Expected**:
  - Step 2: Archived items list shows "Old Spice Jar"
  - Step 3: `unarchiveItem` mutation is called; `enforceActiveCap` is checked; `status` is set to "active"; `archivedAt` is cleared to `undefined`; `updatedAt` is refreshed
  - Step 4: Item appears in the active pantry under its original category; active item count increases to 26

**TC-PANT-015: Unarchive item blocked by free tier cap**
- **Priority**: P1
- **Category**: Negative
- **Preconditions**: Free tier user has exactly 30 active pantry items; has 1 archived item "Archived Sauce"
- **Steps**:
  1. Navigate to the archived items view
  2. Tap "Unarchive" on "Archived Sauce"
  3. Verify the action is handled gracefully
- **Expected**:
  - Step 1: Archived items list is visible
  - Step 2: `unarchiveItem` mutation is called; `enforceActiveCap` runs and detects 30 active items (at cap)
  - Step 3: The oldest non-pinned active item is automatically archived to make room (FIFO eviction based on `lastPurchasedAt` or `updatedAt`); "Archived Sauce" is then restored to active status; user sees both the restoration and the eviction notification

**TC-PANT-016: Auto-archiving of stale out-of-stock items**
- **Priority**: P1
- **Category**: Functional
- **Preconditions**: User has an unpinned, out-of-stock pantry item "Forgotten Item" with `updatedAt` older than 90 days and no `lastPurchasedAt`
- **Steps**:
  1. The `archiveStaleItems` internal cron job runs (daily schedule)
  2. Verify the item is automatically archived
  3. Verify a pinned out-of-stock item older than 90 days is NOT archived
- **Expected**:
  - Step 1: Cron queries all active items with `stockLevel: "out"` using the `by_status_stock` index
  - Step 2: "Forgotten Item" has `status` set to "archived", `archivedAt` set to current timestamp; it no longer appears in the active pantry view
  - Step 3: Pinned items are explicitly skipped (`if (item.pinned) continue`); they remain active regardless of age

### 5.4 Deduplication & Merging

**TC-PANT-017: AI-powered duplicate detection**
- **Priority**: P1
- **Category**: Functional
- **Preconditions**: User has pantry items "Semi Skimmed Milk" and "Semi-Skimmed Milk 2pt" (fuzzy duplicates via `isDuplicateItem`)
- **Steps**:
  1. Navigate to the Stock tab
  2. Trigger or view the duplicate detection results (via `findDuplicates` query)
  3. Verify the two similar items are grouped as a duplicate pair
- **Expected**:
  - Step 1: Stock tab loads
  - Step 2: `findDuplicates` query runs; it uses `isDuplicateItem` (Levenshtein-based fuzzy matching from `lib/fuzzyMatch`) to compare all active items pairwise
  - Step 3: "Semi Skimmed Milk" and "Semi-Skimmed Milk 2pt" appear in a duplicate group; the UI presents options to merge or dismiss

**TC-PANT-018: Merge duplicate suggestions**
- **Priority**: P1
- **Category**: Functional
- **Preconditions**: Duplicate detection found a group: "Semi Skimmed Milk" (purchaseCount: 5, pinned: false) and "Semi-Skimmed Milk 2pt" (purchaseCount: 3, pinned: true)
- **Steps**:
  1. View the duplicate group
  2. Select "Semi Skimmed Milk" as the item to keep
  3. Confirm the merge
  4. Verify the merge result
- **Expected**:
  - Step 1: Both items are displayed with their details
  - Step 2: User selects the primary/keep item
  - Step 3: `mergeDuplicates` mutation is called with `keepId` and `deleteIds`
  - Step 4: The kept item has `purchaseCount` = 8 (5 + 3); `pinned` = true (inherits pin from deleted item); the deleted item is permanently removed; any `listItems` referencing the deleted item's `pantryItemId` are re-pointed to the kept item; `updatedAt` is refreshed

**TC-PANT-019: Dismiss false positive duplicates**
- **Priority**: P2
- **Category**: Functional
- **Preconditions**: Duplicate detection found "Cheddar Cheese" and "Cottage Cheese" as a potential duplicate pair (false positive)
- **Steps**:
  1. View the duplicate group
  2. Tap "Not Duplicates" or "Dismiss"
  3. Verify the pair is dismissed
- **Expected**:
  - Step 1: Both items displayed as a potential merge candidate
  - Step 2: The dismissal action is recorded
  - Step 3: The pair no longer appears in the duplicate suggestions; both items remain unchanged in the pantry

### 5.5 Subscription Limits & UI Features

**TC-PANT-020: Free tier limit enforcement (30 pantry items)**
- **Priority**: P0
- **Category**: Boundary
- **Preconditions**: Free tier user has exactly 29 active pantry items
- **Steps**:
  1. Add a new pantry item (30th item)
  2. Verify the item is added successfully
  3. Attempt to add a 31st pantry item
  4. Verify the addition is blocked
- **Expected**:
  - Step 1: `canAddPantryItem` check passes (29 < 30)
  - Step 2: Item is created; active count is now 30
  - Step 3: `canAddPantryItem` is called; it queries items using `by_user_status` index and finds 30 items (>= maxPantryItems)
  - Step 4: Mutation throws error with message "Free plan allows 30 pantry items. Upgrade to Premium for unlimited items."; user sees an upgrade prompt; no item is created

**TC-PANT-021: Premium user has unlimited pantry items**
- **Priority**: P1
- **Category**: Functional
- **Preconditions**: Premium user has 50 active pantry items
- **Steps**:
  1. Add a new pantry item (51st item)
  2. Verify the item is added successfully
- **Expected**:
  - Step 1: `canAddPantryItem` checks feature access; `isPremium` is true so `features.maxPantryItems` is -1 (unlimited)
  - Step 2: Item is created successfully; no limit enforcement; the 150-item `ACTIVE_PANTRY_CAP` hard cap in `enforceActiveCap` is the only backstop (auto-archives oldest non-pinned item if reached)

**TC-PANT-022: Tab badge shows low + out-of-stock count**
- **Priority**: P1
- **Category**: Functional
- **Preconditions**: User has 3 low-stock and 2 out-of-stock pantry items
- **Steps**:
  1. Navigate to any tab other than Stock
  2. Observe the Stock tab badge in the tab bar
  3. Change one low-stock item to stocked
  4. Observe the badge updates
- **Expected**:
  - Step 1: Tab bar is visible at the bottom
  - Step 2: The Stock tab displays a badge with the number "5" (3 low + 2 out)
  - Step 3: Item is updated via `updateStockLevel` mutation
  - Step 4: Badge updates reactively to "4" (2 low + 2 out); Convex real-time subscription ensures immediate update

**TC-PANT-023: Price display per item and gesture onboarding hint**
- **Priority**: P2
- **Category**: Functional
- **Preconditions**: User is a first-time visitor to the Stock tab; pantry item "Bread" has `lastPrice: 1.15` with `priceSource: "receipt"`
- **Steps**:
  1. Navigate to the Stock tab for the first time
  2. Observe the gesture onboarding hint
  3. Dismiss the hint
  4. Verify "Bread" displays its price
  5. Tap on the price to view price history
- **Expected**:
  - Step 1: Stock tab loads with pantry items
  - Step 2: A `HintOverlay` tutorial hint appears explaining swipe gestures for stock level adjustment (via `useHint` with "delayed" trigger)
  - Step 3: Hint is dismissed and recorded via `hintStorage` so it does not appear again
  - Step 4: "Bread" displays "£1.15" with the price sourced from receipt data
  - Step 5: Navigation to price history screen for that item

---

## SUITE 6: Receipt Scanning (TC-SCAN-001 to TC-SCAN-024)

### 6.1 Receipt Mode

**TC-SCAN-001: Receipt mode displays correctly on load**
- **Priority**: P0
- **Category**: Functional
- **Preconditions**: User is authenticated and on the Scan tab
- **Steps**:
  1. Navigate to the Scan tab
  2. Verify the tab loads with Receipt mode as default
  3. Verify the scan button, receipt list, and mode switcher are visible
- **Expected**:
  - Step 1: Scan tab loads; `allReceipts` and `shoppingLists` queries resolve
  - Step 2: The `GlassCapsuleSwitcher` shows "Receipt" as the active tab (index 0); subtitle reads "Receipt Mode"
  - Step 3: Scan button is visible; previously scanned receipts list (`ReceiptMode` component) is rendered; mode switcher shows "Receipt" and "Product" options

**TC-SCAN-002: Upload receipt from photo library**
- **Priority**: P0
- **Category**: Functional
- **Preconditions**: User is on the Scan tab in Receipt mode; device has photos available
- **Steps**:
  1. Tap the Scan button
  2. In the alert dialog, tap "Photo Library"
  3. Select a receipt image from the device gallery
  4. Wait for AI OCR processing to complete
- **Expected**:
  - Step 1: An alert appears with title "Scan Receipt", message about taking/uploading a photo, and three buttons: Cancel, Photo Library, Use Camera; haptic feedback fires (Medium impact)
  - Step 2: Device photo picker opens via `receiptScanner.pickReceipt()`
  - Step 3: Image is selected; upload begins; `isProcessing` becomes true; a loading indicator appears
  - Step 4: Gemini 2.0 Flash vision AI extracts items; receipt is created via `receipts.create` mutation with `imageStorageId`, store name, date, items, and totals; the new receipt appears in the receipts list; user is navigated to the confirmation screen

**TC-SCAN-003: Capture receipt from camera**
- **Priority**: P0
- **Category**: Functional
- **Preconditions**: User is on the Scan tab in Receipt mode; camera permissions granted
- **Steps**:
  1. Tap the Scan button
  2. In the alert dialog, tap "Use Camera"
  3. Take a photo of a receipt
  4. Wait for AI OCR processing to complete
- **Expected**:
  - Step 1: Alert dialog appears with scan options
  - Step 2: Camera opens via `receiptScanner.captureReceipt()`
  - Step 3: Photo is captured; upload begins to Convex storage via `generateUploadUrl`
  - Step 4: AI processes the receipt image; items, store name, purchase date, subtotal, tax, and total are extracted; receipt is created and appears in the list

**TC-SCAN-004: Previously scanned receipts list**
- **Priority**: P1
- **Category**: Functional
- **Preconditions**: User has 3 previously scanned receipts (2 completed, 1 pending)
- **Steps**:
  1. Navigate to the Scan tab in Receipt mode
  2. Verify the receipts list displays correctly
  3. Tap on a completed receipt
- **Expected**:
  - Step 1: `ReceiptMode` component renders
  - Step 2: Receipts are shown in descending order (newest first) from `receipts.getByUser` query; only non-hidden receipts appear (`isHidden` filter); each receipt shows store name, date, and processing status
  - Step 3: Router navigates to `/receipt/${receipt._id}/confirm` for the receipt confirmation screen

**TC-SCAN-005: AI OCR extracts items correctly (Gemini 2.0 Flash)**
- **Priority**: P0
- **Category**: Integration
- **Preconditions**: User uploads a clear receipt image from Tesco with 5 items
- **Steps**:
  1. Upload receipt image via photo library
  2. Wait for AI processing
  3. Verify extracted data on the confirmation screen
- **Expected**:
  - Step 1: Image is uploaded to Convex storage
  - Step 2: Gemini 2.0 Flash vision model processes the image; AI extracts item names, quantities, unit prices, total prices, and optional sizes/units; each item includes a `confidence` score
  - Step 3: Confirmation screen shows: store name "Tesco", purchase date from receipt, individual items with names in grocery title case, quantities, prices, subtotal, tax (if present), and total; items are editable before final confirmation

### 6.2 Product Mode

**TC-SCAN-006: Switch to Product mode**
- **Priority**: P0
- **Category**: Functional
- **Preconditions**: User is on the Scan tab in Receipt mode
- **Steps**:
  1. Tap the "Product" tab in the `GlassCapsuleSwitcher`
  2. Verify the mode switches
- **Expected**:
  - Step 1: `handleScanModeSwitch` is called; active index changes to 1
  - Step 2: Subtitle changes to "Product Mode"; `ProductMode` component renders showing scanned products list and scan button; haptic feedback fires

**TC-SCAN-007: Scan product via camera capture**
- **Priority**: P0
- **Category**: Functional
- **Preconditions**: User is on the Scan tab in Product mode; camera permissions granted
- **Steps**:
  1. Tap the Scan button
  2. In the alert dialog, tap "Use Camera"
  3. Take a photo of a product (e.g., a bottle of milk showing label)
  4. Wait for AI product recognition
- **Expected**:
  - Step 1: Alert appears with title "Scan Product", message "Ensure the product name and size/weight are clearly visible", and options: Cancel, Photo Library, Use Camera
  - Step 2: Camera opens via `productScanner.captureProduct()`
  - Step 3: Photo is captured and uploaded
  - Step 4: AI extracts product name, size, price as separate fields; if `sizeSource` is "estimated", "unknown", or `size` is missing, the `EditScannedItemModal` auto-opens for user correction; product appears in the scanned products list with thumbnail

**TC-SCAN-008: Scan product from photo library**
- **Priority**: P0
- **Category**: Functional
- **Preconditions**: User is on the Scan tab in Product mode; device has product photos
- **Steps**:
  1. Tap the Scan button
  2. In the alert dialog, tap "Photo Library"
  3. Select a product image
  4. Wait for AI recognition
- **Expected**:
  - Step 1: Alert dialog appears
  - Step 2: Photo picker opens via `productScanner.pickFromLibrary()`
  - Step 3: Image is selected and uploaded
  - Step 4: AI extracts product details (name, size, unit, price, brand, category, confidence); product card appears in the scanned products list; if size confidence is low, `EditScannedItemModal` auto-opens

**TC-SCAN-009: Scanned products list with thumbnails**
- **Priority**: P1
- **Category**: Functional
- **Preconditions**: User has scanned 3 products in Product mode
- **Steps**:
  1. View the Product mode screen
  2. Verify all 3 scanned products are listed
  3. Tap on a product card
- **Expected**:
  - Step 1: `ProductMode` component renders the scanned products
  - Step 2: Each product shows: thumbnail image (from `localImageUri` or `imageStorageId`), product name, size, estimated price, and confidence indicator
  - Step 3: `EditScannedItemModal` opens with the selected product data pre-populated; user can view/edit details

### 6.3 Edit & Add Scanned Items

**TC-SCAN-010: Edit scanned item before adding to list**
- **Priority**: P0
- **Category**: Functional
- **Preconditions**: User has a scanned product "Milk 2pt" with estimated price £1.50 in the scan list
- **Steps**:
  1. Tap on the "Milk 2pt" product card
  2. Change the name to "Semi-Skimmed Milk"
  3. Change the size to "4pt"
  4. Update the price to £2.20
  5. Tap "Confirm"
- **Expected**:
  - Step 1: `EditScannedItemModal` opens with fields: name="Milk 2pt", size="2pt", price=1.50
  - Step 2: Name field updates
  - Step 3: Size field updates to "4pt"
  - Step 4: Price field updates to 2.20
  - Step 5: `cleanItemForStorage` is called on confirm to validate/normalize name, size, and unit; `productScanner.updateProduct(index, edited)` is called; modal closes; product card updates with new details

**TC-SCAN-011: EditScannedItemModal runs cleanItemForStorage on confirm**
- **Priority**: P0
- **Category**: Integration
- **Preconditions**: User edits a scanned product and enters size "500" without a unit
- **Steps**:
  1. Open edit modal for a scanned product
  2. Enter size "500" with no unit
  3. Tap "Confirm"
  4. Verify validation behavior
- **Expected**:
  - Step 1: Modal opens with product details
  - Step 2: Size field has "500"
  - Step 3: `cleanItemForStorage(name, "500", undefined)` is called
  - Step 4: Since "500" has no unit and fails `isValidSize`, the size is rejected (cleared to undefined) per the MANDATORY rule "Size without unit is UNACCEPTABLE"; the item is saved with name only, no size/unit

**TC-SCAN-012: Add all scanned products to a single list**
- **Priority**: P0
- **Category**: Integration
- **Preconditions**: User has 3 scanned products and exactly 1 active shopping list "Weekly Shop"
- **Steps**:
  1. Tap "Add All to List" button
  2. Verify items are added to the list
- **Expected**:
  - Step 1: Since only 1 list exists, `addItemsToList` (`listItems.addBatchFromScan`) is called directly with the list ID; items are mapped with name, category, quantity, size, unit, brand, estimatedPrice, confidence, imageStorageId
  - Step 2: All 3 items are added to "Weekly Shop"; `productScanner.clearAll()` is called; haptic success notification fires; an alert shows "Added 3 items to your list!" with options "Stay Here" and "View List"

**TC-SCAN-013: Add all scanned products - multiple lists picker**
- **Priority**: P1
- **Category**: Functional
- **Preconditions**: User has 2 scanned products and 3 active shopping lists
- **Steps**:
  1. Tap "Add All to List" button
  2. Verify a list picker appears
  3. Select "Sunday Shop" from the picker
  4. Verify items are added
- **Expected**:
  - Step 1: `shoppingLists.length > 1` triggers the multi-list picker alert
  - Step 2: Alert shows title "Choose List", message "Which list should these items be added to?", with buttons for each list name plus "Cancel"
  - Step 3: `executeAdd` is called with the selected list's ID
  - Step 4: Items are added to "Sunday Shop"; products are cleared; success haptic and alert fire

**TC-SCAN-014: Add all scanned products - no active lists**
- **Priority**: P1
- **Category**: Negative
- **Preconditions**: User has 2 scanned products but 0 active shopping lists
- **Steps**:
  1. Tap "Add All to List" button
  2. Verify the empty-list handling
- **Expected**:
  - Step 1: `shoppingLists.length === 0` check triggers
  - Step 2: Alert shows title "No Active Lists", message "Create a shopping list first before adding items.", with buttons "Cancel" and "Create List"; tapping "Create List" navigates to the Lists tab (`router.push("/")`)

**TC-SCAN-015: Clear all scanned products**
- **Priority**: P1
- **Category**: Functional
- **Preconditions**: User has 4 scanned products in Product mode
- **Steps**:
  1. Tap "Clear All" button
  2. Confirm in the dialog
  3. Verify all products are removed
- **Expected**:
  - Step 1: Alert appears with title "Clear All Items", message "Are you sure you want to clear your current scan list?", buttons "Cancel" and "Clear" (destructive style)
  - Step 2: `productScanner.clearAll()` is called
  - Step 3: Scanned products list is empty; the product count shows 0

**TC-SCAN-016: Duplicate detection during scanning**
- **Priority**: P1
- **Category**: Edge Case
- **Preconditions**: User has already scanned "Heinz Baked Beans" in Product mode
- **Steps**:
  1. Scan the same product "Heinz Baked Beans" again
  2. Verify duplicate toast appears
  3. Dismiss the toast
- **Expected**:
  - Step 1: Product is scanned; duplicate detection fires comparing against existing `scannedProducts`
  - Step 2: `GlassToast` appears with message "Heinz Baked Beans already in scan list"; `dupToast.visible` is set to true
  - Step 3: Toast dismisses via `dismissDupToast`; the duplicate item is either not added or flagged

### 6.4 Receipt Confirmation & Reconciliation

**TC-SCAN-017: Receipt confirmation screen - edit items**
- **Priority**: P0
- **Category**: Functional
- **Preconditions**: User has a completed receipt with 5 extracted items; navigated to `/receipt/{id}/confirm`
- **Steps**:
  1. View the confirmation screen
  2. Edit the name of item 1 from "SEMI SK MLK" to "Semi-Skimmed Milk"
  3. Edit the price of item 2
  4. Delete item 3 (incorrect extraction)
  5. Add a missing item that OCR missed
  6. Confirm the receipt
- **Expected**:
  - Step 1: All 5 items are displayed with store name, date, and totals; low-confidence items may be highlighted
  - Step 2: Name is updated; title case is applied
  - Step 3: Price field accepts the new value
  - Step 4: Item is removed from the items list
  - Step 5: New item is added with name, quantity, and price
  - Step 6: `receipts.update` mutation is called with the edited items array; `processingStatus` is set to "completed"; store and item names are stored in grocery title case; `imageHash` is included for duplicate detection

**TC-SCAN-018: Low-confidence items warning**
- **Priority**: P1
- **Category**: Functional
- **Preconditions**: Receipt OCR returned 5 items; 2 items have confidence < 0.7
- **Steps**:
  1. Navigate to the receipt confirmation screen
  2. Verify low-confidence items are flagged
- **Expected**:
  - Step 1: Confirmation screen loads with all items
  - Step 2: Items with confidence < 0.7 are visually highlighted (different background or warning icon); user is prompted to review/correct these items before confirming

**TC-SCAN-019: Store name and date extraction**
- **Priority**: P1
- **Category**: Functional
- **Preconditions**: User scans a Tesco receipt dated 15 March 2026
- **Steps**:
  1. Upload the receipt
  2. Verify store name and date are extracted
  3. Check that the store is normalized
- **Expected**:
  - Step 1: Receipt is processed by AI
  - Step 2: Store name field shows "Tesco"; purchase date is parsed and stored as timestamp for 15 March 2026
  - Step 3: `normalizeStoreName("Tesco")` returns the normalized store ID; this is stored as `normalizedStoreId` on the receipt

**TC-SCAN-020: Receipt reconciliation - link to shopping list**
- **Priority**: P0
- **Category**: Integration
- **Preconditions**: User has a confirmed receipt from Tesco with 5 items and an active shopping list "Weekly Shop" with 4 items
- **Steps**:
  1. Navigate to the receipt reconciliation screen
  2. Select "Weekly Shop" as the target list
  3. Confirm the link
  4. Verify reconciliation results
- **Expected**:
  - Step 1: Reconciliation screen shows available lists to link
  - Step 2: "Weekly Shop" is selected
  - Step 3: `receipts.linkToList` mutation is called; multi-signal matching (`matchReceiptItems`) compares receipt items to list items by name, price, and category
  - Step 4: Matched items (e.g., 3 of 5) are checked off on the list with actual prices and store attribution (`purchasedAtStoreId`, `purchasedAtStoreName`); unmatched receipt items (2 of 5) are added as new list items with `addedFromReceipt: true` and `isChecked: true`; list `actualTotal` is updated; `receiptId` and `receiptIds` are added to the list; list total is recalculated via `recalculateListTotal`

**TC-SCAN-021: Store mismatch warning**
- **Priority**: P1
- **Category**: Edge Case
- **Preconditions**: User has a receipt from "Aldi" and a shopping list "Weekly Shop" with `normalizedStoreId: "tesco"`
- **Steps**:
  1. Attempt to link the Aldi receipt to the Tesco list
  2. Verify the mismatch warning appears
- **Expected**:
  - Step 1: `detectStoreMismatch` query runs comparing `receipt.normalizedStoreId` with `list.normalizedStoreId`
  - Step 2: Since "aldi" !== "tesco" and the store is not in the list's `storeSegments`, `isMismatch` returns true; a warning is displayed: "This receipt is from Aldi but the list is for Tesco"; user can proceed or cancel

### 6.5 Pantry Restock, Points & Deduplication

**TC-SCAN-022: Auto-restock pantry from receipt items**
- **Priority**: P1
- **Category**: Integration
- **Preconditions**: User's pantry has "Milk" with `stockLevel: "low"` and "Bread" with `stockLevel: "out"`; receipt contains "Milk" and "Bread"
- **Steps**:
  1. Confirm a receipt containing "Milk" and "Bread"
  2. Verify pantry items are restocked
- **Expected**:
  - Step 1: `pantryItems.addBatchFromScan` is called with the receipt items
  - Step 2: Existing pantry items are found via `isDuplicateItem` fuzzy matching; "Milk" is updated: `stockLevel` set to "stocked", `lastPrice` updated from receipt, `priceSource` set to "receipt", `purchaseCount` incremented by 1, `lastPurchasedAt` set to now; "Bread" is similarly restocked; if "Bread" was archived, it is also reactivated (`status: "active"`, `archivedAt: undefined`)

**TC-SCAN-023: Duplicate receipt detection (SHA-256 hash)**
- **Priority**: P0
- **Category**: Security
- **Preconditions**: User previously scanned a receipt that generated imageHash "abc123def..."
- **Steps**:
  1. Scan the exact same receipt image again
  2. Verify duplicate detection fires
- **Expected**:
  - Step 1: The same image produces the same SHA-256 hash; `validateReceiptData` checks `receiptHashes` table via `by_hash` index
  - Step 2: The hash already exists in the `receiptHashes` table; validation returns `isValid: false` with a fraud flag; points are NOT awarded for the duplicate; receipt data is still saved for price tracking purposes but `earnedPoints` remains false; the fraud flag is stored on the receipt record

**TC-SCAN-024: Points awarded per scan and receipt soft-delete**
- **Priority**: P1
- **Category**: Integration
- **Preconditions**: Premium Bronze tier user (pointsPerScan: 150); receipt is valid (new hash, valid store/items)
- **Steps**:
  1. Complete a receipt scan (confirm items and finalize)
  2. Verify points are awarded
  3. Soft-delete the receipt
  4. Verify points are refunded and receipt is hidden
- **Expected**:
  - Step 1: Receipt is finalized with `processingStatus: "completed"` and a valid `imageHash`
  - Step 2: `processEarnPoints` is called; Bronze tier awards 150 base points; `earnedPoints` is set to true on the receipt; `pointsEarned` stores the total (base + any bonus); receipt hash is recorded in `receiptHashes` table with `firstSeenAt` timestamp
  - Step 3: `receipts.remove` mutation is called; it checks if `earnedPoints` is true and `pointsEarned > 0`
  - Step 4: Points are refunded via `internal.points.refundPoints`; receipt `isHidden` is set to true (soft delete); receipt no longer appears in `getByUser` results (filtered by `!r.isHidden`); price data is preserved for historical accuracy

---

## SUITE 7: Voice Assistant - Tobi (TC-VOIC-001 to TC-VOIC-020)

### 7.1 Voice Assistant Core Interaction

**TC-VOIC-001: FAB button visibility**
- **Priority**: P0
- **Category**: Functional
- **Preconditions**: User is authenticated and has completed onboarding
- **Steps**:
  1. Navigate to the Lists tab
  2. Verify the Tobi FAB button is visible
  3. Navigate to the Stock tab
  4. Verify the FAB is still visible
  5. Navigate to the Profile tab
  6. Verify the FAB is still visible
  7. Sign out and navigate to the auth screen
  8. Verify the FAB is NOT visible
- **Expected**:
  - Step 1: Lists tab loads
  - Step 2: Floating action button for Tobi is visible in a consistent position (bottom-right or similar)
  - Step 3: Stock tab loads
  - Step 4: FAB remains visible across all authenticated tab screens
  - Step 5: Profile tab loads
  - Step 6: FAB is visible on profile
  - Step 7: User is on the sign-in screen
  - Step 8: FAB is hidden on auth screens and onboarding screens

**TC-VOIC-002: Start and stop listening**
- **Priority**: P0
- **Category**: Functional
- **Preconditions**: User is on an authenticated screen; dev build with native modules available; `STT_AVAILABLE` is true
- **Steps**:
  1. Tap the Tobi FAB button to open the voice sheet
  2. Tap the microphone button to start listening
  3. Speak "Hello Tobi"
  4. Tap the stop button
  5. Verify the transcript is captured
- **Expected**:
  - Step 1: `openSheet` is called; conversation history is loaded from persistence; sheet opens with haptic feedback (Light impact); `isSheetOpen` state becomes true
  - Step 2: `startListening` is called; STT via `expo-speech-recognition` begins; `isListening` state becomes true; microphone animation activates
  - Step 3: Partial transcript appears in real-time as speech is recognized
  - Step 4: `stopListening` is called; `isListening` becomes false
  - Step 5: Final transcript "Hello Tobi" is captured and passed to `processTranscript`

**TC-VOIC-003: TTS response (Azure Neural with fallback)**
- **Priority**: P0
- **Category**: Integration
- **Preconditions**: User sends a voice command; Azure TTS is configured with `AZURE_SPEECH_KEY`
- **Steps**:
  1. Say "What's on my list?"
  2. Wait for AI response
  3. Verify TTS speaks the response aloud
- **Expected**:
  - Step 1: Transcript is sent to `voiceAssistant` action
  - Step 2: Gemini 2.5 Flash Lite processes the command using function declarations; a text response is generated
  - Step 3: `textToSpeech` action is called; Azure Neural voice (en-GB-SoniaNeural for FEMALE or en-GB-RyanNeural for MALE) speaks the response in British English; audio is returned as base64 MP3; TTS character count is tracked via `trackTTSUsage`

**TC-VOIC-004: TTS fallback to expo-speech**
- **Priority**: P1
- **Category**: Edge Case
- **Preconditions**: `AZURE_SPEECH_KEY` is not configured or Azure API fails
- **Steps**:
  1. Say "Hello"
  2. Wait for AI response
  3. Verify fallback TTS speaks
- **Expected**:
  - Step 1: Transcript is processed
  - Step 2: Response text is generated
  - Step 3: `textToSpeech` returns `{ audioBase64: null, provider: null, error: "TTS not configured" }` or `error: "Azure failed"`; the client-side `useVoiceTTS` hook falls back to `expo-speech` for local device TTS; response is still spoken aloud

### 7.2 Voice Commands

**TC-VOIC-005: Voice command - Create a list**
- **Priority**: P0
- **Category**: Functional
- **Preconditions**: User is authenticated; voice assistant is open and listening
- **Steps**:
  1. Say "Create a list called Weekend Shop"
  2. Wait for the AI response
  3. Verify the list is created
- **Expected**:
  - Step 1: Transcript "Create a list called Weekend Shop" is sent to `voiceAssistant` action
  - Step 2: Gemini identifies the intent and calls `create_shopping_list` function declaration with `name: "Weekend Shop"`; `executeVoiceTool` dispatches the tool call; `executeVoiceAction` is called with `actionName: "create_shopping_list"`; `shoppingLists.create` mutation runs
  - Step 3: A new list "Weekend Shop" is created; Tobi responds with something like "Done! I've created Weekend Shop for you"; response is spoken via TTS

**TC-VOIC-006: Voice command - Add items to list**
- **Priority**: P0
- **Category**: Functional
- **Preconditions**: User has an active list "Weekly Shop" set as the active list context
- **Steps**:
  1. Say "Add milk, bread, and eggs to my list"
  2. Wait for the AI response
  3. Verify items are added
- **Expected**:
  - Step 1: Transcript sent to `voiceAssistant`; system prompt includes `activeListId` and `activeListName`
  - Step 2: Gemini calls `add_items_to_list` function declaration; the tool resolves the active list and adds 3 items; sizes from past purchases are used if available
  - Step 3: "Milk", "Bread", and "Eggs" appear on "Weekly Shop" with appropriate prices from the price resolver; Tobi confirms: "Added milk, bread, and eggs to Weekly Shop"

**TC-VOIC-007: Voice command - Check off item**
- **Priority**: P1
- **Category**: Functional
- **Preconditions**: User has "Milk" on their active shopping list
- **Steps**:
  1. Say "Check off milk"
  2. Wait for the AI response
  3. Verify the item is checked
- **Expected**:
  - Step 1: Transcript sent to `voiceAssistant`
  - Step 2: Gemini calls `check_off_item` function declaration; the tool locates "Milk" on the active list using fuzzy matching and marks it as checked
  - Step 3: "Milk" shows as checked on the list; Tobi responds with a confirmation like "Milk is checked off!"

**TC-VOIC-008: Voice command - What's my budget?**
- **Priority**: P1
- **Category**: Functional
- **Preconditions**: User has active list "Weekly Shop" with budget £50, spent £23
- **Steps**:
  1. Say "What's my budget?"
  2. Wait for the AI response
- **Expected**:
  - Step 1: Transcript sent to `voiceAssistant`; system prompt includes budget info resolved server-side: "Budget: £50, Spent: £23, Remaining: £27"
  - Step 2: Gemini calls `get_budget_status` function declaration or uses the context directly; Tobi responds conversationally: "You've got about £27 left on your Weekly Shop budget. You've spent roughly £23 so far"

**TC-VOIC-009: Voice command - Update stock level**
- **Priority**: P1
- **Category**: Functional
- **Preconditions**: User has "Milk" in their pantry with stock level "stocked"
- **Steps**:
  1. Say "I'm running low on milk"
  2. Wait for the AI response
  3. Verify the stock level is updated
- **Expected**:
  - Step 1: Transcript sent to `voiceAssistant`
  - Step 2: Gemini identifies the intent and calls `update_stock_level` with item "milk" and stock level "low"
  - Step 3: Pantry item "Milk" is updated to `stockLevel: "low"`; Tobi confirms: "Done, I've marked milk as running low"; tab badge count increments

**TC-VOIC-010: Voice command - Add item to pantry**
- **Priority**: P1
- **Category**: Functional
- **Preconditions**: User is authenticated; pantry does not contain "Olive Oil"
- **Steps**:
  1. Say "Add olive oil to my pantry"
  2. Wait for the AI response
  3. Verify the item is added to the pantry
- **Expected**:
  - Step 1: Transcript sent to `voiceAssistant`
  - Step 2: Gemini calls `add_pantry_item` function declaration; the tool creates a new pantry item via the pantry create mutation with default stock level "stocked"
  - Step 3: "Olive Oil" appears in the pantry; Tobi confirms: "Olive oil's now in your pantry"

**TC-VOIC-011: Voice command - Remove item from list**
- **Priority**: P1
- **Category**: Functional
- **Preconditions**: User has "Butter" on their active shopping list
- **Steps**:
  1. Say "Remove butter from my list"
  2. Wait for the AI response
  3. Verify the item is removed
- **Expected**:
  - Step 1: Transcript sent to `voiceAssistant`
  - Step 2: Gemini calls `remove_list_item` function declaration; the tool locates "Butter" on the active list and removes it
  - Step 3: "Butter" no longer appears on the list; Tobi confirms the removal

**TC-VOIC-012: Voice command - Search for item**
- **Priority**: P2
- **Category**: Functional
- **Preconditions**: User has items across lists and pantry
- **Steps**:
  1. Say "Search for cheese"
  2. Wait for the AI response
- **Expected**:
  - Step 1: Transcript sent to `voiceAssistant`
  - Step 2: Gemini calls `get_price_estimate` or `get_item_variants` to look up cheese; results include price and available sizes
  - Step 3: Tobi responds with price information: "Cheddar cheese is about £2.50 at Tesco. Shall I add it to your list?"

### 7.3 Context Injection

**TC-VOIC-013: Context injection - low/out-of-stock items**
- **Priority**: P0
- **Category**: Integration
- **Preconditions**: User has pantry items: "Milk (out)", "Bread (low)", "Eggs (low)" as the top low-stock items
- **Steps**:
  1. Open voice assistant and say "What do I need to buy?"
  2. Wait for the AI response
- **Expected**:
  - Step 1: `getUserVoiceContext` runs 5 parallel queries; `lowStockItems` returns `["Milk (out)", "Bread (low)", "Eggs (low)"]` (top 10 items); system prompt includes "Low/out items: Milk (out), Bread (low), Eggs (low)"
  - Step 2: Tobi references the actual low-stock data: "You're out of milk and running low on bread and eggs. Want me to add them to your list?"

**TC-VOIC-014: Context injection - active lists with budgets**
- **Priority**: P1
- **Category**: Integration
- **Preconditions**: User has 2 active lists: "Weekly Shop (£50 budget, £23 spent, 8 items)" and "Party Prep (no budget, 3 items)"
- **Steps**:
  1. Say "What lists do I have?"
  2. Wait for the AI response
- **Expected**:
  - Step 1: `getUserVoiceContext` populates `activeListNames` as enriched strings: `["Weekly Shop (£50 budget, £23 spent, 8 items)", "Party Prep (no budget, 3 items)"]`; system prompt includes this under "Your lists"
  - Step 2: Tobi responds using the real data: "You've got two lists going. Weekly Shop has 8 items and you've spent about £23 of your £50 budget. Party Prep has 3 items with no budget set"

**TC-VOIC-015: Context injection - subscription tier awareness**
- **Priority**: P1
- **Category**: Integration
- **Preconditions**: Free tier user
- **Steps**:
  1. Say "Can I create another list?" (user already has 2 active lists at free tier max)
  2. Wait for the AI response
- **Expected**:
  - Step 1: `getUserVoiceContext` returns `subscriptionTier: "free"`; system prompt includes "Subscription: Free plan (limited features)"
  - Step 2: Tobi gently mentions the limit: "You're on the free plan which allows 2 lists. You could complete one of your current lists or upgrade to Premium for unlimited lists"

**TC-VOIC-016: Context injection - dietary and cuisine preferences**
- **Priority**: P1
- **Category**: Integration
- **Preconditions**: User profile has `dietaryRestrictions: ["gluten-free"]` and `cuisinePreferences: ["Nigerian", "Caribbean"]`
- **Steps**:
  1. Say "Add pasta to my list"
  2. Wait for the AI response
- **Expected**:
  - Step 1: System prompt includes "Dietary restrictions: gluten-free" and "Cuisine preferences: Nigerian, Caribbean"; the DIETARY & CUISINE AWARENESS rules are populated
  - Step 2: Tobi flags the dietary conflict: "Just a heads up -- regular pasta contains gluten, and you mentioned you're gluten-free. Want me to add gluten-free pasta instead?"

**TC-VOIC-017: Context injection - preferred stores**
- **Priority**: P2
- **Category**: Integration
- **Preconditions**: User has preferred stores: ["Tesco", "Aldi"]
- **Steps**:
  1. Say "Where's the cheapest milk?"
  2. Wait for the AI response
- **Expected**:
  - Step 1: `getUserVoiceContext` returns `preferredStores: ["Tesco", "Aldi"]`; system prompt includes "Preferred stores: Tesco, Aldi"
  - Step 2: Tobi prioritizes the user's preferred stores: "I'll check prices at your usual Tesco and Aldi. Milk is about £1.15 at Tesco and £0.99 at Aldi"

### 7.4 Rate Limiting & Edge Cases

**TC-VOIC-018: Rate limiting - Free tier 10/month**
- **Priority**: P0
- **Category**: Boundary
- **Preconditions**: Free tier user has used 9 voice commands this month
- **Steps**:
  1. Send a voice command (10th usage)
  2. Verify it succeeds
  3. Send another voice command (11th usage)
  4. Verify it is blocked
- **Expected**:
  - Step 1: `checkRateLimit` passes; `canUseFeature` query returns `allowed: true` (9 < 10)
  - Step 2: Command is processed normally; usage count increments to 10
  - Step 3: `canUseFeature` query returns `allowed: false` (10 >= 10 monthly limit from `AI_LIMITS.voice.free`)
  - Step 4: `voiceAssistant` returns `{ type: "limit_reached", text: "You've reached your voice usage limit. Upgrade for more." }`; user sees the limit message; no AI call is made

**TC-VOIC-019: Quota exceeded behavior and fast rate limiting**
- **Priority**: P1
- **Category**: Negative
- **Preconditions**: User sends commands very rapidly
- **Steps**:
  1. Send 3 voice commands within 2 seconds
  2. Verify rate limiting kicks in
  3. Verify the Gemini daily quota exhaustion message
- **Expected**:
  - Step 1: First command proceeds; second may proceed
  - Step 2: `checkRateLimit` mutation returns `{ allowed: false }` for rapid commands; `voiceAssistant` returns `{ type: "error", text: "Too fast! Slow down." }`
  - Step 3: If Gemini free tier RPD quota is exhausted, `enforceGeminiQuota` throws `GeminiQuotaExhaustedError`; response returns `{ type: "error", text: "AI capacity reached for today. Please try again tomorrow." }`

**TC-VOIC-020: Graceful degradation in Expo Go**
- **Priority**: P1
- **Category**: Edge Case
- **Preconditions**: App is running in Expo Go (not dev build); `expo-speech-recognition` native module is not available
- **Steps**:
  1. Tap the Tobi FAB button
  2. Attempt to start listening
  3. Verify graceful degradation
- **Expected**:
  - Step 1: FAB button may still be visible (depending on configuration)
  - Step 2: `STT_AVAILABLE` is `false` (native module check fails)
  - Step 3: The voice sheet opens but the microphone/listen functionality is disabled or shows a message explaining that voice input requires the development build; TTS output may still work via `expo-speech`; the app does not crash

---

## SUITE 8: Profile & Settings (TC-PROF-001 to TC-PROF-018)

### 8.1 Account Information

**TC-PROF-001: View account info (name, email)**
- **Priority**: P0
- **Category**: Functional
- **Preconditions**: User is authenticated as "Jane Doe" with email "jane@example.com"; `nameManuallySet` is true in Convex user record
- **Steps**:
  1. Navigate to the Profile tab
  2. Verify account information is displayed
- **Expected**:
  - Step 1: Profile screen loads; queries resolve: `allLists`, `pantryItems`, `pointsBalance`, `subscription`, `aiUsage`, `receipts`, `referralInfo`
  - Step 2: Header shows "Hey, Jane" (from `convexUser.name` since `nameManuallySet` is true and name passes `isGenericName` check); `AccountSection` displays name "Jane" and email "jane@example.com"; avatar icon is shown

**TC-PROF-002: Edit display name**
- **Priority**: P1
- **Category**: Functional
- **Preconditions**: User is authenticated; current name is "Jane"
- **Steps**:
  1. Navigate to the Profile tab
  2. Tap the account card (triggers `handleEditName`)
  3. Verify the edit name modal opens
  4. Change the name to "Jenny"
  5. Tap "Save"
  6. Verify the name is updated
- **Expected**:
  - Step 1: Profile loads with current name
  - Step 2: `handleEditName` is called; `editNameValue` is pre-populated with "Jane"; `showEditName` state becomes true
  - Step 3: `GlassModal` opens with "Edit your name" title, a text input, Save button, and Cancel button
  - Step 4: Text input shows "Jenny"
  - Step 5: `handleSaveName` is called; validates: `trimmed.length >= 2` (passes), not all digits (passes); `updateUser({ name: "Jenny" })` mutation is called; haptic success notification fires; modal closes
  - Step 6: Header updates to "Hey, Jenny"; account card shows "Jenny"

**TC-PROF-003: Edit name validation - too short**
- **Priority**: P2
- **Category**: Negative
- **Preconditions**: User opens the edit name modal
- **Steps**:
  1. Clear the name field and type "J" (1 character)
  2. Tap "Save"
  3. Verify the save is blocked
- **Expected**:
  - Step 1: Input field shows "J"
  - Step 2: `handleSaveName` runs validation: `trimmed.length < 2` returns true
  - Step 3: Function returns early without calling `updateUser`; modal stays open; name is not updated

**TC-PROF-004: Edit name validation - numeric only**
- **Priority**: P2
- **Category**: Negative
- **Preconditions**: User opens the edit name modal
- **Steps**:
  1. Type "12345" in the name field
  2. Tap "Save"
  3. Verify the save is blocked
- **Expected**:
  - Step 1: Input field shows "12345"
  - Step 2: `handleSaveName` runs validation: `/^\d+$/.test("12345")` returns true
  - Step 3: Function returns early without calling `updateUser`; modal stays open; the numeric-only name is rejected

**TC-PROF-005: Name collection modal for generic names**
- **Priority**: P1
- **Category**: Functional
- **Preconditions**: User signed up with Clerk username "user_abc123" which is detected as generic by `isGenericName`; `nameManuallySet` is false
- **Steps**:
  1. Navigate to the Profile tab
  2. Verify the "Personalise your experience" prompt is visible
  3. Tap the prompt
  4. Enter name "Adaeze"
  5. Save the name
- **Expected**:
  - Step 1: Profile loads; `convexUser.nameManuallySet` is false
  - Step 2: The `AnimatedSection` containing "Personalise your experience" card is visible with message "Add your name so Oja feels like yours" and a pencil icon; this prompt shows because `!convexUser?.nameManuallySet` is true
  - Step 3: Edit name modal opens
  - Step 4: Name field shows "Adaeze"
  - Step 5: `updateUser({ name: "Adaeze" })` is called; after save, the personalise prompt should disappear once `nameManuallySet` is updated; header changes to "Hey, Adaeze"

### 8.2 Preferences

**TC-PROF-006: View and edit dietary preferences**
- **Priority**: P1
- **Category**: Functional
- **Preconditions**: User has dietary preferences set to ["vegetarian"]
- **Steps**:
  1. Navigate to the Profile tab
  2. Locate the dietary preferences section in Account
  3. Edit dietary preferences to add "gluten-free"
  4. Save the changes
- **Expected**:
  - Step 1: Profile loads
  - Step 2: Dietary preferences display "vegetarian" in the Account section
  - Step 3: User adds "gluten-free" to the selection
  - Step 4: Preferences are updated via `updateUser` mutation; `dietaryRestrictions` is now `["vegetarian", "gluten-free"]`; these preferences are injected into Tobi's voice context and affect health analysis suggestions

**TC-PROF-007: View and edit cuisine preferences**
- **Priority**: P1
- **Category**: Functional
- **Preconditions**: User has cuisine preferences set to ["Nigerian"]
- **Steps**:
  1. Navigate to the Profile tab
  2. Locate cuisine preferences in Account
  3. Add "Caribbean" to cuisine preferences
  4. Save the changes
- **Expected**:
  - Step 1: Profile loads
  - Step 2: Cuisine preferences display "Nigerian"
  - Step 3: User adds "Caribbean"
  - Step 4: Preferences updated; `cuisinePreferences` is now `["Nigerian", "Caribbean"]`; Tobi will use these for contextual suggestions

**TC-PROF-008: Referral code display and sharing**
- **Priority**: P1
- **Category**: Functional
- **Preconditions**: User is authenticated; referral code has been generated
- **Steps**:
  1. Navigate to the Profile tab
  2. Verify the referral code is displayed
  3. Tap the "Invite" button
  4. Verify the share action fires
- **Expected**:
  - Step 1: Profile loads; `referralInfo` query returns the user's referral data; if `referralInfo` is null, `generateReferralCode` mutation auto-fires
  - Step 2: Referral code is displayed in the `AccountSection` referral card with "YOUR CODE" label and the code in large accent-colored text; if friends have joined, stats show (e.g., "3 friends joined - 1500 pts earned")
  - Step 3: `handleShareReferral` is called; SMS compose opens via `Linking.openURL("sms:?&body=...")` with message: "Join me on Oja and get 500 bonus points! Use my code {code} to save on your groceries. https://oja.app/download"
  - Step 4: Haptic success feedback fires; share interface opens with the pre-composed message

### 8.3 Notification & Tutorial Settings

**TC-PROF-009: Toggle notifications master switch**
- **Priority**: P1
- **Category**: Functional
- **Preconditions**: User has notifications enabled (default: true)
- **Steps**:
  1. Navigate to the Profile tab
  2. Locate "Enable Notifications" in the Settings section
  3. Toggle the checkbox OFF
  4. Verify sub-settings are hidden
  5. Toggle the checkbox ON
  6. Verify sub-settings reappear
- **Expected**:
  - Step 1: Profile loads; `SettingsSection` renders
  - Step 2: "Enable Notifications" checkbox is checked (default: `preferences?.notifications ?? true`)
  - Step 3: `updateNotificationSettings({ notifications: false })` mutation is called
  - Step 4: Sub-settings (Stock Reminders, Nurture Messages, Quiet Hours, Tutorial Hints, Re-show All Hints) are hidden because the parent conditional `convexUser?.preferences?.notifications !== false` evaluates to false
  - Step 5: `updateNotificationSettings({ notifications: true })` is called
  - Step 6: All sub-settings reappear and can be individually configured

**TC-PROF-010: Stock reminders toggle**
- **Priority**: P2
- **Category**: Functional
- **Preconditions**: Notifications are enabled; stock reminders are on (default: true)
- **Steps**:
  1. Toggle "Stock Reminders" OFF
  2. Verify the setting is saved
- **Expected**:
  - Step 1: `updateNotificationSettings({ stockReminders: false })` is called
  - Step 2: The checkbox unchecks; Wednesday and Friday pantry check reminders are disabled for this user

**TC-PROF-011: Tutorial hints toggle and reset**
- **Priority**: P1
- **Category**: Functional
- **Preconditions**: User has tutorial hints enabled (default: true)
- **Steps**:
  1. Navigate to the Profile tab Settings section
  2. Toggle "Tutorial Hints" OFF
  3. Verify hints stop appearing
  4. Tap "Reset" next to "Re-show All Hints"
  5. Confirm the reset
  6. Toggle "Tutorial Hints" ON
  7. Verify hints appear again
- **Expected**:
  - Step 1: Settings section shows Tutorial Hints checkbox (checked) and Re-show All Hints with Reset button
  - Step 2: `setHintsEnabled(false)` is called for local storage; `updateUser({ showTutorialHints: false })` is called for server; checkbox unchecks
  - Step 3: `HintOverlay` components across the app check `showTutorialHints` and do not display
  - Step 4: Confirmation dialog appears: "Reset All Hints - This will show all tutorial hints again as you use the app."
  - Step 5: `resetAllHints()` from `hintStorage` is called; all viewed hint records are cleared; haptic success fires
  - Step 6: `setHintsEnabled(true)` and `updateUser({ showTutorialHints: true })` are called
  - Step 7: Hints appear again on their respective screens (profile_intro, scan_type, etc.) as if it were the first visit

### 8.4 Milestone Path & Quick Stats

**TC-PROF-012: View milestone path (badges/achievements)**
- **Priority**: P2
- **Category**: Functional
- **Preconditions**: User has earned 3 badges: "First Receipt", "Pantry Pro (10 items)", "Budget Saver"
- **Steps**:
  1. Navigate to the Profile tab
  2. Scroll to the Milestone Path section
  3. Verify badges and achievements are displayed
- **Expected**:
  - Step 1: Profile loads
  - Step 2: `MilestonePath` component renders with props: `pantryItems`, `allLists`, `receipts`, `pointsBalance`, `isAdmin`
  - Step 3: Earned badges are visually highlighted; unearned milestones show as locked/greyed out; progress toward next milestones is indicated

**TC-PROF-013: Quick stats display**
- **Priority**: P1
- **Category**: Functional
- **Preconditions**: User has: 5 completed lists (trips), 15 pantry items, 8 completed receipt scans, Bronze tier with 8 lifetime scans
- **Steps**:
  1. Navigate to the Profile tab
  2. Verify the quick stats card displays correctly
- **Expected**:
  - Step 1: Profile loads and computes stats from query results
  - Step 2: Quick stats card shows 4 metrics in a row: "5 trips" (from `allLists.filter(status === "completed")`), "15 items" (from `pantryItems.length`), "8 receipts" (from `receipts.filter(processingStatus === "completed")`), "8 scans" (from `pointsBalance.tierProgress`, highlighted with accent color)

### 8.5 Navigation Links

**TC-PROF-014: Navigation links routing**
- **Priority**: P1
- **Category**: Functional
- **Preconditions**: User is authenticated as a non-admin
- **Steps**:
  1. Navigate to the Profile tab
  2. Tap "Points History"
  3. Navigate back and tap "Insights"
  4. Navigate back and tap "AI Usage"
  5. Navigate back and tap "Subscription"
  6. Navigate back and tap "Help & Support"
- **Expected**:
  - Step 1: Profile loads with `NavigationLinks` section
  - Step 2: Router navigates to `/(app)/points-history`; haptic Light feedback fires
  - Step 3: Router navigates to `/(app)/insights`; haptic Light feedback fires
  - Step 4: Router navigates to `/(app)/ai-usage`; displays "Voice: X/Y this month" subtitle
  - Step 5: Router navigates to `/(app)/subscription`; shows current plan status
  - Step 6: Router navigates to `/(app)/support`; non-admin sees standard support page

**TC-PROF-015: Admin controls visibility**
- **Priority**: P1
- **Category**: Security
- **Preconditions**: User A is a regular user (not admin); User B has `isAdmin: true`
- **Steps**:
  1. As User A, navigate to Profile tab
  2. Verify admin controls are NOT visible
  3. As User B, navigate to Profile tab
  4. Verify admin controls ARE visible
- **Expected**:
  - Step 1: Profile loads for User A
  - Step 2: `AdminControlCenter` is not rendered (guarded by `isAdmin` check); "Admin Dashboard" nav link is not visible; "Reset Account (re-onboard)" button is not visible in Danger Zone
  - Step 3: Profile loads for User B
  - Step 4: `AdminControlCenter` renders at the top with analytics, system health, and platform AI usage; "Admin Dashboard" nav link appears routing to `/(app)/admin`; "Reset Account" button appears in Danger Zone below Delete Account; Support link shows "Internal Support" or "System Status" depending on admin role

### 8.6 Account Actions

**TC-PROF-016: Sign out**
- **Priority**: P0
- **Category**: Functional
- **Preconditions**: User is authenticated
- **Steps**:
  1. Navigate to the Profile tab
  2. Tap "Sign Out" button
  3. Verify the user is signed out
- **Expected**:
  - Step 1: Profile loads; Sign Out button is visible in the bottom section
  - Step 2: `handleSignOut` is called; haptic Medium feedback fires; `signOut()` from Clerk is called
  - Step 3: User session is cleared; router replaces to `/(auth)/sign-in`; all Convex queries are invalidated; returning to the app requires re-authentication

**TC-PROF-017: Delete account (GDPR compliance)**
- **Priority**: P0
- **Category**: Security
- **Preconditions**: User is authenticated with active subscription and Convex data; has Clerk account
- **Steps**:
  1. Navigate to the Profile tab
  2. Tap "Delete Account" in the Danger Zone
  3. Read the confirmation dialog
  4. Tap "Confirm"
  5. Verify complete account deletion
- **Expected**:
  - Step 1: Profile loads; "Delete Account" button is visible in Danger Zone section
  - Step 2: `handleDeleteAccount` is called; confirmation dialog appears
  - Step 3: Dialog shows title "Delete Account" with message: "This permanently deletes EVERYTHING -- Convex data AND your Clerk login. You'll need to sign up with a fresh email. Are you sure?" with "Cancel" and "Confirm" (destructive) buttons
  - Step 4: User taps "Confirm"; `isDeleting` state becomes true; button shows "Deleting..."
  - Step 5: Execution sequence: (a) `cancelAllSubs` action cancels all Stripe subscriptions, (b) `deleteMyAccount` mutation removes all Convex data (PII, pantry, lists, receipts, points, etc.), (c) `user.delete()` deletes the Clerk account (with one retry on failure), (d) `signOut()` is called, (e) router replaces to `/(auth)/sign-in`; if Clerk deletion fails, a "Partial Deletion" alert warns the user to contact support; haptic Warning feedback fires on successful deletion

**TC-PROF-018: Reset account (admin only)**
- **Priority**: P1
- **Category**: Functional
- **Preconditions**: Admin user is authenticated with existing data (lists, pantry, receipts)
- **Steps**:
  1. Navigate to the Profile tab as an admin user
  2. Scroll to the Danger Zone
  3. Verify "Reset Account (re-onboard)" is visible
  4. Tap "Reset Account"
  5. Read the confirmation dialog
  6. Tap "Confirm"
  7. Verify account reset and re-onboarding
- **Expected**:
  - Step 1: Profile loads; admin controls are visible
  - Step 2: Danger Zone section shows both "Delete Account" and "Reset Account" (admin only)
  - Step 3: Button is visible with refresh icon; guarded by `isAdmin` check
  - Step 4: `handleResetAccount` is called; confirmation dialog appears
  - Step 5: Dialog shows "Reset Account" with personalized message: "{name}, this will delete ALL your data (pantry, lists, receipts, etc.) and restart onboarding. Your login stays intact." with "Cancel" and "Confirm" (destructive) buttons
  - Step 6: `isResetting` state becomes true; button shows "Resetting..."; `resetMyAccount` mutation is called
  - Step 7: All user data is wiped (pantry items, shopping lists, receipts, points, preferences, etc.); Clerk login remains intact; haptic success fires; router replaces to `/onboarding/welcome`; user goes through the full onboarding flow again (welcome, cuisine, store, pantry-seeding, review)
---

## SUITE 9: Subscription & Payments (TC-SUBS-001 to TC-SUBS-015)

---

**TC-SUBS-001: View current Free plan**
- **Priority**: P0
- **Category**: Functional
- **Preconditions**: User is authenticated with no subscription record in the database
- **Steps**:
  1. Navigate to the subscription screen via Profile tab
  2. Observe the Current Plan Card section
  3. Observe the feature limits displayed
- **Expected**:
  - Step 1: Subscription screen loads with header "Premium & Rewards"
  - Step 2: Current Plan Card shows plan as "Free" with status "active"
  - Step 3: Feature limits show 2 lists, 30 pantry items, 10 voice requests/month; partnerMode is disabled; no "Manage Subscription" or "Cancel" buttons are shown

---

**TC-SUBS-002: View current Trial plan with days remaining**
- **Priority**: P0
- **Category**: Functional
- **Preconditions**: User has an active trial subscription (status="trial") with trialEndsAt set 5 days in the future
- **Steps**:
  1. Navigate to the subscription screen
  2. Observe the Trial Banner at the top of the screen
  3. Observe the Current Plan Card features
  4. Observe whether upgrade plan options are visible
- **Expected**:
  - Step 1: Subscription screen loads without skeleton loaders
  - Step 2: Trial Banner is visible showing "5 days" remaining in the trial
  - Step 3: Current Plan Card shows premium features (unlimited lists, unlimited pantry, 200 voice/mo, partner mode enabled)
  - Step 4: Upgrade plan options (Monthly and Annual) are still shown below the feature comparison, allowing the user to convert before trial ends

---

**TC-SUBS-003: View expired subscription banner**
- **Priority**: P0
- **Category**: Functional
- **Preconditions**: User has a subscription with status="expired" (trial ended on day 8 without conversion)
- **Steps**:
  1. Navigate to the subscription screen
  2. Observe the banner area at the top of the scroll content
  3. Observe the Current Plan Card section
  4. Observe the PremiumValueProp section
- **Expected**:
  - Step 1: Subscription screen loads successfully
  - Step 2: Expired Banner is displayed (Trial Banner is NOT shown); banner communicates that the trial has ended
  - Step 3: Current Plan Card shows Free plan features (2 lists, 30 pantry items, 10 voice/mo); isPremium is false; no "Manage Subscription" or "Cancel" buttons
  - Step 4: PremiumValueProp section is visible, encouraging the user to upgrade

---

**TC-SUBS-004: View cancelled subscription banner**
- **Priority**: P1
- **Category**: Functional
- **Preconditions**: User has an active premium subscription with status="cancelled" and currentPeriodEnd set 12 days in the future
- **Steps**:
  1. Navigate to the subscription screen
  2. Observe the Current Plan Card section
  3. Check if premium features are still accessible
  4. Observe whether a cancel button is present
- **Expected**:
  - Step 1: Subscription screen loads; isCancelled flag is true
  - Step 2: Current Plan Card indicates the subscription is cancelled but active until the billing period end; the period end date (12 days out) is displayed
  - Step 3: Premium features remain accessible (subscription.status is "cancelled" but effectiveStatus treats cancelled with future periodEnd as still having paid access for the current period)
  - Step 4: No cancel button is shown since the subscription is already cancelled; "Manage Subscription" (Stripe portal) button may still appear

---

**TC-SUBS-005: Plan comparison table (Free vs Premium features)**
- **Priority**: P1
- **Category**: Functional
- **Preconditions**: User is authenticated (any plan)
- **Steps**:
  1. Navigate to the subscription screen
  2. Scroll to the FeatureComparison section
  3. Verify Free tier column values
  4. Verify Premium tier column values
- **Expected**:
  - Step 1: Screen loads successfully
  - Step 2: FeatureComparison component renders a comparison table with Free and Premium columns
  - Step 3: Free column shows: 2 lists, 30 pantry items, 10 voice/mo, receipt scanning enabled, price history enabled, partner mode disabled (or marked as premium-only)
  - Step 4: Premium column shows: unlimited lists, unlimited pantry items, 200 voice/mo, receipt scanning enabled, price history enabled, partner mode enabled, priority support

---

**TC-SUBS-006: Upgrade to Premium via Stripe checkout**
- **Priority**: P0
- **Category**: Integration
- **Preconditions**: User is on Free plan; Stripe environment is configured; createCheckoutSession action is available
- **Steps**:
  1. Navigate to the subscription screen
  2. Scroll to the plan options section
  3. Tap the "Premium Monthly" plan option button
  4. Observe haptic feedback and loading state
  5. Verify Stripe checkout URL is opened
- **Expected**:
  - Step 1: Screen loads showing Free plan
  - Step 2: PlanOptionsList renders with Free, Premium Monthly (at 2.99/mo or dynamic price), and Premium Annual plan cards
  - Step 3: handleCheckout is invoked with planId "premium_monthly"; checkoutLoading state is set to "premium_monthly"
  - Step 4: Medium haptic feedback fires; the tapped button shows a loading spinner
  - Step 5: createCheckoutSession returns a URL; Linking.openURL is called with the Stripe checkout URL; loading state clears after completion

---

**TC-SUBS-007: Stripe checkout success activates premium**
- **Priority**: P0
- **Category**: Integration
- **Preconditions**: User completed Stripe checkout; webhook has fired calling upsertSubscription with plan="premium_monthly", status="active", stripeCustomerId, stripeSubscriptionId, currentPeriodStart, currentPeriodEnd
- **Steps**:
  1. Stripe webhook calls upsertSubscription mutation
  2. Query getCurrentSubscription for the user
  3. Query hasPremium for the user
  4. Check feature gating returns premium features
- **Expected**:
  - Step 1: Subscription record is created (or updated if existing) with plan="premium_monthly", status="active", stripeCustomerId and stripeSubscriptionId set, currentPeriodStart and currentPeriodEnd populated; funnel event "subscribed" is tracked
  - Step 2: getCurrentSubscription returns isActive=true, plan="premium_monthly", status="active", features with maxLists=-1, maxPantryItems=-1, maxVoiceRequests=200, partnerMode=true
  - Step 3: hasPremium returns true
  - Step 4: checkFeatureAccess returns isPremium=true; canCreateList returns allowed=true regardless of list count; canAddPantryItem returns allowed=true regardless of item count

---

**TC-SUBS-008: Stripe checkout cancelled remains on current plan**
- **Priority**: P1
- **Category**: Functional
- **Preconditions**: User is on Free plan; user navigates to Stripe checkout but closes/cancels without completing payment
- **Steps**:
  1. User taps upgrade button, Stripe checkout URL opens
  2. User closes the Stripe checkout page without completing payment
  3. User returns to the app subscription screen
  4. Query getCurrentSubscription
- **Expected**:
  - Step 1: Checkout URL opens in external browser
  - Step 2: No webhook is fired; no upsertSubscription mutation is called
  - Step 3: Subscription screen still shows Free plan
  - Step 4: getCurrentSubscription returns plan="free", status="active" with Free features (2 lists, 30 pantry, 10 voice)

---

**TC-SUBS-009: Manage subscription via Stripe portal**
- **Priority**: P1
- **Category**: Integration
- **Preconditions**: User has an active premium subscription with stripeCustomerId set
- **Steps**:
  1. Navigate to subscription screen
  2. Tap "Manage Subscription" button on the Current Plan Card
  3. Observe haptic feedback and loading state
  4. Verify Stripe portal URL is opened
- **Expected**:
  - Step 1: Current Plan Card shows premium plan with "Manage Subscription" button visible
  - Step 2: handleManageSubscription is invoked; portalLoading is set to true
  - Step 3: Medium haptic feedback fires; button shows loading state
  - Step 4: createPortalSession returns a URL; Linking.openURL is called with the portal URL; portalLoading resets to false

---

**TC-SUBS-010: Cancel subscription (active until period end)**
- **Priority**: P0
- **Category**: Functional
- **Preconditions**: User has an active premium_monthly subscription with currentPeriodEnd 25 days in the future
- **Steps**:
  1. Navigate to subscription screen
  2. Tap "Cancel" button on Current Plan Card
  3. Observe the cancellation confirmation modal
  4. Tap "Keep Subscription" in the modal
  5. Tap "Cancel" button again, then tap "Cancel" (confirm) in the modal
  6. Observe the result
- **Expected**:
  - Step 1: Current Plan Card shows active premium plan with Cancel button
  - Step 2: GlassModal appears with warning icon, title "Cancel Subscription?", body text about keeping features but reverting to 2 lists and 30 pantry items
  - Step 3: Modal has two buttons: "Keep Subscription" (secondary) and "Cancel" (danger)
  - Step 4: Modal closes; no mutation is called; subscription remains active
  - Step 5: cancelSubscription mutation is called; Heavy haptic feedback fires; cancelLoading is true during the call
  - Step 6: Subscription status is patched to "cancelled"; Warning notification haptic fires; modal closes; alert shows "Subscription Cancelled" with message about keeping access until billing period end; user still has premium features until currentPeriodEnd

---

**TC-SUBS-011: Trial auto-starts on onboarding completion (7 days)**
- **Priority**: P0
- **Category**: Functional
- **Preconditions**: New user has completed onboarding; no subscription record exists
- **Steps**:
  1. System calls startFreeTrial mutation after onboarding completion
  2. Verify the subscription record created
  3. Verify the notification created
  4. Query getCurrentSubscription
- **Expected**:
  - Step 1: startFreeTrial mutation executes successfully
  - Step 2: Subscription record is inserted with: userId matching the user, plan="premium_monthly", status="trial", trialEndsAt = now + 7 days (604800000ms), currentPeriodStart = now, currentPeriodEnd = trialEndsAt, createdAt = now, updatedAt = now
  - Step 3: Notification is created with type="trial_started", title="Premium Trial Started!", body containing "7 days of free premium access"
  - Step 4: getCurrentSubscription returns status="trial", isActive=true, features matching premium plan (unlimited lists/pantry, 200 voice, partner mode)

---

**TC-SUBS-012: Trial expiry (day 8) reverts to free features**
- **Priority**: P0
- **Category**: Functional
- **Preconditions**: User has a trial subscription with trialEndsAt in the past (trial expired)
- **Steps**:
  1. expireTrials cron job runs
  2. Query the subscription record
  3. Query getCurrentSubscription
  4. Attempt to create a 3rd shopping list
  5. Attempt to add 31st pantry item
- **Expected**:
  - Step 1: expireTrials finds subscriptions with status="trial" and trialEndsAt <= now; patches status to "expired"
  - Step 2: Subscription record has status="expired"
  - Step 3: getCurrentSubscription returns isActive=false (isEffectivelyPremium returns false for "expired"), features are getFreeFeatures() (2 lists, 30 pantry, 10 voice, partnerMode=false)
  - Step 4: canCreateList returns { allowed: false, reason: "Free plan allows 2 active lists..." } if user already has 2 active lists
  - Step 5: canAddPantryItem returns { allowed: false, reason: "Free plan allows 30 pantry items..." } if user already has 30 active pantry items

---

**TC-SUBS-013: Admin bypass treated as premium_annual**
- **Priority**: P1
- **Category**: Functional
- **Preconditions**: User has isAdmin=true set on their user record; no subscription record exists
- **Steps**:
  1. Query getCurrentSubscription for the admin user
  2. Query hasPremium
  3. Query requirePremium
  4. Check feature gating (canCreateList, canAddPantryItem)
- **Expected**:
  - Step 1: getCurrentSubscription returns plan="premium_annual", status="active", features=getPlanFeatures("premium_annual") with maxLists=-1, maxPantryItems=-1, maxVoiceRequests=200, partnerMode=true, isAdminOverride=true
  - Step 2: hasPremium returns true
  - Step 3: requirePremium returns { isPremium: true, plan: "premium_annual", status: "active" }
  - Step 4: canCreateList returns { allowed: true }; canAddPantryItem returns { allowed: true } regardless of counts

---

**TC-SUBS-014: Already-subscribed user cannot start a trial**
- **Priority**: P1
- **Category**: Negative
- **Preconditions**: User has an existing subscription record (any status: active, cancelled, expired, trial)
- **Steps**:
  1. Call startFreeTrial mutation for this user
  2. Observe the error
  3. Verify no new subscription record was created
- **Expected**:
  - Step 1: startFreeTrial queries for existing subscription and finds one
  - Step 2: Mutation throws Error("Already has a subscription")
  - Step 3: No new subscription record is inserted; existing record is unchanged

---

**TC-SUBS-015: Scan rewards section displays tier and points progress**
- **Priority**: P1
- **Category**: Functional
- **Preconditions**: User is authenticated with a pointsBalance record showing tier="silver", tierProgress=25, availablePoints=3750, earningScansThisMonth=2; user is on premium_monthly plan
- **Steps**:
  1. Navigate to the subscription screen
  2. Observe the ScanRewardsCard component
  3. Verify tier display
  4. Verify points progress information
  5. Tap "View Points History" link
- **Expected**:
  - Step 1: Screen loads; pointsBalance query resolves
  - Step 2: ScanRewardsCard renders with tier badge, points balance, and earning info
  - Step 3: Tier shows "Silver" with visual indicator; next tier info shows "Gold" requiring 25 more scans (50-25)
  - Step 4: Available points show 3,750; earning scans this month show 2 of 5 (Silver premium cap); canEarnMore is true; monthly earning cap shows 875 points; effective discount shows 3.75 (3750/1000)
  - Step 5: Router navigates to "/(app)/points-history"

---

## SUITE 10: Points & Gamification (TC-POIN-001 to TC-POIN-020)

---

**TC-POIN-001: Points earned per receipt scan (Bronze tier, premium user)**
- **Priority**: P0
- **Category**: Functional
- **Preconditions**: Premium user with pointsBalance tier="bronze", tierProgress=5, earningScansThisMonth=1, availablePoints=150; a newly confirmed receipt exists that has not been awarded points yet
- **Steps**:
  1. Call processEarnPoints with userId and receiptId
  2. Verify idempotency check passes (no existing earn transaction for this receipt)
  3. Verify points balance is updated
  4. Verify transaction record is created
- **Expected**:
  - Step 1: processEarnPoints executes successfully
  - Step 2: Query for pointsTransactions with receiptId and type="earn" returns null (no duplicate)
  - Step 3: pointsBalance is patched: totalPoints = 150 + 150 = 300, availablePoints = 150 + 150 = 300, tierProgress = 5 + 1 = 6, earningScansThisMonth = 1 + 1 = 2, tier remains "bronze" (threshold 0, next at 20)
  - Step 4: pointsTransactions record inserted with type="earn", amount=150, source="receipt_scan", receiptId set, balanceBefore=150, balanceAfter=300, metadata contains tierAtEarn="bronze"

---

**TC-POIN-002: Tier system thresholds (Bronze to Silver promotion)**
- **Priority**: P0
- **Category**: Functional
- **Preconditions**: Premium user with tierProgress=19 (one scan away from Silver threshold of 20)
- **Steps**:
  1. Call processEarnPoints for a new receipt
  2. Verify new tierProgress
  3. Verify tier promotion
  4. Verify points per scan rate for the next scan
- **Expected**:
  - Step 1: processEarnPoints succeeds; points awarded at Bronze rate (150)
  - Step 2: tierProgress is patched to 20
  - Step 3: getTierFromScans(20) returns Silver tier; balance.tier is updated to "silver"
  - Step 4: On the next scan, getPointsPerScan will return 175 (Silver rate for premium)

---

**TC-POIN-003: Tier system thresholds (Gold and Platinum)**
- **Priority**: P1
- **Category**: Boundary
- **Preconditions**: Premium user accounts at various tier boundaries
- **Steps**:
  1. Call getTierFromScans(49) - just below Gold threshold
  2. Call getTierFromScans(50) - exactly at Gold threshold
  3. Call getTierFromScans(99) - just below Platinum threshold
  4. Call getTierFromScans(100) - exactly at Platinum threshold
  5. Call getTierFromScans(500) - well above Platinum
- **Expected**:
  - Step 1: Returns Silver tier (threshold=20, pointsPerScan=175, maxEarningScans=5, maxPoints=875)
  - Step 2: Returns Gold tier (threshold=50, pointsPerScan=200, maxEarningScans=6, maxPoints=1200)
  - Step 3: Returns Gold tier
  - Step 4: Returns Platinum tier (threshold=100, pointsPerScan=225, maxEarningScans=6, maxPoints=1350)
  - Step 5: Returns Platinum tier (highest tier, no further promotion)

---

**TC-POIN-004: Monthly earning caps (premium Silver user)**
- **Priority**: P0
- **Category**: Boundary
- **Preconditions**: Premium user at Silver tier with earningScansThisMonth=4 (one below Silver cap of 5)
- **Steps**:
  1. Call processEarnPoints for a new receipt (scan #5)
  2. Verify scan is accepted
  3. Call processEarnPoints for another new receipt (scan #6, exceeding cap)
  4. Verify scan is rejected
- **Expected**:
  - Step 1: processEarnPoints executes; earningScansThisMonth becomes 5
  - Step 2: Returns { earned: true, pointsAmount: 175, ... }; Silver rate applied
  - Step 3: processEarnPoints checks earningScansThisMonth (5) >= maxEarningScans (5 for Silver)
  - Step 4: Returns { earned: false, reason: "monthly_limit_reached" }; no points awarded; no transaction created; balance unchanged

---

**TC-POIN-005: Free tier lock (1 scan earn per month, 100 points)**
- **Priority**: P0
- **Category**: Functional
- **Preconditions**: Free plan user (no subscription or expired trial) with earningScansThisMonth=0, tierProgress=5
- **Steps**:
  1. Call processEarnPoints for a new receipt (first scan of month)
  2. Verify points amount (free rate)
  3. Call processEarnPoints for another new receipt (second scan of month)
  4. Verify rejection
- **Expected**:
  - Step 1: checkFeatureAccess returns isPremium=false; getMaxEarningScans returns 1; getPointsPerScan returns 100
  - Step 2: Points earned = 100 (free rate, not tier-based); transaction created with amount=100
  - Step 3: earningScansThisMonth is now 1; maxEarningScans is 1 for free users
  - Step 4: Returns { earned: false, reason: "monthly_limit_reached" }

---

**TC-POIN-006: Points transaction history query**
- **Priority**: P1
- **Category**: Functional
- **Preconditions**: User has 15 pointsTransactions records of various types (earn, bonus, redeem, expire)
- **Steps**:
  1. Call getPointsHistory with no limit argument
  2. Call getPointsHistory with limit=5
  3. Verify ordering
- **Expected**:
  - Step 1: Returns all 15 transactions (default limit is 50); each transaction includes userId, type, amount, source, balanceBefore, balanceAfter, createdAt
  - Step 2: Returns only the 5 most recent transactions
  - Step 3: Transactions are ordered by descending (most recent first)

---

**TC-POIN-007: Points balance display query**
- **Priority**: P0
- **Category**: Functional
- **Preconditions**: Premium user with pointsBalance: totalPoints=2000, availablePoints=1500, pointsUsed=500, tier="silver", tierProgress=25, earningScansThisMonth=3
- **Steps**:
  1. Call getPointsBalance query
  2. Verify all computed fields
- **Expected**:
  - Step 1: Query resolves successfully
  - Step 2: Response includes: all balance fields spread, canEarnMore=true (3 < 5 for Silver premium), nextTierInfo={ nextTier: "gold", scansToNextTier: 25 }, effectiveDiscount=1.5 (1500/1000), monthlyEarningCap=875, maxEarningScans=5, isPremium=true

---

**TC-POIN-008: Points expiry (12 months after earning)**
- **Priority**: P1
- **Category**: Functional
- **Preconditions**: User has earn transactions from 13 months ago (older than 12 months) totaling 500 points; user's availablePoints=800
- **Steps**:
  1. expireOldPoints cron job runs
  2. Verify expired amount
  3. Verify balance update
  4. Verify expiry transaction created
- **Expected**:
  - Step 1: Cron queries pointsTransactions with createdAt < oneYearAgo; filters for type="earn" or "bonus"
  - Step 2: 500 points identified for expiry; since availablePoints (800) > points to expire (500), toExpire = 500
  - Step 3: processExpirePoints patches balance: availablePoints = 800 - 500 = 300
  - Step 4: Transaction inserted with type="expire", amount=-500, source="12_month_expiration", balanceBefore=800, balanceAfter=300

---

**TC-POIN-009: Expiry warning (30 days before)**
- **Priority**: P1
- **Category**: Functional
- **Preconditions**: User has earn transactions from 11 months and 5 days ago (within the 30-day warning window) totaling 300 points
- **Steps**:
  1. Call getExpiringPoints query
  2. Verify the expiring amount
  3. Verify the expiry date
- **Expected**:
  - Step 1: Query filters transactions where createdAt is between 12 months ago and 11 months ago, and type is "earn" or "bonus"
  - Step 2: Returns amount=300 (sum of qualifying transactions)
  - Step 3: expiresAt = earliest qualifying transaction's createdAt + 365 days; this falls within 25 days from now

---

**TC-POIN-010: Points redemption (500 minimum, Stripe invoice)**
- **Priority**: P0
- **Category**: Functional
- **Preconditions**: User has availablePoints=1200; valid invoiceId and stripeInvoiceItemId
- **Steps**:
  1. Call redeemPoints with points=750, invoiceId, stripeInvoiceItemId
  2. Verify balance update
  3. Verify transaction record
- **Expected**:
  - Step 1: Mutation executes; 750 >= 500 minimum passes; 750 <= 1200 available passes
  - Step 2: Balance patched: availablePoints = 1200 - 750 = 450, pointsUsed = existing + 750
  - Step 3: Transaction inserted with type="redeem", amount=-750, source="invoice_credit", invoiceId and stripeInvoiceItemId set, balanceBefore=1200, balanceAfter=450

---

**TC-POIN-011: Points redemption rejected (below 500 minimum)**
- **Priority**: P1
- **Category**: Negative
- **Preconditions**: User has availablePoints=1000
- **Steps**:
  1. Call redeemPoints with points=400
  2. Verify error
  3. Verify balance is unchanged
- **Expected**:
  - Step 1: Mutation checks 400 < 500
  - Step 2: Throws ConvexError("Minimum redemption is 500 points")
  - Step 3: No balance update; no transaction created

---

**TC-POIN-012: Points redemption rejected (insufficient balance)**
- **Priority**: P1
- **Category**: Negative
- **Preconditions**: User has availablePoints=300
- **Steps**:
  1. Call redeemPoints with points=500
  2. Verify error
- **Expected**:
  - Step 1: Mutation checks 300 < 500 (requested)
  - Step 2: Throws ConvexError("Insufficient points"); no balance change

---

**TC-POIN-013: Achievement unlock (Rewards Pioneer - first points earned)**
- **Priority**: P1
- **Category**: Functional
- **Preconditions**: User has never earned points; no achievements of type "rewards_pioneer"
- **Steps**:
  1. Call processEarnPoints for the first receipt scan
  2. Verify checkPointsAchievements is called
  3. Verify achievement record
  4. Verify notification
- **Expected**:
  - Step 1: Points earned successfully; checkPointsAchievements internal mutation is scheduled with userId, totalPoints > 0, currentTier
  - Step 2: checkPointsAchievements checks totalPoints >= 1 (rewards_pioneer threshold)
  - Step 3: Achievement record inserted: type="rewards_pioneer", title="Rewards Pioneer", description="Earned your first points", icon="star-circle", unlockedAt=now
  - Step 4: Notification created: type="achievement_unlocked", title="Achievement Unlocked!", body="Rewards Pioneer: Earned your first points"

---

**TC-POIN-014: Achievement unlock (Top Tier - Platinum reached)**
- **Priority**: P2
- **Category**: Functional
- **Preconditions**: User has tierProgress=99 (one scan from Platinum); no "top_tier" achievement
- **Steps**:
  1. Call processEarnPoints to push tierProgress to 100
  2. Verify tier promotion to Platinum
  3. Verify checkPointsAchievements detects Platinum
  4. Verify Top Tier achievement created
- **Expected**:
  - Step 1: tierProgress becomes 100; getTierFromScans(100) returns Platinum
  - Step 2: balance.tier updated to "platinum"
  - Step 3: checkPointsAchievements receives currentTier="platinum"
  - Step 4: Achievement inserted: type="top_tier", title="Top Tier", description="Reached Platinum scan tier", icon="crown"

---

**TC-POIN-015: Streak bonus (3 consecutive weeks)**
- **Priority**: P1
- **Category**: Functional
- **Preconditions**: User has streakCount=2, lastStreakScan set to last week; scanning this week will make 3 consecutive
- **Steps**:
  1. Call processEarnPoints this week
  2. Verify streak count incremented
  3. Verify streak bonus awarded
  4. Verify separate bonus transaction
- **Expected**:
  - Step 1: currentWeek = lastWeek + 1 so newStreakCount = 2 + 1 = 3
  - Step 2: balance.streakCount patched to 3; lastStreakScan updated to now
  - Step 3: streakBonus = 50 (for 3-week streak); totalEarnedThisScan = base points + 50
  - Step 4: Separate pointsTransactions record inserted with type="bonus", amount=50, source="streak_bonus_3_weeks"

---

**TC-POIN-016: Streak reset on missed week**
- **Priority**: P1
- **Category**: Functional
- **Preconditions**: User has streakCount=5, lastStreakScan set to 3 weeks ago (missed 2 weeks)
- **Steps**:
  1. Call processEarnPoints with a new receipt
  2. Verify streak count
  3. Verify no streak bonus
- **Expected**:
  - Step 1: currentWeek > lastWeek + 1 (gap of 2+ weeks)
  - Step 2: newStreakCount is reset to 1 (streak broken)
  - Step 3: No streakBonus awarded (only awarded at milestones 3, 4, 8, 12 and streak was reset to 1)

---

**TC-POIN-017: Weekly challenge completion awards bonus points**
- **Priority**: P1
- **Category**: Functional
- **Preconditions**: User has an active weekly challenge: type="scan_receipts", target=3, progress=2, reward=15; challenge is not expired
- **Steps**:
  1. Call updateChallengeProgress with increment=1
  2. Verify progress update
  3. Verify challenge marked completed
  4. Verify bonus points awarded
  5. Verify achievement check for first challenge
  6. Verify notification
- **Expected**:
  - Step 1: newProgress = min(2 + 1, 3) = 3; completed = (3 >= 3) = true
  - Step 2: Challenge patched with progress=3
  - Step 3: completedAt set to Date.now()
  - Step 4: awardBonusPoints called with amount=15, source="challenge_completion", metadata includes challengeId and idempotencyKey
  - Step 5: If no "first_challenge" achievement exists, one is created: type="first_challenge", title="Challenge Accepted", description="Completed your first weekly challenge"
  - Step 6: Notification created: type="challenge_completed", title="Challenge Complete!", body includes challenge title and "+15 points!"

---

**TC-POIN-018: Challenge auto-complete when target reached**
- **Priority**: P1
- **Category**: Boundary
- **Preconditions**: Active challenge with target=3, progress=1
- **Steps**:
  1. Call updateChallengeProgress with increment=5 (overshooting the target)
  2. Verify progress is capped
  3. Verify completion
- **Expected**:
  - Step 1: newProgress = min(1 + 5, 3) = 3 (capped at target)
  - Step 2: progress patched to 3, not 6
  - Step 3: completed = true; completedAt set; bonus points awarded; notification sent

---

**TC-POIN-019: Fraud prevention (duplicate receipt detection and refund)**
- **Priority**: P0
- **Category**: Security
- **Preconditions**: User previously scanned receipt R1 and earned 150 points; receipt R1 is now flagged as fraudulent
- **Steps**:
  1. Call refundPoints with userId, receiptId=R1, points=150
  2. Verify balance update
  3. Verify tier regression
  4. Verify refund transaction
- **Expected**:
  - Step 1: refundPoints executes; balance found
  - Step 2: totalPoints = max(0, previous - 150); availablePoints = max(0, previous - 150)
  - Step 3: tierProgress = max(0, previous - 1); new tier recalculated via getTierFromScans(newTierProgress)
  - Step 4: Transaction inserted: type="refund", amount=-150, source="receipt_deleted_or_fraud", receiptId=R1

---

**TC-POIN-020: Idempotent points earning (duplicate receipt scan)**
- **Priority**: P0
- **Category**: Security
- **Preconditions**: User has already earned points for receipt R1 (pointsTransactions record exists with receiptId=R1 and type="earn")
- **Steps**:
  1. Call processEarnPoints with the same receiptId=R1
  2. Verify no duplicate points awarded
  3. Verify balance unchanged
- **Expected**:
  - Step 1: processEarnPoints queries pointsTransactions by_receipt_and_type index; finds existing earn record
  - Step 2: Returns { earned: false, reason: "already_earned" } immediately
  - Step 3: No balance patch; no new transaction; total points and available points remain the same

---

## SUITE 11: Insights (TC-INSI-001 to TC-INSI-016)

---

**TC-INSI-001: Insights modal screen loads all cards**
- **Priority**: P0
- **Category**: Functional
- **Preconditions**: User is authenticated with receipts, completed lists, streaks, achievements, and challenges data
- **Steps**:
  1. Navigate to the insights screen from the app
  2. Observe the screen structure
  3. Scroll through all cards
- **Expected**:
  - Step 1: Insights screen loads without errors
  - Step 2: Screen displays multiple insight cards in a scrollable layout
  - Step 3: Cards visible include: Weekly Digest, Weekly Challenge, Savings Jar, Monthly Trends, Budget Adherence, Streaks, Personal Bests, Achievements; all render with data

---

**TC-INSI-002: Weekly digest card (narrative, savings, deals, health score)**
- **Priority**: P0
- **Category**: Functional
- **Preconditions**: User has 5 receipts this week totaling 87.50, and 3 receipts last week totaling 62.30; 2 completed lists this week with total budget of 100 and total actual spend of 78
- **Steps**:
  1. Call getWeeklyDigest query
  2. Verify spending totals
  3. Verify percent change
  4. Verify budget savings
  5. Verify sparkline data
  6. Verify trip count and completed lists
- **Expected**:
  - Step 1: Query resolves successfully
  - Step 2: thisWeekTotal = 87.50; lastWeekTotal = 62.30
  - Step 3: percentChange = ((87.50 - 62.30) / 62.30) * 100 = ~40.4% (rounded to 1 decimal)
  - Step 4: budgetSaved = 100 - 78 = 22.00 (positive, so returned)
  - Step 5: dailySparkline is an array of 7 numbers representing daily spending for the last 7 days; each value rounded to 2 decimal places
  - Step 6: tripsCount = 5; completedLists = 2

---

**TC-INSI-003: Weekly digest top categories**
- **Priority**: P1
- **Category**: Functional
- **Preconditions**: User has receipts this week with items categorized as Produce (25.00), Dairy (18.50), Meat (15.00), Bakery (12.00), Snacks (8.00), Drinks (6.00), Household (3.00)
- **Steps**:
  1. Call getWeeklyDigest query
  2. Verify topCategories array
- **Expected**:
  - Step 1: Query resolves
  - Step 2: topCategories contains at most 6 entries sorted by total descending: [{category: "Produce", total: 25.00}, {category: "Dairy", total: 18.50}, {category: "Meat", total: 15.00}, {category: "Bakery", total: 12.00}, {category: "Snacks", total: 8.00}, {category: "Drinks", total: 6.00}]; "Household" (3.00) is excluded as 7th

---

**TC-INSI-004: Weekly challenge card (active challenge display)**
- **Priority**: P1
- **Category**: Functional
- **Preconditions**: User has an active weekly challenge: type="scan_receipts", title="Receipt Collector", target=3, progress=1, reward=15, endDate is 4 days from now
- **Steps**:
  1. Call getActiveChallenge query
  2. Verify challenge data returned
  3. Verify non-expired and non-completed check
- **Expected**:
  - Step 1: Query resolves
  - Step 2: Returns the active challenge object with title="Receipt Collector", description="Scan 3 receipts this week", icon="camera", target=3, progress=1, reward=15
  - Step 3: endDate >= today and completedAt is undefined, so it qualifies as active

---

**TC-INSI-005: Weekly challenge generation (new challenge)**
- **Priority**: P1
- **Category**: Functional
- **Preconditions**: User has no active weekly challenge (all previous challenges are either completed or expired)
- **Steps**:
  1. Call generateChallenge mutation
  2. Verify a challenge is created
  3. Verify challenge properties
  4. Call generateChallenge again immediately
- **Expected**:
  - Step 1: Mutation checks for existing active challenge (none found)
  - Step 2: New weeklyChallenges record inserted; one of 5 templates selected randomly
  - Step 3: Challenge has: userId, type (one of scan_receipts/under_budget/complete_lists/add_items/save_money), title, description, icon, target, progress=0, reward (10-25), startDate=today, endDate=today+7days
  - Step 4: Returns the existing active challenge created in step 2 (does not create a duplicate)

---

**TC-INSI-006: Savings jar card (total savings, visual progress)**
- **Priority**: P1
- **Category**: Functional
- **Preconditions**: User has 10 completed lists with budgets; 7 had spending under budget with total savings of 134.56
- **Steps**:
  1. Call getSavingsJar query
  2. Verify total savings calculation
  3. Verify milestone progress
- **Expected**:
  - Step 1: Query resolves
  - Step 2: totalSaved=134.56, tripsCount=7 (only under-budget trips), averageSaved=134.56/7=19.22
  - Step 3: nextMilestone=200 (134.56 > 100 but < 200); prevMilestone=100; milestoneProgress = ((134.56 - 100) / (200 - 100)) * 100 = 34.56 rounded to 35%

---

**TC-INSI-007: Monthly trends card (spending over 6 months)**
- **Priority**: P1
- **Category**: Functional
- **Preconditions**: User has receipts spanning 4 months within the last 6 months
- **Steps**:
  1. Call getMonthlyTrends query
  2. Verify months array
  3. Verify month-over-month change calculation
- **Expected**:
  - Step 1: Query resolves
  - Step 2: months array contains 4 entries, one per month with receipts; each entry has month (YYYY-MM format), label (e.g., "Jan 26"), total (rounded to 2 decimals), trips count
  - Step 3: First month has change=0; subsequent months have change = ((current - previous) / previous) * 100, rounded to 1 decimal

---

**TC-INSI-008: Monthly trends category breakdown (pie chart data)**
- **Priority**: P1
- **Category**: Functional
- **Preconditions**: User has receipts in the last 6 months with items in 8 categories
- **Steps**:
  1. Call getMonthlyTrends query
  2. Verify categoryBreakdown array
- **Expected**:
  - Step 1: Query resolves
  - Step 2: categoryBreakdown contains at most 6 entries (top 6 by total spending), sorted descending by total; each entry has category name and total (rounded to 2 decimals); remaining categories beyond top 6 are excluded

---

**TC-INSI-009: Budget adherence card (budget vs actual, per-trip breakdown)**
- **Priority**: P1
- **Category**: Functional
- **Preconditions**: User has 8 completed lists with budgets in the last 6 months; 5 were under budget, 3 were over budget
- **Steps**:
  1. Call getMonthlyTrends query
  2. Verify budgetAdherence object
- **Expected**:
  - Step 1: Query resolves
  - Step 2: budgetAdherence = { underBudget: 5, overBudget: 3, total: 8 }; each list's actual spend is calculated as sum of (actualPrice or estimatedPrice) * quantity for all items; compared against list.budget

---

**TC-INSI-010: Streaks card display**
- **Priority**: P1
- **Category**: Functional
- **Preconditions**: User has 3 streak records: type="receipt_scanning" (currentCount=5, longestCount=12), type="item_adding" (currentCount=2, longestCount=8), type="list_completion" (currentCount=0, longestCount=3)
- **Steps**:
  1. Call getStreaks query
  2. Verify all streaks returned
  3. Verify streak data
- **Expected**:
  - Step 1: Query resolves
  - Step 2: Returns array of 3 streak objects
  - Step 3: Each streak has: userId, type, currentCount, longestCount, lastActivityDate, startedAt, updatedAt

---

**TC-INSI-011: Streak update and continuation**
- **Priority**: P1
- **Category**: Functional
- **Preconditions**: User has existing streak type="receipt_scanning" with currentCount=4, lastActivityDate=yesterday
- **Steps**:
  1. Call updateStreak with type="receipt_scanning"
  2. Verify streak incremented
  3. Call updateStreak again on the same day
  4. Verify no duplicate increment
- **Expected**:
  - Step 1: Mutation finds existing streak; lastActivityDate is yesterday
  - Step 2: currentCount = 4 + 1 = 5; longestCount = max(5, existing longest); lastActivityDate updated to today
  - Step 3: Mutation detects lastDate === today
  - Step 4: Returns existing streak unchanged (no increment for same-day activity)

---

**TC-INSI-012: Streak reset on missed day**
- **Priority**: P1
- **Category**: Functional
- **Preconditions**: User has streak type="item_adding" with currentCount=10, lastActivityDate=3 days ago
- **Steps**:
  1. Call updateStreak with type="item_adding"
  2. Verify streak reset
  3. Verify longestCount preserved
- **Expected**:
  - Step 1: Mutation finds existing streak; lastActivityDate is NOT yesterday (3 days gap)
  - Step 2: currentCount reset to 1 (new streak started)
  - Step 3: longestCount = max(1, existing longestCount) so longestCount remains 10 (or whatever was the longest)

---

**TC-INSI-013: Personal bests card**
- **Priority**: P2
- **Category**: Functional
- **Preconditions**: User has 15 completed lists with various budgets and item counts; streaks with longest=12
- **Steps**:
  1. Call getPersonalBests query
  2. Verify biggest saving
  3. Verify longest streak
  4. Verify most items in trip
  5. Verify cheapest trip
- **Expected**:
  - Step 1: Query resolves
  - Step 2: biggestSaving = max savings across all completed lists with budgets (budget - actual spend), rounded to 2 decimals
  - Step 3: longestStreak = 12 (max longestCount across all streaks)
  - Step 4: mostItemsInTrip = max item count across all completed lists
  - Step 5: cheapestTrip = minimum non-zero actual spend across all completed lists; totalTrips = 15

---

**TC-INSI-014: Achievements card (unlocked badges)**
- **Priority**: P1
- **Category**: Functional
- **Preconditions**: User has 4 unlocked achievements: rewards_pioneer, store_explorer, first_challenge, streak_receipt_scanning_7
- **Steps**:
  1. Call getAchievements query
  2. Verify all achievements returned
  3. Verify achievement properties
- **Expected**:
  - Step 1: Query resolves
  - Step 2: Returns array of 4 achievement objects
  - Step 3: Each achievement has: userId, type, title, description, icon, unlockedAt; types match expected values

---

**TC-INSI-015: Empty state (no data yet)**
- **Priority**: P1
- **Category**: Edge Case
- **Preconditions**: New user with no receipts, no completed lists, no streaks, no achievements, no challenges
- **Steps**:
  1. Call getWeeklyDigest
  2. Call getMonthlyTrends
  3. Call getSavingsJar
  4. Call getPersonalBests
  5. Call getStreaks
  6. Call getAchievements
  7. Call getActiveChallenge
- **Expected**:
  - Step 1: Returns thisWeekTotal=0, lastWeekTotal=0, percentChange=0, tripsCount=0, completedLists=0, budgetSaved=0, topCategories=[], dailySparkline=[0,0,0,0,0,0,0]
  - Step 2: Returns { months: [], categoryBreakdown: [], budgetAdherence: { underBudget: 0, overBudget: 0, total: 0 } }
  - Step 3: Returns { totalSaved: 0, tripsCount: 0, averageSaved: 0, nextMilestone: 50, milestoneProgress: 0 }
  - Step 4: Returns { biggestSaving: 0, longestStreak: 0, mostItemsInTrip: 0, cheapestTrip: 0, totalTrips: 0 }
  - Step 5: Returns empty array []
  - Step 6: Returns empty array []
  - Step 7: Returns null

---

**TC-INSI-016: Data refresh and loading states**
- **Priority**: P1
- **Category**: Functional
- **Preconditions**: User is authenticated; Convex queries are connected via real-time subscriptions
- **Steps**:
  1. Navigate to insights screen
  2. Observe initial loading state
  3. Queries resolve with data
  4. User scans a new receipt in another tab/flow
  5. Return to insights screen
- **Expected**:
  - Step 1: Insights screen renders
  - Step 2: Skeleton cards or loading indicators are shown while queries are undefined
  - Step 3: Loading states replaced with actual data cards once all queries resolve
  - Step 4: New receipt data is persisted in the database
  - Step 5: Convex real-time subscriptions automatically update the queries; weekly digest, monthly trends, and other cards reflect the new receipt data without manual refresh

---

## SUITE 12: Partner/Sharing (TC-PART-001 to TC-PART-020)

---

**TC-PART-001: Create invite code (6 alphanumeric, 7-day expiry)**
- **Priority**: P0
- **Category**: Functional
- **Preconditions**: Premium user (partnerMode enabled) who owns shopping list L1
- **Steps**:
  1. Call createInviteCode mutation with listId=L1
  2. Verify feature gating check
  3. Verify ownership check
  4. Verify invite code record
- **Expected**:
  - Step 1: Mutation executes successfully
  - Step 2: requireFeature checks partnerMode; returns allowed=true for premium user
  - Step 3: List ownership verified (list.userId === user._id)
  - Step 4: inviteCodes record inserted with: code = 6-character uppercase alphanumeric string, listId=L1, createdBy=user._id, role="member", expiresAt = now + 7 days (604800000ms), isActive=true; returns { code, expiresAt }

---

**TC-PART-002: Share invite via SMS/messaging (copy code)**
- **Priority**: P1
- **Category**: Functional
- **Preconditions**: Premium user has generated invite code "ABC123" for list L1
- **Steps**:
  1. Invite code is displayed in the UI
  2. User taps share/copy button
  3. Verify code is available for sharing
- **Expected**:
  - Step 1: Invite code "ABC123" and expiry date are displayed clearly
  - Step 2: Code is copied to clipboard or share sheet is presented with the invite code text
  - Step 3: Invite code text is in the clipboard/share content, ready to be pasted or sent via SMS/messaging

---

**TC-PART-003: Copy invite code to clipboard**
- **Priority**: P2
- **Category**: Functional
- **Preconditions**: Invite code "XYZ789" has been generated and is displayed on screen
- **Steps**:
  1. User taps the copy-to-clipboard button/icon next to the invite code
  2. Observe feedback
  3. User pastes in another app
- **Expected**:
  - Step 1: Clipboard API is called with "XYZ789"
  - Step 2: Haptic feedback fires; visual confirmation (toast or icon change) indicates successful copy
  - Step 3: Pasted text is "XYZ789"

---

**TC-PART-004: Accept invite to join shared list**
- **Priority**: P0
- **Category**: Functional
- **Preconditions**: User B is authenticated; User A has generated valid invite code "ABC123" for list L1; code is active and not expired
- **Steps**:
  1. User B navigates to join-list screen
  2. User B enters invite code "ABC123"
  3. Call acceptInvite mutation with code="ABC123"
  4. Verify partner record created
  5. Verify invite marked as used
  6. Verify owner notification
- **Expected**:
  - Step 1: Join-list screen loads with a text input for the invite code
  - Step 2: Code is entered and submit button is tapped
  - Step 3: Mutation finds inviteCode record with code="ABC123"; validates isActive=true and expiresAt > now
  - Step 4: listPartners record inserted with: listId=L1, userId=User B's ID, role="member", invitedBy=User A's ID, invitedAt=now, acceptedAt=now, status="accepted"
  - Step 5: inviteCodes record patched: usedBy=User B's ID, usedAt=now, isActive=false
  - Step 6: Notification inserted for User A: type="partner_joined", title="New Partner", body='User B joined your list "List Name"'

---

**TC-PART-005: Enter invite code manually**
- **Priority**: P1
- **Category**: Functional
- **Preconditions**: User B is authenticated; valid invite code exists
- **Steps**:
  1. Navigate to join-list screen
  2. Observe the code input field
  3. Type invite code character by character
  4. Submit the code
- **Expected**:
  - Step 1: Screen renders with a text input
  - Step 2: Input field accepts alphanumeric characters; may auto-capitalize
  - Step 3: Code is accepted as typed; UI may format or trim whitespace
  - Step 4: acceptInvite mutation is called with the entered code; if valid, partner is added to the list

---

**TC-PART-006: Partner permissions (Owner has full access)**
- **Priority**: P0
- **Category**: Functional
- **Preconditions**: User A owns list L1; list status is "active"
- **Steps**:
  1. Call getUserListPermissions for User A on list L1
  2. Verify all permission fields
- **Expected**:
  - Step 1: Function resolves
  - Step 2: Returns { isOwner: true, isPartner: false, role: null, canView: true, canEdit: true }

---

**TC-PART-007: Partner permissions (Partner has edit but no remove)**
- **Priority**: P0
- **Category**: Functional
- **Preconditions**: User B is an accepted partner on list L1 (owned by User A); list status is "active"
- **Steps**:
  1. Call getUserListPermissions for User B on list L1
  2. Verify permission fields
  3. User B attempts to call removePartner on another partner
- **Expected**:
  - Step 1: Function resolves
  - Step 2: Returns { isOwner: false, isPartner: true, role: "member", canView: true, canEdit: true }
  - Step 3: removePartner checks list.userId !== User B; throws Error("Unauthorized") because only the owner can remove partners

---

**TC-PART-008: Owner can remove partners**
- **Priority**: P0
- **Category**: Functional
- **Preconditions**: User A owns list L1; User B is an accepted partner (listPartners record ID = P1)
- **Steps**:
  1. Call removePartner mutation with partnerId=P1 as User A
  2. Verify ownership check
  3. Verify partner record deleted
  4. Query getByList for L1
- **Expected**:
  - Step 1: Mutation executes
  - Step 2: list.userId === User A's ID; authorization passes
  - Step 3: listPartners record P1 is deleted from the database
  - Step 4: getByList returns list without User B

---

**TC-PART-009: Partner can leave list (permanent, must re-invite)**
- **Priority**: P0
- **Category**: Functional
- **Preconditions**: User B is an accepted partner on list L1 (owned by User A)
- **Steps**:
  1. Call leaveList mutation with listId=L1 as User B
  2. Verify partner record deleted
  3. Verify owner notification
  4. User B queries getSharedLists
  5. User B tries to access list L1 items
- **Expected**:
  - Step 1: Mutation finds listPartners record for User B on L1
  - Step 2: listPartners record is deleted from the database
  - Step 3: Notification inserted for User A: type="partner_left", title="Partner Left", body='User B left your list "List Name"'
  - Step 4: getSharedLists no longer includes L1 for User B
  - Step 5: getUserListPermissions returns canView=false; User B cannot see list items

---

**TC-PART-010: Per-item comments (timestamps, notification to participants)**
- **Priority**: P1
- **Category**: Functional
- **Preconditions**: List L1 owned by User A, with User B and User C as accepted partners; list has item I1 ("Milk")
- **Steps**:
  1. Call addComment mutation as User B with listItemId=I1, text="Get semi-skimmed please"
  2. Verify comment record created
  3. Verify notifications sent to other participants
  4. Call getComments for item I1
- **Expected**:
  - Step 1: Mutation verifies User B has access via getUserListPermissions (canView=true)
  - Step 2: itemComments record inserted: listItemId=I1, userId=User B, text="Get semi-skimmed please", createdAt=now
  - Step 3: Notifications created for User A and User C (not User B): type="comment_added", title="New Comment", body='User B commented on "Milk"', data includes listId and listItemId
  - Step 4: Returns enriched comments array with userName and avatarUrl for each comment; ordered by descending createdAt

---

**TC-PART-011: Comment counts (batch query)**
- **Priority**: P2
- **Category**: Functional
- **Preconditions**: List L1 has items I1 (3 comments), I2 (0 comments), I3 (5 comments); User has access to L1
- **Steps**:
  1. Call getCommentCounts with listItemIds=[I1, I2, I3]
  2. Verify counts
- **Expected**:
  - Step 1: Query verifies access via first item's list
  - Step 2: Returns { [I1._id]: 3, [I2._id]: 0, [I3._id]: 5 }

---

**TC-PART-012: List-wide messages/chat**
- **Priority**: P1
- **Category**: Functional
- **Preconditions**: List L1 owned by User A with User B as partner
- **Steps**:
  1. Call addListMessage as User B with listId=L1, text="I'm heading to Tesco now"
  2. Verify message record created
  3. Verify notification to User A
  4. Call getListMessages for L1
  5. Call getListMessageCount for L1
- **Expected**:
  - Step 1: Mutation verifies User B has access (canView=true)
  - Step 2: listMessages record inserted: listId=L1, userId=User B, text="I'm heading to Tesco now", createdAt=now
  - Step 3: Notification to User A: type="list_message", title="New Message", body='User B in "List Name": I'm heading to Tesco now'
  - Step 4: Returns enriched messages array with userName and avatarUrl, ordered ascending by createdAt (chat order)
  - Step 5: Returns the total number of messages for L1

---

**TC-PART-013: Real-time updates when partner edits**
- **Priority**: P1
- **Category**: Integration
- **Preconditions**: User A and User B both have the list L1 detail screen open; Convex real-time subscriptions active
- **Steps**:
  1. User B adds a new item "Bread" to list L1
  2. Observe User A's screen
  3. User A checks off an item
  4. Observe User B's screen
- **Expected**:
  - Step 1: Item "Bread" is inserted into listItems with listId=L1
  - Step 2: User A's query subscription for list items auto-updates; "Bread" appears in User A's list view without refresh
  - Step 3: Item is toggled; purchasedAtStoreId/Name are set
  - Step 4: User B's query subscription reflects the checked-off item in real-time

---

**TC-PART-014: Notification on partner activity**
- **Priority**: P1
- **Category**: Functional
- **Preconditions**: List L1 owned by User A with partners User B and User C
- **Steps**:
  1. User B adds a comment on item I1
  2. User C sends a list message
  3. Check notifications for User A
  4. Check notifications for User B (from User C's message)
- **Expected**:
  - Step 1: Notifications created for User A and User C with type="comment_added"
  - Step 2: Notifications created for User A and User B with type="list_message"
  - Step 3: User A has 2 notifications (one comment, one message)
  - Step 4: User B has 1 notification (from User C's message); User B does NOT receive a notification for their own comment

---

**TC-PART-015: Multiple partners on one list**
- **Priority**: P1
- **Category**: Functional
- **Preconditions**: User A owns list L1; Users B, C, and D have all accepted invites to L1
- **Steps**:
  1. Call getByList for L1
  2. Verify all partners listed
  3. Each partner calls getMyPermissions for L1
- **Expected**:
  - Step 1: Query resolves
  - Step 2: Returns 3 enriched partner records (Users B, C, D) with userName and avatarUrl for each
  - Step 3: Each partner gets { isOwner: false, isPartner: true, role: "member", canView: true, canEdit: true }

---

**TC-PART-016: Expired invite code (after 7 days)**
- **Priority**: P0
- **Category**: Negative
- **Preconditions**: Invite code "OLD123" was created 8 days ago; expiresAt is in the past; isActive=true (not yet used)
- **Steps**:
  1. User B calls acceptInvite with code="OLD123"
  2. Verify error
  3. Verify no partner record created
- **Expected**:
  - Step 1: Mutation finds invite code; checks invite.expiresAt < Date.now() (expired)
  - Step 2: Throws Error("Invalid or expired invite code")
  - Step 3: No listPartners record inserted; invite code remains unchanged

---

**TC-PART-017: Invalid invite code**
- **Priority**: P0
- **Category**: Negative
- **Preconditions**: No invite code "FAKE99" exists in the database
- **Steps**:
  1. User B calls acceptInvite with code="FAKE99"
  2. Verify error
- **Expected**:
  - Step 1: Query for inviteCodes by_code with "FAKE99" returns null
  - Step 2: Throws Error("Invalid or expired invite code")

---

**TC-PART-018: Re-invite after partner leaves**
- **Priority**: P1
- **Category**: Functional
- **Preconditions**: User B was previously a partner on L1 but called leaveList; their listPartners record was deleted
- **Steps**:
  1. User A creates a new invite code for L1
  2. User B calls acceptInvite with the new code
  3. Verify User B is re-added
  4. Call getByList for L1
- **Expected**:
  - Step 1: New inviteCodes record created; returns { code, expiresAt }
  - Step 2: acceptInvite checks for existing partner record for User B on L1; none found (was deleted); creates new listPartners record
  - Step 3: New listPartners record: listId=L1, userId=User B, role="member", status="accepted"
  - Step 4: getByList includes User B again with enriched user data

---

**TC-PART-019: Premium-only feature (free users see upgrade prompt)**
- **Priority**: P0
- **Category**: Functional
- **Preconditions**: User A is on Free plan (partnerMode=false in getFreeFeatures)
- **Steps**:
  1. User A calls createInviteCode for their list L1
  2. Verify feature gating blocks the action
  3. Verify error message suggests upgrade
- **Expected**:
  - Step 1: createInviteCode calls requireFeature(ctx, userId, "partnerMode")
  - Step 2: requireFeature checks features.partnerMode which is false for free plan; returns { allowed: false, reason: "partnerMode requires a Premium subscription..." }
  - Step 3: Mutation throws Error with the reason message indicating upgrade to Premium is required

---

**TC-PART-020: Partner permissions on completed/archived list (read-only)**
- **Priority**: P1
- **Category**: Edge Case
- **Preconditions**: List L1 is owned by User A with User B as partner; list status is "completed"
- **Steps**:
  1. Call getUserListPermissions for User A on L1
  2. Call getUserListPermissions for User B on L1
  3. User B attempts to add an item to L1
  4. User B attempts to view items on L1
- **Expected**:
  - Step 1: Returns { isOwner: true, isPartner: false, role: null, canView: true, canEdit: false } (isLocked=true because status="completed")
  - Step 2: Returns { isOwner: false, isPartner: true, role: "member", canView: true, canEdit: false } (isLocked=true)
  - Step 3: Edit operation is blocked because canEdit=false; mutation should reject the write
  - Step 4: View operation succeeds because canView=true; items are returned as read-only
---

## SUITE 13: Admin Dashboard (TC-ADMN-001 to TC-ADMN-040)

### 13.1 Access Control & Authentication

**TC-ADMN-001: Admin route access with isAdmin=true**
- **Priority**: P0
- **Category**: Functional
- **Preconditions**: User is authenticated with `isAdmin=true` flag on their users record
- **Steps**:
  1. Navigate to `/admin` route
  2. Wait for the admin dashboard to render
  3. Observe the page content
- **Expected**:
  - Step 1: Route resolves without redirect
  - Step 2: AdminTabBar renders with 10 tab icons visible (overview, users, analytics, support, monitoring, receipts, catalog, settings, webhooks, points)
  - Step 3: Overview tab is shown as the default active tab with system health, analytics, revenue, and audit log widgets

**TC-ADMN-002: Non-admin user blocked from /admin**
- **Priority**: P0
- **Category**: Security
- **Preconditions**: User is authenticated with `isAdmin=false` and no `userRoles` entry
- **Steps**:
  1. Navigate directly to `/admin` route via URL
  2. Observe the response
- **Expected**:
  - Step 1: Route guard intercepts the navigation
  - Step 2: User is redirected away from the admin dashboard; `getMyPermissions` returns `null`; admin content is never rendered

**TC-ADMN-003: Unauthenticated user blocked from /admin**
- **Priority**: P0
- **Category**: Security
- **Preconditions**: No user session exists (logged out)
- **Steps**:
  1. Navigate directly to `/admin` route via URL
  2. Observe the response
- **Expected**:
  - Step 1: Auth guard intercepts before admin guard
  - Step 2: User is redirected to the auth/login screen; no admin queries are executed

**TC-ADMN-004: RBAC super_admin gets all permissions**
- **Priority**: P0
- **Category**: Functional
- **Preconditions**: User has `isAdmin=true` on their record
- **Steps**:
  1. Call `getMyPermissions` query
  2. Inspect the returned permissions array
- **Expected**:
  - Step 1: Query returns a result object
  - Step 2: Role is `"super_admin"` with displayName `"Super Administrator"` and permissions array contains all 10 permissions: `view_analytics`, `view_users`, `edit_users`, `view_receipts`, `delete_receipts`, `manage_catalog`, `manage_flags`, `manage_announcements`, `manage_pricing`, `view_audit_logs`

**TC-ADMN-005: RBAC moderator gets limited permissions**
- **Priority**: P1
- **Category**: Functional
- **Preconditions**: User is NOT `isAdmin=true` but has a `userRoles` entry mapping to a moderator role with permissions `view_receipts` and `view_analytics`
- **Steps**:
  1. Call `getMyPermissions` query
  2. Verify restricted tabs and actions on the dashboard
  3. Attempt to access Settings tab
- **Expected**:
  - Step 1: Returns role `"moderator"` with only `view_receipts` and `view_analytics` permissions
  - Step 2: Only Receipts and Analytics tabs show interactive content; Users tab hides edit controls
  - Step 3: Feature flags, announcements, and pricing sections are not rendered (gated by `manage_flags`, `manage_announcements`, `manage_pricing`)

**TC-ADMN-006: RBAC analyst gets read-only access**
- **Priority**: P1
- **Category**: Functional
- **Preconditions**: User has `userRoles` entry mapping to an analyst role with `view_analytics` permission only
- **Steps**:
  1. Navigate to admin dashboard
  2. Attempt to view Overview tab
  3. Attempt to toggle a feature flag
  4. Attempt to delete a receipt
- **Expected**:
  - Step 1: Dashboard loads with limited tab visibility
  - Step 2: Overview analytics data renders (read-only)
  - Step 3: Toggle control is not rendered; `manage_flags` permission check fails
  - Step 4: Delete button is not rendered; `delete_receipts` permission check fails

**TC-ADMN-007: MFA grace period status - within 14 days**
- **Priority**: P1
- **Category**: Functional
- **Preconditions**: Admin user with `mfaEnabled=false` and `adminGrantedAt` set to 5 days ago
- **Steps**:
  1. Call `getMfaGracePeriodStatus` query
  2. Inspect the response values
- **Expected**:
  - Step 1: Query executes successfully
  - Step 2: Returns `mfaEnabled: false`, `inGracePeriod: true`, `daysRemaining: 9`, `gracePeriodExpired: false`

**TC-ADMN-008: MFA grace period expired blocks access**
- **Priority**: P1
- **Category**: Security
- **Preconditions**: Admin user with `mfaEnabled=false` and `adminGrantedAt` set to 15 days ago (past 14-day grace)
- **Steps**:
  1. Call `getMfaGracePeriodStatus` query
  2. Inspect the response values
- **Expected**:
  - Step 1: Query executes successfully
  - Step 2: Returns `mfaEnabled: false`, `inGracePeriod: false`, `daysRemaining: 0`, `gracePeriodExpired: true`

### 13.2 Overview Tab

**TC-ADMN-009: Overview tab renders platform KPIs**
- **Priority**: P0
- **Category**: Functional
- **Preconditions**: Admin user on Overview tab; analytics, revenue, health, and financial queries return data
- **Steps**:
  1. Navigate to Overview tab
  2. Observe the analytics widget
  3. Observe the revenue widget
  4. Observe the system health widget
- **Expected**:
  - Step 1: Tab renders with date range picker and auto-refresh toggle
  - Step 2: MetricCards display Total Users, New (Week), Active (Week), Total Lists, Completed, Receipts; GMV value shown with segmented filter (Wk/Mth/Yr/All)
  - Step 3: Revenue widget shows MRR, ARR, monthly/annual subscribers, trials active, estimated net revenue, margin percentage, estimated tax and COGS
  - Step 4: System health widget shows green/yellow dot, status (HEALTHY/DEGRADED/DOWN), receipt success rate percentage, failed and processing counts

**TC-ADMN-010: Overview auto-refresh toggles correctly**
- **Priority**: P1
- **Category**: Functional
- **Preconditions**: Admin user on Overview tab; auto-refresh is enabled by default
- **Steps**:
  1. Observe the auto-refresh switch is ON
  2. Wait 30 seconds
  3. Toggle auto-refresh OFF
  4. Wait 30 seconds
- **Expected**:
  - Step 1: Switch shows enabled state; "Last refreshed" timestamp is visible
  - Step 2: RefreshKey updates; "Last refreshed" timestamp advances; data re-fetches
  - Step 3: Switch shows disabled state; haptic feedback triggers
  - Step 4: Timestamp does NOT advance; no automatic data re-fetch occurs

**TC-ADMN-011: Overview date range filter narrows data**
- **Priority**: P1
- **Category**: Functional
- **Preconditions**: Admin user on Overview tab with historical data spanning multiple months
- **Steps**:
  1. Set date range to last 7 days using GlassDateRangePicker
  2. Observe analytics and revenue widget values
  3. Clear the date range filter
  4. Observe values again
- **Expected**:
  - Step 1: Date range picker shows the selected range; haptic feedback fires
  - Step 2: All queries receive `dateFrom` and `dateTo` parameters; metrics reflect the narrow window only
  - Step 3: Date range resets to null; haptic feedback fires
  - Step 4: Metrics return to full unfiltered values (lifetime totals)

**TC-ADMN-012: Overview GMV segmented filter cycles through periods**
- **Priority**: P2
- **Category**: Functional
- **Preconditions**: Admin user on Overview tab; analytics data includes `gmvThisWeek`, `gmvThisMonth`, `gmvThisYear`, `totalGMV`
- **Steps**:
  1. Tap "Wk" segment
  2. Tap "Mth" segment
  3. Tap "Yr" segment
  4. Tap "All" segment
- **Expected**:
  - Step 1: GMV value shows `gmvThisWeek`; segment highlights; haptic triggers
  - Step 2: GMV value shows `gmvThisMonth`; segment highlights; haptic triggers
  - Step 3: GMV value shows `gmvThisYear`; segment highlights; haptic triggers
  - Step 4: GMV value shows `totalGMV`; segment highlights; haptic triggers

**TC-ADMN-013: Overview widget customization toggle visibility**
- **Priority**: P2
- **Category**: Functional
- **Preconditions**: Admin user on Overview tab with dashboard preferences loaded
- **Steps**:
  1. Tap the customize (tune-variant) icon
  2. Observe widget controls appear
  3. Toggle the "health" widget OFF
  4. Tap the customize icon again to exit customization mode
  5. Observe the dashboard
- **Expected**:
  - Step 1: Customization mode activates; icon changes to checkmark; haptic triggers
  - Step 2: Each widget shows up/down chevrons and a visibility switch
  - Step 3: Health widget switch flips OFF; `updateDashboardPreferences` mutation fires; health widget dims (opacity 0.5)
  - Step 4: Customization mode deactivates; icon returns to tune-variant
  - Step 5: Health widget is no longer visible in normal view

**TC-ADMN-014: Overview widget reorder up/down**
- **Priority**: P2
- **Category**: Functional
- **Preconditions**: Admin user on Overview tab in customization mode; widgets are in default order: health, analytics, revenue, audit_logs
- **Steps**:
  1. Tap the "down" chevron on the "health" widget
  2. Observe widget order
  3. Tap the "up" chevron on the "health" widget (now at index 1)
  4. Observe widget order
- **Expected**:
  - Step 1: `updateDashboardPreferences` mutation fires with reordered widgets; haptic triggers
  - Step 2: Widget order becomes: analytics, health, revenue, audit_logs
  - Step 3: `updateDashboardPreferences` mutation fires with reordered widgets; haptic triggers
  - Step 4: Widget order returns to: health, analytics, revenue, audit_logs

### 13.3 Users Tab

**TC-ADMN-015: Users tab search by email/name**
- **Priority**: P0
- **Category**: Functional
- **Preconditions**: Admin user on Users tab; users exist with known names and emails
- **Steps**:
  1. Type "john" into the search input
  2. Wait for 2+ characters to trigger the search query
  3. Observe the user list
  4. Clear the search field
- **Expected**:
  - Step 1: Search input accepts text; magnify icon visible
  - Step 2: `searchUsers` query fires with `searchTerm: "john"`
  - Step 3: List filters to only show users matching "john" in name or email; result count shown
  - Step 4: List returns to showing all paginated users (50 initial items)

**TC-ADMN-016: Users tab view user detail**
- **Priority**: P0
- **Category**: Functional
- **Preconditions**: Admin user on Users tab with users in the list
- **Steps**:
  1. Tap on a user row
  2. Observe the detail panel
  3. Tap "Activity" sub-tab
  4. Tap the close (X) button on the detail panel
- **Expected**:
  - Step 1: `selectedUser` state updates; haptic fires; `getUserDetail` query fires
  - Step 2: Detail panel appears showing: user name, email, Receipts count, Lists count, Spent amount, Points total, subscription plan/status, tier and lifetime scans
  - Step 3: ActivityTimeline component renders showing the user's event history
  - Step 4: Detail panel closes; `selectedUser` resets to null

**TC-ADMN-017: Users tab grant/revoke admin access**
- **Priority**: P0
- **Category**: Security
- **Preconditions**: Admin user with `edit_users` permission on Users tab; target user is not admin
- **Steps**:
  1. Tap the shield icon on a non-admin user row
  2. Observe the result
  3. Tap the shield icon again on the same (now admin) user
  4. Observe the result
- **Expected**:
  - Step 1: `toggleAdmin` mutation fires for the target user ID
  - Step 2: Success toast shows "Admin privileges granted"; shield icon changes to filled/check variant; success haptic fires
  - Step 3: `toggleAdmin` mutation fires again
  - Step 4: Success toast shows "Admin privileges revoked"; shield icon reverts to outline; success haptic fires

**TC-ADMN-018: Users tab suspend/unsuspend user**
- **Priority**: P0
- **Category**: Functional
- **Preconditions**: Admin user with `edit_users` permission viewing a user's detail panel; user is not suspended
- **Steps**:
  1. Tap the "Suspend" button (with account-off icon)
  2. Observe the result
  3. Re-open the user detail
  4. Tap the "Unsuspend" button (with account-check icon)
- **Expected**:
  - Step 1: `toggleSuspension` mutation fires with the user ID
  - Step 2: Warning haptic fires; toast shows "User status updated"; button label changes to "Unsuspend" with account-check icon
  - Step 3: Detail panel shows `suspended` state reflected in the button
  - Step 4: `toggleSuspension` mutation fires; user is unsuspended; button reverts to "Suspend"

**TC-ADMN-019: Users tab extend trial by 14 days**
- **Priority**: P1
- **Category**: Functional
- **Preconditions**: Admin user with `edit_users` permission viewing a user's detail panel; user is on trial
- **Steps**:
  1. Tap "+14d Trial" button
  2. Observe the confirmation alert
  3. Tap "Extend" in the alert
  4. Observe the result
- **Expected**:
  - Step 1: GlassAlert dialog appears with title "Extend Trial" and message "Add 14 days to trial?"
  - Step 2: Two buttons shown: "Cancel" and "Extend"
  - Step 3: `extendTrial` mutation fires with `userId` and `days: 14`
  - Step 4: Success haptic fires; toast shows "Trial extended"

**TC-ADMN-020: Users tab adjust points**
- **Priority**: P1
- **Category**: Functional
- **Preconditions**: Admin user with `edit_users` permission viewing a user's detail panel
- **Steps**:
  1. Tap "Adjust Pts" button
  2. Observe the alert dialog
  3. Tap "+500 pts"
  4. Observe the result
- **Expected**:
  - Step 1: GlassAlert dialog appears with title "Adjust Points"
  - Step 2: Three buttons shown: "Cancel", "+500 pts", "-500 pts"
  - Step 3: `adjustPoints` mutation fires with `amount: 500` and `reason: "Customer goodwill"`
  - Step 4: Toast shows "Added 500 points"

**TC-ADMN-021: Users tab impersonate user**
- **Priority**: P1
- **Category**: Functional
- **Preconditions**: Admin user with `edit_users` permission on Users tab
- **Steps**:
  1. Tap the incognito icon on a user row
  2. Observe the result dialog
  3. Tap "Copy Link"
  4. Tap "Done"
- **Expected**:
  - Step 1: `generateImpersonationToken` mutation fires with the target user ID
  - Step 2: Alert shows "Impersonation Ready" with a deep link URL (`oja://impersonate?token=...`) and note "This token expires in 1 hour"
  - Step 3: Toast shows "Link copied to clipboard"
  - Step 4: Alert dismisses

**TC-ADMN-022: Users tab bulk select and extend trials**
- **Priority**: P1
- **Category**: Functional
- **Preconditions**: Admin user with `bulk_operation` permission on Users tab; multiple users displayed
- **Steps**:
  1. Tap the checkbox on 3 user rows
  2. Observe the bulk actions bar
  3. Tap "+14d Trial" in the bulk actions bar
  4. Tap "Extend" in the confirmation alert
- **Expected**:
  - Step 1: Checkboxes fill for each selected user; haptic fires on each; background highlights
  - Step 2: Bulk actions bar appears showing "3 users selected" with "+14d Trial", "CSV", and close buttons
  - Step 3: Alert shows "Bulk Extend" with message "Add 14 days to trial for 3 users?"
  - Step 4: `bulkExtendTrial` mutation fires with all 3 user IDs and `days: 14`; success haptic; toast shows "Extended trials for 3 users"; selection clears

**TC-ADMN-023: Users tab CSV export**
- **Priority**: P2
- **Category**: Functional
- **Preconditions**: Admin user with `bulk_operation` permission; users selected in bulk
- **Steps**:
  1. Select at least 1 user via checkbox
  2. Tap "CSV" in the bulk actions bar
- **Expected**:
  - Step 1: Bulk actions bar visible with CSV button
  - Step 2: `handleExportCSV("users")` fires; CSV download initiates containing user data

**TC-ADMN-024: Users tab add/remove tags**
- **Priority**: P2
- **Category**: Functional
- **Preconditions**: Admin user viewing a user detail panel
- **Steps**:
  1. Type "vip" in the tag input field
  2. Submit the tag input (press Enter)
  3. Observe the tag badge
  4. Tap the X on the "vip" tag badge
- **Expected**:
  - Step 1: Tag input accepts text
  - Step 2: `addUserTag` mutation fires with tag `"vip"`; success haptic; toast "Tag added"; input clears
  - Step 3: "vip" tag badge appears with close icon
  - Step 4: `removeUserTag` mutation fires; success haptic; toast "Tag removed"; badge disappears

### 13.4 Receipts Tab

**TC-ADMN-025: Receipts tab search and filter**
- **Priority**: P0
- **Category**: Functional
- **Preconditions**: Admin user on Receipts tab; receipts exist with various stores and statuses
- **Steps**:
  1. Type "Tesco" in the search input
  2. Tap "Completed" status filter chip
  3. Set a date range using the date picker
  4. Observe the receipt list
- **Expected**:
  - Step 1: Search input updates; query fires with `searchTerm: "Tesco"` after 2+ characters
  - Step 2: Status filter chip highlights; query fires with `status: "completed"`; haptic triggers
  - Step 3: Date range picker updates; query fires with `dateFrom` and `dateTo`
  - Step 4: Receipt list shows only Tesco receipts with "completed" status within the date range

**TC-ADMN-026: Receipts tab delete receipt with confirmation**
- **Priority**: P0
- **Category**: Functional
- **Preconditions**: Admin user with `delete_receipts` permission on Receipts tab; receipts in the list
- **Steps**:
  1. Tap the delete (trash) icon on a receipt row
  2. Observe the confirmation alert
  3. Tap "Delete"
  4. Observe the result
- **Expected**:
  - Step 1: GlassAlert appears with title "Delete Receipt" and warning "Are you sure? This will remove all associated price history."
  - Step 2: Two buttons shown: "Cancel" and "Delete" (destructive style)
  - Step 3: `deleteReceipt` mutation fires with the receipt ID
  - Step 4: Success haptic fires; toast shows "Receipt deleted"; receipt disappears from list; if it was the selected receipt, selection clears

**TC-ADMN-027: Receipts tab view receipt image modal**
- **Priority**: P1
- **Category**: Functional
- **Preconditions**: Admin user on Receipts tab; receipt has a valid `imageStorageId`
- **Steps**:
  1. Tap the eye icon on a receipt row
  2. Observe the image modal
  3. Tap the close button or backdrop
- **Expected**:
  - Step 1: Image modal opens with fade animation
  - Step 2: Receipt image loads from storage URL; header shows "Receipt Image" with close button; image displays with `contain` resize mode
  - Step 3: Modal closes; `selectedImage` resets to null

**TC-ADMN-028: Receipts tab edit receipt details**
- **Priority**: P1
- **Category**: Functional
- **Preconditions**: Admin user on Receipts tab; receipts in the list
- **Steps**:
  1. Tap the pencil icon on a receipt row
  2. Observe the edit modal
  3. Change the store name to "Sainsbury's" and total to "45.99"
  4. Tap "Save Changes"
- **Expected**:
  - Step 1: Edit modal opens with slide animation; haptic fires
  - Step 2: Modal shows "Edit Receipt" title with pre-populated fields: Store Name and Total Amount
  - Step 3: Fields update with new values
  - Step 4: `updateReceipt` mutation fires with the receipt ID, new `storeName`, and `total: 45.99`; success haptic; toast "Receipt updated"; modal closes

**TC-ADMN-029: Receipts tab flagged queue and bulk approve**
- **Priority**: P1
- **Category**: Functional
- **Preconditions**: Admin user on Receipts tab; `getFlaggedReceipts` returns 5 flagged receipts
- **Steps**:
  1. Observe the Moderation Queue section
  2. Tap "Approve All (5)" button
  3. Tap "Approve All" in the confirmation alert
- **Expected**:
  - Step 1: Horizontal scrollable queue shows receipt thumbnails with store name and amount labels; count shows "(5)"
  - Step 2: Alert appears with "Bulk Approve" title and message about approving all 5 flagged receipts
  - Step 3: `bulkReceiptAction` mutation fires with all 5 receipt IDs and `action: "approve"`; success haptic; toast shows "Approved 5 receipts"

**TC-ADMN-030: Receipts tab price anomaly detection and removal**
- **Priority**: P1
- **Category**: Functional
- **Preconditions**: Admin user on Receipts tab with `delete_receipts` permission; `getPriceAnomalies` returns anomaly entries
- **Steps**:
  1. Observe the Price Anomalies section
  2. Note the displayed anomaly details (item name, price, store, average, deviation %)
  3. Tap the close-circle icon on an anomaly
- **Expected**:
  - Step 1: Section shows "Price Anomalies" with alert icon and count; up to 10 anomalies displayed
  - Step 2: Each anomaly shows item name, unit price, store, average price, and deviation percentage
  - Step 3: `overridePrice` mutation fires with `priceId` and `deleteEntry: true`; success haptic; toast "Price record removed"

### 13.5 Monitoring Tab

**TC-ADMN-031: Monitoring tab displays active alerts**
- **Priority**: P0
- **Category**: Functional
- **Preconditions**: Admin user on Monitoring tab; `getMonitoringSummary` returns alerts
- **Steps**:
  1. Navigate to Monitoring tab
  2. Observe the Active Alerts section
  3. Tap "Resolve" on a critical alert
- **Expected**:
  - Step 1: Tab renders with loading skeleton initially, then content
  - Step 2: Alert count shown in header; each alert displays: type (uppercased), message, timestamp, severity-based color (critical=red, high=yellow, low=default)
  - Step 3: `resolveAlert` mutation fires with alert ID; success haptic; toast "Alert resolved"

**TC-ADMN-032: Monitoring tab SLA performance display**
- **Priority**: P1
- **Category**: Functional
- **Preconditions**: Admin user on Monitoring tab; SLA data exists
- **Steps**:
  1. Observe the SLA Performance section
  2. Check for pass/warn/fail badges on each SLA metric
- **Expected**:
  - Step 1: Section shows overall SLA status (PASS/WARN/FAIL) in header
  - Step 2: Each SLA entry shows: metric name, target value (ms), actual value (ms), and color-coded status badge (green=pass, yellow=warn, red=fail)

**TC-ADMN-033: Monitoring tab A/B experiment creation**
- **Priority**: P2
- **Category**: Functional
- **Preconditions**: Admin user on Monitoring tab
- **Steps**:
  1. Tap "New Experiment" button
  2. Fill in experiment name "Checkout Flow V2" and goal event "subscribed"
  3. Tap "Create Experiment"
  4. Observe the result
- **Expected**:
  - Step 1: Modal opens with fields for Name, Description, Goal Event, and Variants
  - Step 2: Form accepts input; default variants shown (Control 50%, Variant A 50%)
  - Step 3: `createExperiment` mutation fires with form data
  - Step 4: Success haptic; toast "Experiment created"; modal closes; form resets

**TC-ADMN-034: Monitoring tab workflow toggle**
- **Priority**: P2
- **Category**: Functional
- **Preconditions**: Admin user on Monitoring tab; workflows exist with an enabled workflow
- **Steps**:
  1. Observe the Workflows section
  2. Toggle the switch on an enabled workflow to OFF
- **Expected**:
  - Step 1: Each workflow shows name, trigger type, action count, and enabled/disabled switch
  - Step 2: `toggleWorkflow` mutation fires; success haptic; toast "Workflow status updated"; switch reflects new state

### 13.6 Settings Tab

**TC-ADMN-035: Settings tab toggle feature flag**
- **Priority**: P0
- **Category**: Functional
- **Preconditions**: Admin user with `manage_flags` permission on Settings tab; feature flags exist
- **Steps**:
  1. Observe the Feature Flags section
  2. Toggle a flag from OFF to ON
  3. Observe the flag state and audit trail
- **Expected**:
  - Step 1: Flags listed with key name, description, "Modified by" attribution, and toggle switch
  - Step 2: `toggleFeatureFlag` mutation fires with the flag key; haptic triggers; toast shows "{key} toggled"
  - Step 3: Switch reflects new ON state; "Modified by" updates to current admin's name

**TC-ADMN-036: Settings tab create and manage announcements**
- **Priority**: P1
- **Category**: Functional
- **Preconditions**: Admin user with `manage_announcements` permission on Settings tab
- **Steps**:
  1. Tap "New Announcement" button
  2. Enter title "Planned Maintenance", body "Downtime at 2am", select type "warning"
  3. Tap "Create"
  4. Observe the announcement in the list
  5. Toggle the announcement's active switch OFF
- **Expected**:
  - Step 1: New announcement form appears with title, body, and type selector (info/warning/promo)
  - Step 2: Form fields accept input; "warning" type button highlights
  - Step 3: `createAnnouncement` mutation fires; success haptic; toast "Announcement created"; form hides
  - Step 4: Announcement appears in list with warning badge, title, body, and active switch ON
  - Step 5: `toggleAnnouncement` mutation fires; haptic triggers; title dims (opacity 0.5)

**TC-ADMN-037: Settings tab force logout admin session**
- **Priority**: P1
- **Category**: Security
- **Preconditions**: Admin user with `manage_flags` permission on Settings tab; active admin sessions exist
- **Steps**:
  1. Observe the Active Admin Sessions section
  2. Tap the logout icon on another admin's session
  3. Tap "Logout" in the confirmation alert
- **Expected**:
  - Step 1: Sessions listed with name, device/user agent, login time, last active time
  - Step 2: Alert shows "Force Logout" with message "Force this admin session to expire?"
  - Step 3: `forceLogoutSession` mutation fires with session ID; success haptic; toast "Session expired"

### 13.7 Webhooks Tab

**TC-ADMN-038: Webhooks tab create new webhook**
- **Priority**: P1
- **Category**: Functional
- **Preconditions**: Admin user on Webhooks tab
- **Steps**:
  1. Tap "Add Webhook" button
  2. Enter URL "https://api.example.com/webhook" and description "Test webhook"
  3. Toggle event subscriptions (deselect "user.subscribed", select "user.signup")
  4. Tap "Create Webhook"
- **Expected**:
  - Step 1: Create modal opens with slide animation
  - Step 2: URL and description fields accept input
  - Step 3: Event chip toggles work with haptic feedback; deselected chips unhighlight, selected ones highlight
  - Step 4: `createWebhook` mutation fires with URL, description, and events array `["receipt.completed", "user.signup"]`; success haptic; toast "Webhook created"; modal closes; form resets

**TC-ADMN-039: Webhooks tab test and delete webhook**
- **Priority**: P1
- **Category**: Functional
- **Preconditions**: Admin user on Webhooks tab; at least one webhook configured
- **Steps**:
  1. Tap "Test" button on a webhook
  2. Observe the result
  3. Tap the delete icon on the same webhook
  4. Tap "Delete" in the confirmation alert
- **Expected**:
  - Step 1: `testWebhook` action fires with webhook ID
  - Step 2: Toast shows "Test event sent"; last triggered timestamp updates if successful
  - Step 3: Alert shows "Delete Webhook" with message "Are you sure you want to remove this integration?"
  - Step 4: `deleteWebhook` mutation fires; toast "Webhook deleted"; webhook disappears from list

### 13.8 Global Search & Navigation

**TC-ADMN-040: Global search (Cmd+K) finds users, receipts, settings**
- **Priority**: P1
- **Category**: Functional
- **Preconditions**: Admin user on any admin tab; users, receipts, and settings data exist
- **Steps**:
  1. Trigger Cmd+K (or Ctrl+K) keyboard shortcut
  2. Observe the search modal
  3. Type "Tesco" (at least 2 characters)
  4. Observe search results
  5. Tap on a receipt result
  6. Observe navigation
- **Expected**:
  - Step 1: GlobalSearchModal opens with fade animation; input auto-focuses
  - Step 2: Modal shows search input with magnify icon, hint text "Type at least 2 characters to search..."
  - Step 3: `useAdminSearch` hook fires with query "Tesco"
  - Step 4: Results appear with icon (account/receipt/cog), title, subtitle, and tab badge; each result shows its destination tab
  - Step 5: `onSelectResult` fires with the target tab and ID; haptic triggers; modal closes
  - Step 6: Dashboard navigates to the Receipts tab with the selected receipt pre-highlighted via `initialReceiptId`

---

## SUITE 14: Price Intelligence (TC-PRIC-001 to TC-PRIC-008)

**TC-PRIC-001: Price from personal history within 3-day trust window**
- **Priority**: P0
- **Category**: Functional
- **Preconditions**: User has a `priceHistory` entry for "milk" (2 pints, pint) at Tesco purchased 1 day ago at 1.15; no crowdsourced data exists
- **Steps**:
  1. Call `resolvePrice` with normalizedItemName "milk", variantSize "2 pints", variantUnit "pint", storeName "tesco", userId set, aiEstimatedPrice 1.50
  2. Inspect the returned ResolvedPrice object
- **Expected**:
  - Step 1: Function queries `priceHistory` by_user_item index for the user and "milk"
  - Step 2: Returns `{ price: 1.15, priceSource: "personal", confidence: 1.0, storeName: "Tesco", reportCount: 1 }`; AI estimate (1.50) is NOT used because personal history is within the 3-day trust window

**TC-PRIC-002: Stale personal price falls back to fresher crowdsourced data**
- **Priority**: P0
- **Category**: Functional
- **Preconditions**: User has a `priceHistory` entry for "bread" at Tesco purchased 10 days ago at 1.20; `currentPrices` has a crowdsourced entry for "bread" at Tesco in the user's region, last seen 2 days ago, averagePrice 1.35, reportCount 8
- **Steps**:
  1. Call `resolvePrice` with normalizedItemName "bread", variantSize "800g", variantUnit "g", storeName "tesco", userId set
  2. Inspect the returned ResolvedPrice object
- **Expected**:
  - Step 1: Function finds personal price (10 days old, past 3-day window), then checks crowdsourced data
  - Step 2: Returns `{ price: 1.35, priceSource: "crowdsourced", confidence: <value > 0.6>, storeName: "Tesco", reportCount: 8 }` because the crowdsourced data is fresher (2 days vs 10 days) and confidence exceeds 0.6

**TC-PRIC-003: Crowdsourced matching priority: Store+Region > Store > Region > Global**
- **Priority**: P0
- **Category**: Functional
- **Preconditions**: No personal history exists; `currentPrices` has 4 entries for "eggs" variant: (1) Tesco + London region at 2.50 with 5 reports, (2) Tesco (any region) at 2.60 with 10 reports, (3) London region (any store) at 2.70, (4) Global at 2.80; user's region is London
- **Steps**:
  1. Call `resolvePrice` with storeName "tesco", userId for a London user
  2. Remove the store+region entry, call again
  3. Remove the store entries, call again
  4. Remove the region entry, call again
- **Expected**:
  - Step 1: Returns price 2.50 with baseConfidence 0.7 (store_region match); storeName from the matched entry
  - Step 2: Returns weighted average price across Tesco entries with baseConfidence 0.6 (store match); reportCount = total of all Tesco entries
  - Step 3: Returns price 2.70 with baseConfidence 0.5 (region match)
  - Step 4: Returns price 2.80 with baseConfidence 0.4 (global match); this is the entry with highest reportCount

**TC-PRIC-004: AI estimate used as final fallback**
- **Priority**: P0
- **Category**: Functional
- **Preconditions**: No `priceHistory` entries for the user/item; no `currentPrices` entries for the item; AI estimated price of 3.50 exists on the variant
- **Steps**:
  1. Call `resolvePrice` with normalizedItemName "quinoa", variantSize "500g", variantUnit "g", storeName "tesco", userId set, aiEstimatedPrice 3.50
  2. Inspect the returned ResolvedPrice object
- **Expected**:
  - Step 1: Function exhausts Layer 1 (no personal data) and Layer 2 (no crowdsourced data)
  - Step 2: Returns `{ price: 3.50, priceSource: "ai", confidence: 0.5, storeName: null, reportCount: 0 }`

**TC-PRIC-005: Zero-blank-prices guarantee - null price when no sources exist**
- **Priority**: P0
- **Category**: Edge Case
- **Preconditions**: No `priceHistory`, no `currentPrices`, and `aiEstimatedPrice` is undefined for the item
- **Steps**:
  1. Call `resolvePrice` with normalizedItemName "obscure-item", variantSize "1 pack", variantUnit "pack", storeName "tesco", userId set, aiEstimatedPrice undefined
  2. Inspect the returned ResolvedPrice object
  3. Verify the emergency fallback is invoked by the caller
- **Expected**:
  - Step 1: All three layers exhausted with no data
  - Step 2: Returns `{ price: null, priceSource: "ai", confidence: 0, storeName: null, reportCount: 0 }`
  - Step 3: The calling code should invoke `getEmergencyPriceEstimate("obscure-item")` which returns `{ price: 1.50, size: "per item", unit: "each" }` with implicit confidence 0.3, ensuring no item ever displays a blank price

**TC-PRIC-006: Emergency price estimation for known items**
- **Priority**: P1
- **Category**: Functional
- **Preconditions**: None (pure function, no database state needed)
- **Steps**:
  1. Call `getEmergencyPriceEstimate("milk")`
  2. Call `getEmergencyPriceEstimate("bread")`
  3. Call `getEmergencyPriceEstimate("chicken breast")`
  4. Call `getEmergencyPriceEstimate("unknown-thing", "Dairy")`
  5. Call `getEmergencyPriceEstimate("unknown-thing")`
- **Expected**:
  - Step 1: Returns `{ price: 1.15, size: "2 pints", unit: "pint" }`
  - Step 2: Returns `{ price: 1.20, size: "800g", unit: "g" }`
  - Step 3: Returns `{ price: 4.50, size: "500g", unit: "g" }`
  - Step 4: Returns `{ price: 2.50, size: "per item", unit: "each" }` (Dairy category fallback)
  - Step 5: Returns `{ price: 1.50, size: "per item", unit: "each" }` (global default fallback)

**TC-PRIC-007: Price confidence scoring with recency penalty**
- **Priority**: P1
- **Category**: Boundary
- **Preconditions**: None (testing `computeConfidence` pure function)
- **Steps**:
  1. Call `computeConfidence(10, 0)` (10 reports, 0 days old)
  2. Call `computeConfidence(10, 15)` (10 reports, 15 days old)
  3. Call `computeConfidence(10, 30)` (10 reports, 30 days old)
  4. Call `computeConfidence(1, 0)` (1 report, 0 days old)
  5. Call `computeConfidence(0, 0)` (0 reports, 0 days old)
  6. Verify crowdsourced recency multiplier: 91+ day old crowdsourced data
- **Expected**:
  - Step 1: Returns 1.0 (0.5 count factor + 0.5 recency factor, capped at 1)
  - Step 2: Returns 0.75 (0.5 count + 0.25 recency)
  - Step 3: Returns 0.5 (0.5 count + 0 recency, because daysSinceLastSeen >= 30)
  - Step 4: Returns 0.55 (0.05 count + 0.5 recency)
  - Step 5: Returns 0.5 (0 count + 0.5 recency)
  - Step 6: In `resolvePrice`, the crowdsourced recency multiplier is `Math.max(0.4, 1 - (age / (30 * 3 days in ms)))`, so at 91+ days the multiplier floors at 0.4, capping effective confidence

**TC-PRIC-008: Variant matching selects by commonality then cheapest price**
- **Priority**: P1
- **Category**: Functional
- **Preconditions**: Three `itemVariants` exist for "milk": (A) 2 pints, commonality 0.9, price 1.15; (B) 4 pints, commonality 0.8, price 1.85; (C) 1 litre, commonality 0.5, price 0.99
- **Steps**:
  1. Call `resolveVariantWithPrice` with itemName "milk", normalizedStoreId "tesco", userId set
  2. Inspect the returned variant and price
  3. Modify variant A to have `price: null` (no price from any layer)
  4. Call `resolveVariantWithPrice` again
- **Expected**:
  - Step 1: Function fetches all variants via `by_base_item` index, resolves prices for each via `resolvePrice`
  - Step 2: Returns variant A (2 pints) because it has a price AND highest commonality (0.9); price 1.15 with appropriate source and confidence
  - Step 3: Variant A now has no resolved price
  - Step 4: Returns variant B (4 pints) because priced items come first in sort, and among priced items B has higher commonality (0.8) than C (0.5)

---

## SUITE 15: Navigation & UI (TC-NAVI-001 to TC-NAVI-017)

**TC-NAVI-001: Navigate to all 4 tabs**
- **Priority**: P0
- **Category**: Functional
- **Preconditions**: User is authenticated and on the main app screen; tab bar is visible
- **Steps**:
  1. Tap the "Lists" tab (index.tsx)
  2. Tap the "Stock" tab (stock.tsx)
  3. Tap the "Scan" tab (scan.tsx)
  4. Tap the "Profile" tab (profile.tsx)
- **Expected**:
  - Step 1: Lists screen renders showing shopping lists; tab icon highlights; haptic fires
  - Step 2: Stock/Pantry screen renders showing pantry items; tab icon highlights; haptic fires
  - Step 3: Scan screen renders showing camera/scan interface; tab icon highlights; haptic fires
  - Step 4: Profile screen renders showing user settings; tab icon highlights; haptic fires

**TC-NAVI-002: Tab bar visible on main screens**
- **Priority**: P0
- **Category**: Functional
- **Preconditions**: User is on any of the 4 main tab screens
- **Steps**:
  1. Verify tab bar presence on Lists screen
  2. Verify tab bar presence on Stock screen
  3. Verify tab bar presence on Scan screen
  4. Verify tab bar presence on Profile screen
- **Expected**:
  - Step 1: PersistentTabBar component renders at bottom with 4 tab icons
  - Step 2: PersistentTabBar component renders at bottom with 4 tab icons
  - Step 3: PersistentTabBar component renders at bottom with 4 tab icons
  - Step 4: PersistentTabBar component renders at bottom with 4 tab icons

**TC-NAVI-003: Tab bar hidden during focused flows**
- **Priority**: P0
- **Category**: Functional
- **Preconditions**: User is on the Lists tab with at least one list created
- **Steps**:
  1. Navigate to a list detail view (`list/[id].tsx`)
  2. Observe the tab bar
  3. Navigate to trip summary view
  4. Navigate to a receipt confirmation flow
  5. Press back to return to main tab
  6. Observe the tab bar
- **Expected**:
  - Step 1: List detail screen renders with items and budget dial
  - Step 2: Tab bar is NOT visible; only the list detail header with back button is shown
  - Step 3: Tab bar is NOT visible during trip flow
  - Step 4: Tab bar is NOT visible during receipt confirmation/reconciliation
  - Step 5: Navigation returns to the Lists tab
  - Step 6: Tab bar reappears at the bottom of the screen

**TC-NAVI-004: Stock tab badge shows low + out-of-stock count**
- **Priority**: P1
- **Category**: Functional
- **Preconditions**: User has pantry items; 3 items are "low stock" and 2 items are "out of stock"
- **Steps**:
  1. Navigate to any tab where the tab bar is visible
  2. Observe the Stock tab icon
  3. Add stock to one "out of stock" item so it becomes "in stock"
  4. Observe the badge again
- **Expected**:
  - Step 1: Tab bar renders with all 4 icons
  - Step 2: Stock tab shows an animated badge with count "5" (3 low + 2 out)
  - Step 3: Stock update processes via Convex mutation
  - Step 4: Badge updates to "4" (3 low + 1 out); badge animates the value change (scale bounce)

**TC-NAVI-005: Back button standard navigation**
- **Priority**: P0
- **Category**: Functional
- **Preconditions**: User has navigated from Lists tab into a list detail view
- **Steps**:
  1. Verify a back button/arrow is visible in the header
  2. Tap the back button
  3. Observe the navigation result
- **Expected**:
  - Step 1: Header shows a left-pointing chevron or arrow icon
  - Step 2: Navigation triggers with animation
  - Step 3: User returns to the previous screen (Lists tab); tab bar reappears; previously viewed list is still in the list

**TC-NAVI-006: Hardware back button (Android)**
- **Priority**: P1
- **Category**: Functional
- **Preconditions**: Running on Android device or emulator; user is on a nested screen (e.g., list detail)
- **Steps**:
  1. Press the Android hardware back button
  2. Observe the navigation result
  3. Press hardware back button again on the main tab screen
- **Expected**:
  - Step 1: Navigation processes the back event
  - Step 2: User returns to the previous screen (Lists tab); same behavior as tapping the header back button
  - Step 3: App either minimizes or shows exit confirmation (does not navigate to a previous tab)

**TC-NAVI-007: Gesture back (iOS swipe from edge)**
- **Priority**: P1
- **Category**: Functional
- **Preconditions**: Running on iOS device or simulator; user is on a nested screen; `GestureHandlerRootView` wraps the app
- **Steps**:
  1. Swipe from the left edge of the screen toward the right
  2. Observe the navigation animation
  3. Complete the swipe gesture
- **Expected**:
  - Step 1: Screen begins to slide right, revealing the previous screen underneath
  - Step 2: Interactive dismissal animation plays (screen follows finger position)
  - Step 3: User returns to the previous screen; navigation stack updates correctly

**TC-NAVI-008: GlassCard renders with correct glass effect**
- **Priority**: P1
- **Category**: Functional
- **Preconditions**: GlassCard component is rendered with default props
- **Steps**:
  1. Render `<GlassCard>Content</GlassCard>` with default props
  2. Render with `variant="elevated"`
  3. Render with `variant="bordered"` and `accentColor="#FF0000"`
  4. Render with `pressable={true}` and press it
- **Expected**:
  - Step 1: Card renders with `rgba(255,255,255,0.1)` background (medium intensity), 1px border in `glass.border` color, `lg` border radius, `md` padding
  - Step 2: Card renders with `rgba(255,255,255,0.14)` background, `borderFocus` color, shadow elevation applied
  - Step 3: Card renders with 2px border, `#FF0000` accent border color
  - Step 4: Card animates scale to `pressScale` (0.97) on press-in with spring animation, returns to scale 1 on press-out; haptic fires (Light impact)

**TC-NAVI-009: Skeleton loading states with shimmer**
- **Priority**: P1
- **Category**: Functional
- **Preconditions**: Data is loading (queries return `undefined`)
- **Steps**:
  1. Render `<SkeletonCard />` component
  2. Observe the shimmer animation
  3. Render `<SkeletonListItem />` component
  4. Wait for actual data to load
- **Expected**:
  - Step 1: Card skeleton appears with avatar circle (40x40), title line (80% width, 24px), and text line (60% width, 16px); glass background and border styling applied
  - Step 2: Shimmer gradient (200px wide) translates from -200 to +200 repeatedly every 1500ms using ease-in-out easing
  - Step 3: List item skeleton appears with avatar, two text lines, and icon placeholder; glass styling matches
  - Step 4: Skeleton components unmount; actual content replaces them without layout jump

**TC-NAVI-010: AnimatedSection stagger animations**
- **Priority**: P2
- **Category**: Functional
- **Preconditions**: Multiple AnimatedSection components rendered on a screen with staggered delays
- **Steps**:
  1. Navigate to a screen with cascading AnimatedSections (e.g., admin Overview tab with delays 0, 100, 200, 300)
  2. Observe the entrance animations
- **Expected**:
  - Step 1: Screen begins rendering content
  - Step 2: Sections appear sequentially: first section fades in from above at 0ms delay, second at 100ms, third at 200ms, fourth at 300ms; each uses `FadeInDown` with 400ms duration; creates a polished cascading entrance effect

**TC-NAVI-011: Haptic feedback on all interactive elements**
- **Priority**: P1
- **Category**: Functional
- **Preconditions**: Running on a physical device with haptic engine; haptic feedback is not disabled in system settings
- **Steps**:
  1. Tap a GlassCard with `pressable={true}`
  2. Tap a GlassButton
  3. Tap a tab bar icon
  4. Toggle a Switch component
  5. Long-press a GlassCard with `onLongPress` handler
- **Expected**:
  - Step 1: `Haptics.impactAsync(Light)` fires; card scales down briefly
  - Step 2: Haptic feedback fires via the button's press handler
  - Step 3: `Haptics.selectionAsync()` fires on tab change
  - Step 4: `Haptics.selectionAsync()` fires on toggle
  - Step 5: `Haptics.impactAsync(Medium)` fires on long press

**TC-NAVI-012: Toast notifications display and auto-dismiss**
- **Priority**: P1
- **Category**: Functional
- **Preconditions**: GlassToast component is in the component tree
- **Steps**:
  1. Trigger a success action (e.g., save an item)
  2. Observe the toast notification
  3. Wait for the auto-dismiss duration (default 3000ms)
  4. Trigger an error action
  5. Observe the error toast
- **Expected**:
  - Step 1: Action completes successfully
  - Step 2: Toast appears at the top of the screen with `FadeInUp` animation (300ms); shows icon (if provided) and message text; glass-styled container with `rgba(20,30,55,0.92)` background, border, and shadow
  - Step 3: Toast auto-dismisses with `FadeOutUp` animation after 3000ms; `onDismiss` callback fires
  - Step 4: Error action completes
  - Step 5: Error toast appears with appropriate icon color and message; same positioning and animation behavior

**TC-NAVI-013: Modal dialogs with overlay and backdrop dismiss**
- **Priority**: P1
- **Category**: Functional
- **Preconditions**: GlassModal component available in the component tree
- **Steps**:
  1. Trigger a modal open (e.g., confirm delete)
  2. Observe the modal overlay and content card
  3. Tap the backdrop (outside the content card)
  4. Re-open the modal
  5. Tap inside the content card
  6. Tap a close/cancel button inside the card
- **Expected**:
  - Step 1: Modal becomes visible with fade animation
  - Step 2: Overlay renders at 60% black opacity; content card renders with `background.primary` color, `borderFocus` border, 20px border radius, `xl` padding; centered position
  - Step 3: `onClose` fires; modal dismisses (the overlay Pressable handles this)
  - Step 4: Modal re-opens
  - Step 5: Card content Pressable calls `e.stopPropagation()` to prevent backdrop dismiss; modal stays open
  - Step 6: Close action fires; modal dismisses properly

**TC-NAVI-014: Pull to refresh on scrollable lists**
- **Priority**: P1
- **Category**: Functional
- **Preconditions**: User is on a screen with a scrollable list (e.g., pantry list, shopping list)
- **Steps**:
  1. Scroll to the top of the list
  2. Pull down beyond the top boundary
  3. Release the pull gesture
  4. Observe the refresh behavior
- **Expected**:
  - Step 1: List is at scroll position 0
  - Step 2: Pull-to-refresh indicator appears (spinner or custom indicator)
  - Step 3: Refresh action triggers
  - Step 4: Data re-fetches from Convex; list updates with latest data; refresh indicator hides

**TC-NAVI-015: Offline banner displays when network lost**
- **Priority**: P0
- **Category**: Functional
- **Preconditions**: OfflineBanner component is in the layout; device has network connectivity initially
- **Steps**:
  1. Verify banner is NOT visible when connected
  2. Disable network connectivity (airplane mode or disconnect)
  3. Observe the offline banner
  4. Attempt an action that requires network (e.g., add list item)
  5. Re-enable network connectivity
  6. Observe the banner transition
- **Expected**:
  - Step 1: `shouldShow` is false; OfflineBanner returns null; no banner visible
  - Step 2: `useNetworkStatus` reports `isConnected: false`
  - Step 3: Banner slides in from top with `SlideInUp` spring animation; shows cloud-off-outline icon in warning color (amber), "Offline" status message, amber background `rgba(245,158,11,0.15)` and border `rgba(245,158,11,0.3)`; if pending mutations exist, a count badge shows
  - Step 4: Convex queues the mutation locally; pending mutation count badge updates on the banner
  - Step 5: `isConnected` returns to true; Convex syncs pending mutations
  - Step 6: If pending mutations are syncing, banner briefly shows cloud-sync icon in primary color with rotation animation; once sync completes, banner slides out with `SlideOutUp` animation

**TC-NAVI-016: Trial nudge banner display and interaction**
- **Priority**: P1
- **Category**: Functional
- **Preconditions**: User is on trial subscription with 2 days remaining; TrialNudgeBanner is in the layout
- **Steps**:
  1. Observe the banner on a main screen
  2. Verify the message content
  3. Tap the banner body
  4. Tap the dismiss (X) icon on the banner
  5. Navigate to another tab
  6. Observe banner state
- **Expected**:
  - Step 1: Banner renders with crown icon, message text, and close button; border color is `accent.secondary` (urgent because 2 days left)
  - Step 2: Message reads "{FirstName}, 2 days left -- subscribe to keep unlimited access"
  - Step 3: Light haptic fires; router navigates to `/(app)/subscription` screen
  - Step 4: `dismissed` state set to true; banner disappears immediately
  - Step 5: Navigation occurs to the new tab
  - Step 6: Banner remains dismissed for the current session (state-based, reappears on app restart)

**TC-NAVI-017: Impersonation banner display and stop action**
- **Priority**: P0
- **Category**: Functional
- **Preconditions**: Admin has activated impersonation mode; `useImpersonation` hook returns `isImpersonated: true` with `adminName` and `tokenValue`
- **Steps**:
  1. Observe the impersonation banner
  2. Verify the banner content and styling
  3. Tap the "STOP" button
  4. Observe the result
- **Expected**:
  - Step 1: ImpersonationBanner renders at the very top of the screen (above safe area insets); z-index 9999 ensures it overlays all other content
  - Step 2: Banner shows shield-account icon in warning color, "Impersonation Active" title in bold warning color, subtitle "Viewing as user (Admin: {adminName})"; background is `warning` color at 20% opacity with bottom border at 40% opacity; "STOP" button has solid warning background with black text
  - Step 3: `stopImpersonation` mutation fires with the current `tokenValue`; success haptic fires
  - Step 4: Impersonation session ends; `isImpersonated` becomes false; banner unmounts (returns null); user returns to their own admin session view
# Part 6: Integration, Performance, Security, Accessibility, Edge Case Matrices, Regression & Templates

> Oja Shopping App -- Comprehensive Test Suites & Quality Assurance Artifacts
> Last Updated: 2026-03-25

---

## SUITE 16: Cross-Feature Integration (TC-INTG-001 to TC-INTG-012)

These tests verify end-to-end journeys that span multiple features, ensuring data flows correctly across the entire system.

---

**TC-INTG-001: Complete Shopping Journey -- List to Pantry Restock**
- **Priority**: P0
- **Category**: Integration
- **Preconditions**: Authenticated premium user with at least 3 pantry items (milk, bread, eggs) set to "out" stock level with autoAddToList enabled. No active shopping lists.
- **Steps**:
  1. Create a new shopping list named "Weekly Shop"
  2. Verify auto-added items from pantry appear on the list (milk, bread, eggs)
  3. Add 2 manual items (butter, cheese) using cleanItemForStorage
  4. Set budget to 25.00 GBP
  5. Start trip with store set to Tesco
  6. Check off milk (actual price 1.50), bread (1.20), eggs (2.10)
  7. Check off butter (2.50), cheese (3.00)
  8. Scan a receipt via camera capture for the Tesco shop
  9. Confirm receipt items match checked-off items in reconciliation
  10. Link receipt to the shopping list
  11. Finish the trip
  12. Verify pantry items (milk, bread, eggs) restock to "stocked" level
  13. Navigate to trip summary and verify history record
- **Expected**:
  - Step 2: 3 auto-added items appear with autoAdded=true, each with estimated prices from price resolver
  - Step 3: Items added with valid names via cleanItemForStorage, prices estimated via 3-layer cascade
  - Step 4: Budget dial shows 25.00
  - Step 5: shoppingStartedAt timestamp set, activeShopperId set to current user, storeSegments seeded with Tesco
  - Step 6: Each item gets isChecked=true, checkedAt timestamp, purchasedAtStoreId="tesco", purchasedAtStoreName="Tesco"
  - Step 8: Receipt OCR extracts store name, total, and line items
  - Step 9: Reconciliation screen shows matched and unmatched items
  - Step 10: receiptId or receiptIds field populated on the shopping list
  - Step 11: List status="completed", completedAt set, actualTotal calculated from checked items
  - Step 12: Pantry items with autoAddToList=true that were checked off have stockLevel updated to "stocked", lastPurchasedAt updated, purchaseCount incremented
  - Step 13: Trip summary shows budget=25.00, actualTotal=10.30, savings=14.70, all 5 items checked, receipt linked

---

**TC-INTG-002: Voice-Driven List Creation and Shopping**
- **Priority**: P1
- **Category**: Integration
- **Preconditions**: Premium user with voice assistant enabled (dev build with expo-speech-recognition). Microphone permission granted. At least one favorite store configured. Convex backend running.
- **Steps**:
  1. Activate Tobi voice assistant from any screen
  2. Say "Create a new shopping list called Sunday Roast with a budget of thirty pounds"
  3. Verify list created with correct name and budget
  4. Say "Add 2 kilos of chicken, 1 kilo of potatoes, and 500 grams of carrots"
  5. Verify all 3 items added with correct sizes and units
  6. Say "What is on my list?"
  7. Verify Tobi reads back all items with quantities and estimated prices
  8. Say "Start shopping at Tesco"
  9. Verify trip started with Tesco as active store
  10. Say "Check off the chicken and potatoes"
  11. Verify both items marked as checked
- **Expected**:
  - Step 2: getUserVoiceContext provides system prompt with user data; list created with name "Sunday Roast", budget=30.00
  - Step 3: List appears in Lists tab with correct name and budget
  - Step 5: Items created via cleanItemForStorage: chicken (size="2kg", unit="kg"), potatoes (size="1kg", unit="kg"), carrots (size="500g", unit="g")
  - Step 6: Voice response latency < 3s
  - Step 7: TTS reads items in format "{size} {name}" (e.g., "2kg Chicken")
  - Step 9: shoppingStartedAt set, normalizedStoreId="tesco"
  - Step 11: Items have isChecked=true, purchasedAtStoreId="tesco"

---

**TC-INTG-003: Receipt-First Workflow -- Scan to List Creation**
- **Priority**: P1
- **Category**: Integration
- **Preconditions**: Authenticated user (free or premium). Physical receipt or receipt image available. No prior list matching this receipt.
- **Steps**:
  1. Navigate to Scan tab and select receipt scanning mode
  2. Capture receipt image (Tesco receipt, total 47.32, 12 items)
  3. Wait for OCR processing to complete
  4. Review extracted receipt data on confirmation screen
  5. Tap "Save Receipt" to persist
  6. Navigate to "Create List from Receipt" flow via the saved receipt
  7. Verify all 12 receipt items pre-populated on new list
  8. Set list name to "From Tesco Receipt" and budget to 50.00
  9. Save the list
  10. Verify sourceReceiptId field links back to the scanned receipt
  11. Verify pantry items matching receipt line items have prices updated
- **Expected**:
  - Step 3: Processing completes in < 5s; Gemini 2.0 Flash extracts store, date, items, prices
  - Step 4: Confirmation screen shows store="Tesco", total=47.32, 12 line items with names and prices
  - Step 5: Receipt saved with normalizedStoreId, imageHash computed for fraud prevention
  - Step 7: All 12 items appear with names cleaned via cleanItemForStorage, prices from receipt
  - Step 9: List created with status="active", sourceReceiptId set to the receipt ID
  - Step 10: sourceReceiptId matches the receipt._id from step 5
  - Step 11: Matching pantry items have lastPrice updated, priceSource="receipt", lastStoreName="Tesco"

---

**TC-INTG-004: Multi-Store Trip -- Tesco to Aldi to Lidl**
- **Priority**: P1
- **Category**: Integration
- **Preconditions**: Premium user with an active shopping list containing 9 items. Stores Tesco, Aldi, Lidl configured in store preferences.
- **Steps**:
  1. Start trip with initial store set to Tesco
  2. Check off 3 items at Tesco (milk 1.50, bread 1.10, eggs 2.00)
  3. Switch store to Aldi via switchStoreMidShop mutation
  4. Check off 3 items at Aldi (butter 1.80, cheese 2.50, yogurt 0.90)
  5. Switch store to Lidl
  6. Check off remaining 3 items at Lidl (rice 1.20, pasta 0.80, sauce 1.50)
  7. Finish the trip
  8. View trip summary with store breakdown
- **Expected**:
  - Step 1: storeSegments = [{storeId:"tesco", storeName:"Tesco", switchedAt:...}]
  - Step 2: Items get purchasedAtStoreId="tesco", purchasedAtStoreName="Tesco"
  - Step 3: normalizedStoreId updated to "aldi", new segment appended to storeSegments
  - Step 4: Items get purchasedAtStoreId="aldi", purchasedAtStoreName="Aldi"
  - Step 5: Third segment appended, storeSegments.length === 3
  - Step 6: Items get purchasedAtStoreId="lidl", purchasedAtStoreName="Lidl"
  - Step 7: List status="completed", actualTotal=13.30, storeBreakdown has 3 entries
  - Step 8: Trip summary storeBreakdown: Tesco (3 items, 4.60), Aldi (3 items, 5.20), Lidl (3 items, 3.50). Header shows "Tesco | Aldi | Lidl" as confirmed stores.

---

**TC-INTG-005: Partner Collaborative Shopping -- Real-Time Sync**
- **Priority**: P1
- **Category**: Integration
- **Preconditions**: Two premium users (User A owner, User B partner). User A has shared a list with User B via listPartners. User B has status="accepted". Convex real-time subscriptions active.
- **Steps**:
  1. User A opens the shared list on Device A
  2. User B opens the same shared list on Device B
  3. User A adds item "500ml Orange Juice" to the list
  4. Verify item appears on Device B within 1 second
  5. User B checks off "Orange Juice" on Device B
  6. Verify check-off reflected on Device A within 1 second
  7. User A starts trip at Tesco
  8. Verify Device B shows trip started with active shopper = User A
  9. User B adds mid-shop item "Crisps" on Device B
  10. Verify item appears on Device A with addedMidShop=true
- **Expected**:
  - Step 3: Item created with userId=User A, cleanItemForStorage applied (name="Orange Juice", size="500ml", unit="ml")
  - Step 4: Convex real-time subscription pushes new item to Device B in < 1s
  - Step 5: checkedByUserId = User B's ID, purchasedAtStoreId from list's current store
  - Step 6: Convex subscription fires on Device A showing isChecked=true within < 1s
  - Step 8: Device B query returns shoppingStartedAt set, activeShopperId = User A
  - Step 9: Item created with userId=User B, addedMidShop=true
  - Step 10: Real-time sync delivers to Device A in < 1s

---

**TC-INTG-006: Free to Trial Transition -- Onboarding Complete**
- **Priority**: P0
- **Category**: Integration
- **Preconditions**: New user account created via Clerk auth. No existing subscription record. Onboarding not yet completed.
- **Steps**:
  1. User signs up and lands on welcome screen
  2. Complete cuisine preferences step (select "Nigerian", "British")
  3. Complete store preferences step (select Tesco, Aldi)
  4. Complete pantry seeding step (seed 5 items)
  5. Complete review step and tap "Get Started"
  6. Verify subscription record created with status="trial"
  7. Verify trialEndsAt is exactly 7 days from now
  8. Verify all premium features accessible (unlimited lists, partner mode, 200 voice/mo)
  9. Verify notification created: "Premium Trial Started!"
  10. Navigate to Profile and verify tier shows "Premium Trial"
- **Expected**:
  - Step 2: cuisinePreferences saved to user document as ["Nigerian", "British"]
  - Step 3: storePreferences.favorites saved as ["tesco", "aldi"]
  - Step 4: 5 pantryItems created with status="active", stockLevel="stocked"
  - Step 5: user.onboardingComplete set to true, trackFunnelEvent fired
  - Step 6: Subscription inserted: plan="premium_monthly", status="trial", trialEndsAt = now + 7*24*60*60*1000
  - Step 7: trialEndsAt is within 1 second of expected timestamp
  - Step 8: getPlanFeatures returns maxLists=-1, partnerMode=true, maxVoiceRequests=200
  - Step 9: Notification with type="trial_started", body contains "7 days"
  - Step 10: Profile screen shows trial badge and days remaining

---

**TC-INTG-007: Trial to Expired Transition -- Day 8**
- **Priority**: P0
- **Category**: Integration
- **Preconditions**: User with active trial subscription. trialEndsAt set to 1 hour ago (simulating day 8). expireTrials cron has not yet run.
- **Steps**:
  1. Query getCurrentSubscription for the user
  2. Verify effectiveStatus returns "expired" even before cron runs (read-time guard)
  3. Attempt to create a 3rd shopping list (free limit is 2)
  4. Verify creation blocked with appropriate message
  5. Attempt to use partner mode
  6. Verify partner mode blocked
  7. Verify voice requests limited to 10/month (free tier)
  8. Trigger expireTrials cron manually
  9. Verify subscription status in DB updated to "expired"
  10. Verify user still has access to existing 2 lists (read-only not blocked)
- **Expected**:
  - Step 2: effectiveStatus(sub) returns "expired" because isTrialExpired checks trialEndsAt <= Date.now()
  - Step 3: canCreateList returns {allowed: false, reason: "Free plan allows 2 active lists..."}
  - Step 4: Error message mentions upgrading to Premium
  - Step 6: requireFeature("partnerMode") returns {allowed: false}
  - Step 7: getAILimit("free", "voice") returns 10
  - Step 8: expireTrials mutation patches status to "expired"
  - Step 9: DB record shows status="expired", updatedAt refreshed
  - Step 10: Existing lists are readable; list queries do not fail

---

**TC-INTG-008: Expired to Premium Transition -- Stripe Checkout**
- **Priority**: P0
- **Category**: Integration
- **Preconditions**: User with expired trial. Valid test Stripe payment method. Stripe webhook endpoint configured.
- **Steps**:
  1. Navigate to subscription page showing expired trial status
  2. Select "Premium Monthly" plan at 2.99/month
  3. Complete Stripe Checkout with test card 4242424242424242
  4. Stripe webhook fires with event checkout.session.completed
  5. Verify upsertSubscription called with status="active", plan="premium_monthly"
  6. Verify trackFunnelEvent records "subscribed" event
  7. Verify all premium features immediately accessible
  8. Attempt to create a 3rd and 4th shopping list
  9. Verify unlimited lists allowed (maxLists=-1)
  10. Navigate to Profile and verify "Premium Monthly" badge
- **Expected**:
  - Step 3: Stripe returns success, redirects back to app
  - Step 5: Subscription patched: status="active", plan="premium_monthly", stripeCustomerId and stripeSubscriptionId populated
  - Step 6: funnelEvents table has entry with stage="subscribed"
  - Step 7: isEffectivelyPremium returns true, getPlanFeatures("premium_monthly") returns full features
  - Step 9: canCreateList returns {allowed: true} for 3rd and 4th lists
  - Step 10: Profile shows "Premium Monthly", currentPeriodEnd shows next billing date

---

**TC-INTG-009: Premium to Cancelled Transition -- Active Until Period End**
- **Priority**: P1
- **Category**: Integration
- **Preconditions**: Premium monthly user with currentPeriodEnd set to 15 days from now. Active subscription with stripeSubscriptionId.
- **Steps**:
  1. Navigate to subscription management
  2. Tap "Cancel Subscription"
  3. Verify cancelSubscription mutation sets status="cancelled"
  4. Verify premium features still accessible (within paid period)
  5. Verify currentPeriodEnd unchanged (user keeps access until end)
  6. Simulate currentPeriodEnd passing (set to past)
  7. Query hasPremium
  8. Verify premium access revoked (isEffectivelyPremium returns false for "cancelled")
  9. Verify feature limits revert to free tier
  10. Verify existing data (lists, pantry) still accessible but creation limited
- **Expected**:
  - Step 3: Subscription status updated to "cancelled", updatedAt refreshed
  - Step 4: effectiveStatus returns "cancelled"; isEffectivelyPremium returns false for "cancelled" status -- NOTE: cancellation immediately restricts features in current implementation
  - Step 8: hasPremium query returns false
  - Step 9: getFreeFeatures() applied: maxLists=2, maxPantryItems=30, voice=10/mo
  - Step 10: Existing lists remain accessible for reading; new creation subject to free limits

---

**TC-INTG-010: Receipt Scan Earns Points and Updates Tier -- Bronze to Silver Boundary**
- **Priority**: P0
- **Category**: Integration
- **Preconditions**: Premium user with lifetimeScans=19 (one scan away from Silver at threshold 20). earningScansThisMonth < maxEarningScans. Points balance initialized.
- **Steps**:
  1. Scan a new receipt (unique, no duplicate hash)
  2. processEarnPoints called with userId and receiptId
  3. Verify idempotency check passes (no prior earn transaction for this receipt)
  4. Verify tier computed from lifetimeScans=19 is Bronze (pointsPerScan=150)
  5. Verify 150 points awarded (Bronze premium rate)
  6. Verify tierProgress incremented from 19 to 20
  7. Verify getTierFromScans(20) returns Silver tier
  8. Verify pointsBalance.tier updated to "silver"
  9. Verify pointsTransaction created with type="earn", amount=150, source="receipt_scan"
  10. Verify checkPointsAchievements called with new tier
  11. Scan same receipt again
  12. Verify idempotency: "already_earned" returned, no duplicate points
- **Expected**:
  - Step 3: No existing pointsTransaction with matching receiptId and type="earn"
  - Step 4: getTierFromScans(19) returns Bronze (threshold 0)
  - Step 5: getPointsPerScan(Bronze, isPremium=true) returns 150
  - Step 6: balance.tierProgress patched from 19 to 20
  - Step 7: getTierFromScans(20) returns Silver (threshold 20)
  - Step 8: balance.tier = "silver"
  - Step 9: Transaction: {type:"earn", amount:150, balanceBefore:X, balanceAfter:X+150, metadata:{tierAtEarn:"bronze"}}
  - Step 10: internal.insights.checkPointsAchievements called
  - Step 12: processEarnPoints returns {earned: false, reason: "already_earned"}

---

**TC-INTG-011: Trip Completion Updates Streaks and Challenges**
- **Priority**: P1
- **Category**: Integration
- **Preconditions**: Premium user with an active weekly challenge of type "complete_lists" (target=3, current progress=2). User has a shopping streak at currentCount=6, lastActivityDate=yesterday. Active shopping list with trip in progress.
- **Steps**:
  1. Check off all remaining items on the list
  2. Finish the trip via finishTrip mutation
  3. Verify list status changed to "completed"
  4. Trigger streak update with type="shopping"
  5. Verify streak incremented from 6 to 7
  6. Verify streak achievement check triggered at count 7
  7. Verify weekly challenge progress updated from 2 to 3
  8. Verify challenge marked as completed (completedAt set)
  9. Verify challenge reward points awarded (15 points for "complete_lists")
  10. Verify all updates reflected in insights dashboard
- **Expected**:
  - Step 2: List patched: status="completed", completedAt=now, actualTotal calculated
  - Step 3: list.status === "completed"
  - Step 5: streak.currentCount=7, lastActivityDate=today, longestCount updated if 7 > longestCount
  - Step 6: checkStreakAchievement called because 7 >= 7
  - Step 7: Challenge progress incremented; 3 >= target of 3
  - Step 8: challenge.completedAt = now
  - Step 9: Points transaction with source containing challenge reference
  - Step 10: Insights page shows updated streak and completed challenge

---

**TC-INTG-012: Achievement Unlock Triggers Celebration**
- **Priority**: P2
- **Category**: Integration
- **Preconditions**: Premium user approaching an achievement threshold. For example: "First Silver" achievement -- user at 19 lifetime scans. Achievement not yet unlocked.
- **Steps**:
  1. Perform the action that unlocks the achievement (scan 20th receipt)
  2. Verify achievement record created in database
  3. Verify confetti animation triggered on the client
  4. Verify toast notification displayed with achievement details
  5. Verify push notification sent (if expoPushToken set)
  6. Verify achievement visible in profile/achievements section
  7. Verify points bonus awarded for achievement unlock (if applicable)
  8. Dismiss celebration UI
  9. Verify achievement persists and shows in history
- **Expected**:
  - Step 1: processEarnPoints completes, tier transitions to Silver, checkPointsAchievements fires
  - Step 2: Achievement record with type, unlockedAt timestamp, metadata
  - Step 3: Client receives real-time update, confetti component renders
  - Step 4: GlassAlert or toast shows "Achievement Unlocked: Silver Scanner!"
  - Step 5: Notification inserted with type containing "achievement"
  - Step 6: Achievements list includes the new unlock with icon and description
  - Step 7: Bonus points transaction if achievement grants points
  - Step 8: Confetti clears, toast dismisses
  - Step 9: Achievement record remains in DB, visible on subsequent visits

---

## SUITE 17: Performance Testing (TC-PERF-001 to TC-PERF-010)

Performance benchmarks ensure the app remains responsive under realistic conditions. All thresholds are measured on a mid-range Android device (e.g., Samsung Galaxy A54) or equivalent iOS device unless otherwise stated.

---

**TC-PERF-001: App Cold Start Time**
- **Priority**: P0
- **Category**: Performance
- **Preconditions**: App fully closed (not in recent apps). Device is a mid-range Android (Samsung Galaxy A54 or equivalent). Network connection is stable 4G/LTE.
- **Steps**:
  1. Force-close the Oja app (clear from recent apps)
  2. Wait 5 seconds for process cleanup
  3. Start a stopwatch and tap the Oja app icon
  4. Stop timing when the first interactive screen renders (either auth screen or home tab)
  5. Repeat 5 times and calculate average
- **Expected**:
  - Step 4: First meaningful paint (interactive content visible) within 3 seconds
  - Step 5: Average cold start time < 3.0s across 5 runs. P95 < 4.0s. No white screen or flash-of-unstyled-content lasting > 500ms.

---

**TC-PERF-002: List Load -- Small List (10 Items)**
- **Priority**: P0
- **Category**: Performance
- **Preconditions**: Shopping list with exactly 10 items. Each item has name, size, unit, estimatedPrice, and category populated. User is authenticated and on the Lists tab.
- **Steps**:
  1. Navigate to Lists tab (ensure list is not cached)
  2. Tap on the 10-item shopping list
  3. Measure time from tap to all 10 items rendered with prices visible
  4. Verify skeleton loading state appears during load
  5. Scroll up and down through the list
  6. Verify all items display correctly with formatItemDisplay format
- **Expected**:
  - Step 3: Full list render (all 10 items visible with prices) in < 500ms from navigation
  - Step 4: SkeletonCard loading states shown if render exceeds 100ms
  - Step 5: Smooth scrolling at 60fps with no dropped frames
  - Step 6: All items show "{size} {name}" format, all prices visible (zero-blank guarantee)

---

**TC-PERF-003: List Load -- Large List (100 Items)**
- **Priority**: P1
- **Category**: Performance
- **Preconditions**: Shopping list with exactly 100 items across multiple categories. Each item has full data (name, size, unit, estimatedPrice, category, priority). User is authenticated.
- **Steps**:
  1. Navigate to the 100-item shopping list
  2. Measure time from tap to first screen of items rendered
  3. Scroll rapidly from top to bottom
  4. Measure FPS during rapid scroll using device profiler
  5. Scroll to bottom, then back to top
  6. Check off 10 items rapidly in succession
  7. Verify optimistic updates for each check-off
- **Expected**:
  - Step 2: First screen of items rendered in < 1.0s
  - Step 3: No blank frames or jank during rapid scroll
  - Step 4: Sustained 60fps during scroll. Dropped frames < 5% of total frames
  - Step 5: Return to top is instant, no re-render flicker
  - Step 6: Each check-off animates immediately (< 100ms via optimistic update)
  - Step 7: Optimistic updates apply instantly; server confirmation follows

---

**TC-PERF-004: Pantry Load -- Large Pantry (100+ Items)**
- **Priority**: P1
- **Category**: Performance
- **Preconditions**: User with 120 pantry items across 8+ categories. Mix of stock levels (stocked, low, out). Some items pinned. Premium subscription active.
- **Steps**:
  1. Navigate to Stock tab
  2. Measure time from tab tap to pantry items rendered
  3. Verify category grouping renders correctly
  4. Scroll through entire pantry
  5. Filter by "low" stock level
  6. Verify filter applies in < 200ms
  7. Tap a pantry item to edit stock level
  8. Verify stock level change animates smoothly
- **Expected**:
  - Step 2: Pantry items rendered in < 1.0s with category headers
  - Step 3: All 8+ categories visible with correct item grouping
  - Step 4: Smooth 60fps scroll through 120 items
  - Step 5: Filter transition smooth, no full re-render
  - Step 6: Filtered results display in < 200ms
  - Step 7: Edit modal or inline editor opens in < 300ms
  - Step 8: Stock level icon/badge updates instantly via optimistic update

---

**TC-PERF-005: Receipt OCR Processing Time**
- **Priority**: P0
- **Category**: Performance
- **Preconditions**: Camera or image picker ready. Test receipt image (clear, well-lit, standard UK supermarket format, 10-15 items). Network connection stable.
- **Steps**:
  1. Open Scan tab in receipt mode
  2. Capture receipt image
  3. Start timing from capture confirmation to OCR results displayed
  4. Verify Gemini 2.0 Flash processes the image
  5. Verify extracted items, store name, and total displayed
  6. Test with a blurry/poor quality receipt image
  7. Verify graceful handling (retry or error message)
- **Expected**:
  - Step 3: OCR processing completes in < 5.0s for a clear receipt
  - Step 4: Gemini 2.0 Flash used as primary; OpenAI fallback available
  - Step 5: Store name, date, total, and line items extracted accurately (> 90% accuracy for clear receipts)
  - Step 6: Processing may take longer (< 8s) but should not hang
  - Step 7: Error message displayed within 10s; option to retry or enter manually

---

**TC-PERF-006: Voice Response Latency**
- **Priority**: P1
- **Category**: Performance
- **Preconditions**: Dev build with expo-speech-recognition. Microphone permission granted. Quiet environment. Voice assistant enabled. Convex backend running.
- **Steps**:
  1. Activate Tobi voice assistant
  2. Speak a simple command: "What is on my list?"
  3. Measure time from end of speech to start of Tobi's response (STT + AI + TTS)
  4. Speak a complex command: "Add 500 grams of chicken breast to my Tesco list"
  5. Measure end-to-end latency for complex command
  6. Test 5 consecutive commands without reactivation
  7. Verify no degradation in response time across consecutive queries
- **Expected**:
  - Step 3: Total latency (STT + Gemini 2.5 Flash Lite + TTS) < 3.0s
  - Step 4: Complex command with tool use < 4.0s
  - Step 5: Mutation (addItem) executes as part of the response flow
  - Step 6: Each response < 3.0s, no cumulative delay
  - Step 7: 5th command latency within 20% of 1st command latency

---

**TC-PERF-007: Real-Time Sync Latency Between Partners**
- **Priority**: P1
- **Category**: Performance
- **Preconditions**: Two devices connected to the same Convex backend. Shared shopping list between two premium users (partner status="accepted"). Both devices on stable WiFi.
- **Steps**:
  1. User A opens the shared list on Device A
  2. User B opens the shared list on Device B
  3. User A adds an item and starts a precise timer
  4. Measure time until item appears on Device B
  5. Repeat 10 times and calculate average and P95
  6. User B checks off an item; measure sync to Device A
  7. Test during concurrent edits (both users adding items simultaneously)
- **Expected**:
  - Step 4: Item appears on Device B in < 1.0s (Convex real-time subscription)
  - Step 5: Average < 500ms, P95 < 1.0s
  - Step 6: Check-off reflected on Device A in < 1.0s
  - Step 7: No data loss during concurrent edits; both items appear on both devices; Convex handles conflict resolution

---

**TC-PERF-008: Memory Usage -- 30-Minute Extended Session**
- **Priority**: P2
- **Category**: Performance
- **Preconditions**: Fresh app start on Android. Memory profiler attached (Android Studio Profiler or equivalent). Shopping list with 50 items.
- **Steps**:
  1. Record baseline memory usage after initial load
  2. Navigate between all 4 tabs (Lists, Stock, Scan, Profile) 5 times each
  3. Open and close 3 different shopping lists
  4. Perform 5 receipt scans (camera preview open/close cycles)
  5. Use voice assistant for 3 commands
  6. Scroll through large pantry (100 items) back and forth 10 times
  7. Record memory usage at 10-minute intervals (0, 10, 20, 30 min)
  8. Compare final memory to baseline
- **Expected**:
  - Step 1: Baseline memory < 150MB
  - Step 7: Memory at each interval should not exceed 1.5x baseline
  - Step 8: Final memory within 20% of baseline (no sustained leak). Temporary spikes (during camera, voice) acceptable if they reclaim. No OutOfMemory errors. Garbage collection occurs between major screen transitions.

---

**TC-PERF-009: Battery Consumption -- 1-Hour Session**
- **Priority**: P3
- **Category**: Performance
- **Preconditions**: Device charged to 100%. Screen brightness at 50%. WiFi connected. Background app refresh disabled for other apps.
- **Steps**:
  1. Record battery level at start (100%)
  2. Use app actively for 30 minutes: browse lists, add items, check items, navigate tabs
  3. Use app passively for 30 minutes: leave on list detail screen (Convex subscription active)
  4. Record battery level at end
  5. Check system battery usage breakdown for Oja
- **Expected**:
  - Step 4: Total battery consumption < 10% for the 1-hour session
  - Step 5: Oja should not appear as top battery consumer. Active usage (30 min) < 7%. Passive usage with Convex WebSocket (30 min) < 3%. No excessive wake locks or background CPU usage.

---

**TC-PERF-010: Network Resilience -- Slow 3G Connection**
- **Priority**: P1
- **Category**: Performance
- **Preconditions**: Network throttled to simulated slow 3G (download: 780kbps, upload: 330kbps, latency: 200ms). User authenticated with cached data.
- **Steps**:
  1. Open the app on slow 3G
  2. Navigate to a shopping list
  3. Add an item to the list
  4. Check off an item
  5. Navigate to Stock tab
  6. Attempt receipt scan
  7. Activate voice assistant
  8. Switch network off completely (airplane mode) for 10 seconds then restore
- **Expected**:
  - Step 1: App loads from cache; Convex reconnection may take 2-5s
  - Step 2: List loads with skeleton states; data arrives within 3-5s
  - Step 3: Optimistic update shows item immediately; server sync < 5s
  - Step 4: Check-off animates instantly (optimistic); confirmation < 5s
  - Step 5: Pantry loads within 3-5s with skeleton states
  - Step 6: Receipt scan should show loading indicator; OCR may take 10-15s on slow 3G; timeout message if > 30s
  - Step 7: Voice STT may fail or have high latency; graceful error message displayed
  - Step 8: App handles disconnection without crash; "Reconnecting..." indicator shown; data syncs correctly when network restores; no data loss

---

## SUITE 18: Security Testing (TC-SECU-001 to TC-SECU-015)

Security tests verify authentication, authorization, data isolation, and protection against common attack vectors.

---

**TC-SECU-001: Auth Required for All Protected Routes**
- **Priority**: P0
- **Category**: Security
- **Preconditions**: Unauthenticated session (no Clerk token). App or API accessible.
- **Steps**:
  1. Attempt to navigate to /(app)/(tabs)/index.tsx (Lists tab) without authentication
  2. Attempt to navigate to /(app)/(tabs)/stock.tsx (Stock tab) without authentication
  3. Attempt to navigate to /(app)/(tabs)/scan.tsx (Scan tab)
  4. Attempt to navigate to /(app)/(tabs)/profile.tsx (Profile tab)
  5. Attempt to navigate to /(app)/list/[id].tsx with a valid list ID
  6. Attempt to navigate to /(app)/admin.tsx
  7. Verify all routes redirect to auth screen
- **Expected**:
  - Step 1-6: Each route is inside the (app) route group which is protected by ClerkProvider + auth check
  - Step 7: All attempts redirect to (auth)/ screen with sign-in prompt. No flash of protected content. No data leakage in network responses.

---

**TC-SECU-002: User Data Isolation -- Cross-User Access Prevention**
- **Priority**: P0
- **Category**: Security
- **Preconditions**: Two authenticated users (User A, User B). User A has 3 shopping lists and 20 pantry items. User B has 2 shopping lists and 10 pantry items. No sharing between them.
- **Steps**:
  1. Authenticate as User B
  2. Attempt to query User A's shopping lists by manipulating list ID in URL
  3. Attempt to call toggleChecked mutation on User A's list item
  4. Attempt to query User A's pantry items by ID
  5. Attempt to read User A's receipt data
  6. Attempt to read User A's points balance
  7. Attempt to read User A's subscription status
- **Expected**:
  - Step 2: Query returns null or empty (by_user index scoped to User B's userId)
  - Step 3: Mutation throws "Not authorized" or "Unauthorized" (requireOwnership or permission check fails)
  - Step 4: Query returns null (by_user index prevents cross-user access)
  - Step 5: Receipt query returns null (by_user index scoped)
  - Step 6: Points query returns null (by_user index scoped)
  - Step 7: Subscription query returns null or User B's subscription only

---

**TC-SECU-003: Admin Routes Require isAdmin=true**
- **Priority**: P0
- **Category**: Security
- **Preconditions**: Authenticated non-admin user. Admin dashboard routes exist at /(app)/admin/*.
- **Steps**:
  1. Navigate to /(app)/admin.tsx as non-admin user
  2. Attempt to call adjustUserPoints mutation
  3. Attempt to call resetUserByEmail mutation
  4. Attempt to access admin analytics queries
  5. Attempt to manipulate request to include isAdmin=true in user document
- **Expected**:
  - Step 1: Admin dashboard shows "Admin privileges required" error or redirects
  - Step 2: requireAdmin(ctx) throws "Admin privileges required"
  - Step 3: requireAdmin(ctx) throws "Admin privileges required"
  - Step 4: Admin queries return null or throw auth error
  - Step 5: User document isAdmin field is server-side only; client cannot self-elevate. Convex mutations ignore client-supplied isAdmin.

---

**TC-SECU-004: requireCurrentUser Enforcement on All Mutations**
- **Priority**: P0
- **Category**: Security
- **Preconditions**: No authentication token (expired or missing Clerk session).
- **Steps**:
  1. Call addItem mutation without auth token
  2. Call toggleChecked mutation without auth token
  3. Call createList mutation without auth token
  4. Call updatePantryItem mutation without auth token
  5. Call startFreeTrial mutation without auth token
  6. Call cancelSubscription mutation without auth token
  7. Verify all mutations that modify user data call requireCurrentUser or requireUser
- **Expected**:
  - Step 1-6: Each mutation throws "Not authenticated" error
  - Step 7: Code audit confirms every mutation in shoppingLists/, listItems/, pantry/, subscriptions.ts, points/ calls requireCurrentUser(ctx) or a wrapper (requireUser) as the first operation

---

**TC-SECU-005: requireAdmin Enforcement on Admin Mutations**
- **Priority**: P0
- **Category**: Security
- **Preconditions**: Authenticated non-admin user. Admin mutations accessible via API.
- **Steps**:
  1. Call adjustUserPoints mutation as non-admin
  2. Call resetUserByEmail mutation as non-admin
  3. Call any mutation in convex/admin/ directory as non-admin
  4. Call expireOldPoints (internal mutation) -- verify it is internalMutation (not callable from client)
  5. Call checkFraudAlerts (internal mutation) -- verify not client-callable
- **Expected**:
  - Step 1: requireAdmin throws "Admin privileges required"
  - Step 2: requireAdmin throws "Admin privileges required"
  - Step 3: All admin mutations fail with "Admin privileges required"
  - Step 4: internalMutation not exposed via api.* -- Convex blocks direct client calls
  - Step 5: internalMutation not exposed via api.* -- only callable via ctx.runMutation(internal.*)

---

**TC-SECU-006: Partner List Access Control -- Non-Partner Blocked**
- **Priority**: P1
- **Category**: Security
- **Preconditions**: User A owns a shopping list. User C is NOT a partner on this list (no listPartners record). User B IS a partner with status="accepted".
- **Steps**:
  1. Authenticate as User C
  2. Attempt to view User A's list via direct ID
  3. Attempt to add an item to User A's list
  4. Attempt to check off items on User A's list
  5. Attempt to start a trip on User A's list
  6. Authenticate as User B (accepted partner)
  7. Verify User B can view and edit the list
- **Expected**:
  - Step 2: getTripStats/getTripSummary returns null (partner check: no listPartners record for User C)
  - Step 3: Mutation throws "Unauthorized" (getUserListPermissions returns canEdit=false)
  - Step 4: Mutation throws "Unauthorized"
  - Step 5: markTripStart throws "Unauthorized" (perms.canEdit check)
  - Step 7: User B can successfully view and edit (getUserListPermissions returns canEdit=true)

---

**TC-SECU-007: RBAC Permission Enforcement -- Moderator Limitations**
- **Priority**: P1
- **Category**: Security
- **Preconditions**: Admin user with role "moderator" (limited admin permissions). Full admin user with role "super_admin". Both authenticated.
- **Steps**:
  1. Authenticate as moderator
  2. Access admin dashboard -- verify read access to Overview, Users, Analytics
  3. Attempt to suspend a user (requires admin.users.suspend permission)
  4. Attempt to adjust user points
  5. Attempt to change admin settings
  6. Authenticate as super_admin
  7. Verify all admin actions available
- **Expected**:
  - Step 2: Moderator can view dashboard tabs with read permissions
  - Step 3: Action blocked if moderator lacks "users.suspend" permission in RBAC config
  - Step 4: adjustUserPoints requires requireAdmin; moderator with isAdmin=true passes, but granular RBAC may further restrict
  - Step 5: Settings changes blocked for moderator role
  - Step 7: Super admin has full access to all admin functions

---

**TC-SECU-008: Receipt Duplicate Fraud Prevention -- SHA-256 Hash**
- **Priority**: P0
- **Category**: Security
- **Preconditions**: Premium user. One receipt already scanned and saved with imageHash stored in receiptHashes table.
- **Steps**:
  1. Scan the exact same receipt image again
  2. Verify imageHash computed matches the existing hash in receiptHashes
  3. Verify receipt flagged or rejected as duplicate
  4. Attempt to earn points for the duplicate receipt
  5. Verify points NOT awarded (idempotency check in processEarnPoints)
  6. Scan a slightly modified version of the same receipt (cropped or rotated)
  7. Verify hash detection handles common modifications
- **Expected**:
  - Step 2: SHA-256 hash of receipt image matches existing entry in receiptHashes table
  - Step 3: Receipt saved but with fraudFlags containing "duplicate_hash" or similar warning
  - Step 4: processEarnPoints checks for existing earn transaction for this receiptId
  - Step 5: Returns {earned: false, reason: "already_earned"} -- no duplicate points
  - Step 6: Minor modifications may produce different hash; receipt validation layer applies additional heuristics
  - Step 7: fraudFlags populated if heuristics detect suspicious patterns (same store, same total, same day)

---

**TC-SECU-009: Points Fraud Detection**
- **Priority**: P1
- **Category**: Security
- **Preconditions**: checkFraudAlerts cron configured. Test environment with controllable receipt creation.
- **Steps**:
  1. Create 15 receipts with fraudFlags in a 6-hour window (exceeding threshold of 10)
  2. Trigger checkFraudAlerts internal mutation
  3. Verify adminAlerts record created with alertType="high_fraud_activity"
  4. Verify alert severity is "warning"
  5. Verify alert message contains the count of flagged receipts
  6. Attempt to earn points on a flagged receipt
  7. Verify points still awarded (fraud flags are warnings, not blocks) unless blocked by other checks
- **Expected**:
  - Step 2: checkFraudAlerts queries receipts created in last 6 hours with non-undefined fraudFlags
  - Step 3: adminAlerts entry: {alertType:"high_fraud_activity", message:"15 flagged receipts in last 6 hours", severity:"warning"}
  - Step 4: severity = "warning" (not "critical" for 15 flagged)
  - Step 5: Message includes "15 flagged receipts"
  - Step 6: Points awarded if no duplicate earn transaction exists (fraud flags are informational)
  - Step 7: Admin must manually review and take action on fraud alerts

---

**TC-SECU-010: Session Management -- Sign Out Clears Session**
- **Priority**: P0
- **Category**: Security
- **Preconditions**: Authenticated user with active session. Shopping list data cached locally.
- **Steps**:
  1. Verify user is authenticated and can access protected routes
  2. Sign out via Profile > Sign Out
  3. Verify Clerk session token cleared
  4. Verify local state/cache cleared
  5. Attempt to navigate to /(app)/ routes
  6. Verify redirect to auth screen
  7. Press device back button
  8. Verify no protected content visible
- **Expected**:
  - Step 2: signOut() called on Clerk client
  - Step 3: No Clerk token in storage; ctx.auth.getUserIdentity() returns null
  - Step 4: Convex cache invalidated; UserSwitchContext blocks queries during switch to prevent cache leakage
  - Step 5: Redirected to (auth)/ screen
  - Step 6: Auth screen displayed, no flash of previous user's data
  - Step 7: Back button does not expose protected content
  - Step 8: Only auth/public screens accessible

---

**TC-SECU-011: Password Masked in UI**
- **Priority**: P1
- **Category**: Security
- **Preconditions**: Auth flow using Clerk. Password input field on sign-in/sign-up screen.
- **Steps**:
  1. Navigate to sign-in screen
  2. Tap password field and enter "TestPassword123!"
  3. Verify password characters are masked (shown as dots or asterisks)
  4. Verify no plaintext password visible in field
  5. Toggle "show password" if available
  6. Verify password revealed only when toggled
  7. Check accessibility tree does not expose password text
- **Expected**:
  - Step 3: All characters displayed as masked characters (dots/asterisks)
  - Step 4: secureTextEntry=true on TextInput (React Native)
  - Step 5: If toggle exists, password shown only while toggled on
  - Step 6: Returns to masked state when toggled off
  - Step 7: Screen reader does not read out password characters; input has appropriate accessibility role

---

**TC-SECU-012: No Sensitive Data in Console Logs**
- **Priority**: P1
- **Category**: Security
- **Preconditions**: App running in development mode with console visible. User performing standard operations.
- **Steps**:
  1. Open developer console/logcat
  2. Perform sign-in with email and password
  3. Check console for any password or auth token output
  4. Perform receipt scan
  5. Check console for any API keys (GEMINI_API_KEY, OPENAI_API_KEY)
  6. Navigate through Stripe checkout flow
  7. Check console for STRIPE_SECRET_KEY or payment card details
  8. Search all console output for patterns: /key/i, /secret/i, /password/i, /token/i
- **Expected**:
  - Step 3: No password or raw auth token in console output
  - Step 5: No API keys in client logs (GEMINI_API_KEY and OPENAI_API_KEY are server-side Convex environment variables)
  - Step 7: No Stripe secret key or card numbers in console
  - Step 8: No matches for sensitive patterns in production builds; dev builds may show Clerk publishable key (this is intentionally public) but no secret keys

---

**TC-SECU-013: API Keys Not in Client Bundle**
- **Priority**: P0
- **Category**: Security
- **Preconditions**: Production build of the app. Bundle analysis tools available.
- **Steps**:
  1. Build the production app bundle (expo build or eas build)
  2. Extract/inspect the JavaScript bundle
  3. Search bundle for "GEMINI_API_KEY" string
  4. Search bundle for "OPENAI_API_KEY" string
  5. Search bundle for "STRIPE_SECRET_KEY" string
  6. Search bundle for "CLERK_SECRET_KEY" string
  7. Verify only EXPO_PUBLIC_* variables are present in client bundle
- **Expected**:
  - Step 3: GEMINI_API_KEY not found (server-only, Convex Dashboard env)
  - Step 4: OPENAI_API_KEY not found (server-only, Convex Dashboard env)
  - Step 5: STRIPE_SECRET_KEY not found (server-only, Convex Dashboard env)
  - Step 6: CLERK_SECRET_KEY not found (server-only, Convex Dashboard env)
  - Step 7: Only EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY and EXPO_PUBLIC_CONVEX_URL found (intentionally public client-side variables)

---

**TC-SECU-014: XSS Prevention -- Script Tags in Item Names**
- **Priority**: P1
- **Category**: Security
- **Preconditions**: Authenticated user. Shopping list available for adding items.
- **Steps**:
  1. Add item with name: `<script>alert('xss')</script>`
  2. Verify item saved (cleanItemForStorage processes name)
  3. View the item in the shopping list
  4. Verify no JavaScript execution occurs
  5. Add item with name: `<img onerror="alert(1)" src="x">`
  6. Verify HTML rendered as escaped text, not as HTML elements
  7. Add item with name: `javascript:alert(1)`
  8. Verify name displayed as literal text
  9. Test in Web (Expo Web) specifically where XSS is most relevant
- **Expected**:
  - Step 2: Item name stored as literal string (React Native/Web auto-escapes in JSX)
  - Step 4: No alert() dialog; script tags displayed as text in React Native Text component
  - Step 5: HTML stored as literal string
  - Step 6: Rendered as escaped text: `<img onerror="alert(1)" src="x">` visible as literal text
  - Step 8: "javascript:alert(1)" displayed as plain text
  - Step 9: Expo Web (React DOM) auto-escapes JSX content; no innerHTML usage with user data

---

**TC-SECU-015: Account Deletion Removes All PII -- GDPR Compliance**
- **Priority**: P0
- **Category**: Security
- **Preconditions**: User account with full data: shopping lists, list items, pantry items, receipts, price history, points balance, points transactions, subscriptions, notifications, streaks, challenges. Admin has access to verify deletion.
- **Steps**:
  1. Navigate to Profile > Delete Account
  2. Confirm account deletion
  3. Verify user document deleted or anonymized
  4. Verify all shopping lists deleted
  5. Verify all list items deleted
  6. Verify all pantry items deleted
  7. Verify all receipts deleted
  8. Verify all price history records deleted
  9. Verify points balance and transactions deleted
  10. Verify subscription records deleted
  11. Verify notifications deleted
  12. Verify Clerk user identity removed
  13. Attempt to sign in with deleted credentials
- **Expected**:
  - Step 3: User document removed from users table or PII fields nullified
  - Step 4-11: All related records cascade-deleted (per resetUserByEmail pattern in accountManagement.ts)
  - Step 12: Clerk user identity deleted or deactivated
  - Step 13: Sign-in fails; no ghost account accessible. All PII completely removed per GDPR Article 17 (Right to Erasure).

---

## SUITE 19: Accessibility Testing (TC-ACCS-001 to TC-ACCS-007)

Accessibility tests ensure the app is usable by people with disabilities, meeting WCAG 2.1 AA standards.

---

**TC-ACCS-001: Screen Reader Compatibility -- VoiceOver and TalkBack**
- **Priority**: P1
- **Category**: Accessibility
- **Preconditions**: iOS device with VoiceOver enabled OR Android device with TalkBack enabled. App installed and user authenticated.
- **Steps**:
  1. Enable VoiceOver (iOS) or TalkBack (Android)
  2. Navigate through the 4 main tabs using gestures
  3. Verify each tab announces its name and selection state
  4. Navigate to a shopping list
  5. Verify each list item announces: name, size, price, checked/unchecked state
  6. Check off an item using screen reader gestures
  7. Verify state change announced ("checked" or "completed")
  8. Navigate to the budget dial
  9. Verify budget amount and remaining amount announced
  10. Navigate through the Profile tab
  11. Verify all settings and buttons are reachable and labeled
- **Expected**:
  - Step 2: Tab bar items have accessibilityLabel; each announces "Lists tab", "Stock tab", "Scan tab", "Profile tab"
  - Step 3: Selected tab announces "selected" state
  - Step 5: List items use accessibilityLabel with format "{size} {name}, {price}, {priority}, {checked state}"
  - Step 6: AnimatedPressable and touchable elements are focusable and activatable
  - Step 7: Screen reader announces "checked" after toggle; haptic feedback fires
  - Step 9: Budget announced as "Budget: 25 pounds, 14 pounds 70 remaining"
  - Step 11: All interactive elements have labels; no unlabeled buttons or icons

---

**TC-ACCS-002: Touch Target Sizes >= 44x44 Points**
- **Priority**: P1
- **Category**: Accessibility
- **Preconditions**: App running on a standard device. Layout inspector or accessibility scanner available.
- **Steps**:
  1. Inspect the PersistentTabBar tab buttons
  2. Measure touch target of list item check-off circle
  3. Measure touch target of "Add Item" button
  4. Measure touch target of category filter pills
  5. Measure touch target of budget dial interaction area
  6. Measure touch target of pantry stock level buttons
  7. Inspect any icon-only buttons (edit, delete, share)
- **Expected**:
  - Step 1: Each tab target >= 44x44 points (per Apple HIG and WCAG)
  - Step 2: Check-off circle touch target >= 44x44 points (may have invisible padding)
  - Step 3: Add Item button >= 44x44 points
  - Step 4: Category pills >= 44x44 points in height, adequate width
  - Step 5: Budget dial interactive area >= 44x44 points
  - Step 6: Stock level buttons >= 44x44 points
  - Step 7: Icon buttons have minimum 44x44 point hit area via hitSlop or padding

---

**TC-ACCS-003: Color Contrast Ratios -- WCAG AA Compliance**
- **Priority**: P1
- **Category**: Accessibility
- **Preconditions**: Glass UI design system active. Color contrast analysis tool available (e.g., Accessibility Scanner, axe). Design tokens from glassTokens.ts.
- **Steps**:
  1. Measure contrast of primary text (white) against dark background (#0D1528)
  2. Measure contrast of primary accent (#00D4AA) against dark background
  3. Measure contrast of warm accent (#FFB088) against dark background
  4. Measure contrast of secondary/muted text against background
  5. Measure contrast of price text against list item background
  6. Measure contrast of budget remaining text
  7. Verify error state text (red) against background
  8. Verify disabled/inactive element contrast
- **Expected**:
  - Step 1: White (#FFFFFF) on #0D1528 = ~17.4:1 ratio (passes AAA)
  - Step 2: #00D4AA on #0D1528 should be >= 4.5:1 for normal text; if used for large text, >= 3:1
  - Step 3: #FFB088 on #0D1528 should be >= 4.5:1 for normal text
  - Step 4: Muted text must be >= 4.5:1 for WCAG AA
  - Step 5: Price text >= 4.5:1 contrast ratio
  - Step 6: Budget remaining text >= 4.5:1
  - Step 7: Error/danger text >= 4.5:1
  - Step 8: Disabled elements should still meet 3:1 minimum contrast for discernibility

---

**TC-ACCS-004: Font Scaling Support -- System Largest Font**
- **Priority**: P1
- **Category**: Accessibility
- **Preconditions**: Device accessibility settings accessible. App installed.
- **Steps**:
  1. Set device font size to maximum/largest
  2. Launch the app
  3. Verify text on all tabs is readable and not clipped
  4. Verify shopping list items do not overflow their containers
  5. Verify tab bar labels remain visible (or switch to icon-only gracefully)
  6. Verify buttons remain tappable with enlarged text
  7. Verify no horizontal scrolling required for standard content
  8. Verify formatItemDisplay truncation (40 char limit) still works at large font
- **Expected**:
  - Step 2: App launches without crash
  - Step 3: All text scales proportionally; no text hidden behind other elements
  - Step 4: List items wrap or truncate gracefully; no text overflow outside bounds
  - Step 5: Tab bar adapts to larger text without overlap
  - Step 6: Buttons expand vertically to accommodate larger text; remain tappable
  - Step 7: No horizontal scroll on main content screens
  - Step 8: Item names truncated with ellipsis at 40-char display limit work correctly at all font sizes

---

**TC-ACCS-005: Reduce Motion Support -- Animations Reduced or Disabled**
- **Priority**: P2
- **Category**: Accessibility
- **Preconditions**: Device has "Reduce Motion" accessibility setting available (iOS: Settings > Accessibility > Motion > Reduce Motion; Android: Settings > Accessibility > Remove Animations).
- **Steps**:
  1. Enable "Reduce Motion" / "Remove Animations" on device
  2. Launch the app
  3. Navigate between tabs
  4. Verify AnimatedSection stagger animations are reduced or instant
  5. Open a shopping list
  6. Verify list item check-off animation is reduced to simple state change
  7. Verify confetti celebration animation is suppressed
  8. Verify screen transitions are immediate (no slide/fade)
  9. Verify haptic feedback still works (haptics are separate from visual motion)
- **Expected**:
  - Step 4: AnimatedSection uses accessibilityReduceMotion to skip stagger delays
  - Step 5: List renders without entrance animations
  - Step 6: Check-off shows state change without bouncing/scaling animation
  - Step 7: Confetti component respects reduceMotion preference; shows static "Achievement Unlocked" message instead
  - Step 8: Navigation transitions are instant crossfade or cut
  - Step 9: Haptic feedback from safeHaptics.ts still fires (motion reduction applies to visual only)

---

**TC-ACCS-006: Focus Indicators -- Keyboard Navigation on Web**
- **Priority**: P2
- **Category**: Accessibility
- **Preconditions**: Expo Web build running in browser. Physical keyboard attached. Mouse not used for navigation.
- **Steps**:
  1. Load app in browser (Expo Web)
  2. Press Tab to move focus to first interactive element
  3. Verify visible focus indicator (outline, ring, or highlight) on focused element
  4. Tab through the tab bar
  5. Verify each tab shows focus indicator before activation
  6. Press Enter/Space to activate focused tab
  7. Tab through shopping list items
  8. Verify focus order is logical (top to bottom, left to right)
  9. Press Enter/Space to check off a focused list item
  10. Verify focus remains in logical position after state change
- **Expected**:
  - Step 2: First focusable element receives visible focus ring
  - Step 3: Focus indicator has sufficient contrast (>= 3:1 against adjacent colors)
  - Step 4: Tab bar items receive focus in order
  - Step 5: Each tab visually highlighted before activation
  - Step 6: Tab activates on Enter/Space press
  - Step 7: List items are focusable; AnimatedPressable supports keyboard interaction
  - Step 8: Tab order follows DOM order, which matches visual order
  - Step 9: Item checks off; state change reflected visually and announced
  - Step 10: Focus does not jump unexpectedly; remains on the toggled item or next logical element

---

**TC-ACCS-007: Error Messages Announced by Screen Reader**
- **Priority**: P1
- **Category**: Accessibility
- **Preconditions**: Screen reader enabled (VoiceOver or TalkBack). Scenarios that trigger error states.
- **Steps**:
  1. Attempt to create a 3rd list as free user (triggers limit error)
  2. Verify error message announced by screen reader
  3. Submit an item with invalid size (e.g., size="large" with no unit)
  4. Verify validation error announced
  5. Attempt an action with no network
  6. Verify network error announced
  7. Attempt to access a deleted list via deep link
  8. Verify "not found" error announced
- **Expected**:
  - Step 2: GlassAlert or error component has accessibilityRole="alert" or uses accessibilityLiveRegion="assertive" (Android), causing screen reader to immediately announce "Free plan allows 2 active lists..."
  - Step 4: Validation error announced via live region or alert role
  - Step 6: Network error announced: "Unable to connect. Please check your connection."
  - Step 8: Error state announced: "List not found" or equivalent

---

## EDGE CASE MATRICES

### Matrix 1: Item Name Parser Edge Cases

| # | Input (name, size, unit) | Expected Output (name, size, unit) | Related Test Case |
|---|---|---|---|
| 1 | `("500ml Milk", null, null)` | `{name:"Milk", size:"500ml", unit:"ml"}` | TC-INTG-001 |
| 2 | `("Milk 500ml", null, null)` | `{name:"Milk", size:"500ml", unit:"ml"}` | TC-INTG-001 |
| 3 | `("Milk", "500ml", "ml")` | `{name:"Milk", size:"500ml", unit:"ml"}` | TC-INTG-002 |
| 4 | `("Milk", "per item", "each")` | `{name:"Milk", size:undefined, unit:undefined}` | TC-INTG-001 |
| 5 | `("Milk", "large", null)` | `{name:"Milk", size:undefined, unit:undefined}` | TC-INTG-003 |
| 6 | `("Butter", "227g (8oz)", "g")` | `{name:"Butter", size:"227g", unit:"g"}` | TC-INTG-003 |
| 7 | `("8 FL OZ / 237 mL Conditioner", null, null)` | `{name:"Conditioner", size:"237ml", unit:"ml"}` | TC-INTG-003 |
| 8 | `("347ml/12 fl oz Juice", null, null)` | `{name:"Juice", size:"347ml", unit:"ml"}` | TC-INTG-003 |
| 9 | `("", null, null)` | `{name:"", size:undefined, unit:undefined}` | TC-SECU-014 |
| 10 | `("A Very Long Product Name That Exceeds The Maximum Display Character Limit Set For Items In The App", "500ml", "ml")` | `{name:"A Very Long Product Name...", size:"500ml", unit:"ml"}` -- display truncated to 40 chars | TC-ACCS-004 |
| 11 | `("12345", null, null)` | `{name:"12345", size:undefined, unit:undefined}` -- numeric name, no valid size pattern | TC-SECU-014 |
| 12 | `("Milk", "500", null)` | `{name:"Milk", size:undefined, unit:undefined}` -- size without unit REJECTED | TC-INTG-001 |
| 13 | `("Milk", "500ml", "kg")` | `{name:"Milk", size:undefined, unit:undefined}` -- unit mismatch REJECTED | TC-INTG-001 |
| 14 | `("2kg Basmati Rice", "2kg", "kg")` | `{name:"Basmati Rice", size:"2kg", unit:"kg"}` -- size stripped from name | TC-INTG-004 |
| 15 | `("  Milk  ", "  500ml  ", "  ml  ")` | `{name:"Milk", size:"500ml", unit:"ml"}` -- whitespace trimmed | TC-INTG-001 |
| 16 | `("<script>alert('xss')</script>", null, null)` | `{name:"<script>alert('xss')</script>", size:undefined, unit:undefined}` -- stored as literal | TC-SECU-014 |
| 17 | `("4 pack Yogurt", null, null)` | `{name:"Yogurt", size:"4pack", unit:"pack"}` | TC-INTG-001 |
| 18 | `("Semi-Skimmed Milk", "2pt", "pt")` | `{name:"Semi-Skimmed Milk", size:"2pt", unit:"pt"}` -- pint unit valid | TC-INTG-002 |

### Matrix 2: Subscription State Transitions

| Current State | Action | Expected New State | Feature Access |
|---|---|---|---|
| None (no record) | Complete onboarding | Trial (7 days) | Premium: unlimited lists, partner mode, 200 voice/mo |
| Trial (active) | Day 7, trialEndsAt not reached | Trial | Premium features continue |
| Trial (active) | Day 8, trialEndsAt <= now | Expired (read-time guard) | Free: 2 lists, 30 pantry, 10 voice/mo, no partner |
| Trial (active) | expireTrials cron runs | Expired (DB updated) | Free tier features |
| Trial (active) | Subscribe via Stripe | Active | Premium: unlimited everything |
| Expired | Subscribe via Stripe | Active | Premium features restored |
| Active (monthly) | Cancel subscription | Cancelled | Features revoked immediately (current implementation) |
| Active (annual) | Cancel subscription | Cancelled | Features revoked immediately (current implementation) |
| Cancelled | Subscribe again via Stripe | Active | Premium features restored |
| Cancelled | Period end passes | Cancelled (remains) | Free tier |
| Free (no subscription) | Subscribe via Stripe | Active | Premium features granted |
| Any state | User has isAdmin=true | Treated as Active | Full premium (admin override via isEffectivelyPremium check) |
| Active | Stripe payment fails | Depends on Stripe webhook | May transition to cancelled/expired via webhook |

### Matrix 3: Points Earning Matrix

| Tier | Is Premium? | Points/Scan | Max Earning Scans/Month | Max Points/Month (base) | Lifetime Scans Required |
|---|---|---|---|---|---|
| Bronze | No (Free) | 100 | 1 | 100 | 0 |
| Bronze | Yes (Premium) | 150 | 4 | 600 | 0 |
| Silver | Yes (Premium) | 175 | 5 | 875 | 20 |
| Gold | Yes (Premium) | 200 | 6 | 1,200 | 50 |
| Platinum | Yes (Premium) | 225 | 6 | 1,350 | 100 |

**Notes:**
- Free users are always Bronze tier rate (100 pts/scan, 1 scan/month max)
- Streak bonuses: 3 weeks = +50, 4 weeks = +100, 8 weeks = +250, 12 weeks = +500
- Seasonal events can multiply points, add flat bonuses, or apply tier boosts
- Points expire after 12 months (expireOldPoints cron)
- Duplicate receipt scans (same receiptId) return "already_earned" -- idempotent

### Matrix 4: Feature Gating Matrix

| Feature | Free Tier | Trial (7 days) | Premium (Monthly/Annual) |
|---|---|---|---|
| Max Active Lists | 2 | Unlimited (-1) | Unlimited (-1) |
| Max Pantry Items | 30 | Unlimited (-1) | Unlimited (-1) |
| Partner Mode | No | Yes | Yes |
| Voice Requests/Month | 10 | 200 | 200 |
| Receipt Scanning | Unlimited (tracking) | Unlimited | Unlimited |
| Point-Earning Scans/Month | 1 (at 100pts) | Tier-based (150-225pts) | Tier-based (150-225pts) |
| Price Estimates/Month | 30 | 200 | 200 |
| Health Analysis/Month | 10 | 50 | 50 |
| List Suggestions/Month | 20 | 100 | 100 |
| Product Scan/Month | 20 | 100 | 100 |
| Item Variants/Month | 15 | 60 | 60 |
| Pantry Seed | 3 | 10 | 10 |
| TTS (Text-to-Speech)/Month | 50 | 300 | 300 |
| Price History | Yes | Yes | Yes |
| Insights | Yes | Yes | Yes |
| Export Data | Yes | Yes | Yes |

### Matrix 5: Store Tracking State Matrix

| Action | Confirmed Stores (pipe-separated) | Tentative Store | Header Display | normalizedStoreId |
|---|---|---|---|---|
| Create list (no store) | (empty) | (none) | (no store shown) | undefined |
| Start trip at Tesco | (empty) | Tesco | "Tesco" (tentative preview) | "tesco" |
| Check off item at Tesco | "Tesco" | (none) | "Tesco" (confirmed, permanent) | "tesco" |
| Switch to Aldi (no checkout) | "Tesco" | Aldi | "Tesco | Aldi" (Aldi tentative) | "aldi" |
| Check off item at Aldi | "Tesco | Aldi" | (none) | "Tesco | Aldi" (both confirmed) | "aldi" |
| Switch to Lidl | "Tesco | Aldi" | Lidl | "Tesco | Aldi | Lidl" (Lidl tentative) | "lidl" |
| Switch to Asda (no checkout at Lidl) | "Tesco | Aldi" | Asda | "Tesco | Aldi | Asda" (replaces Lidl tentative) | "asda" |
| Check off item at Asda | "Tesco | Aldi | Asda" | (none) | "Tesco | Aldi | Asda" (all confirmed) | "asda" |
| Finish trip | "Tesco | Aldi | Asda" | (none) | storeSegments records full history | "asda" (last) |

**Key Rules:**
- Confirmed stores = stores where at least one item was checked off (purchasedAtStoreId set on listItem). Permanent.
- Tentative store = current active store with no check-offs yet. Replaced when switching to another store.
- Header shows confirmed stores (pipe-separated) plus tentative store (if any) as preview.
- storeSegments is an append-only chronological log of all store switches during the trip.

---

## REGRESSION TEST CHECKLIST

### Critical Path (Run Before Every Release)

The following test cases MUST pass before any release to production. Failure in any of these blocks the release.

| # | Test Case ID | Description | Feature Area |
|---|---|---|---|
| 1 | TC-INTG-001 | Complete shopping journey end-to-end | Core Flow |
| 2 | TC-SECU-001 | Auth required for all protected routes | Auth |
| 3 | TC-SECU-002 | User data isolation | Auth |
| 4 | TC-SECU-004 | requireCurrentUser on all mutations | Auth |
| 5 | TC-INTG-006 | Free to trial transition | Subscription |
| 6 | TC-INTG-007 | Trial to expired transition | Subscription |
| 7 | TC-INTG-008 | Expired to premium transition | Subscription |
| 8 | TC-INTG-010 | Receipt scan earns points + tier update | Points |
| 9 | TC-SECU-008 | Receipt duplicate fraud prevention | Security |
| 10 | TC-SECU-013 | API keys not in client bundle | Security |
| 11 | TC-PERF-002 | Small list load < 500ms | Performance |
| 12 | TC-PERF-001 | Cold start < 3s | Performance |
| 13 | TC-INTG-004 | Multi-store trip attribution | Store Tracking |
| 14 | TC-SECU-015 | Account deletion GDPR compliance | Security |
| 15 | TC-ACCS-001 | Screen reader compatibility | Accessibility |

### Feature-Specific Regression

#### Auth & Session Management
| Test Case ID | Description |
|---|---|
| TC-SECU-001 | Auth required for all protected routes |
| TC-SECU-002 | User data isolation |
| TC-SECU-003 | Admin routes require isAdmin |
| TC-SECU-004 | requireCurrentUser on mutations |
| TC-SECU-005 | requireAdmin on admin mutations |
| TC-SECU-010 | Sign out clears session |

#### Shopping Lists
| Test Case ID | Description |
|---|---|
| TC-INTG-001 | Complete shopping journey |
| TC-INTG-004 | Multi-store trip |
| TC-INTG-005 | Partner collaborative shopping |
| TC-PERF-002 | Small list load performance |
| TC-PERF-003 | Large list load performance |

#### Pantry
| Test Case ID | Description |
|---|---|
| TC-INTG-001 | Pantry restock after trip (steps 12-13) |
| TC-PERF-004 | Large pantry load performance |
| TC-INTG-006 | Pantry seeding during onboarding |

#### Receipt Scanning
| Test Case ID | Description |
|---|---|
| TC-INTG-003 | Receipt-first workflow |
| TC-INTG-010 | Receipt earns points |
| TC-SECU-008 | Duplicate fraud prevention |
| TC-PERF-005 | OCR processing time |

#### Voice Assistant (Tobi)
| Test Case ID | Description |
|---|---|
| TC-INTG-002 | Voice-driven list creation |
| TC-PERF-006 | Voice response latency |

#### Subscription & Payments
| Test Case ID | Description |
|---|---|
| TC-INTG-006 | Free to trial transition |
| TC-INTG-007 | Trial to expired transition |
| TC-INTG-008 | Expired to premium transition |
| TC-INTG-009 | Premium to cancelled transition |

#### Points & Gamification
| Test Case ID | Description |
|---|---|
| TC-INTG-010 | Points earning and tier boundary |
| TC-INTG-011 | Streaks and challenges |
| TC-INTG-012 | Achievement celebrations |
| TC-SECU-009 | Points fraud detection |

---

## EXPLORATORY TESTING CHARTERS

### Charter 1: New User Experience

- **Mission**: Explore the entire new user journey from first launch to completing a first shopping trip, looking for confusion, friction, bugs, and missing guidance.
- **Time Box**: 60 minutes
- **Focus Areas**:
  - Sign-up flow via Clerk (email, social auth)
  - Onboarding steps: welcome, cuisine preferences, store selection, pantry seeding, review
  - Trial activation and premium feature availability
  - First shopping list creation with budget
  - First item addition (manual, voice, scan)
  - First trip start and check-off flow
  - First receipt scan and reconciliation
  - Tutorial hints visibility and helpfulness
- **Notes**:
  - Pay attention to loading states during onboarding (Convex subscriptions initializing)
  - Check if onboarding can be interrupted and resumed
  - Verify haptic feedback fires at each interaction
  - Note any moments of confusion where the user might abandon
- **Risks to Watch**:
  - Trial not starting after onboarding completion
  - Pantry seeding failing silently (free tier limit: 3 seeds, trial: 10)
  - ClerkProvider initialization race condition
  - Empty state screens not showing helpful prompts

### Charter 2: Power User Workflow

- **Mission**: Simulate a heavy user managing many lists, a large pantry, frequent scanning, and using all premium features simultaneously to find performance issues and edge cases.
- **Time Box**: 90 minutes
- **Focus Areas**:
  - Create 10+ shopping lists with varying budgets and stores
  - Maintain 100+ pantry items across all categories
  - Scan 5+ receipts in a single session
  - Use voice assistant for rapid command sequences
  - Partner sharing across 3+ lists
  - Check insights dashboard with rich data
  - View points history with many transactions
  - Navigate rapidly between tabs and screens
- **Notes**:
  - Monitor memory usage during extended use
  - Check if Convex real-time subscriptions degrade with many open queries
  - Test voice assistant context injection with large data sets (many lists, big pantry)
  - Verify points monthly cap enforcement across multiple scans
- **Risks to Watch**:
  - Memory leaks from Convex subscription accumulation
  - Voice context exceeding Gemini token limits
  - Points month-boundary race condition (earningScansThisMonth reset)
  - Large list rendering jank

### Charter 3: Offline and Network Edge Cases

- **Mission**: Test app behavior under adverse network conditions including complete offline, intermittent connectivity, slow 3G, and network transitions.
- **Time Box**: 45 minutes
- **Focus Areas**:
  - Launch app in airplane mode
  - Toggle airplane mode during active operations (adding items, checking off, scanning)
  - Simulate slow 3G during receipt OCR
  - Network switch: WiFi to cellular during trip
  - Convex WebSocket reconnection behavior
  - Optimistic update behavior when server is unreachable
  - Data consistency after reconnection
- **Notes**:
  - Convex optimistic updates should apply immediately but may roll back on server rejection
  - Receipt OCR requires network; test timeout behavior
  - Voice assistant requires network for STT and AI; test fallback
  - Check for duplicate data creation after reconnection
- **Risks to Watch**:
  - Data loss from failed optimistic updates
  - Duplicate items created after reconnection
  - Receipt scan hanging indefinitely without timeout
  - Voice assistant crash on network loss mid-conversation
  - Convex "Reconnecting..." state not shown to user

### Charter 4: Multi-Device Sync

- **Mission**: Test the real-time sync experience across multiple devices and users, looking for conflict resolution issues, stale data, and sync failures.
- **Time Box**: 60 minutes
- **Focus Areas**:
  - Same user on two devices (phone + tablet/web)
  - Two partners editing same list simultaneously
  - One device offline, other online, then sync
  - Rapid concurrent edits (both add items at exact same time)
  - Partner check-off while owner is adding items
  - Store switch on one device, view on another
  - Sign out on one device, verify other device
- **Notes**:
  - Convex handles conflict resolution server-side; test that client reflects correct state
  - UserSwitchContext should prevent cache leakage between users
  - Check that activeShopperId is correctly set and cleared
  - Test Convex subscription reconnection on device wake
- **Risks to Watch**:
  - Lost updates during concurrent edits
  - activeShopperId conflict between two partners
  - Stale cache showing after user switch (UserSwitchContext failure)
  - Convex subscription not reconnecting after device sleep

### Charter 5: Boundary Pushing

- **Mission**: Push all input fields and data structures to their limits, testing maximum values, special characters, rapid actions, and boundary conditions.
- **Time Box**: 60 minutes
- **Focus Areas**:
  - Item name at exactly 40 characters (MAX_DISPLAY_CHARS)
  - Item name at 41 characters (truncation with ellipsis)
  - Item name with special characters: emojis, unicode, RTL text, HTML tags
  - Budget set to 0, negative, 99999.99, decimal precision
  - Quantity set to 0, 999, fractional (0.5)
  - Rapid tap: check/uncheck item 20 times in 5 seconds
  - Create exactly 2 lists as free user, then try 3rd
  - Add exactly 30 pantry items as free user, then try 31st
  - Scan receipt with 0 items, 1 item, 50+ items
  - Voice command with background noise, very long sentence, foreign language
- **Notes**:
  - cleanItemForStorage should handle all edge cases gracefully
  - Feature gating boundaries at exact limits (2 lists, 30 pantry)
  - Rapid tapping should not create duplicate mutations (idempotency)
  - Budget precision: check for floating-point arithmetic issues
- **Risks to Watch**:
  - Floating-point budget rounding errors (e.g., 10.30 shown as 10.299999)
  - Unicode/emoji causing display issues
  - Rapid tap creating race conditions in check-off mutations
  - Free tier boundary off-by-one (allows 3 instead of 2)
  - Very long receipt causing OCR timeout

### Charter 6: Partner Mode Chaos

- **Mission**: Stress test the partner collaboration features with simultaneous edits, permission boundaries, and edge cases that could cause data inconsistency.
- **Time Box**: 45 minutes
- **Focus Areas**:
  - Both partners adding items simultaneously
  - Partner removing item while owner is editing it
  - Partner attempting to delete the list
  - Owner revoking partner access while partner is actively shopping
  - Partner starting trip while owner has already started
  - Three-way sharing (if supported) or attempting to add unauthorized third user
  - Partner on free tier collaborating with premium owner
  - Real-time sync of check-offs, store switches, and budget changes
- **Notes**:
  - getUserListPermissions should enforce correct canEdit permissions
  - activeShopperId should prevent two people from starting trips simultaneously
  - listPartners status transitions: pending -> accepted, pending -> rejected
  - Premium features apply to list owner, not partner tier
- **Risks to Watch**:
  - Race condition: both partners start trip at exact same moment
  - Partner access not revoked in real-time (cached permissions)
  - Data inconsistency from concurrent item deletions
  - Free-tier partner accessing premium features through shared list

---

## BUG REPORTING TEMPLATE

```markdown
# Bug Report

## Bug ID
BUG-[YYYY]-[NNN]

## Date Reported
[YYYY-MM-DD]

## Reporter
[Name / Email]

## Severity
- [ ] S1 - Critical (app crash, data loss, security breach)
- [ ] S2 - Major (feature broken, workaround exists)
- [ ] S3 - Minor (cosmetic, minor inconvenience)
- [ ] S4 - Trivial (typo, suggestion)

## Priority
- [ ] P0 - Fix immediately (release blocker)
- [ ] P1 - Fix before next release
- [ ] P2 - Fix in next sprint
- [ ] P3 - Backlog

## Summary
[One-line description of the bug]

## Environment
| Field | Value |
|---|---|
| Platform | iOS / Android / Web |
| Device | [e.g., Samsung Galaxy A54, iPhone 15, Chrome 120] |
| OS Version | [e.g., Android 14, iOS 17.2] |
| App Version | [e.g., 1.2.0 (build 45)] |
| User Type | Free / Trial / Premium / Admin |
| Subscription Status | [e.g., trial (day 3), active, expired] |
| Network | WiFi / 4G / 3G / Offline |

## Steps to Reproduce
1. [First step]
2. [Second step]
3. [Third step]
...

## Expected Behavior
[What should happen]

## Actual Behavior
[What actually happens]

## Frequency
- [ ] Always (100%)
- [ ] Often (> 50%)
- [ ] Sometimes (10-50%)
- [ ] Rarely (< 10%)
- [ ] Once

## Screenshots / Videos
[Attach screenshots or screen recordings]

## Logs
```
[Paste relevant console logs, error stack traces, or Convex function logs]
```

## Related Test Case
[e.g., TC-INTG-001, TC-SECU-008]

## Additional Notes
[Any additional context, workarounds, or related issues]
```

---

## TEST EXECUTION TRACKING TEMPLATE

### Test Run Summary

| Field | Value |
|---|---|
| **Run ID** | TR-[YYYY]-[NNN] |
| **Date** | [YYYY-MM-DD] |
| **Tester** | [Name] |
| **Build Version** | [e.g., 1.2.0 (build 45)] |
| **Environment** | Development / Staging / Production |
| **Platform** | iOS / Android / Web / All |
| **Convex Deployment** | [e.g., dev / preview / production] |
| **Test Suite(s)** | [e.g., Suite 16 + Suite 18] |
| **Trigger** | [e.g., Pre-release, Sprint end, Hotfix validation] |

### Execution Results

| Test Case | Title | Priority | Status | Duration | Notes | Bug ID |
|---|---|---|---|---|---|---|
| TC-INTG-001 | Complete shopping journey | P0 | Pass / Fail / Blocked / Skip | [mm:ss] | [Notes] | [BUG-ID or N/A] |
| TC-INTG-002 | Voice-driven list creation | P1 | Pass / Fail / Blocked / Skip | [mm:ss] | [Notes] | [BUG-ID or N/A] |
| TC-INTG-003 | Receipt-first workflow | P1 | Pass / Fail / Blocked / Skip | [mm:ss] | [Notes] | [BUG-ID or N/A] |
| TC-INTG-004 | Multi-store trip | P1 | Pass / Fail / Blocked / Skip | [mm:ss] | [Notes] | [BUG-ID or N/A] |
| TC-INTG-005 | Partner collaborative shopping | P1 | Pass / Fail / Blocked / Skip | [mm:ss] | [Notes] | [BUG-ID or N/A] |
| TC-INTG-006 | Free to trial transition | P0 | Pass / Fail / Blocked / Skip | [mm:ss] | [Notes] | [BUG-ID or N/A] |
| TC-INTG-007 | Trial to expired transition | P0 | Pass / Fail / Blocked / Skip | [mm:ss] | [Notes] | [BUG-ID or N/A] |
| TC-INTG-008 | Expired to premium transition | P0 | Pass / Fail / Blocked / Skip | [mm:ss] | [Notes] | [BUG-ID or N/A] |
| TC-INTG-009 | Premium to cancelled transition | P1 | Pass / Fail / Blocked / Skip | [mm:ss] | [Notes] | [BUG-ID or N/A] |
| TC-INTG-010 | Receipt earns points + tier | P0 | Pass / Fail / Blocked / Skip | [mm:ss] | [Notes] | [BUG-ID or N/A] |
| TC-INTG-011 | Trip updates streaks/challenges | P1 | Pass / Fail / Blocked / Skip | [mm:ss] | [Notes] | [BUG-ID or N/A] |
| TC-INTG-012 | Achievement celebration | P2 | Pass / Fail / Blocked / Skip | [mm:ss] | [Notes] | [BUG-ID or N/A] |
| TC-PERF-001 | Cold start < 3s | P0 | Pass / Fail / Blocked / Skip | [mm:ss] | [Notes] | [BUG-ID or N/A] |
| TC-PERF-002 | Small list load < 500ms | P0 | Pass / Fail / Blocked / Skip | [mm:ss] | [Notes] | [BUG-ID or N/A] |
| TC-PERF-003 | Large list load < 1s | P1 | Pass / Fail / Blocked / Skip | [mm:ss] | [Notes] | [BUG-ID or N/A] |
| TC-PERF-004 | Large pantry load < 1s | P1 | Pass / Fail / Blocked / Skip | [mm:ss] | [Notes] | [BUG-ID or N/A] |
| TC-PERF-005 | Receipt OCR < 5s | P0 | Pass / Fail / Blocked / Skip | [mm:ss] | [Notes] | [BUG-ID or N/A] |
| TC-PERF-006 | Voice latency < 3s | P1 | Pass / Fail / Blocked / Skip | [mm:ss] | [Notes] | [BUG-ID or N/A] |
| TC-PERF-007 | Partner sync < 1s | P1 | Pass / Fail / Blocked / Skip | [mm:ss] | [Notes] | [BUG-ID or N/A] |
| TC-PERF-008 | Memory 30-min session | P2 | Pass / Fail / Blocked / Skip | [mm:ss] | [Notes] | [BUG-ID or N/A] |
| TC-PERF-009 | Battery 1-hour session | P3 | Pass / Fail / Blocked / Skip | [mm:ss] | [Notes] | [BUG-ID or N/A] |
| TC-PERF-010 | Slow 3G resilience | P1 | Pass / Fail / Blocked / Skip | [mm:ss] | [Notes] | [BUG-ID or N/A] |
| TC-SECU-001 | Auth on protected routes | P0 | Pass / Fail / Blocked / Skip | [mm:ss] | [Notes] | [BUG-ID or N/A] |
| TC-SECU-002 | User data isolation | P0 | Pass / Fail / Blocked / Skip | [mm:ss] | [Notes] | [BUG-ID or N/A] |
| TC-SECU-003 | Admin routes require isAdmin | P0 | Pass / Fail / Blocked / Skip | [mm:ss] | [Notes] | [BUG-ID or N/A] |
| TC-SECU-004 | requireCurrentUser enforcement | P0 | Pass / Fail / Blocked / Skip | [mm:ss] | [Notes] | [BUG-ID or N/A] |
| TC-SECU-005 | requireAdmin enforcement | P0 | Pass / Fail / Blocked / Skip | [mm:ss] | [Notes] | [BUG-ID or N/A] |
| TC-SECU-006 | Partner access control | P1 | Pass / Fail / Blocked / Skip | [mm:ss] | [Notes] | [BUG-ID or N/A] |
| TC-SECU-007 | RBAC permission enforcement | P1 | Pass / Fail / Blocked / Skip | [mm:ss] | [Notes] | [BUG-ID or N/A] |
| TC-SECU-008 | Receipt duplicate fraud | P0 | Pass / Fail / Blocked / Skip | [mm:ss] | [Notes] | [BUG-ID or N/A] |
| TC-SECU-009 | Points fraud detection | P1 | Pass / Fail / Blocked / Skip | [mm:ss] | [Notes] | [BUG-ID or N/A] |
| TC-SECU-010 | Session management | P0 | Pass / Fail / Blocked / Skip | [mm:ss] | [Notes] | [BUG-ID or N/A] |
| TC-SECU-011 | Password masked | P1 | Pass / Fail / Blocked / Skip | [mm:ss] | [Notes] | [BUG-ID or N/A] |
| TC-SECU-012 | No secrets in console | P1 | Pass / Fail / Blocked / Skip | [mm:ss] | [Notes] | [BUG-ID or N/A] |
| TC-SECU-013 | API keys not in bundle | P0 | Pass / Fail / Blocked / Skip | [mm:ss] | [Notes] | [BUG-ID or N/A] |
| TC-SECU-014 | XSS prevention | P1 | Pass / Fail / Blocked / Skip | [mm:ss] | [Notes] | [BUG-ID or N/A] |
| TC-SECU-015 | GDPR account deletion | P0 | Pass / Fail / Blocked / Skip | [mm:ss] | [Notes] | [BUG-ID or N/A] |
| TC-ACCS-001 | Screen reader compatibility | P1 | Pass / Fail / Blocked / Skip | [mm:ss] | [Notes] | [BUG-ID or N/A] |
| TC-ACCS-002 | Touch targets >= 44pt | P1 | Pass / Fail / Blocked / Skip | [mm:ss] | [Notes] | [BUG-ID or N/A] |
| TC-ACCS-003 | Color contrast WCAG AA | P1 | Pass / Fail / Blocked / Skip | [mm:ss] | [Notes] | [BUG-ID or N/A] |
| TC-ACCS-004 | Font scaling support | P1 | Pass / Fail / Blocked / Skip | [mm:ss] | [Notes] | [BUG-ID or N/A] |
| TC-ACCS-005 | Reduce motion support | P2 | Pass / Fail / Blocked / Skip | [mm:ss] | [Notes] | [BUG-ID or N/A] |
| TC-ACCS-006 | Focus indicators (Web) | P2 | Pass / Fail / Blocked / Skip | [mm:ss] | [Notes] | [BUG-ID or N/A] |
| TC-ACCS-007 | Error messages announced | P1 | Pass / Fail / Blocked / Skip | [mm:ss] | [Notes] | [BUG-ID or N/A] |

### Summary Metrics

| Metric | Count |
|---|---|
| **Total Test Cases** | [N] |
| **Passed** | [N] |
| **Failed** | [N] |
| **Blocked** | [N] |
| **Skipped** | [N] |
| **Pass Rate** | [N]% |
| **P0 Pass Rate** | [N]% |
| **P1 Pass Rate** | [N]% |
| **Total Bugs Found** | [N] |
| **S1 Bugs** | [N] |
| **S2 Bugs** | [N] |
| **Total Execution Time** | [HH:MM] |

### Release Sign-Off

| Role | Name | Signature | Date | Decision |
|---|---|---|---|---|
| **QA Lead** | [Name] | __________ | [YYYY-MM-DD] | Go / No-Go |
| **Dev Lead** | [Name] | __________ | [YYYY-MM-DD] | Go / No-Go |
| **Product Owner** | [Name] | __________ | [YYYY-MM-DD] | Go / No-Go |

**Release Decision**: [ ] GO / [ ] NO-GO

**Conditions for Go** (if applicable):
- [ ] All P0 tests pass (100%)
- [ ] P1 pass rate >= 95%
- [ ] No open S1 bugs
- [ ] No open S2 bugs in critical path
- [ ] Performance benchmarks met

**Notes**:
[Any release conditions, known issues accepted, or deferred items]

---

*End of Part 6: Integration, Performance, Security, Accessibility, Edge Case Matrices, Regression & Templates*
