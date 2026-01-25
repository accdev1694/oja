# Story 1.7: Configure CI/CD and Development Tooling

Status: ready-for-dev

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As a **developer**,
I want **automated testing and deployment pipelines**,
so that **I can maintain code quality and deploy confidently**.

## Acceptance Criteria

1. **.github/workflows/ci.yml** runs linting, type checking, and tests on pull requests
2. **Vercel project** is connected for automatic preview deployments
3. **Environment variables** are configured for development, preview, and production
4. **.env.example** documents all required environment variables
5. **ESLint and Prettier** are configured with Architecture naming conventions enforced
6. **Husky pre-commit hooks** run linting

## Tasks / Subtasks

- [ ] **Task 1: GitHub Actions CI Workflow** (AC: #1)
  - [ ] Create `.github/workflows/ci.yml` with smoke, unit, integration, and E2E stages
  - [ ] Configure linting stage with ESLint
  - [ ] Configure type checking stage with TypeScript (`tsc --noEmit`)
  - [ ] Configure test execution stage with Vitest and Playwright
  - [ ] Set up test environment variables for Supabase, Stripe, Gemini
  - [ ] Configure GitHub Actions cache for npm dependencies
  - [ ] Set up matrix strategy for parallel test execution

- [ ] **Task 2: Vercel Deployment Integration** (AC: #2)
  - [ ] Connect Vercel project to GitHub repository
  - [ ] Configure automatic preview deployments for PR branches
  - [ ] Configure automatic production deployment for main branch
  - [ ] Set up Vercel environment variables (dev, preview, production)
  - [ ] Configure build command: `npm run build`
  - [ ] Configure output directory: `.next`
  - [ ] Test preview deployment on a sample PR

- [ ] **Task 3: Environment Variable Management** (AC: #3, #4)
  - [ ] Create `.env.example` with all required variables documented
  - [ ] Add `.env.local` to `.gitignore` (verify it's already there)
  - [ ] Document Supabase variables (URL, anon key)
  - [ ] Document Google Places API key
  - [ ] Document Gemini API key
  - [ ] Document Stripe variables (publishable key, secret key, webhook secret)
  - [ ] Document PostHog variables (API key, host)
  - [ ] Document Sentry DSN
  - [ ] Document environment identifier variable
  - [ ] Add environment variable validation in CI

- [ ] **Task 4: ESLint Configuration** (AC: #5)
  - [ ] Install ESLint plugins: @next/eslint-plugin-next, eslint-plugin-react-hooks, @typescript-eslint/eslint-plugin
  - [ ] Configure naming convention rules:
    - Database: `snake_case` validation
    - API routes: `kebab-case` validation
    - Components: `PascalCase.tsx` validation
    - Utilities: `camelCase.ts` validation
    - Hooks: `useCamelCase.ts` pattern validation
  - [ ] Configure import rules (no relative imports, require @/* alias)
  - [ ] Configure React hooks rules (dependency array validation)
  - [ ] Configure TypeScript strict mode rules
  - [ ] Add no-console rule for production
  - [ ] Test ESLint on existing codebase and fix any violations

- [ ] **Task 5: Prettier Configuration** (AC: #5)
  - [ ] Create `.prettierrc` with project standards
  - [ ] Configure line width, quotes, trailing commas, bracket spacing
  - [ ] Create `.prettierignore` for build artifacts
  - [ ] Install Prettier VS Code extension recommendation (`.vscode/extensions.json`)
  - [ ] Run Prettier on entire codebase to establish baseline
  - [ ] Add Prettier check to CI workflow

- [ ] **Task 6: Husky Pre-commit Hooks** (AC: #6)
  - [ ] Install Husky and configure git hooks
  - [ ] Create `.husky/pre-commit` hook
  - [ ] Add ESLint check for staged files (using lint-staged)
  - [ ] Add Prettier format check for staged files
  - [ ] Add TypeScript type checking (`tsc --noEmit`)
  - [ ] Configure fast-fail behavior (abort early on error)
  - [ ] Test pre-commit hook with intentional lint error
  - [ ] Optional: Create `.husky/pre-push` for running tests before push

- [ ] **Task 7: Testing Framework Enhancement** (Related to CI)
  - [ ] Verify Playwright is configured for E2E tests
  - [ ] Configure Playwright browsers (Chromium, Firefox, WebKit)
  - [ ] Configure Playwright viewports (mobile, tablet, desktop)
  - [ ] Set up Playwright trace capture on failure
  - [ ] Configure parallel test execution (4 workers)
  - [ ] Add test coverage reporting to CI
  - [ ] Configure test isolation with Supabase RLS

- [ ] **Task 8: Quality Gates Configuration** (Related to CI)
  - [ ] Configure npm audit security check in CI
  - [ ] Add Lighthouse performance check (≥90 score target)
  - [ ] Add accessibility check with axe-core (WCAG AA)
  - [ ] Configure code duplication check with jscpd (<5% threshold)
  - [ ] Set up branch protection rules requiring CI pass
  - [ ] Configure CODEOWNERS file for PR review requirements

- [ ] **Task 9: Documentation Updates** (AC: #4)
  - [ ] Update README.md with development setup instructions
  - [ ] Document environment variable setup process
  - [ ] Document testing command usage
  - [ ] Document CI/CD workflow explanation
  - [ ] Document code style guidelines
  - [ ] Add troubleshooting section for common CI failures

- [ ] **Task 10: Monitoring Setup** (Post-deployment readiness)
  - [ ] Configure Sentry project and get DSN
  - [ ] Add Sentry client-side error boundary
  - [ ] Configure Sentry server-side error capture
  - [ ] Set up PostHog project and get API key
  - [ ] Add PostHog client initialization
  - [ ] Create health check endpoint (`/api/health`)
  - [ ] Configure health check monitoring in Vercel

## Dev Notes

### Critical Architecture Requirements

**From Architecture Document:**

1. **CI/CD Pipeline Structure** (4-stage pipeline):
   - **Smoke Stage** (<5min): P0 health checks, linting, type checking
   - **Unit Tests** (<10min): Business logic (50% coverage target)
   - **Integration Tests** (<15min): API + Supabase RLS (30% coverage)
   - **E2E Tests** (<30min): Critical journeys (20% coverage, Playwright with 4 shards)

2. **Deployment Strategy**:
   - **Development**: Local only, Supabase dev, Stripe test mode
   - **Preview**: PR branches, Supabase staging, Stripe test mode, unique URLs
   - **Production**: main branch, Supabase production, Stripe live mode

3. **Naming Convention Enforcement** (CRITICAL - must be automated):
   - Database: `snake_case` (tables, columns, enums)
   - API routes: `kebab-case` (folders, routes)
   - Components: `PascalCase.tsx`
   - Utilities: `camelCase.ts`
   - Types: `PascalCase` in `types/index.ts`
   - Hooks: `useCamelCase.ts`

4. **Quality Gates** (ALL must pass before merge):
   - ESLint: 0 errors
   - TypeScript: 0 errors
   - Unit Tests: ≥80% critical paths
   - E2E Tests (P0): 100% pass rate
   - npm audit: No critical/high vulnerabilities
   - Lighthouse: ≥90 performance score
   - Accessibility: WCAG AA compliance (axe-core)
   - Code duplication: <5% (jscpd)

5. **TypeScript Strict Mode** (tsconfig.json):
   - All strict flags enabled
   - `noImplicitAny`, `strictNullChecks`, `strict PropertyInitialization`
   - `noUnusedLocals`, `noUnusedParameters`, `noImplicitReturns`
   - Validation runs in CI via `tsc --noEmit`

### Previous Story Intelligence (Story 1-6: Design System)

**Key Learnings:**

1. **Testing Approach:**
   - Use `data-testid` for components without semantic roles (fixed test failures)
   - Change from `toHaveClass()` to `className.toContain()` for Tailwind arbitrary values
   - Comprehensive test coverage (60 tests, 100% passing)
   - Jest configuration with @/ path mapping working well

2. **Build & Lint:**
   - Production build successful with Next.js 16.1.4 webpack
   - ESLint configuration needs eslint-disable for CommonJS requires (jest.config.js)
   - React purity issues resolved with `useId()` hook instead of `Math.random()`
   - CSS @import ordering matters (Google Fonts before Tailwind)

3. **Files Created (Pattern Established):**
   - `src/components/ui/**/*.tsx` - UI components
   - `src/components/ui/__tests__/**/*.test.tsx` - Component tests
   - `jest.config.js` - Jest configuration with Next.js
   - `jest.setup.js` - Test setup with @testing-library/jest-dom

4. **Code Quality Patterns:**
   - React.forwardRef for all components
   - className prop for customization
   - TypeScript interfaces exported
   - Barrel exports via index.ts
   - Comprehensive JSDoc comments

### Git Intelligence (Recent Commits)

**Pattern Analysis (Last 10 commits):**

1. **Commit Message Pattern:**
   - Format: "Complete Story X.Y: [Story Title]" or "Implement Story X.Y: [Story Title]"
   - Multi-line commit messages with bulleted lists of changes
   - Co-Authored-By: Claude Sonnet 4.5 <noreply@anthropic.com>

2. **Story Progression:**
   - Stories 1-1 through 1-6 completed sequentially
   - Each story created comprehensive infrastructure
   - Pattern: Story file → Implementation → Tests → Review status

3. **Files Modified Recently:**
   - `package.json` - Dependencies and scripts
   - `src/app/globals.css` - Design system
   - `src/lib/**` - Core libraries (query, supabase, stores)
   - `src/components/ui/**` - UI components
   - `sprint-status.yaml` - Progress tracking

### Project Structure Notes

**Current Structure (from CLAUDE.md):**

```
oja/
├── app/                          # Next.js App Router
├── components/
│   ├── ui/                       # Design system primitives
│   ├── stock/                    # Stock tracker components (future)
│   ├── list/                     # Shopping list components (future)
├── lib/
│   ├── supabase/                 # Supabase client (created in 1-3)
│   ├── stores/                   # Zustand stores (created in 1-5)
│   ├── hooks/                    # Custom hooks
│   ├── ai/                       # AI utilities (future)
│   ├── db/                       # Dexie.js database (created in 1-4)
│   └── utils/                    # General utilities
├── public/
│   └── icons/                    # PWA icons (created in 1-2)
├── _bmad-output/                 # BMAD artifacts
└── .github/                      # GitHub configuration (THIS STORY)
    └── workflows/                # CI/CD workflows (CREATE)
```

**Files to Create:**

```
.github/
  workflows/
    ci.yml                        # Main CI pipeline
.husky/
  pre-commit                      # Pre-commit hooks
  pre-push                        # Pre-push hooks (optional)
.env.example                      # Environment variable template
.eslintrc.json                    # ESLint configuration (may exist, extend)
.prettierrc                       # Prettier configuration
.prettierignore                   # Prettier ignore patterns
.vscode/
  extensions.json                 # Recommended VS Code extensions
playwright.config.ts              # Playwright E2E configuration (verify exists)
```

**Files to Modify:**

```
package.json                      # Add lint-staged, husky scripts
tsconfig.json                     # Verify strict mode settings
README.md                         # Add setup and CI documentation
next.config.ts                    # Verify build settings
```

### Library & Framework Specifics

**Required Dependencies (Install if Missing):**

```json
{
  "devDependencies": {
    "husky": "^9.0.0",
    "lint-staged": "^15.0.0",
    "jscpd": "^4.0.0",
    "@axe-core/playwright": "^4.0.0",
    "lighthouse-ci": "^0.13.0"
  }
}
```

**ESLint Plugins (Install if Missing):**

```bash
npm install --save-dev \
  @next/eslint-plugin-next \
  eslint-plugin-react-hooks \
  @typescript-eslint/eslint-plugin \
  @typescript-eslint/parser \
  eslint-config-prettier
```

**Husky Setup Commands:**

```bash
npx husky init
npx husky add .husky/pre-commit "npx lint-staged"
npx husky add .husky/pre-push "npm test"
```

**lint-staged Configuration (package.json):**

```json
{
  "lint-staged": {
    "*.{ts,tsx}": [
      "eslint --fix",
      "prettier --write"
    ],
    "*.{json,md}": [
      "prettier --write"
    ]
  }
}
```

### Testing Standards

**From Test Design Document:**

1. **Unit Tests (Vitest):**
   - Coverage target: ≥80% for critical paths
   - Parallel execution enabled
   - Mock Supabase client (factory pattern)
   - Mock Stripe API
   - Mock Gemini AI (recorded fixtures with MSW)

2. **E2E Tests (Playwright):**
   - Critical journeys only (20% of suite)
   - 4 worker shards for parallelism
   - Mobile viewports: 375x667, 390x844
   - Offline simulation support
   - Trace capture on failure

3. **Test Organization:**
   - Unit: `src/**/*.test.ts` or `src/**/__tests__/**/*.ts`
   - E2E: `tests/e2e/**/*.spec.ts`
   - Fixtures: `tests/fixtures/**/*`

### Environment Variables Documentation

**All Required Variables (from CLAUDE.md):**

```bash
# Supabase (required for auth, database, storage)
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key

# Google Places (required for store location detection)
NEXT_PUBLIC_GOOGLE_PLACES_API_KEY=your-google-api-key

# AI / Receipt Parsing (required for receipt OCR)
GEMINI_API_KEY=your-gemini-api-key

# Stripe Payments (required for subscriptions)
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_your-key
STRIPE_SECRET_KEY=sk_test_your-key
STRIPE_WEBHOOK_SECRET=whsec_your-secret

# Analytics (optional but recommended)
NEXT_PUBLIC_POSTHOG_API_KEY=phc_your-key
NEXT_PUBLIC_POSTHOG_HOST=https://app.posthog.com

# Error Tracking (optional but recommended)
NEXT_PUBLIC_SENTRY_DSN=https://your-sentry-dsn

# Environment Identifier (for conditional logic)
NEXT_PUBLIC_ENVIRONMENT=development|preview|production
```

### GitHub Actions Workflow Template

**Basic Structure (`.github/workflows/ci.yml`):**

```yaml
name: CI

on:
  pull_request:
    branches: [main, master]
  push:
    branches: [main, master]

jobs:
  smoke:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'npm'
      - run: npm ci
      - run: npm run lint
      - run: npm run type-check # or tsc --noEmit

  unit:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'npm'
      - run: npm ci
      - run: npm test -- --coverage
      - uses: codecov/codecov-action@v3 # optional

  e2e:
    runs-on: ubuntu-latest
    strategy:
      matrix:
        shard: [1, 2, 3, 4]
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'npm'
      - run: npm ci
      - run: npx playwright install --with-deps
      - run: npx playwright test --shard=${{ matrix.shard }}/4
      - uses: actions/upload-artifact@v3
        if: failure()
        with:
          name: playwright-report-${{ matrix.shard }}
          path: playwright-report/
```

### Vercel Configuration

**Project Settings:**

- **Framework Preset:** Next.js
- **Build Command:** `npm run build`
- **Output Directory:** `.next`
- **Install Command:** `npm ci`
- **Node Version:** 20.x

**Environment Variables (Vercel Dashboard):**

- Add all variables from `.env.example`
- Configure per environment (Development, Preview, Production)
- Use Vercel's encrypted storage for secrets
- Enable "Expose System Environment Variables" for preview URLs

### References

- [Architecture: CI/CD Pipeline] `_bmad-output/planning-artifacts/architecture.md#CI/CD Pipeline`
- [Architecture: Testing Strategy] `_bmad-output/planning-artifacts/architecture.md#Testing Strategy`
- [Architecture: Code Structure] `_bmad-output/planning-artifacts/architecture.md#Code Structure`
- [Architecture: Deployment] `_bmad-output/planning-artifacts/architecture.md#Deployment`
- [Test Design: Test Framework] `_bmad-output/planning-artifacts/test-design-system.md#Test Framework`
- [Test Design: Quality Gates] `_bmad-output/planning-artifacts/test-design-system.md#Quality Gates`
- [Epics: Story 1.7] `_bmad-output/planning-artifacts/epics.md#Story 1.7`
- [CLAUDE.md: Commands] `CLAUDE.md#Key Commands`
- [CLAUDE.md: Environment Variables] `CLAUDE.md#Environment Variables`
- [Previous Story: 1-6 Learnings] `_bmad-output/implementation-artifacts/stories/1-6-establish-design-system-foundation.md#Dev Agent Record`

## Dev Agent Record

### Agent Model Used

Claude Opus 4.5

### Debug Log References

- TypeScript type check: ✅ Passed
- ESLint: ✅ Passed (0 errors, 0 warnings)
- Prettier: ✅ Passed (all files formatted)
- Unit tests: ✅ Passed (60 tests)
- Production build: ✅ Successful

### Completion Notes List

1. Created GitHub Actions CI workflow with 4-stage pipeline (smoke, unit, build, e2e)
2. Installed dev dependencies: husky, lint-staged, @playwright/test, prettier, eslint-config-prettier, jscpd
3. Enhanced ESLint config with consistent-type-imports, no-restricted-imports for ../ paths, Prettier compatibility
4. Created Prettier configuration with project standards
5. Set up Husky pre-commit hooks with lint-staged for automatic linting/formatting
6. Configured Playwright for E2E testing with mobile-first viewports and 4-worker sharding
7. Updated .env.example with comprehensive documentation of all required environment variables
8. Created VS Code extensions recommendations and project settings
9. Created /api/health endpoint for monitoring
10. Created comprehensive README.md with development setup, testing, and troubleshooting docs
11. Fixed existing code to comply with new ESLint rules (type imports, relative import paths)
12. Excluded E2E tests from Jest configuration (run separately with Playwright)

### File List

**Created:**
- `.github/workflows/ci.yml` - GitHub Actions CI pipeline
- `.prettierrc` - Prettier configuration
- `.prettierignore` - Prettier ignore patterns
- `.husky/pre-commit` - Pre-commit hook
- `.vscode/extensions.json` - VS Code extension recommendations
- `.vscode/settings.json` - VS Code project settings
- `playwright.config.ts` - Playwright E2E configuration
- `tests/e2e/app.spec.ts` - E2E smoke tests
- `src/app/api/health/route.ts` - Health check endpoint
- `src/types/jest.d.ts` - Jest DOM type declarations
- `README.md` - Project documentation

**Modified:**
- `package.json` - Added scripts and lint-staged config
- `eslint.config.mjs` - Enhanced with naming conventions and Prettier compatibility
- `.env.example` - Comprehensive environment variable documentation
- `.gitignore` - Allow .vscode directory
- `jest.config.js` - Exclude E2E tests
- `src/components/ui/Button.tsx` - Fixed type imports
- `src/components/ui/Card.tsx` - Fixed type imports
- `src/components/ui/Input.tsx` - Fixed type imports
- `src/components/ui/__tests__/Button.test.tsx` - Fixed import paths
- `src/components/ui/__tests__/Card.test.tsx` - Fixed import paths
- `src/components/ui/__tests__/Input.test.tsx` - Fixed import paths

**Deleted:**
- `.env.local.example` - Consolidated into .env.example
