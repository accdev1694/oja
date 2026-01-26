# System-Level Test Design - Oja

**Date:** 2026-01-24
**Author:** Test Architect (Murat)
**Status:** Draft
**Mode:** System-Level (Phase 3 - Testability Review)

---

## Executive Summary

**Project:** Oja - Budget-First Shopping Confidence PWA
**Assessment Scope:** Architecture testability review before implementation gate

**Overall Testability:** ✅ PASS with CONCERNS

The architecture is fundamentally testable with clear boundaries, typed APIs, and separation of concerns. Three concerns require mitigation during Sprint 0.

---

## Testability Assessment

### Controllability: ✅ PASS

| Factor | Evidence | Score |
|--------|----------|-------|
| Database State Control | Supabase migrations + seed.sql, RLS policies isolate test data | 3/3 |
| External Service Mocking | All integrations in dedicated `lib/` modules (Stripe, Gemini, Supabase) | 3/3 |
| Error Condition Simulation | `ActionResult<T>` typed error responses, error codes defined | 3/3 |
| Offline Simulation | Dexie.js sync queue + Service Worker control via Playwright | 3/3 |

**Mitigation Required:**
- Create Supabase client factory for test injection (avoid singleton in tests)

### Observability: ✅ PASS

| Factor | Evidence | Score |
|--------|----------|-------|
| State Inspection | TanStack Query + Zustand DevTools, Dexie.js IndexedDB inspection | 3/3 |
| Logging & Tracing | Sentry (error tracking), PostHog (analytics), structured error codes | 3/3 |
| Performance Metrics | Lighthouse integration, Core Web Vitals tracking | 3/3 |
| API Transparency | Server Actions with typed responses, Server-Timing headers | 3/3 |

**Mitigation Required:**
- Add correlation IDs to Server Actions for trace linking

### Reliability: ⚠️ CONCERNS

| Factor | Evidence | Score |
|--------|----------|-------|
| Test Isolation | Feature boundaries enforced, RLS per-user isolation | 3/3 |
| Reproducibility | Gemini AI responses non-deterministic | 2/3 |
| Parallel Safety | Per-user RLS enables parallel test users | 3/3 |
| Race Condition Risk | Supabase Realtime subscriptions | 2/3 |

**Mitigation Required:**
- Mock Gemini responses with recorded fixtures (HAR or JSON stubs)
- Implement deterministic waits for Realtime subscription tests

---

## Architecturally Significant Requirements (ASRs)

### High-Priority ASRs (Score ≥6)

| ASR ID | Requirement | Category | Probability | Impact | Score | Test Approach |
|--------|-------------|----------|-------------|--------|-------|---------------|
| ASR-001 | <100ms budget updates | PERF | 3 | 3 | 9 | k6 load testing + Lighthouse |
| ASR-002 | Zero data loss sync | DATA | 2 | 3 | 6 | E2E offline→online scenarios |
| ASR-003 | 99.5% uptime | OPS | 2 | 3 | 6 | Health endpoint monitoring |
| ASR-004 | GDPR compliance (deletion) | SEC | 2 | 3 | 6 | E2E data export + deletion |
| ASR-005 | <2s cold start | PERF | 3 | 2 | 6 | Lighthouse + Web Vitals |
| ASR-006 | AES-256 encryption at rest | SEC | 2 | 3 | 6 | Supabase configuration audit |

### Medium-Priority ASRs (Score 3-5)

| ASR ID | Requirement | Category | Probability | Impact | Score | Test Approach |
|--------|-------------|----------|-------------|--------|-------|---------------|
| ASR-007 | 60fps animations | PERF | 2 | 2 | 4 | Playwright Performance API |
| ASR-008 | WCAG AA compliance | BUS | 2 | 2 | 4 | axe-core E2E integration |
| ASR-009 | Stripe webhook <5s | PERF | 2 | 2 | 4 | API integration tests |
| ASR-010 | <50MB IndexedDB | PERF | 2 | 2 | 4 | Quota monitoring tests |

---

## Test Levels Strategy

### Recommended Distribution

Based on architecture (PWA with heavy offline, real-time sync):

| Level | Percentage | Rationale |
|-------|------------|-----------|
| **Unit** | 50% | Business logic (budget calculations, stock level transitions, currency formatting) |
| **Integration/API** | 30% | Server Actions, Supabase RLS policies, Stripe webhook handling |
| **E2E** | 20% | Critical user journeys (onboarding, shopping trip, receipt scan) |

### Level Selection by Domain

| Domain | Primary Level | Secondary | Rationale |
|--------|---------------|-----------|-----------|
| Budget Calculations | Unit | API | Pure math logic, validate at source |
| Stock Level Transitions | Unit | E2E | State machine, swipe gesture E2E |
| Authentication | E2E | API | User-facing critical flow |
| Receipt OCR/AI | E2E | Mock fixtures | Non-deterministic, need real camera flow |
| Offline Sync | E2E | Unit | Complex interaction, test full offline scenario |
| Stripe Payments | API | E2E | Webhook validation, checkout E2E |
| Admin Dashboard | API | E2E | CRUD operations, fewer user journeys |

---

## NFR Testing Approach

### Security (NFR-S1 through NFR-S12)

| NFR | Test Type | Tool | Approach |
|-----|-----------|------|----------|
| NFR-S1: AES-256 at rest | Audit | Supabase config | Verify encryption settings |
| NFR-S2: TLS 1.3 | E2E | Playwright + SSL labs | Verify HTTPS enforcement |
| NFR-S3: httpOnly JWT | E2E | Playwright | Verify token not in localStorage |
| NFR-S4: OWASP Top 10 | E2E + Security | ZAP/Burp | SQL injection, XSS tests |
| NFR-S6: Admin 2FA | E2E | Playwright | MFA enrollment flow |
| NFR-S10: GDPR deletion | E2E | Playwright | Account deletion + verification |

### Performance (NFR-P1 through NFR-P10)

| NFR | Test Type | Tool | Threshold |
|-----|-----------|------|-----------|
| NFR-P1: <100ms budget update | Load | k6 | p95 < 100ms |
| NFR-P2: <2s cold start | E2E | Lighthouse | LCP < 2s |
| NFR-P3: 60fps animations | E2E | Performance API | Frame drops < 5% |
| NFR-P4: <5s receipt OCR | E2E | Playwright | Processing time < 5s |
| NFR-P10: <50MB IndexedDB | E2E | quota API | Storage < 50MB after 1000 items |

### Reliability (NFR-R1 through NFR-R10)

| NFR | Test Type | Tool | Approach |
|-----|-----------|------|----------|
| NFR-R1: 99.5% uptime | Monitoring | External | Not directly testable |
| NFR-R3: Zero data loss sync | E2E | Playwright | Offline edit → online → verify |
| NFR-R5: 99.5% crash-free | E2E | Sentry | Error rate monitoring |
| NFR-R7: Retry transient errors | Unit + E2E | Jest + Playwright | Mock failures, verify retry |
| NFR-R9: Graceful degradation | E2E | Playwright | Service unavailable scenarios |

### Maintainability

| Aspect | Test Type | Tool | Threshold |
|--------|-----------|------|-----------|
| Code Coverage | CI | Vitest | ≥80% critical paths |
| Code Duplication | CI | jscpd | <5% duplication |
| Vulnerability Scan | CI | npm audit | No critical/high |
| Observability | E2E | Playwright | Sentry events captured |

---

## Test Environment Requirements

### Local Development

```yaml
environment: local
services:
  - Supabase CLI (local postgres + auth)
  - Stripe CLI (webhook testing)
  - Mock Gemini server (recorded responses)
data:
  - seed.sql for baseline data
  - Test user fixtures
```

### CI/CD (GitHub Actions)

```yaml
environment: ci
services:
  - Supabase test project (isolated)
  - Stripe test mode
  - Gemini mock server
parallelism:
  - Sharded E2E tests (4 workers)
  - Parallel unit tests
```

### Staging

```yaml
environment: staging
services:
  - Supabase staging project
  - Stripe test mode
  - Real Gemini API (test quota)
data:
  - Synthetic test data
  - No real user data
```

---

## Testability Concerns

### CONCERN-1: Gemini AI Non-Determinism

**Risk:** Receipt parsing tests will be flaky due to AI response variation.

**Mitigation:**
1. Record Gemini responses as JSON fixtures during development
2. Mock Gemini API in E2E tests using MSW (Mock Service Worker)
3. Run real Gemini tests nightly (not on every PR)

**Owner:** Dev Team
**Timeline:** Sprint 0

### CONCERN-2: Supabase Realtime Race Conditions

**Risk:** Tests relying on real-time updates may have timing issues.

**Mitigation:**
1. Use Playwright's `waitForResponse` for subscription messages
2. Implement deterministic test helpers for Realtime verification
3. Add timeout wrappers with clear failure messages

**Owner:** QA Team
**Timeline:** Sprint 0

### CONCERN-3: Offline/PWA Testing Complexity

**Risk:** Service Worker testing requires special Playwright configuration.

**Mitigation:**
1. Use `page.context().setOffline(true)` for network simulation
2. Clear Service Worker cache between tests
3. Create dedicated PWA test fixtures

**Owner:** Dev Team
**Timeline:** Sprint 0

---

## Recommendations for Sprint 0

### Framework Setup (`*framework` workflow)

1. **Playwright Configuration**
   - Configure for PWA testing (Service Worker support)
   - Set up mobile viewport presets (375x667, 390x844)
   - Configure offline testing helpers

2. **Test Data Factories**
   - Create factories for: User, StockItem, ShoppingList, Receipt
   - Integrate with Supabase seed mechanism
   - Implement cleanup hooks

3. **Mock Infrastructure**
   - Set up MSW for Gemini API mocking
   - Configure Stripe test webhooks
   - Create Supabase client factory for test injection

### CI Pipeline Setup (`*ci` workflow)

1. **Test Stages**
   ```yaml
   smoke: <5min (P0 health checks)
   unit: <10min (Vitest, parallel)
   integration: <15min (API tests, Supabase)
   e2e: <30min (Playwright, 4 shards)
   ```

2. **Quality Gates**
   - Unit coverage ≥80%
   - All P0 tests pass
   - No security vulnerabilities (npm audit)
   - Lighthouse score ≥90

3. **Artifacts**
   - Playwright traces on failure
   - Coverage reports
   - Performance baselines

---

## Quality Gate Criteria (Implementation Readiness)

### Pass Criteria

- [ ] All ASRs with score ≥6 have defined test approach
- [ ] Test levels strategy documented
- [ ] NFR testing approach defined for all categories
- [ ] Testability concerns identified with mitigations
- [ ] Sprint 0 recommendations actionable

### Current Assessment: ✅ PASS

This architecture is ready for implementation. The three testability concerns are manageable with the recommended mitigations during Sprint 0.

---

## Next Steps

1. **Sprint Planning** → Run `/bmad:bmm:workflows:sprint-planning` to generate sprint-status.yaml
2. **Sprint 0 Implementation** → Set up test framework per recommendations
3. **Epic-Level Test Design** → Run `*test-design` again in Phase 4 for per-epic test plans

---

**Generated by**: BMad TEA Agent - Test Architect Module
**Workflow**: `_bmad/bmm/workflows/testarch/test-design`
**Mode**: System-Level (Phase 3)
