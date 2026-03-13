# Code Review Guidelines

Review-specific rules for the Oja codebase. These are checked in addition to CLAUDE.md.

## Always Check

### Data Integrity
- Every item creation/update uses `cleanItemForStorage()` from `convex/lib/itemNameParser.ts`
- Size without unit is NEVER saved to the database
- Every Convex query uses `.withIndex()` — never full table scans
- Every mutation calls `requireCurrentUser(ctx)` for auth verification
- Admin functions call `requireAdmin(ctx)` with RBAC permission checks
- Price data always flows through the 3-layer cascade (personal > crowdsourced > AI)

### Modular Architecture (Post-Refactor)
- Backend modules use barrel re-exports — check the root file (e.g., `convex/ai.ts`) delegates to subdirectory (e.g., `convex/ai/index.ts`)
- New functions added to modularized modules go in the correct subfile, not the root barrel
- Schema changes go in the appropriate file under `convex/schema/` (core, pricing, collaboration, gamification, subscriptions, analytics, admin, receipts, content, experiments, utils)
- Cross-function calls use `ctx.runQuery(api.module.fn, args)` — never direct imports of internal handlers

### Security
- No secrets or API keys in client-side code
- Stripe webhook handlers verify idempotency via `processedWebhooks` table
- Admin endpoints check RBAC permissions, not just `isAdmin` flag
- Rate limiting applied to AI features (voice, receipt scanning)
- Receipt fraud detection flags checked before awarding points

### Feature Gating
- Free tier limits enforced: 2 lists, 30 pantry items, 10 voice/mo
- Premium checks use `isEffectivelyPremium()` which handles trial expiry
- Admins bypass feature gates (treated as premium_annual)
- AI usage tracked in `aiUsage` table with monthly period resets

### UI Patterns
- Haptic feedback on all interactive elements via `safeHaptics.ts`
- Loading states use `GlassSkeleton` variants, never blank screens
- All icons validated through `iconMatcher.ts` (MaterialCommunityIcons)
- Glass design system components used consistently — no raw `View` cards
- Item display uses `formatItemDisplay()` for size-first formatting ("500ml Milk")

### Provider Order
- Root layout provider chain must remain: GestureHandler > Clerk > ClerkLoaded > SafeKeyboard > ConvexWithClerk > GlassAlert > InitialLayout
- Never import native modules in barrel/index files — cascading failures break Clerk

## Style

- Prefer early returns for guard clauses in Convex handlers
- Use `v.optional()` for new schema fields to maintain backward compatibility
- Keep Convex mutations focused — extract shared logic to `lib/` helpers
- Use Reanimated for animations, not `Animated` from react-native core

## Skip

- Generated files under `convex/_generated/`
- Files in `node_modules/`, `dist/`, `_archived/`
- Formatting-only changes in lock files
- Screenshot files (`.png`, `.jpg`) in project root
- Legacy implementation plan `.md` files at project root
- Test fixture data in `e2e/fixtures/`
