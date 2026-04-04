---
description: Build and deploy Oja via EAS with pre-flight checks. Use when the user asks to build, deploy, or create an APK. IMPORTANT - never run without explicit user request.
disable-model-invocation: true
allowed-tools: Bash, Read, Grep, Glob
---

# Deploy

Build and deploy Oja via Expo Application Services (EAS).

## Context

- EAS config: `eas.json` (development, preview, production profiles)
- App config: `app.json` (version 2.0.0, package com.oja.app)
- Platform: Android (primary), iOS (future)
- Dev builds use `expo-dev-client` with native modules

## Instructions

1. **Pre-flight checks** — run all in parallel, abort on any failure:
   ```
   npx tsc --noEmit                     # TypeScript
   npx eslint . --ext .ts,.tsx --quiet   # ESLint
   npm test -- --no-coverage --ci --bail # Jest
   ```
   Report results. If ANY check fails, STOP and show errors.

2. **Determine build profile:**
   - If `$ARGUMENTS` specifies a profile, use it
   - Otherwise ask the user:
     - `development` — Dev client with debugging, internal distribution
     - `preview` — Internal testing, no dev menu
     - `production` — App Store / Play Store release

3. **Check for uncommitted changes:**
   ```
   git status --short
   ```
   If there are uncommitted changes, warn the user and ask whether to proceed.

4. **Run the build:**
   ```
   eas build --platform android --profile <selected-profile>
   ```
   For local builds (no EAS cloud):
   ```
   eas build --platform android --profile <selected-profile> --local
   ```

5. **Report build status:**
   - Show the EAS build URL for monitoring
   - For local builds, report the output APK path

6. **Post-build (production only):**
   - Ask if user wants to submit to Play Store: `eas submit --platform android`
   - Remind user to update version in `app.json` for next release

## Rules

- NEVER run a build without passing all pre-flight checks first
- NEVER modify `eas.json` or `app.json` without explicit user approval
- NEVER use `--non-interactive` flag (user must confirm prompts)
- For production builds, always verify the version number with the user first
- Always show the build profile being used before starting
