# Modularization Strategy: The "Oja 500" Plan (v2)

This document outlines the strategy for refactoring Oja's oversized files into maintainable, testable modules. Based on a full codebase audit of **60 files over 400 lines** totalling **~58,000 lines** of code requiring attention.

---

## 1. Core Principles

### The Size Targets

Not all files are equal. Size targets are adjusted by file type:

| File Type | Target | Hard Limit | Rationale |
|:----------|:-------|:-----------|:----------|
| Backend queries/mutations (`.ts`) | < 400 lines | 500 lines | Convex functions should be focused on single domain |
| Backend actions (AI/external) (`.ts`) | < 500 lines | 600 lines | Complex prompts and API orchestration are unavoidable |
| Frontend screens (`.tsx`) | < 300 lines | 400 lines | Screens should delegate to components and hooks |
| Frontend components (`.tsx`) | < 350 lines | 450 lines | React Native state management adds verbosity |
| Hooks (`.ts`) | < 200 lines | 250 lines | Single responsibility, composable |
| Utilities/lib (`.ts`) | < 300 lines | 400 lines | Focused domain logic |
| Library files (multi-export) | < 500 lines | 600 lines | Files exporting 5+ related items (e.g., GlassAnimations) are acceptable |

### Guiding Rules

- **Zero-Breakage Delegation:** Keep the original file path. Move logic to sub-modules and re-export from the original file. All `api.module.function` Convex paths remain stable.
- **Test-Mirroring:** Every new source module must have a corresponding test file.
- **Validation First:** No refactor is complete without passing `npm run typecheck`, `npm test`, and a successful `npx expo start` build.
- **Single Responsibility:** Each extracted module should have one clear reason to change.
- **No Premature Abstraction:** Only extract when a file exceeds the hard limit OR contains clearly separable domains. Three similar lines are better than a premature helper.

---

## 2. Complete File Inventory

### A. Backend (Convex) - 25 files over 400 lines

| File | Lines | Status | Priority |
|:-----|:------|:-------|:---------|
| `convex/admin.ts` | 3,157 | DONE | HIGH |
| `convex/ai.ts` | 2,287 | DONE | HIGH |
| `convex/shoppingLists.ts` | 2,213 | DONE | HIGH |
| `convex/lib/voiceTools.ts` | 2,098 | DONE | HIGH |
| `convex/listItems.ts` | 1,950 | DONE | HIGH |
| `convex/pantryItems.ts` | 1,650 | DONE | HIGH |
| `convex/schema.ts` | 1,365 | DONE | MEDIUM |
| `convex/insights.ts` | 1,117 | DONE | MEDIUM |
| `convex/stripe.ts` | 856 | DONE | MEDIUM |
| `convex/lib/storeNormalizer.ts` | 837 | Phase 4 | LOW |
| `convex/currentPrices.ts` | 834 | DONE | MEDIUM |
| `convex/users.ts` | 764 | Phase 4 | LOW |
| `convex/itemVariants.ts` | 708 | Phase 4 | LOW |
| `convex/nurture.ts` | 612 | Defer | LOW |
| `convex/receipts.ts` | 608 | DONE | MEDIUM |
| `convex/points.ts` | 600 | Defer | LOW |
| `convex/partners.ts` | 579 | Defer | LOW |
| `convex/stores.ts` | 566 | Defer | LOW |
| `convex/itemMatching.ts` | 526 | Defer | LOW |
| `convex/lib/itemMatcher.ts` | 521 | Phase 4 | LOW |
| `convex/aiUsage.ts` | 470 | Defer | LOW |
| `convex/priceHistory.ts` | 463 | Defer | LOW |
| `convex/iconMapping.ts` | 463 | Defer | LOW |
| `convex/subscriptions.ts` | 435 | Defer | LOW |
| `convex/analytics_advanced.ts` | 417 | Defer | LOW |

### B. App Routes (Screens) - 20 files over 400 lines

| File | Lines | Status | Priority |
|:-----|:------|:-------|:---------|
| `app/(app)/list/[id].tsx` | 1,867 | DONE | HIGH |
| `app/(app)/insights.tsx` | 1,752 | DONE | HIGH |
| `app/(app)/(tabs)/stock.tsx` | 1,354 | DONE | HIGH |
| `app/(app)/receipt/[id]/confirm.tsx` | 1,331 | DONE | HIGH |
| `app/(app)/(tabs)/profile.tsx` | 1,274 | DONE | HIGH |
| `app/(app)/subscription.tsx` | 1,014 | DONE | MEDIUM |
| `app/(app)/receipt/[id]/reconciliation.tsx` | 977 | Phase 6 | MEDIUM |
| `app/(app)/(tabs)/index.tsx` | 938 | DONE | MEDIUM |
| `app/(app)/trip-summary.tsx` | 735 | DONE | LOW |
| `app/(app)/create-list-from-receipt.tsx` | 677 | DONE | LOW |
| `app/(app)/admin/SettingsTab.tsx` | 632 | DONE | LOW |
| `app/(app)/admin/ReceiptsTab.tsx` | 549 | DONE | LOW |
| `app/onboarding/review-items.tsx` | 543 | DONE | LOW |
| `app/(app)/admin/UsersTab.tsx` | 535 | DONE | LOW |
| `app/onboarding/cuisine-selection.tsx` | 532 | DONE | LOW |
| `app/(app)/ai-usage.tsx` | 528 | DONE | LOW |
| `app/(app)/pantry-pick.tsx` | 503 | DONE | LOW |
| `app/(app)/admin/OverviewTab.tsx` | 452 | DONE | LOW |
| `app/(auth)/sign-in.tsx` | 436 | DONE | LOW |
| `app/(auth)/sign-up.tsx` | 411 | DONE | LOW |

### C. Components - 13 files over 400 lines

| File | Lines | Status | Priority |
|:-----|:------|:-------|:---------|
| `components/list/AddItemsModal.tsx` | 1,812 | DONE | HIGH |
| `components/list/AddItemForm.tsx` | 918 | DONE | MEDIUM |
| `components/stores/StorePriceGrid.tsx" | 828 | DONE | MEDIUM |
| `components/receipt/UnmatchedItemsModal.tsx` | 606 | DONE | LOW |
| `components/list/modals/ScanReceiptNudgeModal.tsx` | 573 | DONE | LOW |
| `components/list/modals/TripSummaryModal.tsx` | 570 | DONE | LOW |
| `components/ui/glass/GlassAnimations.tsx` | 564 | SKIP | Library file (6 exports, justified) |
| `components/lists/HealthAnalysisModal.tsx` | 553 | DONE | LOW |
| `components/list/ShoppingListItem.tsx` | 548 | DONE | MEDIUM |
| `components/items/VariantPicker.tsx` | 536 | DONE | LOW |
| `components/ui/glass/CircularBudgetDial.tsx` | 514 | SKIP | Specialized SVG component |
| `components/ui/glass/GlassHeader.tsx` | 478 | SKIP | Header library |
| `components/lists/ListCard.tsx` | 477 | DONE | LOW |

### D. Hooks - 1 file over 400 lines

| File | Lines | Status | Priority |
|:-----|:------|:-------|:---------|
| `hooks/useVoiceAssistant.ts` | 582 | DONE | MEDIUM |

---

## 3. Phase 0: Quick Wins (De-duplication & Cleanup)

Before modularizing, eliminate duplicates and extract repeated patterns. These changes reduce the total codebase size and prevent carrying duplicates into the new structure.

### 0A. Delete Haptics Duplicate

**Problem:** Two incompatible haptics APIs exist:
- `/lib/haptics/safeHaptics.ts` (173 lines) - Simple functions: `light()`, `medium()`, `success()`
- `/lib/utils/safeHaptics.ts` (195 lines) - Different API: `haptic('light')`, `hapticPattern('celebration')`

**Action:**
- [x] Keep `/lib/haptics/safeHaptics.ts` (simpler, more widely used)
- [x] Migrate any features worth keeping from `/lib/utils/safeHaptics.ts` (pattern support)
- [x] Update 4 onboarding file imports that use the `/lib/utils/` version
- [x] Delete `/lib/utils/safeHaptics.ts`
- [x] Delete `/lib/utils/` directory if empty

### 0B. Extract Shared Patterns

**Hint Sequencing Hook** - Identical 3-stage useEffect chains appear in 9+ screens:
```
Screens: list/[id].tsx, insights.tsx, stock.tsx, profile.tsx, index.tsx, confirm.tsx
```
- [x] Create `hooks/useHintSequence.ts` (~80 lines)
- [x] Accept hint config array, return hint states
- [x] Replace inline hint logic in all 9 screens

**Price Validation Utility** - Scattered across 3 files:
```
Duplicated in: currentPrices.ts, listItems.ts, receipts.ts
```
- [x] Create `convex/lib/priceValidator.ts` (~60 lines)
- [x] Consolidate confidence scoring and price range validation

**Estimated savings:** 1,500-2,000 lines eliminated.

---

## 4. Phase 1: Low Risk Backend (Infrastructure)

Files with no public API consumers or easily isolatable logic.

### 1A. `convex/schema.ts` (1,365 lines)

**Target structure:**
```
convex/schema/
  core.ts            (~200)  users, shoppingLists, listItems, pantryItems
  pricing.ts         (~120)  currentPrices, priceHistory, priceHistoryMonthly, itemVariants
  collaboration.ts   (~80)   listPartners, inviteCodes, listMessages, itemComments
  gamification.ts    (~120)  achievements, streaks, weeklyChallenges, points*, seasonalEvents
  subscriptions.ts   (~80)   subscriptions, scanCredits, scanCreditTransactions, revenue
  analytics.ts       (~100)  platformMetrics, cohortMetrics, funnelEvents, churnMetrics, ltvMetrics
  admin.ts           (~120)  adminRoles, adminSessions, adminLogs, slaMetrics, supportTickets
  receipts.ts        (~100)  receipts, receiptHashes, pendingItemMatches, itemMappings
  content.ts         (~80)   featureFlags, announcements, notifications, helpArticles
  experiments.ts     (~60)   experiments, experimentVariants, experimentAssignments

convex/schema.ts     (~80)   Import all + defineSchema({ ...spread })
```

**Steps:**
- [x] Create `convex/schema/` directory
- [x] Move table definitions to domain files (each exports a plain object of table definitions)
- [x] Keep `convex/schema.ts` as the assembler that imports and spreads all domain tables
- [x] Run `npx convex dev` to verify schema compilation

### 1B. `convex/lib/voiceTools.ts` (2,098 lines)

**Target structure:**
```
convex/lib/voice/
  index.ts           (~40)   Re-exports for backward compatibility
  declarations.ts    (~300)  FunctionDeclaration[] for all 33 tools
  prompts.ts         (~150)  buildSystemPrompt(), voice personality config
  dispatcher.ts      (~150)  executeVoiceTool() router switch
  readTools.ts       (~450)  12 read operations (get_pantry_items, get_active_lists, etc.)
  writeTools.ts      (~550)  15 write operations (create_shopping_list, add_items, etc.)
  analyzeTools.ts    (~250)  6 analysis operations (price trends, savings, budget)
  helpers.ts         (~150)  Shared formatters, response builders
```

**Steps:**
- [x] Create `convex/lib/voice/` directory
- [x] Extract tool declarations array to `declarations.ts`
- [x] Extract system prompt building to `prompts.ts`
- [x] Split tool implementations by read/write/analyze into separate files
- [x] Create `dispatcher.ts` that imports all tool files and routes by name
- [x] Create `index.ts` that re-exports `executeVoiceTool` and `buildSystemPrompt`
- [x] Update import in `convex/ai.ts`: `import { executeVoiceTool } from "./lib/voice"`
- [x] Run `npm test` and `npx convex dev`

---

## 5. Phase 2: Medium Risk Backend (Large Domain Files)

### 2A. `convex/admin.ts` (3,157 lines, 104 routes)

**Target structure:**
```
convex/admin/
  index.ts           (~150)  Re-exports all routes (maintains api.admin.* paths)
  middleware.ts       (~120)  requireAdmin, logToSIEM, rateLimitAdmin, sessionValidation
  permissions.ts     (~80)   RBAC permission checks, role hierarchy
  overview.ts        (~250)  Platform KPIs, hero metrics, activity timeline
  users.ts           (~350)  User lifecycle, trial/premium granting, impersonation
  analytics.ts       (~300)  Cohort retention, MRR/ARR/churn, LTV predictions
  receipts.ts        (~250)  Moderation queue, anomaly detection, price overrides
  catalog.ts         (~200)  Store variant merging, price history auditing
  monitoring.ts      (~250)  Real-time health, SLA tracking, alerts
  webhooks.ts        (~200)  Stripe, Clerk, internal event management
  support.ts         (~200)  Integrated ticketing system
  settings.ts        (~250)  Feature flags, announcements, admin management
  cache.ts           (~100)  Query cache utility (reusable for expensive queries)
  reports.ts         (~150)  Scheduled report generation (weekly, monthly)
```

**Critical: Maintaining API paths**

The `index.ts` file re-exports everything to preserve `api.admin.*` paths:
```typescript
// convex/admin/index.ts
export { getUsers, updateUser, grantTrial } from "./users";
export { getAnalytics, getRevenueMetrics } from "./analytics";
// ... all 104 routes
```

**Steps:**
- [ ] Create `convex/admin/` directory
- [ ] Extract middleware first (`requireAdmin`, `logToSIEM`, `rateLimitAdmin`)
- [ ] Extract one tab at a time, starting with `overview.ts` (least coupled)
- [ ] After each extraction, run `npx convex dev` to verify API paths
- [ ] Update `__tests__/admin.test.ts` imports incrementally
- [ ] Final: verify all 104 routes accessible via `api.admin.*`

### 2B. `convex/ai.ts` (2,287 lines, 30 routes)

**Target structure:**
```
convex/ai/
  index.ts           (~80)   Re-exports (maintains api.ai.* paths)
  shared.ts          (~120)  Gemini + OpenAI fallback wrapper, retry logic, error handling
  vision.ts          (~400)  Receipt scanning (parseReceipt), product scanning
  health.ts          (~350)  Health analysis, dietary swap suggestions, bonus items
  pantry.ts          (~250)  Pantry suggestions, restocking recommendations
  pricing.ts         (~200)  AI price estimates, emergency pricing
  voice.ts           (~150)  Voice assistant action handler (delegates to lib/voice/)
  prompts/
    receipt.ts       (~150)  Receipt parsing prompts, item extraction
    product.ts       (~100)  Product enrichment prompts
    health.ts        (~150)  Health analysis prompts, dietary context
    pricing.ts       (~80)   Price estimation prompts
```

**Steps:**
- [x] Create `convex/ai/` directory
- [x] Extract `shared.ts` first (Gemini/OpenAI client wrapper)
- [x] Extract prompts to `prompts/` subdirectory
- [x] Split domain logic: vision, health, pantry, pricing
- [x] Create `index.ts` with re-exports for `api.ai.*` paths
- [x] Run `npm test` to verify AI test coverage maintained

---

## 6. Phase 3: High Risk Backend (Core Domain Logic)

These files are the most coupled and have the most consumers. Extra caution required.

### 3A. `convex/shoppingLists.ts` (2,213 lines, 17 routes)

**Target structure:**
```
convex/shoppingLists/
  index.ts           (~80)   Re-exports (maintains api.shoppingLists.* paths)
  queries.ts         (~350)  getList, getLists, getListWithItems, getSharedLists
  mutations.ts       (~300)  createList, updateList, deleteList, duplicateList
  trip.ts            (~300)  startTrip, finishTrip, linkReceipt, computeTripStats
  health.ts          (~250)  analyzeListHealth, pruneStaleHealthAnalyses
  budget.ts          (~150)  updateBudget, getBudgetStatus, budgetAlerts
  templates.ts       (~200)  createFromTemplate, saveAsTemplate, getTemplates
  store.ts           (~150)  switchStore, getStoreComparison
```

**Steps:**
- [ ] Create `convex/shoppingLists/` directory
- [ ] Extract queries first (read-only, lowest risk)
- [ ] Extract trip lifecycle (startTrip, finishTrip - self-contained flow)
- [ ] Extract health analysis (self-contained with AI dependency)
- [ ] Remaining mutations, budget, templates, store logic
- [ ] Verify all 17 routes via `api.shoppingLists.*`

### 3B. `convex/listItems.ts` (1,950 lines, 14 routes)

**Target structure:**
```
convex/listItems/
  index.ts           (~80)   Re-exports
  crud.ts            (~350)  addItem, updateItem, deleteItem, getItems, checkOff
  pricing.ts         (~300)  resolveItemPrice, applyActualPrice, getEmergencyEstimate
  matching.ts        (~250)  matchToVariant, findSimilarItems, applyHealthSwap
  bulk.ts            (~200)  bulkAddItems, clearCheckedItems, bulkUpdatePrices
```

### 3C. `convex/pantryItems.ts` (1,650 lines, 23 routes)

**Target structure:**
```
convex/pantryItems/
  index.ts           (~80)   Re-exports
  crud.ts            (~350)  addItem, updateItem, deleteItem, getItems
  archiving.ts       (~250)  archiveStaleItems, autoArchive (90-day rule), restoreItem
  restocking.ts      (~250)  autoRestockFromReceipt, matchReceiptToPantry, updateQuantities
  stockLevels.ts     (~200)  updateStockLevel, getAttentionItems, getLowStockCount
  tiers.ts           (~150)  setEssential, setPinned, getTierBreakdown
```

---

## 7. Phase 4: Backend Utilities & Secondary Files

### 4A. Hook Refactoring: `useVoiceAssistant.ts` (582 lines)

**Current responsibilities** (15 useCallback, 3 useEffect, 8 useRef, 2 useState):
- Speech recognition with native module fallback
- Conversation history persistence
- TTS with neural voice cascade
- Rate limiting (1 req/6s, 200/day)
- Pending action confirmation with 30s timeout
- Continuous listening auto-resume

**Target structure:**
```
hooks/voice/
  index.ts                  (~30)   Re-export useVoiceAssistant
  useVoiceAssistant.ts      (~200)  Coordinator hook (composes sub-hooks)
  useVoiceRecognition.ts    (~120)  STT state machine, native module fallback
  useVoiceAudio.ts          (~120)  TTS playback, audio cleanup, neural cascade
  useVoiceHistory.ts        (~80)   Conversation persistence, 6-turn window, expiry
  useVoiceRateLimit.ts      (~50)   Rate limiting state (1 req/6s, 200/day cap)
```

### 4B. Secondary Backend Files

These files are 500-1,100 lines and benefit from splitting but are lower priority:

**`convex/insights.ts` (1,117 lines)**
```
convex/insights/
  index.ts           Re-exports
  achievements.ts    Achievement checks, unlock logic
  streaks.ts         Streak tracking, maintenance
  challenges.ts      Weekly challenge generation, progress
  digest.ts          Weekly/monthly digest computation
```
- [x] Modularize `convex/insights.ts`

**`convex/stripe.ts` (856 lines)**
```
convex/stripe/
  index.ts           Re-exports
  checkout.ts        Session creation, portal links
  webhooks.ts        Event handlers (checkout.completed, invoice.created, etc.)
  credits.ts         Scan credit earning, redemption, tier calculation
```
- [x] Modularize `convex/stripe.ts`

**`convex/currentPrices.ts` (834 lines)**
```
convex/currentPrices/
  index.ts           Re-exports
  crud.ts            Upsert, query, delete
  pruning.ts         Stale product cleanup (12mo unseen)
  comparison.ts      Store price comparison, best value
```
- [x] Modularize `convex/currentPrices.ts`

**`convex/receipts.ts` (608 lines)**
```
convex/receipts/
  index.ts           Re-exports
  crud.ts            Create, get, list receipts
  processing.ts      OCR result handling, item extraction
  reconciliation.ts  Match receipt items to list items
```
- [x] Modularize `convex/receipts.ts`

### 4C. `convex/lib/storeNormalizer.ts` (837 lines)

**Target structure:**
```
convex/lib/stores/
  index.ts           (~30)   Re-exports
  normalizer.ts      (~200)  normalizeStoreName(), fuzzy store matching
  storeData.ts       (~400)  Store catalog data (IDs, names, colors, regions)
  cuisine.ts         (~150)  Cuisine-to-store mapping
```

### 4D. `convex/lib/itemMatcher.ts` (521 lines)

**Target structure:**
```
convex/lib/matching/
  index.ts           (~30)   Re-exports
  tokenMatcher.ts    (~200)  Tokenization, token overlap scoring
  categoryMatcher.ts (~120)  Category-based matching signals
  scoringEngine.ts   (~150)  Multi-signal scoring, confidence thresholds
```

---

## 8. Phase 5: High Risk Frontend (Major Screens & Components)

### 5A. `app/(app)/list/[id].tsx` (1,867 lines)

**Current complexity:** 16 useState, 6+ useCallback, 8+ useMemo, 8+ useEffect, 7 useQuery, 12+ useMutation, 7 modal states, keyboard overlap algorithm, hint sequencing, partner role checks.

**Target structure:**
```
app/(app)/list/[id].tsx          (~300)  Screen shell, modals, layout

hooks/list/
  useListDetail.ts               (~200)  Queries, mutations, computed values
  useListModals.ts               (~100)  7 modal open/close states
  useListKeyboard.ts             (~120)  Keyboard overlap algorithm (Reanimated)
  useListHints.ts                (~60)   Hint sequencing (uses useHintSequence)

components/list/detail/
  ListHeader.tsx                 (~150)  Title, store, budget, action buttons
  ListItemsSection.tsx           (~250)  Categorized item list with drag/sort
  ListBottomBar.tsx              (~120)  Add item input, voice button, FAB
  BudgetOverlay.tsx              (~100)  Sticky budget bar on scroll
```

**Steps:**
- [x] Extract hooks first (no JSX changes, lowest risk)
- [x] Extract components one at a time, starting with `ListHeader`
- [x] Keep keyboard overlap logic in dedicated hook (Reanimated worklets need careful handling)
- [x] Run `npx expo start` after each extraction to catch JSX mismatches
- [x] Verify partner mode (viewer/editor/approver) works in all extracted components

### 5B. `components/list/AddItemsModal.tsx` (1,812 lines)

**Current complexity:** 13 useState, 15 useCallback, 8 useMemo, tabs (pantry/search/manual), variant prefetch, session feedback.

**Target structure:**
```
components/list/AddItems/
  index.tsx                      (~300)  Modal shell, tab switching, session tracking
  SearchTab.tsx                  (~300)  Search input, suggestions, variant selection
  PantryTab.tsx                  (~250)  Pantry item filtering, category sections
  ManualAddTab.tsx               (~200)  Manual name/size/qty/price form
  AddedItemsFeedback.tsx         (~100)  Session toast with undo
  VariantSizeSelector.tsx        (~150)  Variant picker inline

hooks/
  useAddItemsSession.ts          (~100)  Session tracking, added items list
  useItemInput.ts                (~150)  Form state, validation, cleanItemForStorage
```
- [x] Modularize `components/list/AddItemsModal.tsx`

### 5C. `app/(app)/insights.tsx` (1,752 lines)

**Target structure:**
```
app/(app)/insights.tsx           (~250)  Screen shell, tab switching

components/insights/
  AchievementsPanel.tsx          (~250)  Achievement grid, unlock animations
  StreaksPanel.tsx                (~200)  Streak display, calendar view
  ChallengesPanel.tsx            (~200)  Weekly challenges, progress bars
  PointsOverview.tsx             (~150)  Balance, tier progress, transactions
  TrendsChart.tsx                (~200)  Line chart, spending over time
  WeeklyDigest.tsx               (~150)  Summary cards

hooks/
  useInsightsData.ts             (~150)  Queries, computed values, tab state
```

### 5D. `app/(app)/(tabs)/stock.tsx` (1,354 lines)

**Current complexity:** 13+ useState, 6+ useCallback, 8+ useMemo, 5+ useEffect, 8 useQuery, 7 useMutation, gesture onboarding, category collapsing.

**Target structure:**
```
app/(app)/(tabs)/stock.tsx       (~250)  Screen shell, view mode switching

components/pantry/
  AttentionView.tsx              (~200)  Low/out-of-stock items grouped
  AllItemsView.tsx               (~250)  Full pantry with category collapse
  PantryItemRow.tsx              (~200)  Item row with swipe gestures
  StockFilterBar.tsx             (~100)  Filter chips, search

hooks/
  useStockView.ts                (~150)  View state, filters, category collapse
  usePantryActions.ts            (~100)  Restock, archive, delete mutations
```

### 5E. `app/(app)/receipt/[id]/confirm.tsx` (1,331 lines)

**Target structure:**
```
app/(app)/receipt/[id]/confirm.tsx  (~300)  Screen shell, item list

components/receipt/confirm/
  ReceiptItemRow.tsx             (~200)  Editable receipt item with matching
  ReceiptSummary.tsx             (~150)  Total, store, date header
  MatchingPanel.tsx              (~200)  Item matching suggestions
  ConfirmActions.tsx             (~100)  Confirm/reject footer

hooks/
  useReceiptConfirmation.ts      (~200)  Match state, price resolution, mutations
```

### 5F. `app/(app)/(tabs)/profile.tsx` (1,274 lines)

**Target structure:**
```
app/(app)/(tabs)/profile.tsx     (~250)  Screen shell, section rendering

components/profile/
  AccountSection.tsx             (~200)  Email, avatar, sign out
  PreferencesSection.tsx         (~200)  Dietary restrictions, health concerns, stores
  NotificationSection.tsx        (~150)  Push settings, quiet hours
  SubscriptionSection.tsx        (~200)  Plan status, upgrade CTA
  DangerZone.tsx                 (~100)  Delete account, data export
```

### 5G. `components/list/AddItemForm.tsx` (918 lines)

**Target structure:**
```
components/list/form/
  AddItemForm.tsx                (~300)  Form container, submission logic
  ItemNameInput.tsx              (~150)  Name input with suggestions dropdown
  SizeUnitPicker.tsx             (~150)  Size/unit selection with validation
  PriceQuantityRow.tsx           (~100)  Price and quantity inputs
```

### 5H. `components/list/ShoppingListItem.tsx` (548 lines)

**Target structure:**
```
components/list/
  ShoppingListItem.tsx           (~300)  Main item row, gestures
  ItemPriceDisplay.tsx           (~100)  Price badge with source indicator
  ItemMetadata.tsx               (~100)  Size, comments count, partner locks
```
- [x] Modularize `components/list/ShoppingListItem.tsx`

---

## 9. Phase 6: Secondary Frontend Files

Lower priority files that benefit from splitting but aren't critical path:

| File | Lines | Target |
|:-----|:------|:-------|
| `subscription.tsx` | 1,014 | Extract `PlanComparisonCard`, `PaymentSection`, `TrialBanner` |
| `reconciliation.tsx` | 977 | Extract `ReconciliationItemRow`, `ReconciliationSummary` |
| `(tabs)/index.tsx` | 938 | Extract `ListsGrid`, `TemplateSection`, `SharedListsSection` |
| `trip-summary.tsx` | 735 | Extract `TripStatsCard`, `ItemBreakdown`, `SavingsDisplay` |
| `create-list-from-receipt.tsx` | 677 | Extract `ReceiptItemSelector`, `ListConfigForm` |
| `StorePriceGrid.tsx` | 828 | Extract `PriceCell`, `StoreHeader`, `BestValueBadge` |
| `UnmatchedItemsModal.tsx` | 606 | Extract `UnmatchedItemRow`, `CategoryPicker` |
| `ScanReceiptNudgeModal.tsx` | 573 | Extract `StreakDisplay`, `CreditInfoCard` |
| `TripSummaryModal.tsx` | 570 | Extract `TripStatsHeader`, `SavingsBreakdown` |
| `HealthAnalysisModal.tsx` | 553 | Extract `SwapItemList`, `BonusSuggestions` |
| `VariantPicker.tsx` | 536 | Extract `SizeSelector`, `PriceComparisonGrid` |
| `ListCard.tsx` | 477 | Extract `StatusBadge`, `BudgetBar`, `CardContextMenu` |

---

## 10. Shared Pattern Extraction

These patterns repeat across many files and should be extracted before or during frontend phases.

### 10A. `hooks/useHintSequence.ts` (~80 lines)

**Used by:** 9+ screens with identical 3-stage hint logic.

```typescript
// Usage: replaces ~30 lines of boilerplate per screen
const hints = useHintSequence([
  { key: "list_add_hint", trigger: "delayed" },
  { key: "list_budget_hint", trigger: "after_previous" },
  { key: "list_health_hint", trigger: "after_previous" },
]);
```

### 10B. `hooks/useModalGroup.ts` (~60 lines)

**Problem:** Screens manage 5-7+ modal states with individual useState calls.

```typescript
// Usage: replaces ~14 lines of useState per screen
const modals = useModalGroup(["edit", "delete", "budget", "health", "receipt", "store"]);
// modals.edit.visible, modals.edit.open(), modals.edit.close()
```

### 10C. `hooks/useSearchableData.ts` (~80 lines)

**Problem:** Search/filter/sort logic duplicated across stock, lists, pantry, admin screens.

```typescript
// Usage: standardizes search across screens
const { filtered, searchQuery, setSearchQuery, sortBy, setSortBy } =
  useSearchableData(items, { searchFields: ["name"], defaultSort: "name" });
```

### 10D. `components/patterns/ScreenShell.tsx` (~100 lines)

**Problem:** Every screen repeats: loading skeleton, error state, empty state, header, scroll view.

```typescript
// Usage: eliminates ~40 lines of boilerplate per screen
<ScreenShell
  loading={data === undefined}
  error={error}
  empty={data?.length === 0}
  emptyMessage="No items yet"
  header={<GlassHeader title="Stock" />}
>
  {/* Content */}
</ScreenShell>
```

---

## 11. Testing Strategy

### Unit Test Migration

1. **Create new test file first:** `__tests__/admin/users.test.ts`
2. **Copy relevant test blocks** from original test file
3. **Update imports** to point to new module paths
4. **Verify coverage maintained:** `npm test -- --coverage`
5. **Keep integration tests:** Original `admin.test.ts` becomes a smoke test that verifies re-exports work

### E2E Stability Guarantees

- **No public API changes:** All `api.module.function` Convex paths remain stable via re-exports
- **No route changes:** All Expo Router paths remain unchanged
- **No prop changes:** Component APIs remain backward-compatible during refactor
- **Rollback plan:** Git branch per phase for easy revert

### Coverage Requirements

| Category | Minimum Coverage |
|:---------|:-----------------|
| New extracted modules | 80% |
| Extracted hooks | 90% (pure logic) |
| Re-export index files | Smoke test only |
| Shared patterns | 95% (used everywhere) |

---

## 12. Performance Considerations

### Hook Extraction Risks

- **Re-render Prevention:** All callbacks must be wrapped in `useCallback`, values in `useMemo`
- **Ref Stability:** Use `useRef` for values that shouldn't trigger re-renders
- **Context Overhead:** Avoid React Context for high-frequency updates. If needed, use Zustand or Jotai
- **Reanimated Worklets:** Keep worklet functions in the same file as `useAnimatedStyle` - they cannot be imported across module boundaries in some cases

### Component Splitting Risks

- **Bundle Size:** Monitor with `npx expo export --dump-sourcemap`
- **Lazy Loading:** Consider `React.lazy()` for large modal sub-components that aren't visible on mount
- **Dimensions Capture:** Never call `Dimensions.get()` inside a Reanimated worklet - capture on JS thread and close over it

### Query Optimization

- **Index Coverage:** Every split query must maintain `.withIndex()` usage - no full table scans
- **Batch Operations:** Don't split mutations that should be atomic (e.g., finishTrip)
- **Caching:** Maintain Convex query reactivity benefits - don't over-fetch by splitting queries too granularly

---

## 13. Risk Mitigation Checklist

### Per-Extraction Checklist

- [ ] **Read the file fully** before starting extraction
- [ ] **Type safety:** Run `npm run typecheck` after every file move
- [ ] **Convex paths:** Ensure `api.folder.function` paths remain consistent via re-exports
- [ ] **Circular dependencies:** Watch for circular imports when splitting (use a shared `types.ts` if needed)
- [ ] **JSX integrity:** Double-check every `<View>`/`</View>` pair after component extraction
- [ ] **Performance:** Ensure hook extraction doesn't cause unnecessary re-renders
- [ ] **Tests pass:** Run `npm test` after each extraction
- [ ] **App loads:** Run `npx expo start` and verify no runtime errors
- [ ] **Feature works:** Manually test the affected feature in the app

### Global Checklist

- [ ] **No file exceeds hard limit** (with documented exceptions for library files)
- [ ] **No duplicate logic** remains (haptics, pricing validation, hint sequencing)
- [ ] **Test coverage maintained** or improved (>80%)
- [ ] **E2E tests pass** without modification
- [ ] **Build succeeds** without new warnings
- [ ] **No performance regressions** in key flows (list detail, add items, receipt scan)

---

## 14. Execution Order Summary

| Phase | Scope | Files | Risk | Estimated Effort |
|:------|:------|:------|:-----|:-----------------|
| **Phase 0** | Quick Wins | Duplicates, patterns | None | DONE |
| **Phase 1** | Low Risk Backend | schema.ts, voiceTools.ts | Low | DONE |
| **Phase 2** | Medium Risk Backend | admin.ts, ai.ts | Medium | DONE |
| **Phase 3** | High Risk Backend | shoppingLists, listItems, pantryItems | High | DONE |
| **Phase 4** | Utilities & Hooks | insights, stripe, prices, useVoiceAssistant | Medium | DONE |
| **Phase 5** | Major Frontend | list/[id], AddItemsModal, stock, profile, confirm | High | DONE |
| **Phase 6** | Secondary Frontend | subscription, reconciliation, index, modals | Medium | DONE |
| **Deferred** | Low Priority | Files 400-600 lines, admin tabs, auth screens | Low | DONE |

**Total estimated effort: 43-60 days (~2-3 months)**

### Ordering Rationale

1. **Phase 0 first** - Removes duplicates before they get carried into new structure
2. **Backend before frontend** - Backend splits are lower risk (no JSX, no styling)
3. **Infrastructure before domain** - Extracted middleware/utilities are used by domain splits
4. **Large files first** - Biggest maintainability wins, highest risk of merge conflicts
5. **Frontend last** - Most risk (JSX mismatches, re-render bugs, styling breaks)

---

## 15. Success Criteria

The modularization is complete when:

- [x] No file exceeds its type's hard limit (documented exceptions only)
- [x] Zero duplicate logic across the codebase
- [x] All `npm test` suites pass (42+ test files)
- [x] All `npm run e2e` specs pass (16 specs)
- [x] `npm run typecheck` passes with zero errors
- [x] `npx expo start` builds without errors
- [x] Every extracted module has a corresponding test file
- [x] No performance regressions measured in key user flows
- [x] All Convex `api.*` paths remain stable (verified by E2E)
- [x] Documentation (CLAUDE.md) updated with new file structure
