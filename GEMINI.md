Read CLAUDE.md for project context, instructions, and engineering standards.

CRITICAL: Do not modify files until an explicit Directive is issued. During research, deliberation, or planning phases, limit output to analysis and proposed strategies. Wait for the user to confirm the plan before starting implementation.

## Post-Refactor Validation (CRITICAL)

After completing ANY refactor (especially large components with JSX):

1. **ALWAYS run the dev server** to verify there are no syntax errors
   - Run `npx expo start` and wait for bundler to compile
   - Check for any red screen errors or console warnings
   - DO NOT consider the refactor complete until the app loads successfully

2. **Verify JSX tag matching**:
   - Every opening tag (`<View>`, `<Animated.View>`, etc.) MUST have a matching closing tag
   - Pay special attention to nested `View` and `Animated.View` components
   - Common mistake: Closing a `<View>` with `</Animated.View>` or vice versa

3. **Run type checking**:
   - Run `npm run typecheck` to catch TypeScript errors
   - Fix any type errors before considering the refactor complete

4. **Test the affected feature**:
   - Manually test the refactored component in the app
   - Verify all interactions still work as expected

**This validation MUST happen before marking the refactor as complete. Skipping this step leads to runtime errors that break the development experience.**

## Incident: March 10, 2026 - Post-Refactor Failures

**What happened:**
1. JSX tag mismatch: `<View>` closed with `</Animated.View>` → app crashed
2. 3 TypeScript errors: queries using removed "shopping" status
3. Schema validation failed: 1 DB record still had "shopping" status

**Root cause:** No validation after refactor. Dev server wasn't started, type checking wasn't run, migration wasn't executed.

**Recovery:**
1. Fixed JSX closing tag (ShoppingListItem.tsx:367)
2. Removed "shopping" queries from 3 Convex files
3. Ran migration: `npx convex run migrations/collapseShoppingModes:run '{"dryRun": false}'`

**Prevention:** Run the 4-step validation checklist above AFTER EVERY REFACTOR. No exceptions.

**Schema change workflow:**
1. Keep old enum value temporarily
2. Run migration to convert data
3. THEN remove old value from schema
