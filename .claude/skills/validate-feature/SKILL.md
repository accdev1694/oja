---
description: Deep investigation of a feature's actual vs expected behavior. Tests correctness, adds missing tests, fixes bugs, and enforces all project standards. Use when you want to fully validate a feature works correctly end-to-end.
allowed-tools: Bash, Read, Edit, Write, Grep, Glob, Task
---

# Validate & Harden Feature

Full-depth investigation: does this feature actually work as expected? Find gaps, fix bugs, add tests, enforce standards.

## Context

@FEATURE-RULES.md
@CLAUDE.md (Critical Rules section)

## Instructions

### Phase 1: Identify & Map

1. Identify the feature from `$ARGUMENTS` (e.g., "scanning", "pantry", "lists", "subscriptions", "voice", "pricing", "insights", "partners", "onboarding", "stores").

2. **Map the feature** — launch an Explore agent to find:
   - All source files that implement the feature (backend + frontend + hooks + components)
   - All test files that cover it (unit + E2E)
   - Related utilities it depends on
   - FEATURE-RULES.md section for this feature (if one exists)
   - Build a file manifest and present it before proceeding

### Phase 2: Behavior Investigation (5 parallel agents)

Launch 5 agents simultaneously using the Task tool:

**Agent 1 — Expected vs Actual Behavior:**
- Read FEATURE-RULES.md for this feature's behavior contracts (if defined)
- Read every source file in the manifest
- Trace the full data flow: user action → frontend → hook → Convex mutation → DB → query → UI
- Document what the code ACTUALLY does at each step
- Flag any deviation from FEATURE-RULES.md contracts
- Flag any logic that seems wrong even without documented rules (dead branches, impossible conditions, swallowed errors)

**Agent 2 — CLAUDE.md Rules Compliance:**
- Rule #2: Every Convex query uses `.withIndex()` (no bare `.collect()`)
- Rule #3: Optimistic updates for instant UX
- Rule #4: Haptic feedback on all interactions via `safeHaptics.ts`
- Rule #5: All states handled — loading, error, empty, success
- Rule #6: Zero-Blank Prices — every item shows a price
- Rule #7: Validated icons only via `iconMatcher.ts`
- Rule #9: No `any` type anywhere
- Rule #10: Max 400 lines per file
- Rule #13: `cleanItemForStorage()` on every item creation/update
- Rule #14: Cross-function calls use `ctx.runQuery(api.module.fn)`
- Rule #16: New Convex functions in subdirectories, not barrel files

**Agent 3 — Bug & Edge Case Scanner:**
- Missing null/undefined checks on DB lookups
- Race conditions in async operations (parallel mutations, stale closures)
- Unhandled promise rejections or missing try/catch
- Off-by-one errors in pagination, slicing, or limits
- Memory leaks (missing useEffect cleanup)
- Missing `requireCurrentUser(ctx)` in mutations
- Missing `requireAdmin(ctx)` in admin functions
- N+1 query patterns (loop of DB reads)
- XSS vectors in user-rendered content
- Missing rate limiting on sensitive operations

**Agent 4 — Test Coverage Audit:**
- List every public function/export in the feature's source files
- For each, check if a test exists and what it covers
- Flag: untested functions, missing edge cases, weak assertions (truthy-only), missing error paths, stale tests
- Flag: missing integration tests (e.g., does the mutation → query round-trip work?)
- Count: X functions, Y tested, Z% coverage estimate

**Agent 5 — Performance & Efficiency:**
- Unnecessary re-renders (large components without memoization)
- Over-fetching from Convex (`.collect()` when `.first()` suffices)
- Missing indexes on frequently-queried fields
- Redundant DB reads (same data fetched multiple times)
- Unused imports, dead code paths, commented-out blocks
- Heavy computations in render path without useMemo

### Phase 3: Report

Collect all 5 agent results and present a unified report:

```
## Feature Validation: <feature name>

### Files Analyzed
- <file manifest with line counts>

### Behavior Deviations (X found)
- [file:line] Expected: <rule> | Actual: <what code does>

### Rule Violations (X found)
- [file:line] Rule #N: <description>

### Bugs & Edge Cases (X found)
- [CRITICAL|HIGH|MEDIUM|LOW] [file:line] <description>

### Test Gaps (X found)
- <function> in <file> — untested / missing edge cases
- Estimated coverage: X%

### Performance Issues (X found)
- [file:line] <description>

**Summary: X critical, Y high, Z medium, W low**
**Tests: X functions, Y tested, Z gaps**
```

**Wait for user approval before making any changes.**

### Phase 4: Fix

After approval, work through fixes in priority order:

1. **Critical/High bugs first** — fix source code
2. **Rule violations** — bring into compliance
3. **Write missing tests** — follow patterns in neighboring test files:
   - Match existing `describe`/`it` structure and assertion style
   - One behavior per `it` block, clear descriptive names
   - Cover: happy path, edge cases, error paths, boundary values
   - For Convex functions: test with realistic mock data
4. **Performance fixes** — add memoization, fix queries, remove dead code

After each batch of fixes, run:
```
npm run typecheck
npm test -- --testPathPattern="<relevant-pattern>" --no-coverage
```

### Phase 5: Verify

After all fixes applied:

1. Run full relevant test suite:
   ```
   npm test -- --testPathPattern="<feature-pattern>"
   ```

2. Run typecheck:
   ```
   npm run typecheck
   ```

3. Present final summary:
   ```
   ## Validation Complete: <feature>

   Fixed: X bugs, Y rule violations, Z performance issues
   Tests: X new tests written, Y existing tests updated
   Coverage: before X% → after Y% (estimated)
   All tests passing: YES/NO
   Typecheck clean: YES/NO
   ```

## Rules

- NEVER weaken assertions or delete tests to make things pass
- NEVER skip the report — present findings BEFORE making any changes
- NEVER fix without user approval
- Fix the SOURCE when a test reveals a real bug, not the test
- Follow existing test patterns — read 2-3 neighboring tests for style reference
- Max 400 lines per file — split if approaching limit
- Every new test must run green before finishing
- If FEATURE-RULES.md has no section for this feature, note it and validate against general standards only
