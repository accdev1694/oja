### Story 8.1: Admin Authentication & Dashboard Overview

As an **admin**,
I want **secure access to the admin dashboard**,
So that **I can monitor and manage the system**.

**Acceptance Criteria:**

**Given** I'm an admin user
**When** I navigate to `/admin`
**Then** I'm prompted for 2FA authentication
**And** After successful 2FA, I access the admin dashboard

**Given** I successfully authenticate
**When** the dashboard loads
**Then** I see key metrics at a glance:
  - Total users (active, trial, paying)
  - DAU/WAU/MAU
  - MRR/ARR
  - Recent activity feed

**Given** I'm a non-admin user
**When** I try to access `/admin`
**Then** I see a 403 Forbidden error
**And** The attempt is logged in the audit trail

**Technical Requirements:**
- Admin role checking in Convex
- 2FA requirement for admin access
- Audit logging for all admin actions
- Dashboard metrics aggregation
- FR96, FR97, FR98

---

