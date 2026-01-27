### Epic 5: Receipt Intelligence & Price History

**Goal:** Users can scan receipts, reconcile planned vs actual spending, and build personal price history

**Key Capabilities:**
- Camera capture with auto-detect
- Client-side OCR processing (Tesseract.js)
- AI parsing via Gemini 1.5 Flash (structured data extraction)
- User confirmation/correction step
- Planned vs Actual reconciliation view
- Identify missed items (bought but not on list)
- Identify skipped items (on list but not bought)
- Personal price history per user
- Crowdsourced price database contributions
- Receipt validation (freshness ≤3 days, legibility ≥60%, duplicate detection)
- Save receipt without points if validation fails
- Price estimates when adding items to lists
- Price confidence levels
- Store-specific price tracking
- Convex file storage for receipt photos

**FRs Covered:** FR40-FR57 (18 FRs)

**Additional Requirements:** None (uses AR5 for file storage, AR6 for AI)

**Dependencies:** Epic 1 (auth), Epic 3 (shopping lists for reconciliation)

---
