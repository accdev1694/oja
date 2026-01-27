### Story 1.4: Device Capabilities & Graceful Degradation

As a **developer**,
I want **a device tier detection system**,
So that **the app adapts to different device capabilities automatically**.

**Acceptance Criteria:**

**Given** the app launches on any device
**When** the device capabilities are detected
**Then** the system assigns a tier: Premium, Enhanced, or Baseline
**And** The tier is based on: OS version, blur support, haptic support, animation support

**Given** the app runs on iPhone 14+ with iOS 16+
**When** capabilities are checked
**Then** the device is assigned Premium tier
**And** Liquid Glass blur effects are enabled

**Given** the app runs on Android 12+ or older iOS
**When** capabilities are checked
**Then** the device is assigned Enhanced tier
**And** Gradient fallbacks replace blur effects

**Given** the app runs on older devices
**When** capabilities are checked
**Then** the device is assigned Baseline tier
**And** Solid colors replace gradients and blur

**Technical Requirements:**
- `lib/capabilities/deviceTier.ts` with tier detection logic
- `hooks/useDeviceCapabilities.ts` hook
- Support for 3 tiers: Premium, Enhanced, Baseline
- Detect: OS version, blur support, haptic support
- GD1-GD8 requirements

---

