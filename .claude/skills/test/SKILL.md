---
description: Run Jest unit tests and fix failures. Use when the user asks to run tests, fix test failures, or validate changes with unit tests.
allowed-tools: Bash, Read, Edit, Grep, Glob, Task
---

# Run & Fix Unit Tests

Run the project's Jest unit tests and handle any failures.

## Context

- Test files: `__tests__/` (45 files)
- Config: `jest.config.js`
- Run all: `npm test`
- Run specific: `npm test -- --testPathPattern="$ARGUMENTS"`
- Watch mode: `npm run test:watch`

## Instructions

1. If `$ARGUMENTS` is provided, run only matching tests:
   ```
   npm test -- --testPathPattern="$ARGUMENTS"
   ```
   Otherwise run the full suite: `npm test`

2. If all tests pass, report the summary and stop.

3. If tests fail:
   - Read each failing test file to understand what's being tested
   - Read the source file being tested to understand the implementation
   - Determine whether the **test is wrong** (outdated assertion, stale mock) or the **source has a bug**
   - Present your analysis to the user with the proposed fix
   - After user approval, apply fixes
   - Re-run the failing tests to confirm the fix
   - Repeat until green

4. Report final summary:
   ```
   Tests: X passed, Y failed -> Y fixed
   Files modified: list of files changed
   ```

## Rules

- NEVER silently skip or delete failing tests
- NEVER weaken assertions just to make tests pass
- If a test failure reveals a real bug in source code, fix the source, not the test
- Follow existing test patterns — check neighboring test files for style
- Use `cleanItemForStorage()` in any test involving item creation
- Max 400 lines per file
- Present analysis before making any changes
