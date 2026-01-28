# Epic: Glass UI Redesign

> Transform Oja's interface into a sleek, modern glassmorphism design system

**Epic ID:** EPIC-UI-GLASS
**Priority:** High
**Status:** Ready for Development
**Replaces:** Previous UI/UX design documentation

---

## Overview

This epic implements the Glass Design System based on the moodboard analysis. The redesign creates a premium, modern feel with glassmorphism effects, deep blue gradients, and vibrant accent colors.

---

## Stories

### Story UI-1: Glass Design Foundation

**Priority:** P0 - Critical
**Points:** 5

#### Description
Set up the foundational design system including colors, typography, spacing, and animation constants.

#### Acceptance Criteria
- [ ] Create `lib/constants/colors.ts` with full color palette
- [ ] Create `lib/constants/typography.ts` with font styles
- [ ] Create `lib/constants/spacing.ts` with spacing scale
- [ ] Create `lib/constants/animations.ts` with animation configs
- [ ] Create `lib/constants/index.ts` barrel export
- [ ] All constants are TypeScript-typed
- [ ] Colors support both values and rgba functions

#### Technical Notes
```typescript
// colors.ts structure
export const colors = {
  background: { primary, secondary, tertiary, gradient },
  glass: { background, border, shadow },
  accent: { primary, secondary, success, warning, error },
  text: { primary, secondary, tertiary, disabled },
};
```

---

### Story UI-2: GlassCard Component

**Priority:** P0 - Critical
**Points:** 5

#### Description
Create the foundational GlassCard component with variants: standard, elevated, sunken, bordered.

#### Acceptance Criteria
- [ ] Component renders with glassmorphism effect
- [ ] Supports 4 variants: standard, elevated, sunken, bordered
- [ ] Supports intensity levels: subtle, medium, strong
- [ ] Supports border radius sizes: sm, md, lg, xl, full
- [ ] Optional accent color border
- [ ] Blur effect works on iOS and Android
- [ ] Pressable variant with scale animation
- [ ] TypeScript props interface exported

#### Technical Notes
```typescript
interface GlassCardProps {
  variant?: 'standard' | 'elevated' | 'sunken' | 'bordered';
  intensity?: 'subtle' | 'medium' | 'strong';
  borderRadius?: 'sm' | 'md' | 'lg' | 'xl' | 'full';
  accentColor?: string;
  pressable?: boolean;
  onPress?: () => void;
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
}
```

---

### Story UI-3: GlassButton Component

**Priority:** P0 - Critical
**Points:** 3

#### Description
Create the GlassButton component with primary, secondary, ghost, and danger variants.

#### Acceptance Criteria
- [ ] Supports 4 variants: primary, secondary, ghost, danger
- [ ] Supports 3 sizes: sm, md, lg
- [ ] Optional leading/trailing icon
- [ ] Loading state with spinner
- [ ] Disabled state styling
- [ ] Press animation with haptic feedback
- [ ] Full-width option

#### Technical Notes
- Primary: Solid teal (#00D4AA) background
- Secondary: Glass background with border
- Ghost: Transparent with border
- Danger: Solid red background

---

### Story UI-4: GlassInput Component

**Priority:** P0 - Critical
**Points:** 3

#### Description
Create the GlassInput component for text entry with glass styling.

#### Acceptance Criteria
- [ ] Standard and filled variants
- [ ] Focus state with accent border
- [ ] Error state with red styling
- [ ] Optional leading icon
- [ ] Optional clear button
- [ ] Label and helper text support
- [ ] Multiline support for textarea
- [ ] Keyboard-aware behavior

---

### Story UI-5: GlassListItem Component

**Priority:** P1 - High
**Points:** 5

#### Description
Create the GlassListItem component for pantry items and shopping list items.

#### Acceptance Criteria
- [ ] Glass background with configurable opacity
- [ ] Leading icon with circular glass background
- [ ] Title and subtitle text
- [ ] Right element slot (checkbox, price, arrow)
- [ ] Checked/completed state styling
- [ ] Swipeable actions (edit, delete)
- [ ] Press animation
- [ ] Optional numbered badge (01, 02, etc.)

---

### Story UI-6: GlassCheckbox Component

**Priority:** P1 - High
**Points:** 2

#### Description
Create a glass-styled checkbox for shopping list items.

#### Acceptance Criteria
- [ ] Unchecked: Glass circle outline
- [ ] Checked: Teal filled with checkmark
- [ ] Animated transition between states
- [ ] Haptic feedback on toggle
- [ ] Indeterminate state for partial selections

---

### Story UI-7: GlassProgressBar Component

**Priority:** P1 - High
**Points:** 3

#### Description
Create a progress bar for budget tracking with glass styling.

#### Acceptance Criteria
- [ ] Glass track background
- [ ] Gradient fill based on progress
- [ ] Budget status colors (healthy, caution, exceeded)
- [ ] Animated progress changes
- [ ] Optional percentage label
- [ ] Configurable height

---

### Story UI-8: GlassTabBar Component

**Priority:** P0 - Critical
**Points:** 5

#### Description
Create the main navigation tab bar with glass styling.

#### Acceptance Criteria
- [ ] Glass background with blur
- [ ] 4 tabs: Pantry, Lists, Scan, Profile
- [ ] Active tab indicator (pill background)
- [ ] Animated tab transitions
- [ ] Haptic feedback on tab change
- [ ] Safe area handling
- [ ] Works with Expo Router

---

### Story UI-9: GlassHeader Component

**Priority:** P1 - High
**Points:** 3

#### Description
Create a glass-styled header component for screens.

#### Acceptance Criteria
- [ ] Glass background with gradient
- [ ] Back button with animation
- [ ] Title with large/small variants
- [ ] Right action buttons slot
- [ ] Collapsible on scroll
- [ ] Safe area handling

---

### Story UI-10: Gradient Background Component

**Priority:** P0 - Critical
**Points:** 2

#### Description
Create the animated gradient background component.

#### Acceptance Criteria
- [ ] Linear gradient from #0B1426 to #1A2744
- [ ] Supports radial gradient variant
- [ ] Subtle animation option
- [ ] Covers full screen
- [ ] Works with SafeAreaView

---

### Story UI-11: Update Pantry Screen

**Priority:** P1 - High
**Points:** 8

#### Description
Apply the glass design system to the Pantry (home) screen.

#### Acceptance Criteria
- [ ] Gradient background applied
- [ ] Glass header with search
- [ ] Budget overview in GlassCard (elevated)
- [ ] Category pills with glass styling
- [ ] Pantry items using GlassListItem
- [ ] Add item FAB with glass effect
- [ ] Empty state with glass card
- [ ] Pull to refresh animation
- [ ] All existing functionality preserved

---

### Story UI-12: Update Lists Screen

**Priority:** P1 - High
**Points:** 5

#### Description
Apply the glass design system to the Shopping Lists screen.

#### Acceptance Criteria
- [ ] Gradient background applied
- [ ] Glass header
- [ ] Shopping list cards using GlassCard (bordered for active)
- [ ] Progress indicators in cards
- [ ] Create list button with glass styling
- [ ] Empty state styling
- [ ] Swipe to delete animation

---

### Story UI-13: Update List Detail Screen

**Priority:** P1 - High
**Points:** 8

#### Description
Apply the glass design system to the List Detail screen.

#### Acceptance Criteria
- [ ] Gradient background applied
- [ ] Glass header with actions
- [ ] Budget card using GlassCard (sunken)
- [ ] Add item input with glass styling
- [ ] List items using GlassListItem
- [ ] Checkbox interactions with animation
- [ ] Swipe actions for items
- [ ] Similar item detection modal with glass styling

---

### Story UI-14: Update Profile Screen

**Priority:** P1 - High
**Points:** 5

#### Description
Apply the glass design system to the Profile screen.

#### Acceptance Criteria
- [ ] Gradient background applied
- [ ] Profile card with floating avatar
- [ ] Stats row using nested GlassCards
- [ ] Settings list using GlassListItem
- [ ] Sign out button (danger variant)

---

### Story UI-15: Update Onboarding Flow

**Priority:** P2 - Medium
**Points:** 5

#### Description
Apply the glass design system to the onboarding screens.

#### Acceptance Criteria
- [ ] Animated gradient backgrounds
- [ ] Glass input fields
- [ ] Glass buttons
- [ ] Step indicators with glass pills
- [ ] Smooth transitions between screens

---

### Story UI-16: Loading & Error States

**Priority:** P2 - Medium
**Points:** 3

#### Description
Create glass-styled loading and error state components.

#### Acceptance Criteria
- [ ] Skeleton loader with shimmer effect
- [ ] Error card with glass styling
- [ ] Retry button
- [ ] Toast notifications with glass background
- [ ] Modal overlay with glass blur

---

### Story UI-17: Animation Polish

**Priority:** P2 - Medium
**Points:** 3

#### Description
Add micro-interactions and polish animations throughout.

#### Acceptance Criteria
- [ ] List item stagger animations on load
- [ ] Screen transition animations
- [ ] Pull to refresh custom animation
- [ ] Button press feedback refinement
- [ ] Tab bar indicator animation

---

## Story Dependencies

```
UI-1 (Foundation)
  ├── UI-2 (GlassCard) ──┬── UI-5 (ListItem)
  │                      ├── UI-7 (ProgressBar)
  │                      └── UI-9 (Header)
  ├── UI-3 (GlassButton)
  ├── UI-4 (GlassInput)
  └── UI-10 (Gradient)

UI-2 + UI-3 + UI-10
  └── UI-8 (TabBar)

UI-5 + UI-6 (Checkbox)
  └── UI-11 (Pantry Screen)
  └── UI-12 (Lists Screen)
  └── UI-13 (List Detail)
  └── UI-14 (Profile)

UI-4 + UI-3
  └── UI-15 (Onboarding)
```

---

## Sprint Allocation

### Sprint 4: Glass Foundation
- UI-1: Glass Design Foundation
- UI-2: GlassCard Component
- UI-3: GlassButton Component
- UI-4: GlassInput Component
- UI-10: Gradient Background

**Total Points:** 18

### Sprint 5: Glass Components
- UI-5: GlassListItem Component
- UI-6: GlassCheckbox Component
- UI-7: GlassProgressBar Component
- UI-8: GlassTabBar Component
- UI-9: GlassHeader Component

**Total Points:** 18

### Sprint 6: Screen Updates
- UI-11: Update Pantry Screen
- UI-12: Update Lists Screen
- UI-13: Update List Detail Screen
- UI-14: Update Profile Screen

**Total Points:** 26

### Sprint 7: Polish & Finish
- UI-15: Update Onboarding Flow
- UI-16: Loading & Error States
- UI-17: Animation Polish

**Total Points:** 11

---

## Success Metrics

1. **Visual Consistency:** 100% of screens use glass design system
2. **Performance:** Blur effects run at 60fps
3. **Accessibility:** Color contrast ratios meet WCAG AA
4. **User Feedback:** Positive sentiment on premium feel

---

## Risks & Mitigations

| Risk | Likelihood | Impact | Mitigation |
|------|------------|--------|------------|
| Blur performance on Android | Medium | High | Use react-native-blur with fallback |
| Color contrast accessibility | Low | Medium | Test with accessibility tools |
| Gradient rendering issues | Low | Low | Use expo-linear-gradient |

---

*This epic supersedes all previous UI/UX epic definitions.*
