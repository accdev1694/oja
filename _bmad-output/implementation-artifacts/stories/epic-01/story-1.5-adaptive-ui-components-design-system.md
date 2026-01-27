### Story 1.5: Adaptive UI Components & Design System

As a **developer**,
I want **platform-adaptive UI components with tier-based styling**,
So that **the app looks premium on capable devices and works well on all devices**.

**Acceptance Criteria:**

**Given** I use the `<AdaptiveCard>` component on a Premium iOS device
**When** the component renders
**Then** it displays with Liquid Glass blur effect
**And** The blur intensity is configurable

**Given** I use the `<AdaptiveCard>` component on an Enhanced device
**When** the component renders
**Then** it displays with gradient background
**And** The gradient mimics the blur appearance

**Given** I use the `<AdaptiveCard>` component on a Baseline device
**When** the component renders
**Then** it displays with solid background color
**And** The shadow is appropriate for the platform

**Given** I need design tokens
**When** I use `useDeviceCapabilities()` hook
**Then** I receive tier-appropriate tokens for: borderRadius, shadow, spacing, colors

**Technical Requirements:**
- `components/ui/AdaptiveCard.tsx` component
- `lib/design/tokens.ts` with tier-based tokens
- Support for iOS Liquid Glass and Android Material You
- Export from `components/ui/index.ts`
- NFR1, NFR2, NFR3 (performance, responsiveness, accessibility)

---

