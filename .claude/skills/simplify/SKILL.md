---
description: Review recently changed files for code quality, reuse opportunities, and efficiency improvements. Use after completing a feature, fixing bugs, or before committing. Spawns parallel review agents for thorough analysis.
allowed-tools: Bash, Read, Edit, Grep, Glob, Task
---

# Simplify & Clean

Review recently changed files and fix quality issues, dead code, and missed reuse opportunities.

## Instructions

1. **Identify changed files** — run:
   ```
   git diff --name-only HEAD
   git diff --name-only --cached
   ```
   If no changes, check `$ARGUMENTS` for specific files/directories to review.

2. **Launch 3 parallel review agents** using the Task tool:

   **Agent 1 — Code Reuse & DRY:**
   - Find duplicated logic across changed files
   - Identify patterns that should use existing utilities (`lib/`, `convex/lib/`)
   - Check for reimplemented helpers (fuzzyMatch, itemNameParser, priceResolver, iconMatcher, safeHaptics)
   - Flag any new utility that duplicates existing functionality

   **Agent 2 — Quality & Rules Compliance:**
   - No `any` types (Rule #9)
   - Max 400 lines per file (Rule #10)
   - Convex queries use `.withIndex()` (Rule #2)
   - Item creation uses `cleanItemForStorage()` (Rule #13)
   - No missing error/loading/empty states (Rule #6)
   - Haptic feedback on interactions (Rule #4)
   - Validated icons only via `iconMatcher.ts` (Rule #7)

   **Agent 3 — Efficiency & Dead Code:**
   - Unused imports and variables
   - Unnecessary re-renders (missing useMemo/useCallback where needed)
   - Over-fetching from Convex (selecting all fields when few needed)
   - Dead code paths, commented-out code blocks
   - Backwards-compatibility hacks (renamed `_vars`, re-exports, `// removed` comments)

3. **Collect results** from all 3 agents and present a unified report:
   ```
   ## Simplify Report

   ### Code Reuse (X issues)
   - ...

   ### Rules Compliance (X issues)
   - ...

   ### Efficiency (X issues)
   - ...

   **Total: X issues found across Y files**
   ```

4. **Ask user** which issues to fix (all, specific categories, or specific items).

5. **Apply fixes** — edit files, then re-run:
   ```
   npm run typecheck
   npm test -- --no-coverage --bail
   ```

6. **Report final summary** with before/after line counts for modified files.

## Rules

- NEVER add features, refactor beyond what's needed, or add docstrings to untouched code
- NEVER introduce new dependencies to fix simplification issues
- Present the full report BEFORE making any changes
- Keep fixes minimal and focused — three similar lines is better than a premature abstraction
- If a file is already clean, say so — don't invent issues
