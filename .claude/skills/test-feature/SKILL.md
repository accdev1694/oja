---
description: Validate a feature area by running its unit tests, checking types, and optionally running relevant E2E specs. Use after implementing a feature, fixing a bug, or before marking work complete.
allowed-tools: Bash, Read, Edit, Grep, Glob, Task
---

# Validate Feature

Run comprehensive validation for a feature area: unit tests + typecheck + relevant E2E specs.

## Context

@FEATURE-RULES.md

## Test File Mapping

| Feature Area | Unit Tests (--testPathPattern) | E2E Specs |
|-------------|-------------------------------|-----------|
| lists | listItems, budget-logic, priceResolver | 04-shopping-lists, 05-list-items |
| pantry | sizes/, itemNameParser | 03-pantry |
| scanning | priceValidator, scanEnrichment | 06-receipt-scanning |
| prices | priceResolver, priceValidator, price-bracket-matcher | 07-budget-prices |
| insights | insights/ | 08-gamification-insights |
| partners | partners/ | 09-partner-mode |
| subscriptions | subscriptions/ | 11-subscription |
| admin | admin/ | 12-admin |
| stores | store-normalizer, storeQueries | 14-store-selection, 16-store-switch |
| sizes | sizes/, itemNameParser | 15-size-display |

## Instructions

1. Identify the feature area from `$ARGUMENTS` (e.g., "lists", "scanning", "prices", "pantry").
   If not recognized, search for the closest match in the mapping above and confirm with the user.

2. **Read FEATURE-RULES.md** for the relevant feature's behavior contracts.
   Any test failure that contradicts a rule = real bug, not a flaky test.

3. **Run unit tests** for that area:
   ```
   npm test -- --testPathPattern="<pattern-from-mapping>"
   ```

4. **Run typecheck:**
   ```
   npm run typecheck
   ```
   Stop here if types are broken — no point running E2E with type errors.

5. **Ask the user** if they want to run E2E specs for this area too.
   If yes, verify Metro + Convex are running, then:
   ```
   npx playwright test e2e/tests/<relevant-specs>
   ```

6. **Report results:**
   ```
   ## Validation: <feature area>
   - Unit tests: X passed / Y failed
   - Typecheck: clean | N errors
   - E2E: X passed / Y failed (or skipped)
   - Feature rules: all contracts verified | N violations found
   ```

7. If anything fails, analyze the failure:
   - Cross-reference with FEATURE-RULES.md behavior contracts
   - Determine if the failure is a test bug or a source bug
   - Present analysis and proposed fix
   - After approval, fix and re-run

## Rules

- Always check FEATURE-RULES.md before diagnosing a failure
- Run typecheck BEFORE E2E — broken types mean broken E2E
- A test failure after a feature change likely means the feature broke a behavior contract
- Present analysis before making any changes
- Never weaken assertions or delete tests to pass validation
