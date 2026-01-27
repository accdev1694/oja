### Story 5.1: Camera Receipt Capture

As a **user**,
I want **to capture my receipt with my phone camera**,
So that **I can digitize my shopping trip**.

**Acceptance Criteria:**

**Given** I completed a shopping trip
**When** I tap the "Scan" tab
**Then** I see a camera interface with guidance: "Position receipt within frame"

**Given** the camera is open
**When** I position my receipt in the viewfinder
**Then** I see corner detection highlights showing the receipt boundaries
**And** The app auto-detects when the receipt is in focus

**Given** the receipt is properly positioned
**When** I tap the capture button (or it auto-captures)
**Then** the photo is taken and saved temporarily
**And** I see a preview with options: "Retake" or "Use This Photo"

**Given** I choose "Use This Photo"
**When** I confirm
**Then** the image is uploaded to Convex file storage
**And** I'm redirected to the processing screen with a loading animation
**And** The AI parsing begins (Story 5.2)

**Given** the photo is blurry or unreadable
**When** the app detects poor quality
**Then** I see a warning: "Receipt may be hard to read. Retake for better results?"
**And** I can choose to retake or proceed anyway

**Technical Requirements:**
- Expo Camera API for receipt capture
- Image quality detection (blur, lighting)
- Corner detection for receipt boundary
- Convex file storage for receipt images
- Compress images before upload (reduce bandwidth)
- FR36

---

