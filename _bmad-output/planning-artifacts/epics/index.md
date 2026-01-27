# Oja - Epic Index

> **Last Updated:** 2026-01-27
> **Total Epics:** 8
> **Total Stories:** 47
> **Total Requirements:** 206 Functional + 54 Non-Functional + 62 Additional = **322 Total**

---

## Epic Overview

| Epic | Stories | FRs | Status | File |
|------|---------|-----|--------|------|
| **Epic 1:** Foundation & Authentication | 9 | 21 | ⏳ Pending | [epic-01-foundation-authentication.md](./epic-01-foundation-authentication.md) |
| **Epic 2:** Pantry Stock Tracker | 6 | 20 | ⏳ Pending | [epic-02-pantry-stock-tracker.md](./epic-02-pantry-stock-tracker.md) |
| **Epic 3:** Shopping Lists with Budget Control | 10 | 25 | ⏳ Pending | [epic-03-shopping-lists-budget-control.md](./epic-03-shopping-lists-budget-control.md) |
| **Epic 4:** Partner Mode & Collaboration | 5 | 15 | ⏳ Pending | [epic-04-partner-mode-collaboration.md](./epic-04-partner-mode-collaboration.md) |
| **Epic 5:** Receipt Intelligence & Price History | 6 | 18 | ⏳ Pending | [epic-05-receipt-intelligence-price-history.md](./epic-05-receipt-intelligence-price-history.md) |
| **Epic 6:** Insights, Gamification & Progress | 3 | 7 | ⏳ Pending | [epic-06-insights-gamification-progress.md](./epic-06-insights-gamification-progress.md) |
| **Epic 7:** Subscription, Payments & Loyalty | 3 | 12 | ⏳ Pending | [epic-07-subscription-payments-loyalty.md](./epic-07-subscription-payments-loyalty.md) |
| **Epic 8:** Admin Dashboard & Operations | 5 | 95 | ⏳ Pending | [epic-08-admin-dashboard-operations.md](./epic-08-admin-dashboard-operations.md) |

---

## Requirements Coverage Map

### Epic 1: Foundation & Authentication (21 FRs)
- FR1-FR7: User Account Management
- FR16: Hybrid Pantry Seeding (location + multi-cuisine)
- FR75-FR77: Location & Currency Detection
- FR85-FR90: Onboarding Flow

**Additional:** AR1-AR10, CR1-CR4, SR1-SR4, DT1-DT10, GD1-GD8, GF8

---

### Epic 2: Pantry Stock Tracker (20 FRs)
- FR8-FR15: Pantry/Stock Tracking
- FR80-FR84: Cross-Device & Offline Sync
- FR91-FR96: Feedback & Celebrations (sounds, haptics)

---

### Epic 3: Shopping Lists with Budget Control (25 FRs)
- FR17-FR31: Shopping List Management
- FR32-FR39: Budget Control (Safe Zone, Budget Lock, Impulse Fund)
- FR78-FR79: Location & Store Intelligence

---

### Epic 4: Partner Mode & Collaboration (15 FRs)
- FR192-FR206: Multi-User Lists (invite, roles, bidirectional approval, contest, comments, notifications)

**Gamification:** GF7 (Partner Mode with approval workflow)

---

### Epic 5: Receipt Intelligence & Price History (18 FRs)
- FR40-FR51: Receipt Processing (capture, OCR, Gemini parsing, validation)
- FR52-FR57: Price Intelligence (history, estimates, crowdsourced DB)

---

### Epic 6: Insights, Gamification & Progress (7 FRs)
- FR58-FR64: Insights & Analytics (weekly digest, trends, category breakdown, savings)

**Gamification:** GF1-GF6, GF9-GF11 (streaks, savings jar, challenges, personal best, surprise delight, stock reminder, mid-shop flow)

---

### Epic 7: Subscription, Payments & Loyalty (12 FRs)
- FR65-FR74: Subscription & Payments (£2.99/mo, £21.99/yr, loyalty points, up to 50% discount)

---

### Epic 8: Admin Dashboard & Operations (95 FRs)
- FR97-FR101: Admin Access & Security
- FR102-FR110: Business Analytics
- FR111-FR118: Revenue & Financial
- FR119-FR127: Stripe Integration
- FR128-FR139: User Management
- FR140-FR151: Receipt & Price Management
- FR152-FR158: Product & Content
- FR159-FR167: System Health
- FR168-FR174: Customer Support
- FR175-FR179: Communication
- FR180-FR186: Configuration
- FR187-FR191: Reporting

---

## Non-Functional Requirements (54 NFRs)

**Performance (10):** NFR-P1 to NFR-P10
**Security (12):** NFR-S1 to NFR-S12
**Scalability (7):** NFR-SC1 to NFR-SC7
**Reliability (10):** NFR-R1 to NFR-R10
**Accessibility (8):** NFR-A1 to NFR-A8
**Integration (6):** NFR-I1 to NFR-I6
**Mobile-Native (6):** NFR-M1 to NFR-M6

All NFRs are addressed as cross-cutting concerns across all epics.

---

## Additional Requirements (62)

- **Architecture Requirements (10):** AR1-AR10 (Expo + Convex + Clerk)
- **Gamification Features (11):** GF1-GF11 (streaks, savings jar, partner mode, etc.)
- **Security Requirements (4):** SR1-SR4 (Clerk + SecureStore, user ownership)
- **Coding Conventions (4):** CR1-CR4 (file naming, structure, barrel exports, path aliases)
- **UX Requirements (8):** UX1-UX8 (Safe Zone glow, animations, mature celebrations)
- **Graceful Degradation (8):** GD1-GD8 (3-tier device system, UI fallbacks, haptics wrapper)
- **Development Tooling (10):** DT1-DT10 (MCP servers, Expo Skills, Context7)

---

## Story Files

All 47 stories are organized by epic in:
```
_bmad-output/implementation-artifacts/stories/
├── epic-01/  (9 stories)
├── epic-02/  (6 stories)
├── epic-03/  (10 stories)
├── epic-04/  (5 stories)
├── epic-05/  (6 stories)
├── epic-06/  (3 stories)
├── epic-07/  (3 stories)
└── epic-08/  (5 stories)
```

---

## Key Decisions

1. **Pricing:** £2.99/mo, £21.99/yr (38% savings)
2. **Loyalty System:** 10 points per receipt scan → up to 50% off subscription
3. **Partner Mode:** 3 roles (viewer, approver with bidirectional approval, editor)
4. **Hybrid Pantry Seeding:** 60% local staples (residence) + 40% cultural (12+ cuisines multi-select)
5. **3-Tier Graceful Degradation:** Premium (iOS 15+), Enhanced (mid-range), Baseline (older devices)
6. **Platform-Adaptive UI:** Liquid Glass (iOS) / Material You (Android)

---

## Next Steps

1. **Sprint Planning:** Run `/bmad:bmm:workflows:sprint-planning` to create sprint-status.yaml
2. **Begin Implementation:** Start with Epic 1 stories using `/bmad:bmm:workflows:dev-story`

---

_Generated by: PM Agent (John) | BMAD Workflow Phase 0.5_
