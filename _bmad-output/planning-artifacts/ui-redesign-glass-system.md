# Oja UI Redesign - Glass Design System

> A sleek, modern, and irresistible glassmorphism-inspired design system for the Oja shopping app.

**Version:** 2.0
**Date:** 2026-01-28
**Status:** APPROVED - Replaces previous UI design docs

---

## Executive Summary

Based on comprehensive analysis of 8 moodboard images, this document defines a complete UI redesign for Oja featuring:
- **Glassmorphism** as the primary design language
- **Deep blue gradient** backgrounds with vibrant accent colors
- **Semi-transparent cards** with subtle blur and borders
- **Modern typography** with clear hierarchy
- **Smooth animations** using React Native Reanimated

---

## Part 1: Moodboard Analysis

### Image 1: Glassmorphism Profile Card
**Key Elements:**
- Vibrant blue gradient background with flowing abstract shapes
- Semi-transparent glass card with subtle white border (1px, 20% opacity)
- Nested glass elements within main card
- Large border radius (~24px)
- Bold stat numbers with light descriptive text
- Floating avatar partially outside card boundary

**Applicable to Oja:**
- Profile screen design
- Budget overview cards
- Stat displays (items, savings, lists)

---

### Image 2: Dark Architectural Editorial
**Key Elements:**
- Dark theme with gold/bronze metallic accents
- Asymmetric grid layout with strong typography
- High contrast photography integration
- Thin, spaced elegant typography
- Professional, luxurious feel

**Applicable to Oja:**
- Premium tier visual treatment
- Empty states with editorial flair
- Onboarding hero sections

---

### Image 3: Transparent Glass Feature Card
**Key Elements:**
- Deep blue monochrome palette
- Large glass card with visible transparency
- 3D objects visible through glass
- Dotted separator/progress indicators
- Nested content card within glass panel
- Checkmark badges in rounded containers

**Applicable to Oja:**
- Feature announcement cards
- Onboarding step cards
- Achievement/badge displays

---

### Image 4: Dark Blue 3D Feature Cards
**Key Elements:**
- Deep navy gradient background (#1a1f4c to #0a1628)
- Three feature cards with consistent sizing
- Subtle glassmorphism (lower opacity ~10-15%)
- 3D geometric illustrations
- "FEATURE" label above title
- Muted, sophisticated color palette

**Applicable to Oja:**
- Feature selection grid
- Category cards in pantry
- Shopping list type cards

---

### Image 5: Minimalist Music Player
**Key Elements:**
- High contrast black/white theme
- Large curved/rounded image cards (pill shape)
- Clean list items with minimal decoration
- Circular progress indicator
- Minimal UI chrome, focus on content
- Bold floating action buttons

**Applicable to Oja:**
- List item rows
- Media/image card styling
- Progress indicators for budget

---

### Image 6: Connected Node Infographic
**Key Elements:**
- Blurred cityscape/abstract background
- Connected flow/journey design with lines
- Icon badges in rounded square containers
- Horizontal pill-shaped content bars
- Warm brown/sepia tones for variety
- Clear information hierarchy

**Applicable to Oja:**
- Onboarding flow visualization
- Shopping trip timeline
- Receipt processing steps

---

### Image 7: Blue Smoky Glass List Items
**Key Elements:**
- Deep blue with smoky/misty atmospheric effect
- Numbered glass list items (01, 02, 03, 04)
- Full-width glass bars with generous padding
- White circular icon badges (left-aligned)
- Clear step progression (vertical flow)
- Consistent glass treatment across items

**Applicable to Oja:**
- Shopping list items
- Step-by-step processes
- Settings menu items
- Pantry item rows

---

### Image 8: City Skyline Connected Journey
**Key Elements:**
- Night cityscape background with blue tones
- Connected journey design with flowing line
- Pill-shaped cards with colored borders
- Multiple accent colors (gold #c4a052, coral #ff6b6b, white)
- Numbered circular nodes on connection line
- Icon badges within cards
- Premium feel through color variation

**Applicable to Oja:**
- Budget tracking journey
- Shopping trip progress
- Multi-step workflows
- Status-based color coding

---

## Part 2: Color System

### Primary Palette

```typescript
export const colors = {
  // Backgrounds
  background: {
    primary: '#0B1426',      // Deep navy (main background)
    secondary: '#111D32',    // Slightly lighter navy
    tertiary: '#162033',     // Card hover state
    gradient: {
      start: '#0B1426',
      middle: '#1A2744',
      end: '#0F1829',
    },
  },

  // Glass Effects
  glass: {
    background: 'rgba(255, 255, 255, 0.08)',  // Base glass
    backgroundHover: 'rgba(255, 255, 255, 0.12)',
    backgroundActive: 'rgba(255, 255, 255, 0.15)',
    border: 'rgba(255, 255, 255, 0.15)',
    borderFocus: 'rgba(255, 255, 255, 0.25)',
    shadow: 'rgba(0, 0, 0, 0.25)',
  },

  // Accent Colors
  accent: {
    primary: '#00D4AA',      // Teal/Mint (main actions)
    secondary: '#6366F1',    // Indigo (secondary actions)
    success: '#10B981',      // Emerald green
    warning: '#F59E0B',      // Amber/Gold
    error: '#EF4444',        // Red
    info: '#3B82F6',         // Blue
  },

  // Budget Status Colors
  budget: {
    healthy: '#10B981',      // Under budget - green
    caution: '#F59E0B',      // Approaching limit - amber
    exceeded: '#EF4444',     // Over budget - red
    neutral: '#6B7280',      // No budget set - gray
  },

  // Text Colors
  text: {
    primary: '#FFFFFF',
    secondary: 'rgba(255, 255, 255, 0.7)',
    tertiary: 'rgba(255, 255, 255, 0.5)',
    disabled: 'rgba(255, 255, 255, 0.3)',
    inverse: '#0B1426',
  },

  // Semantic Colors
  semantic: {
    pantry: '#00D4AA',       // Teal
    lists: '#6366F1',        // Indigo
    scan: '#F59E0B',         // Amber
    profile: '#EC4899',      // Pink
  },
};
```

### Gradient Definitions

```typescript
export const gradients = {
  // Background gradients
  backgroundMain: ['#0B1426', '#1A2744', '#0F1829'],
  backgroundRadial: ['#1A2744', '#0B1426'],

  // Accent gradients
  accentPrimary: ['#00D4AA', '#00B894'],
  accentSecondary: ['#6366F1', '#8B5CF6'],
  accentWarm: ['#F59E0B', '#EF4444'],

  // Glass overlays
  glassShine: ['rgba(255,255,255,0.2)', 'rgba(255,255,255,0)'],
  glassDepth: ['rgba(255,255,255,0.1)', 'rgba(255,255,255,0.05)'],

  // Budget status
  budgetHealthy: ['#10B981', '#059669'],
  budgetCaution: ['#F59E0B', '#D97706'],
  budgetExceeded: ['#EF4444', '#DC2626'],
};
```

---

## Part 3: Glass Component Specifications

### 3.1 GlassCard Component

```typescript
interface GlassCardProps {
  variant: 'standard' | 'elevated' | 'sunken' | 'bordered';
  intensity: 'subtle' | 'medium' | 'strong';
  borderRadius: 'sm' | 'md' | 'lg' | 'xl' | 'full';
  accentColor?: string;
  children: React.ReactNode;
}

// Style specifications
const glassCardStyles = {
  standard: {
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.15)',
    backdropFilter: 'blur(20px)',
  },
  elevated: {
    backgroundColor: 'rgba(255, 255, 255, 0.12)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
    backdropFilter: 'blur(24px)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 24,
  },
  sunken: {
    backgroundColor: 'rgba(0, 0, 0, 0.2)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
    backdropFilter: 'blur(16px)',
  },
  bordered: {
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderWidth: 2,
    borderColor: 'rgba(255, 255, 255, 0.25)',
    backdropFilter: 'blur(20px)',
  },
};

const borderRadii = {
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  full: 9999,
};
```

### 3.2 GlassButton Component

```typescript
interface GlassButtonProps {
  variant: 'primary' | 'secondary' | 'ghost' | 'danger';
  size: 'sm' | 'md' | 'lg';
  icon?: string;
  loading?: boolean;
  disabled?: boolean;
  children: React.ReactNode;
}

const glassButtonStyles = {
  primary: {
    backgroundColor: '#00D4AA',
    borderWidth: 0,
    textColor: '#0B1426',
  },
  secondary: {
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
    textColor: '#FFFFFF',
  },
  ghost: {
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.15)',
    textColor: '#FFFFFF',
  },
  danger: {
    backgroundColor: '#EF4444',
    borderWidth: 0,
    textColor: '#FFFFFF',
  },
};

const buttonSizes = {
  sm: { height: 36, paddingHorizontal: 12, fontSize: 14 },
  md: { height: 48, paddingHorizontal: 20, fontSize: 16 },
  lg: { height: 56, paddingHorizontal: 28, fontSize: 18 },
};
```

### 3.3 GlassInput Component

```typescript
interface GlassInputProps {
  variant: 'standard' | 'filled';
  size: 'md' | 'lg';
  icon?: string;
  error?: string;
  placeholder?: string;
}

const glassInputStyles = {
  standard: {
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.15)',
    focusBorderColor: '#00D4AA',
    borderRadius: 12,
  },
  filled: {
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderWidth: 0,
    focusBackgroundColor: 'rgba(255, 255, 255, 0.15)',
    borderRadius: 12,
  },
};
```

### 3.4 GlassListItem Component

```typescript
interface GlassListItemProps {
  icon?: string;
  title: string;
  subtitle?: string;
  rightElement?: React.ReactNode;
  onPress?: () => void;
  status?: 'default' | 'checked' | 'highlighted';
  index?: number; // For numbered display like mood7
}

const listItemStyles = {
  container: {
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    borderRadius: 16,
    paddingVertical: 16,
    paddingHorizontal: 20,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  iconContainer: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  checked: {
    backgroundColor: 'rgba(0, 212, 170, 0.15)',
    borderColor: 'rgba(0, 212, 170, 0.3)',
  },
};
```

### 3.5 GlassTabBar Component

```typescript
const tabBarStyles = {
  container: {
    backgroundColor: 'rgba(11, 20, 38, 0.95)',
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.1)',
    backdropFilter: 'blur(20px)',
    paddingBottom: 34, // Safe area
    paddingTop: 12,
  },
  tab: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
  },
  tabActive: {
    // Pill background for active tab
    backgroundColor: 'rgba(0, 212, 170, 0.15)',
    borderRadius: 20,
    paddingHorizontal: 16,
  },
  indicator: {
    position: 'absolute',
    bottom: 34,
    height: 3,
    backgroundColor: '#00D4AA',
    borderRadius: 1.5,
  },
};
```

---

## Part 4: Typography System

```typescript
export const typography = {
  // Display (Hero text, onboarding)
  displayLarge: {
    fontSize: 48,
    fontWeight: '700',
    lineHeight: 56,
    letterSpacing: -0.5,
  },
  displayMedium: {
    fontSize: 36,
    fontWeight: '600',
    lineHeight: 44,
    letterSpacing: -0.25,
  },
  displaySmall: {
    fontSize: 28,
    fontWeight: '600',
    lineHeight: 36,
    letterSpacing: 0,
  },

  // Headlines (Section titles)
  headlineLarge: {
    fontSize: 24,
    fontWeight: '600',
    lineHeight: 32,
  },
  headlineMedium: {
    fontSize: 20,
    fontWeight: '600',
    lineHeight: 28,
  },
  headlineSmall: {
    fontSize: 18,
    fontWeight: '600',
    lineHeight: 24,
  },

  // Body (Content)
  bodyLarge: {
    fontSize: 16,
    fontWeight: '400',
    lineHeight: 24,
  },
  bodyMedium: {
    fontSize: 14,
    fontWeight: '400',
    lineHeight: 20,
  },
  bodySmall: {
    fontSize: 12,
    fontWeight: '400',
    lineHeight: 16,
  },

  // Labels (Buttons, tags)
  labelLarge: {
    fontSize: 16,
    fontWeight: '600',
    lineHeight: 24,
    letterSpacing: 0.1,
  },
  labelMedium: {
    fontSize: 14,
    fontWeight: '600',
    lineHeight: 20,
    letterSpacing: 0.1,
  },
  labelSmall: {
    fontSize: 12,
    fontWeight: '600',
    lineHeight: 16,
    letterSpacing: 0.5,
    textTransform: 'uppercase',
  },

  // Numbers (Stats, prices)
  numberLarge: {
    fontSize: 36,
    fontWeight: '700',
    lineHeight: 40,
    fontVariant: ['tabular-nums'],
  },
  numberMedium: {
    fontSize: 24,
    fontWeight: '700',
    lineHeight: 28,
    fontVariant: ['tabular-nums'],
  },
  numberSmall: {
    fontSize: 18,
    fontWeight: '600',
    lineHeight: 24,
    fontVariant: ['tabular-nums'],
  },
};

// Font family (uses system fonts)
export const fontFamily = {
  regular: 'System',
  medium: 'System',
  semibold: 'System',
  bold: 'System',
  // On iOS, use SF Pro
  // On Android, use Roboto
};
```

---

## Part 5: Spacing & Layout System

```typescript
export const spacing = {
  // Base unit: 4px
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  '2xl': 24,
  '3xl': 32,
  '4xl': 40,
  '5xl': 48,
  '6xl': 64,
};

export const layout = {
  // Screen padding
  screenPadding: 20,

  // Card padding
  cardPaddingSm: 12,
  cardPaddingMd: 16,
  cardPaddingLg: 20,

  // List item spacing
  listItemGap: 12,

  // Section spacing
  sectionGap: 32,

  // Safe areas (handled by SafeAreaView)
  headerHeight: 56,
  tabBarHeight: 80, // Including safe area
};
```

---

## Part 6: Animation Specifications

```typescript
import { withSpring, withTiming, Easing } from 'react-native-reanimated';

export const animations = {
  // Spring configs
  spring: {
    gentle: { damping: 20, stiffness: 150 },
    bouncy: { damping: 12, stiffness: 180 },
    stiff: { damping: 25, stiffness: 300 },
  },

  // Timing configs
  timing: {
    fast: { duration: 150, easing: Easing.out(Easing.ease) },
    normal: { duration: 250, easing: Easing.inOut(Easing.ease) },
    slow: { duration: 400, easing: Easing.inOut(Easing.ease) },
  },

  // Specific animations
  pressScale: {
    pressed: 0.97,
    duration: 100,
  },

  fadeIn: {
    from: 0,
    to: 1,
    duration: 200,
  },

  slideUp: {
    from: 20,
    to: 0,
    duration: 300,
  },

  shimmer: {
    duration: 1500,
    loop: true,
  },
};

// Haptic feedback triggers
export const haptics = {
  light: 'impactLight',
  medium: 'impactMedium',
  heavy: 'impactHeavy',
  success: 'notificationSuccess',
  warning: 'notificationWarning',
  error: 'notificationError',
  selection: 'selectionChanged',
};
```

---

## Part 7: Screen Compositions

### 7.1 Pantry Screen (Home)

```
+------------------------------------------+
|  [Gradient Background #0B1426 -> #1A2744] |
|                                          |
|  +----- Glass Header ----------------+   |
|  | My Pantry              [Search]   |   |
|  +-----------------------------------+   |
|                                          |
|  +----- Budget Overview Card ---------+  |
|  | [Elevated Glass]                   |  |
|  |                                    |  |
|  |  Weekly Budget         $150.00    |  |
|  |  [===== Progress Bar =====] 67%   |  |
|  |                                    |  |
|  |  Spent: $100.50   Remaining: $49.50|  |
|  +------------------------------------+  |
|                                          |
|  CATEGORIES                              |
|  +----+ +----+ +----+ +----+            |
|  |Icon| |Icon| |Icon| |Icon|   <- Pills |
|  |Meat| |Dairy| |Veg | |All |            |
|  +----+ +----+ +----+ +----+            |
|                                          |
|  +----- Item Card (Glass) ------------+  |
|  | [Icon] Whole Milk                  |  |
|  |        Dairy  |  Qty: 2  | 3 days  |  |
|  +------------------------------------+  |
|                                          |
|  +----- Item Card (Glass) ------------+  |
|  | [Icon] Chicken Breast              |  |
|  |        Proteins | Qty: 1 | 5 days  |  |
|  +------------------------------------+  |
|                                          |
|  [+ FAB - Add Item]                      |
|                                          |
+------------------------------------------+
|  [Glass Tab Bar]                         |
|  Pantry  Lists  Scan  Profile            |
+------------------------------------------+
```

### 7.2 Shopping Lists Screen

```
+------------------------------------------+
|  [Gradient Background]                    |
|                                          |
|  Shopping Lists              [+ Create]   |
|                                          |
|  +----- List Card (Glass Bordered) ----+ |
|  | [Gold Border - Active]              | |
|  |                                     | |
|  | Weekly Groceries                    | |
|  | 12 items | Budget: $80              | |
|  |                                     | |
|  | [===== 45% Complete =====]          | |
|  | Last updated: 2 hours ago           | |
|  +-------------------------------------+ |
|                                          |
|  +----- List Card (Glass Standard) ----+ |
|  |                                     | |
|  | Party Supplies                      | |
|  | 8 items | Budget: $50               | |
|  |                                     | |
|  | [== 20% Complete ==]                | |
|  | Last updated: Yesterday             | |
|  +-------------------------------------+ |
|                                          |
|  +----- Empty State ------------------+  |
|  | [Illustration]                     |  |
|  | Create your first shopping list    |  |
|  | [Get Started Button]               |  |
|  +------------------------------------+  |
|                                          |
+------------------------------------------+
```

### 7.3 List Detail Screen

```
+------------------------------------------+
|  [<Back]  Weekly Groceries    [Edit][...] |
|                                          |
|  +----- Budget Card (Sunken Glass) ----+ |
|  |                                     | |
|  |  $45.00 / $80.00                    | |
|  |  [=========== Progress ===]  56%    | |
|  |                                     | |
|  |  Under budget by $35.00             | |
|  +-------------------------------------+ |
|                                          |
|  +----- Add Item Input (Glass) -------+  |
|  | [+]  Add item...                   |  |
|  +------------------------------------+  |
|                                          |
|  TO BUY (8)                              |
|  +----- List Item (Glass) -------------+ |
|  | [ ] [Icon] Milk                     | |
|  |     1L | Est: $2.50                 | |
|  +-------------------------------------+ |
|                                          |
|  +----- List Item (Glass) -------------+ |
|  | [ ] [Icon] Eggs                     | |
|  |     12 pack | Est: $4.00            | |
|  +-------------------------------------+ |
|                                          |
|  CHECKED (4)                             |
|  +----- List Item (Checked Glass) -----+ |
|  | [x] [Icon] Bread         [strikethrough]
|  |     1 loaf | $2.50                  | |
|  +-------------------------------------+ |
|                                          |
+------------------------------------------+
```

### 7.4 Profile Screen

```
+------------------------------------------+
|  [Gradient Background]                    |
|                                          |
|  +----- Profile Card (Elevated Glass)--+ |
|  |                                     | |
|  |     [Avatar - Floating]             | |
|  |                                     | |
|  |     John Doe                        | |
|  |     john@example.com                | |
|  |                                     | |
|  |  +------+ +------+ +------+         | |
|  |  | 156  | | $420 | |  12  |         | |
|  |  |Items | |Saved | |Lists |         | |
|  |  +------+ +------+ +------+         | |
|  +-------------------------------------+ |
|                                          |
|  PREFERENCES                             |
|  +----- Settings List (Glass) ---------+ |
|  | [Icon] Budget Settings         [>]  | |
|  +-------------------------------------+ |
|  | [Icon] Notifications           [>]  | |
|  +-------------------------------------+ |
|  | [Icon] Appearance              [>]  | |
|  +-------------------------------------+ |
|                                          |
|  ACCOUNT                                 |
|  +----- Account List (Glass) ----------+ |
|  | [Icon] Subscription            [>]  | |
|  +-------------------------------------+ |
|  | [Icon] Export Data             [>]  | |
|  +-------------------------------------+ |
|  | [Danger] Sign Out                   | |
|  +-------------------------------------+ |
|                                          |
+------------------------------------------+
```

---

## Part 8: Implementation Priority

### Phase 1: Core Foundation (Sprint 4)
1. Create `components/ui/glass/` directory
2. Implement `GlassCard` component
3. Implement `GlassButton` component
4. Create color and spacing constants
5. Set up gradient backgrounds
6. Implement haptic feedback hooks

### Phase 2: Input Components (Sprint 4)
1. Implement `GlassInput` component
2. Implement `GlassSearchBar` component
3. Create form validation styling

### Phase 3: List Components (Sprint 4)
1. Implement `GlassListItem` component
2. Implement `GlassCheckbox` component
3. Create swipe actions (delete, edit)

### Phase 4: Navigation (Sprint 4)
1. Implement `GlassTabBar` component
2. Implement `GlassHeader` component
3. Create navigation transitions

### Phase 5: Screen Updates (Sprint 5)
1. Update Pantry screen
2. Update Lists screen
3. Update List Detail screen
4. Update Profile screen

### Phase 6: Polish (Sprint 5)
1. Add loading states and skeletons
2. Implement error states
3. Add empty states with illustrations
4. Fine-tune animations

---

## Appendix A: Icon Updates

The glass design system works best with outlined icons. Update icon selections:

```typescript
const glassIcons = {
  // Tab bar
  pantry: 'home-outline',
  lists: 'clipboard-list-outline',
  scan: 'camera-outline',
  profile: 'person-circle-outline',

  // Actions
  add: 'add-circle-outline',
  edit: 'pencil-outline',
  delete: 'trash-outline',
  search: 'search-outline',
  filter: 'filter-outline',
  sort: 'swap-vertical-outline',

  // Status
  check: 'checkmark-circle',
  uncheck: 'ellipse-outline',
  warning: 'alert-circle-outline',
  info: 'information-circle-outline',
};
```

---

## Appendix B: File Structure

```
components/
  ui/
    glass/
      GlassCard.tsx
      GlassButton.tsx
      GlassInput.tsx
      GlassListItem.tsx
      GlassTabBar.tsx
      GlassHeader.tsx
      GlassCheckbox.tsx
      GlassProgressBar.tsx
      GlassBadge.tsx
      GlassAvatar.tsx
      index.ts

lib/
  constants/
    colors.ts
    typography.ts
    spacing.ts
    animations.ts

  hooks/
    useGlassStyle.ts
    useHaptics.ts
    useAnimatedPress.ts
```

---

*This document supersedes all previous UI design documentation for Oja.*
