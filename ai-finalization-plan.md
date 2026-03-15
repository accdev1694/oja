# AI Finalization Plan

## 1. Migrate from Gemini 2.0 Flash to Gemini 2.5 Flash-Lite

**Deadline:** Before June 1, 2026 (Gemini 2.0 Flash shutdown)

**Why Flash-Lite:** 1,000 RPD free tier (vs 250 for 2.5 Flash), sufficient for current usage patterns.

### Files to change

| File | Change |
|------|--------|
| `convex/ai/shared.ts` | Change model string from `"gemini-2.0-flash"` to `"gemini-2.5-flash-lite"` in `smartGenerateInstrumented` |
| `convex/ai/voice.ts` | Change model string from `"gemini-2.0-flash"` to `"gemini-2.5-flash-lite"` in `voiceAssistant` |
| `convex/lib/aiTracking.ts` | Update `PROVIDER_LIMITS.gemini.requestsPerDay` from `1500` to `1000` |
| `convex/admin/analytics.ts` | Update scaling recommendation thresholds (currently warns at 1000/1400 RPD) |
| `components/admin/PlatformAIUsageMonitor.tsx` | Update any displayed limit references |

### Validation steps

- [ ] Run `npm run typecheck` after model string changes
- [ ] Test voice assistant multi-turn chat (uses `startChat` directly)
- [ ] Test receipt scanning (vision — confirm 2.5 Flash-Lite supports image input)
- [ ] Test product scanning (vision)
- [ ] Test health analysis, price estimation, pantry seeding, suggestions
- [ ] Verify token metrics still parse correctly from `response.usageMetadata`
- [ ] Monitor RPD usage for first 48 hours post-migration
- [ ] Confirm `enforceGeminiQuota` works with new 1,000 RPD limit

### Risk check

- [ ] Confirm Gemini 2.5 Flash-Lite supports function calling (voice assistant requires it)
- [ ] Confirm Gemini 2.5 Flash-Lite supports vision/image input (receipt + product scanning)
- [ ] Compare output quality on health analysis prompts (temperature 0.7)
- [ ] Compare output quality on price estimation prompts (temperature 0.3)

---

## 2. Add missing per-user monthly caps

Currently only `voice` has a per-user monthly cap (10 free / 200 premium). The following features have NO monthly cap and can drain global RPD quota if a single user is hyperactive.

### Features needing monthly caps

| Feature | Current cap | Risk | Proposed free cap | Proposed premium cap |
|---------|------------|------|-------------------|---------------------|
| `price_estimate` | None (30/min rate limit only) | **High** — fires per item added | 30/month | 200/month |
| `health_analysis` | None | Medium — user can spam | 10/month | 50/month |
| `list_suggestions` | None | Medium | 20/month | 100/month |
| `product_scan` | None | Low — requires camera | 20/month | 100/month |
| `item_variants` | None | Low — batch call | 15/month | 60/month |
| `pantry_seed` | None | Low — onboarding only | 3/month | 10/month |
| `receipt_scan` | Unlimited (-1) | Medium — 1 call each but vision is expensive | Keep unlimited | Keep unlimited |
| `tts` | None (global 480K cap) | Medium | 50/month | 300/month |

### Implementation

- [ ] Add new feature entries to `AI_LIMITS` in `convex/lib/featureGating.ts`
- [ ] Wire `canUseFeature` check into each AI action that currently lacks it:
  - [ ] `convex/ai/pricing.ts` — `estimateItemPrice` (add `canUseFeature("price_estimate")`)
  - [ ] `convex/ai/health.ts` — `analyzeListHealth` (add `canUseFeature("health_analysis")`)
  - [ ] `convex/ai/suggestions.ts` — suggestion generation (add `canUseFeature("list_suggestions")`)
  - [ ] `convex/ai/vision.ts` — product scan path (add `canUseFeature("product_scan")`)
  - [ ] `convex/ai/pricing.ts` — `generateItemVariants` (add `canUseFeature("item_variants")`)
  - [ ] `convex/ai/pantry.ts` — `generateHybridSeedItems` (add `canUseFeature("pantry_seed")`)
- [ ] Update `getUsageSummary` to return all new feature usage records
- [ ] Update `app/(app)/ai-usage.tsx` to display all feature caps in the UI
- [ ] Run typecheck and test each feature hits cap correctly

---

## 3. Capacity planning — when to upgrade each provider

### Gemini (1,000 RPD on Flash-Lite free tier)

| DAU | RPD usage (~7 calls/user) | Zone | Action |
|-----|---------------------------|------|--------|
| < 50 | < 350 | Green | No action needed |
| 50 | ~350 | Info | Monitor growth, add per-user caps |
| 80 | ~560 | Warning | Plan paid tier migration |
| 120 | ~840 | Critical | Enable Gemini billing immediately |
| 143+ | 1,000+ | Blocked | Users start seeing "AI capacity reached" |

**Upgrade path:** Gemini Tier 1 (billing enabled) = pay-as-you-go, higher RPD limits.

### Azure TTS (480K chars/month free, F0 tier)

| Voice DAU | Estimated daily chars | Monthly projection | Zone | Action |
|-----------|----------------------|-------------------|------|--------|
| < 25 | ~3,750 | ~113K | Green | No action |
| 25 | ~3,750 | ~113K | Info | Monitor consumption |
| 40 | ~6,000 | ~180K | Warning | Plan Azure S0 paid tier |
| 60 | ~9,000 | ~270K | Critical | Upgrade or lean on expo-speech fallback |
| 107+ calls/day | ~16K | 480K+ | Blocked | TTS returns "quota reached", device TTS fallback |

**Upgrade path:** Azure Speech S0 = $1/million chars (~$0.48/month at current scale).

### Admin scaling nudge (IMPLEMENTED)

`checkProviderScalingNeeds` runs daily at 9pm UTC and creates alerts:

| Alert type | Triggers at | Severity progression |
|------------|------------|---------------------|
| `provider_scaling_gemini` | 50 / 80 / 120 AI DAU | info -> warning -> critical |
| `provider_scaling_tts` | 25 / 40 / 60 voice DAU | info -> warning -> critical |

Alert metadata includes: DAU count, RPD usage, percentage, avg calls per user, projected monthly TTS chars. Old lower-severity alerts auto-resolve when escalating.

---

## 4. OpenAI fallback — when to re-enable

Currently disabled via `PROVIDER_LIMITS.openai.dailySpendCapUsd = 0`.

**Re-enable when:**
- Gemini starts throttling at scale (fallback rate > 5%)
- You've moved to Gemini paid tier and want a safety net
- You're comfortable with ~$0.15/1M input tokens + $0.60/1M output tokens

**To re-enable:**
1. Set `PROVIDER_LIMITS.openai.dailySpendCapUsd` to desired cap (e.g., `1.0` for $1/day)
2. `withAIFallbackInstrumented` will automatically start using OpenAI when Gemini fails
3. Monitor `ai_fallback_rate` alert for actual fallback frequency
