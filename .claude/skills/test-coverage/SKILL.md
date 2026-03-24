---
description: Analyze test coverage, find gaps, identify missing edge cases, and write new tests to improve coverage. Use when the user asks to improve tests, check coverage, find untested code, or harden test suites.
allowed-tools: Read, Grep, Glob, Bash, Edit, Write, Task
---

# Test Coverage Analyzer & Improver

Explore the codebase to find testing gaps, missing edge cases, and weak assertions, then write tests to fill them.

## Context

- Unit tests: `__tests__/` (45 files, Jest)
- E2E tests: `e2e/tests/` (18 specs, Playwright)
- Backend: `convex/` (modular subdirectories: ai/, shoppingLists/, listItems/, pantry/, insights/, admin/, lib/voice/)
- Key utilities: `convex/lib/itemNameParser.ts`, `convex/lib/priceResolver.ts`, `convex/lib/featureGating.ts`, `lib/sizes/sizeNormalizer.ts`, `lib/text/fuzzyMatch.ts`
- Hooks: `hooks/`
- Components: `components/`

## Instructions

### Phase 1: Scope

If `$ARGUMENTS` is provided, focus on that area (e.g., "pantry", "listItems", "pricing", "voice").
Otherwise, do a broad sweep across the codebase.

### Phase 2: Discover What Exists

1. List all test files and map them to source files:
   - For each test in `__tests__/`, identify the source file it covers
   - Build a coverage map: `{ sourceFile -> testFile(s) }`

2. List all source files that have NO corresponding test:
   - Backend modules in `convex/` subdirectories
   - Hooks in `hooks/`
   - Utilities in `lib/`
   - Components with logic (not pure UI) in `components/`

3. Report the gap summary to the user before writing anything.

### Phase 3: Analyze Existing Tests

For each existing test file in scope:

1. **Read the test file** and the source file it covers side by side
2. Check for:
   - **Untested functions** — public exports in the source that have zero test cases
   - **Missing edge cases** — boundary values, empty inputs, null/undefined, large inputs, unicode, special characters
   - **Weak assertions** — tests that only check truthy/falsy instead of exact values
   - **Missing error paths** — happy path tested but error/rejection paths aren't
   - **Stale tests** — tests referencing functions or behavior that no longer exists
   - **Missing integration points** — e.g., `cleanItemForStorage` called in source but not tested with realistic dirty input
   - **Concurrency/timing gaps** — async functions tested without race condition scenarios

3. For `itemNameParser` tests specifically, verify coverage of:
   - Size without unit (must reject)
   - Vague sizes ("per item", "each", "unit", "piece")
   - Size embedded in name ("500ml Milk")
   - UK-specific units (pints, stone, fl oz)
   - Unicode and accented characters in item names
   - Empty string, whitespace-only, extremely long inputs

4. For `priceResolver` tests, verify coverage of:
   - All 3 cascade layers (personal, crowdsourced, AI)
   - Stale personal data (> 3 days) being overridden by fresher crowdsourced
   - Missing prices at each layer
   - Price confidence scoring edge cases

### Phase 4: Report

Present findings as a structured report:

```
## Coverage Report: <area>

### Untested Source Files (no test file exists)
- convex/pantry/lifecycle.ts — 0 tests
- hooks/useVariantPrefetch.ts — 0 tests

### Existing Tests with Gaps
- __tests__/lib/itemNameParser.test.ts
  - MISSING: Unicode item names
  - MISSING: Size "0g" edge case
  - WEAK: line 45 only checks truthiness

### Edge Cases to Add
1. itemNameParser: size="0ml" should reject (zero quantity)
2. priceResolver: all layers return null simultaneously
...

### Recommended New Test Files
- __tests__/convex/pantry-lifecycle.test.ts
- __tests__/hooks/useVariantPrefetch.test.ts
```

**Wait for user approval before writing any tests.**

### Phase 5: Write Tests

After approval:

1. For **new test files**, follow the patterns in neighboring test files:
   - Read 2-3 existing tests in the same `__tests__/` subdirectory for style reference
   - Match import patterns, describe/it structure, assertion style
   - Use `describe` blocks grouped by function, `it` blocks for each scenario

2. For **additions to existing test files**, add new `describe` or `it` blocks:
   - Place new edge case tests near the related happy-path tests
   - Use clear test names: `it("rejects size without unit")` not `it("works")`

3. Run the tests after writing to verify they pass:
   ```
   npm test -- --testPathPattern="<new-or-modified-test>"
   ```

4. If a new test reveals an actual bug (test fails against current source), **do not fix the source** — report it to the user as a finding.

## Rules

- NEVER write tests that just pass without meaningful assertions
- NEVER mock so aggressively that the test doesn't exercise real logic
- NEVER modify source code — this skill only reads source and writes/edits test files
- Every test must have a clear, descriptive name explaining the scenario
- Group related tests in `describe` blocks
- Test one behavior per `it` block
- Always run new tests to verify they pass before finishing
- Max 400 lines per test file — split into multiple files if needed
- Follow existing test patterns in the codebase, don't invent new conventions
