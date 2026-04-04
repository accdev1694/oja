---
description: Verify Convex database integrity — orphaned records, stale subscriptions, price gaps, rule violations. Use to audit data health, find inconsistencies, or before releases.
allowed-tools: Bash, Read, Grep, Glob, Task, mcp__Neon__run_sql
---

# Database Health Check

Audit Convex database integrity using the Convex MCP server.

## Context

- Backend: Convex with 60+ tables across 11 schema files in `convex/schema/`
- Key rules: Zero-blank prices, size+unit together, trial expiry, index usage
- Convex MCP tools: `tables`, `data`, `functionSpec`, `runOneoffQuery`

## Instructions

1. **Connect to Convex** — use the Convex MCP server tools. If not available, fall back to:
   ```
   npx convex run --help
   ```

2. **Run integrity checks** — launch parallel agents for each category:

   **Check 1 — Subscription Integrity:**
   - Users with expired trials but `subscriptionStatus` still `"trialing"`
   - Users with `subscriptionStatus: "active"` but no valid Stripe subscription
   - Free users exceeding feature limits (>2 lists, >30 pantry items)
   - Deleted accounts without tombstone records

   **Check 2 — Item Data Quality:**
   - List items with size but no unit (violates `cleanItemForStorage` contract)
   - List items with no price AND no AI estimate (violates Zero-Blank Price rule)
   - Pantry items with invalid `stockLevel` values
   - Items with names longer than 200 characters

   **Check 3 — Relational Integrity:**
   - List items referencing non-existent shopping lists
   - Pantry items referencing non-existent users
   - Partner invites in `"pending"` status older than 30 days
   - Shopping lists with no owner

   **Check 4 — Price Intelligence:**
   - Items with stale personal prices (older than 30 days, no crowdsourced fallback)
   - Price history records with negative or zero amounts
   - Item variants with no price data at all

   **Check 5 — Cron Job Health:**
   - Check if daily metrics have recent entries
   - Check if pantry auto-archiving ran recently
   - Check for orphaned session records

3. **Present report:**
   ```
   ## Database Health Report

   ### Subscription Integrity
   - ✅ / ❌ Finding with count and sample records

   ### Item Data Quality
   - ✅ / ❌ Finding with count and sample records

   ### Relational Integrity
   - ✅ / ❌ Finding with count and sample records

   ### Price Intelligence
   - ✅ / ❌ Finding with count and sample records

   ### Cron Job Health
   - ✅ / ❌ Finding with last run timestamps

   **Overall: X checks passed, Y issues found**
   ```

4. **Suggest fixes** for any issues found, but NEVER apply without user approval.

## Rules

- NEVER modify or delete data without explicit user approval
- Use `runOneoffQuery` for read-only inspection — it's sandboxed
- Show sample records (max 3) for each issue, not full dumps
- If Convex MCP is unavailable, report that and suggest manual checks
