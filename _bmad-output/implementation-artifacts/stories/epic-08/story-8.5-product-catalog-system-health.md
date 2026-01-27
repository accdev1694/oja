### Story 8.5: Product Catalog & System Health

As an **admin**,
I want **to manage seeded products and monitor system health**,
So that **the app runs smoothly and data stays current**.

**Acceptance Criteria:**

**Given** I access product catalog management
**When** I view seeded products
**Then** I see all items used in onboarding seed generation
**And** I can add, edit, or remove products by category and cuisine

**Given** I add a new seeded product
**When** I submit it
**Then** it becomes available in future onboarding flows
**And** Users can choose to include it in their pantry

**Given** I monitor system health
**When** I view the system dashboard
**Then** I see:
  - API response times
  - Error rates (last 24h, 7d, 30d)
  - Database storage usage
  - Third-party service status (Stripe, Gemini, Clerk)

**Given** error rates exceed threshold (>5%)
**When** the alert triggers
**Then** I receive an email and push notification
**And** The alert is logged in the dashboard

**Technical Requirements:**
- CRUD operations for seeded product catalog
- System metrics aggregation
- Error monitoring and alerting
- Third-party API status checks
- FR151-FR166

---
