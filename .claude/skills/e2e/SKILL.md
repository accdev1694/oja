---
description: Run Playwright E2E tests and debug failures. Use when the user asks to run end-to-end tests, debug E2E issues, or validate user journeys.
allowed-tools: Bash, Read, Edit, Grep, Glob, Task
---

# Run & Debug E2E Tests

Run Playwright end-to-end tests against Expo Web.

## Context

- 18 spec files in `e2e/tests/` (serial execution, shared Clerk auth state)
- Page Object Model in `e2e/pages/` (7 pages)
- Helpers in `e2e/helpers/`
- Run all: `npm run e2e`
- Run specific: `npx playwright test e2e/tests/$ARGUMENTS`
- UI mode: `npm run e2e:ui`
- Target: http://localhost:8081 (Expo Web)

## Known Quirks

- `AnimatedPressable` clicks need JS click via `clickPressable()` helper — never use `.click()` directly
- `networkidle` never fires (Convex WebSocket stays open) — use `waitForConvex()` helper
- Receipt upload uses hidden `<input type="file">` (expo-image-picker on web)
- Tests run serially — order matters because specs share Clerk auth state
- 19 real UK receipt images available in test fixtures for scanning tests

## Instructions

1. Verify prerequisites are running:
   - Metro dev server on port 8081 (`npx expo start`)
   - Convex backend (`npx convex dev`)
   If not running, warn the user and stop.

2. If `$ARGUMENTS` is provided, run that specific spec:
   ```
   npx playwright test e2e/tests/$ARGUMENTS
   ```
   Otherwise run all: `npm run e2e`

3. On failure:
   - Read the failing spec and the relevant page object
   - Check if selectors have changed (read the actual component source)
   - Check for timing issues (missing waits, race conditions)
   - Check if the test uses `clickPressable()` where needed
   - Check if the test uses `waitForConvex()` instead of `networkidle`
   - Present analysis to the user before fixing

4. After fix, re-run only the failing spec to confirm:
   ```
   npx playwright test e2e/tests/<spec-file>
   ```

## Rules

- Use `waitForConvex()` instead of `networkidle` — always
- Use `clickPressable()` for AnimatedPressable elements
- Never break test execution order (specs depend on prior auth state)
- Check `e2e/helpers/` for existing utilities before writing new ones
- Check `e2e/pages/` for existing page objects before adding selectors inline
- Present analysis before making any changes
