---
description: Create well-formatted conventional commits with type checking and test validation. Use when the user asks to commit, or says /commit.
disable-model-invocation: true
allowed-tools: Bash, Read, Grep, Glob
---

# Commit

Create a conventional commit with pre-commit validation.

## Instructions

1. **Gather state** — run in parallel:
   ```
   git status --short
   git diff --stat
   git diff --cached --stat
   git log --oneline -5
   ```

2. **Stage changes** — if nothing is staged, stage all tracked changes:
   ```
   git add -u
   ```
   If `$ARGUMENTS` specifies files, stage only those.
   NEVER stage `.env*`, `credentials*`, `service-account*`, or `google-services.json`.

3. **Pre-commit checks** — run in parallel:
   ```
   npx tsc --noEmit
   npx eslint . --ext .ts,.tsx --quiet
   ```
   If either fails, report errors and STOP. Do not commit with type errors or lint failures.

4. **Analyze changes** for commit message:
   - Read the diff: `git diff --cached`
   - Determine the type: `feat`, `fix`, `refactor`, `test`, `docs`, `chore`, `perf`, `style`
   - Summarize the WHY not the WHAT
   - If `$ARGUMENTS` contains a message hint, incorporate it

5. **Create commit** using heredoc format:
   ```
   git commit -m "$(cat <<'EOF'
   type(scope): concise description

   Optional body explaining WHY this change was made.

   Co-Authored-By: Claude <noreply@anthropic.com>
   EOF
   )"
   ```

6. **Post-commit verification:**
   ```
   git log --oneline -1
   git status --short
   ```

## Commit Message Rules

- **Format:** `type(scope): description` — lowercase, no period, imperative mood, max 72 chars
- **Types:** feat, fix, refactor, test, docs, chore, perf, style
- **Scope:** component or area affected (e.g., `pantry`, `lists`, `voice`, `admin`, `onboarding`)
- **Body:** Only if the change is non-obvious. Explain WHY, not WHAT.
- **Breaking changes:** Add `BREAKING CHANGE:` footer if applicable
- NEVER use `--no-verify` or `--no-gpg-sign`
- NEVER amend commits that have been pushed to remote
- NEVER force push to main/master

## Examples

```
feat(pantry): add auto-archive for expired items
fix(voice): prevent double-submission on Tobi commands
refactor(pricing): extract price cascade into shared utility
test(insights): add weekly digest edge case coverage
chore(deps): bump convex to 1.33.1
```
