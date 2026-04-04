---
description: Load critical project context at session start — sprint status, recent changes, active issues, and current state. Use at the beginning of any session, or when you need a status briefing.
allowed-tools: Bash, Read, Grep, Glob, Task
---

# Session Context Briefing

Load and summarize the current project state for an efficient session start.

## Instructions

1. **Gather context** — run all in parallel:

   **Git state:**
   ```
   git status --short
   git log --oneline -10
   git branch --show-current
   ```

   **Sprint status:**
   - Read `_bmad-output/implementation-artifacts/sprint-status.yaml`

   **Active rules:**
   - Read `FEATURE-RULES.md` (first 50 lines for active contracts)

   **Open GitHub issues:**
   ```
   gh issue list --state open --limit 10
   ```

   **Test health:**
   ```
   npm run typecheck 2>&1 | tail -5
   ```

2. **Present briefing:**
   ```
   ## Session Briefing — Oja

   ### Git State
   Branch: <branch>
   Uncommitted changes: <count> files
   Last 5 commits: <list>

   ### Sprint Status
   Current Epic: <epic name and number>
   Stories in progress: <list>
   Stories completed: <count>/<total>
   Next up: <next story>

   ### Active Issues
   <open GitHub issues summary>

   ### Codebase Health
   Type errors: <count or clean>
   Uncommitted changes: <list>

   ### Key Reminders
   - Active feature rules from FEATURE-RULES.md
   - Any recent architectural decisions
   ```

3. **If Memory MCP is available**, also load:
   - Recent entities from the knowledge graph
   - Any stored decisions or context from previous sessions

## Rules

- Keep the briefing concise — max 40 lines
- Highlight anything that needs immediate attention (failing types, stale branches)
- Do NOT start fixing issues — just report the state
- If sprint-status.yaml is missing, note it and skip that section
