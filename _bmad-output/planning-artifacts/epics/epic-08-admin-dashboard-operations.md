### Epic 8: Admin Dashboard & Operations

**Goal:** Admins can monitor business metrics, manage users, moderate content, and configure system settings

**Key Capabilities:**
- Admin authentication with mandatory 2FA
- Role-based permissions (viewer, support, manager, super-admin)
- Comprehensive audit logging
- Business analytics dashboard (DAU/WAU/MAU, retention, funnels, cohorts)
- Revenue dashboard (MRR, ARR, ARPU, LTV, churn analysis, point liability)
- Stripe payment management (transactions, refunds, failed payments, reconciliation)
- User management (search, profiles, subscription history, trial extensions, complimentary subs)
- Receipt moderation (review flagged, OCR accuracy, AI parsing metrics, bulk approve/reject)
- Price database management (edit/delete prices, outlier detection, spam removal)
- Product catalog management (seeded items, categories, store normalization, item canonicalization)
- System health monitoring (uptime, API response times, error rates, service status, storage usage)
- Customer support tools (read-only impersonation, password reset triggers, GDPR exports/deletion)
- In-app announcements (create, schedule, segment targeting, read/dismiss tracking)
- Feature flags and configuration (toggle features, segment rollouts, loyalty rules, receipt thresholds)
- Automated reporting (CSV exports for users/revenue/analytics, scheduled weekly email reports)

**FRs Covered:** FR96-FR190 (95 FRs)

**Additional Requirements:** None (consumes data from all previous epics)

**Dependencies:** Epic 1-7 (all user data to manage and monitor)

---

## Epic Summary

| Epic | Title | User Value | FR Count | Standalone |
|------|-------|------------|----------|------------|
| **1** | Foundation & Authentication | Users can sign up and onboard with hybrid pantry | 21 FRs | ✅ Yes |
| **2** | Pantry Stock Tracker | Users track stock and auto-populate lists | 20 FRs | ✅ Yes (uses Epic 1) |
| **3** | Shopping Lists & Budget | Users create lists and stay under budget | 25 FRs | ✅ Yes (uses Epic 1-2) |
| **4** | Partner Mode | Users collaborate on lists together | 15 FRs | ✅ Yes (uses Epic 1, 3) |
| **5** | Receipt Intelligence | Users scan receipts and build price history | 18 FRs | ✅ Yes (uses Epic 1, 3) |
| **6** | Insights & Gamification | Users see progress and stay motivated | 7 FRs | ✅ Yes (uses Epic 1-3) |
| **7** | Subscription & Loyalty | Users subscribe and earn discounts | 12 FRs | ✅ Yes (uses Epic 1, 5) |
| **8** | Admin Dashboard | Admins manage and monitor system | 95 FRs | ✅ Yes (uses Epic 1-7) |

**Total: 212 Functional Requirements** mapped across 8 epics
**All 54 NFRs** addressed as cross-cutting concerns
**All 62 Additional Requirements** integrated throughout


---

# Epic Stories

## Epic 1: Foundation & Authentication
