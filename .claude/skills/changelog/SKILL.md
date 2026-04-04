---
description: Explain the most recent changes implemented in the codebase. Use when the user asks what changed, what was done recently, wants a changelog, or needs to catch up on recent work.
allowed-tools: Bash, Read, Grep, Glob, Task
---

# Recent Changes

Summarize recent git history — what changed, why, and what it affects.

## Instructions

1. **Scope:** `$ARGUMENTS` can be a number (last N commits), date (`today`, `this week`), or path. Default: last 10 commits.

2. **Gather** — run in parallel:
   ```
   git log --oneline --stat -<N>
   git status --short
   ```

3. **Present** — one line per commit, grouped:
   ```
   ## Changes — <range>

   **Features:** <hash> <what and why>
   **Fixes:** <hash> <what was broken, how fixed>
   **Refactors:** <hash> <what and why>
   **Tests/Config:** <hash> <summary>

   Uncommitted: <file list if any>
   Areas touched: <pantry, lists, voice, etc.>
   ```

4. For complex commits (5+ files), use a Task agent to read key files for deeper context.

## Rules

- One line per commit — WHY not WHAT
- Call out breaking changes and missing tests
- Group related commits together
