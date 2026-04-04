---
description: Find and remove dead imports, unused exports, and orphaned files. Use after refactoring, deleting features, or when the codebase feels cluttered.
allowed-tools: Bash, Read, Edit, Grep, Glob, Task
---

# Fix Imports & Dead Code

Clean up unused imports, dead exports, and orphaned files across the codebase.

## Instructions

1. **Determine scope:**
   - If `$ARGUMENTS` specifies files/directories, scope to those
   - Otherwise, check recently changed files: `git diff --name-only HEAD~5`

2. **Run TypeScript compiler** to find unused diagnostics:
   ```
   npx tsc --noEmit --noUnusedLocals --noUnusedParameters 2>&1
   ```
   Parse the output for:
   - `TS6133` — declared but never read (unused variable/import)
   - `TS6196` — declared but never used (unused type import)

3. **Scan for dead exports** — for each file in scope:
   - Find all `export` declarations
   - Grep the entire project for each exported name
   - Flag exports only used in 0 places (the file itself doesn't count)
   - EXCEPTION: Barrel files (`convex/*.ts` root) re-export for `api.*` — those are valid

4. **Scan for orphaned files:**
   - Find all `.ts`/`.tsx` files in scope
   - Check if each file is imported anywhere
   - Flag files with zero imports (except entry points: `app/**/*.tsx`, `convex/*.ts`)

5. **Present report:**
   ```
   ## Import Cleanup Report

   ### Unused Imports (X total)
   - file.ts:3 — `import { Foo } from './bar'` (Foo never used)

   ### Dead Exports (X total)
   - utils.ts:15 — `export function helper()` (0 consumers)

   ### Orphaned Files (X total)
   - lib/oldHelper.ts (imported nowhere)

   **Safe to remove: X items**
   **Needs verification: Y items**
   ```

6. **After user approval**, apply fixes:
   - Remove unused imports (preserve side-effect imports like `import './polyfill'`)
   - Do NOT remove dead exports without user confirmation (they may be API surface)
   - Run `npm run typecheck` after cleanup to verify nothing broke

## Rules

- NEVER remove imports that have side effects (CSS imports, polyfills, `import 'module'`)
- NEVER remove barrel file re-exports (e.g., `convex/ai.ts` re-exporting from `convex/ai/`)
- NEVER remove exports from files in `convex/schema/` (used by Convex runtime)
- Present report BEFORE making changes
- Run typecheck after every batch of removals
- Keep changes atomic — one file per edit, verify between batches
