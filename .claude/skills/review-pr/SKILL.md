---
description: Perform adversarial code review on a PR or set of changes. Finds real bugs, rule violations, and security issues. Use before merging PRs or after completing a feature branch.
allowed-tools: Bash, Read, Edit, Grep, Glob, Task
---

# Adversarial Code Review

Thorough code review that finds 3-10 specific problems — not cosmetic nitpicks, but real issues.

## Instructions

1. **Identify scope** — determine what to review:
   - If `$ARGUMENTS` contains a PR number: `gh pr diff $ARGUMENTS`
   - If `$ARGUMENTS` contains file paths: review those files
   - Otherwise: `git diff main...HEAD` (all changes on current branch)

2. **Launch 4 parallel review agents:**

   **Agent 1 — CLAUDE.md Compliance:**
   - Every item creation uses `cleanItemForStorage()` (Rule #13)
   - No `any` types anywhere (Rule #9)
   - All files under 400 lines (Rule #10)
   - Convex queries use `.withIndex()` (Rule #2)
   - Optimistic updates for instant UX (Rule #3)
   - Haptic feedback on interactions (Rule #4)
   - All states handled: loading, error, empty, success (Rule #5)
   - Zero-blank prices enforced (Rule #6)
   - Validated icons only (Rule #7)
   - New Convex functions in subdirectories, not barrel files (Rule #16)

   **Agent 2 — Bug & Logic Scanner:**
   - Race conditions in async operations
   - Missing null/undefined checks
   - Incorrect TypeScript narrowing
   - Off-by-one errors in pagination/slicing
   - Missing error boundaries or try/catch
   - Unhandled promise rejections
   - Memory leaks (missing cleanup in useEffect)
   - Stale closures in callbacks

   **Agent 3 — Security & Performance:**
   - SQL/NoSQL injection in Convex queries
   - Missing `requireCurrentUser(ctx)` in mutations
   - Missing `requireAdmin(ctx)` in admin functions
   - Exposed secrets or PII in logs
   - N+1 query patterns in Convex
   - Unnecessary re-renders (large components without memoization)
   - Missing rate limiting on sensitive operations
   - XSS vectors in user-rendered content

   **Agent 4 — Git History & Consistency:**
   - Files that changed but tests weren't updated
   - New exports without corresponding tests
   - Removed functionality without cleanup (dead imports, orphaned files)
   - Schema changes without migration consideration
   - Feature flag references to non-existent flags

3. **Score each finding** (Critical / High / Medium / Low) and present:
   ```
   ## Code Review Report

   ### Critical (must fix before merge)
   1. [file:line] Description — why it's critical

   ### High (should fix before merge)
   1. [file:line] Description

   ### Medium (fix soon)
   1. [file:line] Description

   ### Low (consider fixing)
   1. [file:line] Description

   **Verdict: APPROVE / REQUEST CHANGES / NEEDS DISCUSSION**
   Total: X critical, Y high, Z medium, W low
   ```

4. **If user approves fixes**, apply them and re-run:
   ```
   npm run typecheck
   npm test -- --no-coverage --bail
   ```

## Rules

- MUST find minimum 3 issues — "looks good" is not acceptable
- NEVER approve code with Critical or High severity issues
- Focus on issues that would break in production, not style preferences
- Reference specific file:line for every finding
- Present the full report BEFORE making any changes
