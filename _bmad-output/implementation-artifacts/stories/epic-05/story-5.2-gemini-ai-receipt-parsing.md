### Story 5.2: Gemini AI Receipt Parsing

As a **user**,
I want **AI to extract items and prices from my receipt**,
So that **I don't have to manually enter everything**.

**Acceptance Criteria:**

**Given** I uploaded a receipt photo
**When** the AI processing starts
**Then** I see a loading screen: "Reading your receipt... This may take 10-15 seconds"
**And** A progress indicator shows the status

**Given** Gemini AI processes the receipt
**When** the OCR completes
**Then** the system extracts: store name, date, all items (name + price), subtotal, tax, total
**And** Each item is parsed into: name, price, quantity (if detectable)

**Given** the AI successfully parses the receipt
**When** processing finishes
**Then** I see the extracted items in a list
**And** I'm redirected to the confirmation screen (Story 5.3)

**Given** the AI has low confidence on some items
**When** confidence is below 70%
**Then** those items are marked with a ⚠️ warning icon
**And** I'm prompted to review them carefully

**Given** the AI fails to parse the receipt
**When** an error occurs (blurry image, non-receipt image, etc.)
**Then** I see an error message: "Couldn't read this receipt. Please try again with better lighting."
**And** I can retake the photo

**Technical Requirements:**
- Convex action: `parseReceipt(fileStorageId)` calling Gemini Vision API
- Parse: store, date, items[], subtotal, tax, total
- Confidence scoring for each extracted field
- Error handling for failed OCR
- Store parsed data temporarily (not yet saved to DB)
- FR37

---

