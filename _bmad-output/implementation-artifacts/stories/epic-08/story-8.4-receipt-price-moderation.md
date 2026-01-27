### Story 8.4: Receipt & Price Moderation

As an **admin**,
I want **to review flagged receipts and moderate prices**,
So that **data quality remains high**.

**Acceptance Criteria:**

**Given** a receipt is flagged as suspicious
**When** I view the moderation queue
**Then** I see flagged receipts with reasons (duplicate, fake, spam)
**And** I can approve or reject each receipt

**Given** I review a flagged receipt
**When** I examine the details
**Then** I see the original image, parsed items, and flag reason
**And** I can manually correct items or delete the receipt

**Given** I view the price database
**When** I access price management
**Then** I see all crowdsourced prices with outlier detection
**And** I can edit incorrect prices or delete spam entries

**Given** a price is significantly different from average
**When** the system detects an outlier (>50% deviation)
**Then** it's automatically flagged for review

**Technical Requirements:**
- Flagging system for suspicious receipts
- Price outlier detection algorithm
- Manual correction UI for receipts
- Bulk approve/reject for price entries
- FR139-FR150

---

