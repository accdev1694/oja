/**
 * Glass Design System Tokens
 *
 * Based on moodboard analysis - sleek, modern glassmorphism aesthetic
 * Deep blue gradients with vibrant accent colors
 */

import { Platform } from "react-native";

// =============================================================================
// COLOR PALETTE
// =============================================================================

export const colors = {
  // Background Colors
  background: {
    primary: "#0B1426", // Deep navy (main background)
    secondary: "#111D32", // Slightly lighter navy
    tertiary: "#162033", // Card hover state
    gradient: {
      start: "#0B1426",
      middle: "#1A2744",
      end: "#0F1829",
    },
  },

  // Glass Effect Colors
  glass: {
    background: "rgba(255, 255, 255, 0.08)", // Base glass
    backgroundHover: "rgba(255, 255, 255, 0.12)",
    backgroundActive: "rgba(255, 255, 255, 0.15)",
    backgroundStrong: "rgba(255, 255, 255, 0.18)",
    border: "rgba(255, 255, 255, 0.15)",
    borderFocus: "rgba(255, 255, 255, 0.25)",
    borderStrong: "rgba(255, 255, 255, 0.3)",
    shadow: "rgba(0, 0, 0, 0.25)",
    shadowDeep: "rgba(0, 0, 0, 0.4)",
  },

  // Accent Colors
  accent: {
    primary: "#00D4AA", // Teal/Mint (main actions)
    primaryLight: "#33DDBB",
    primaryDark: "#00B894",
    secondary: "#6366F1", // Indigo (secondary actions)
    secondaryLight: "#818CF8",
    secondaryDark: "#4F46E5",
    success: "#10B981", // Emerald green
    successLight: "#34D399",
    warning: "#F59E0B", // Amber/Gold
    warningLight: "#FBBF24",
    error: "#EF4444", // Red
    errorLight: "#F87171",
    info: "#3B82F6", // Blue
    infoLight: "#60A5FA",
  },

  // Budget Status Colors
  budget: {
    healthy: "#10B981", // Under budget - green
    healthyGlow: "rgba(16, 185, 129, 0.2)",
    caution: "#F59E0B", // Approaching limit - amber
    cautionGlow: "rgba(245, 158, 11, 0.2)",
    exceeded: "#EF4444", // Over budget - red
    exceededGlow: "rgba(239, 68, 68, 0.2)",
    neutral: "#6B7280", // No budget set - gray
  },

  // Text Colors
  text: {
    primary: "#FFFFFF",
    secondary: "rgba(255, 255, 255, 0.7)",
    tertiary: "rgba(255, 255, 255, 0.5)",
    disabled: "rgba(255, 255, 255, 0.3)",
    inverse: "#0B1426",
    link: "#00D4AA",
  },

  // Semantic/Tab Colors
  semantic: {
    pantry: "#00D4AA", // Teal
    pantryGlow: "rgba(0, 212, 170, 0.15)",
    lists: "#6366F1", // Indigo
    listsGlow: "rgba(99, 102, 241, 0.15)",
    scan: "#F59E0B", // Amber
    scanGlow: "rgba(245, 158, 11, 0.15)",
    profile: "#EC4899", // Pink
    profileGlow: "rgba(236, 72, 153, 0.15)",
    // Status colors (aliased from accent)
    success: "#10B981",
    warning: "#F59E0B",
    danger: "#EF4444",
    // Gamification
    fire: "#FF6B35",
    fireGlow: "rgba(255, 107, 53, 0.15)",
  },

  // Chart Colors (for category charts, pie charts, etc.)
  chart: [
    "#00D4AA", // Teal (primary)
    "#6366F1", // Indigo (secondary)
    "#F59E0B", // Amber (warning)
    "#EF4444", // Red (error)
    "#3B82F6", // Blue (info)
    "#10B981", // Green (success)
  ] as unknown as readonly string[],
} as const;

// =============================================================================
// GRADIENTS
// =============================================================================

export const gradients = {
  // Background gradients (for LinearGradient)
  backgroundMain: ["#0B1426", "#1A2744", "#0F1829"] as const,
  backgroundRadial: ["#1A2744", "#0B1426"] as const,
  backgroundSubtle: ["#0B1426", "#0F1829"] as const,

  // Accent gradients
  accentPrimary: ["#00D4AA", "#00B894"] as const,
  accentSecondary: ["#6366F1", "#8B5CF6"] as const,
  accentWarm: ["#F59E0B", "#EF4444"] as const,
  accentCool: ["#3B82F6", "#6366F1"] as const,

  // Glass overlays
  glassShine: [
    "rgba(255, 255, 255, 0.2)",
    "rgba(255, 255, 255, 0)",
  ] as const,
  glassDepth: [
    "rgba(255, 255, 255, 0.1)",
    "rgba(255, 255, 255, 0.05)",
  ] as const,

  // Budget status gradients
  budgetHealthy: ["#10B981", "#059669"] as const,
  budgetCaution: ["#F59E0B", "#D97706"] as const,
  budgetExceeded: ["#EF4444", "#DC2626"] as const,
} as const;

// =============================================================================
// TYPOGRAPHY
// =============================================================================

export const typography = {
  // Display (Hero text, onboarding)
  displayLarge: {
    fontSize: 48,
    fontWeight: "700" as const,
    lineHeight: 56,
    letterSpacing: -0.5,
  },
  displayMedium: {
    fontSize: 36,
    fontWeight: "600" as const,
    lineHeight: 44,
    letterSpacing: -0.25,
  },
  displaySmall: {
    fontSize: 28,
    fontWeight: "600" as const,
    lineHeight: 36,
    letterSpacing: 0,
  },

  // Headlines (Section titles)
  headlineLarge: {
    fontSize: 24,
    fontWeight: "600" as const,
    lineHeight: 32,
  },
  headlineMedium: {
    fontSize: 20,
    fontWeight: "600" as const,
    lineHeight: 28,
  },
  headlineSmall: {
    fontSize: 18,
    fontWeight: "600" as const,
    lineHeight: 24,
  },

  // Body (Content)
  bodyLarge: {
    fontSize: 16,
    fontWeight: "400" as const,
    lineHeight: 24,
  },
  bodyMedium: {
    fontSize: 14,
    fontWeight: "400" as const,
    lineHeight: 20,
  },
  bodySmall: {
    fontSize: 12,
    fontWeight: "400" as const,
    lineHeight: 16,
  },

  // Labels (Buttons, tags)
  labelLarge: {
    fontSize: 16,
    fontWeight: "600" as const,
    lineHeight: 24,
    letterSpacing: 0.1,
  },
  labelMedium: {
    fontSize: 14,
    fontWeight: "600" as const,
    lineHeight: 20,
    letterSpacing: 0.1,
  },
  labelSmall: {
    fontSize: 12,
    fontWeight: "600" as const,
    lineHeight: 16,
    letterSpacing: 0.5,
  },

  // Numbers (Stats, prices, budgets)
  numberLarge: {
    fontSize: 36,
    fontWeight: "700" as const,
    lineHeight: 40,
  },
  numberMedium: {
    fontSize: 24,
    fontWeight: "700" as const,
    lineHeight: 28,
  },
  numberSmall: {
    fontSize: 18,
    fontWeight: "600" as const,
    lineHeight: 24,
  },
} as const;

// =============================================================================
// SPACING
// =============================================================================

export const spacing = {
  // Base unit: 4px
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  "2xl": 24,
  "3xl": 32,
  "4xl": 40,
  "5xl": 48,
  "6xl": 64,
} as const;

// =============================================================================
// BORDER RADIUS
// =============================================================================

export const borderRadius = {
  none: 0,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  "2xl": 32,
  full: 9999,
} as const;

// =============================================================================
// LAYOUT
// =============================================================================

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

  // Safe areas (handled by SafeAreaView, but useful for calculations)
  headerHeight: 56,
  tabBarHeight: 80, // Including safe area
} as const;

// =============================================================================
// SHADOWS
// =============================================================================

export const shadows = {
  sm: {
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 2,
  },
  md: {
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 4,
  },
  lg: {
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.25,
    shadowRadius: 16,
    elevation: 8,
  },
  xl: {
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.3,
    shadowRadius: 24,
    elevation: 12,
  },
  glow: (color: string) => ({
    shadowColor: color,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.4,
    shadowRadius: 12,
    elevation: 0,
  }),
} as const;

// =============================================================================
// GLASS CARD STYLES
// =============================================================================

export const glassCardStyles = {
  standard: {
    backgroundColor: colors.glass.background,
    borderWidth: 1,
    borderColor: colors.glass.border,
    borderRadius: borderRadius.lg,
  },
  elevated: {
    backgroundColor: colors.glass.backgroundHover,
    borderWidth: 1,
    borderColor: colors.glass.borderFocus,
    borderRadius: borderRadius.xl,
    ...shadows.lg,
  },
  sunken: {
    backgroundColor: "rgba(0, 0, 0, 0.2)",
    borderWidth: 1,
    borderColor: colors.glass.border,
    borderRadius: borderRadius.lg,
  },
  bordered: {
    backgroundColor: colors.glass.background,
    borderWidth: 2,
    borderColor: colors.glass.borderStrong,
    borderRadius: borderRadius.lg,
  },
} as const;

// =============================================================================
// BLUR SETTINGS
// =============================================================================

export const blur = {
  // iOS uses blur intensity
  // Android will fall back to semi-transparent backgrounds
  light: {
    intensity: 20,
    tint: "dark" as const,
  },
  medium: {
    intensity: 40,
    tint: "dark" as const,
  },
  heavy: {
    intensity: 60,
    tint: "dark" as const,
  },
  // Check if blur is supported
  isSupported: Platform.OS === "ios",
} as const;

// =============================================================================
// ANIMATIONS
// =============================================================================

export const animations = {
  // Spring configs (for react-native-reanimated)
  spring: {
    gentle: { damping: 20, stiffness: 150 },
    bouncy: { damping: 12, stiffness: 180 },
    stiff: { damping: 25, stiffness: 300 },
  },

  // Timing configs
  timing: {
    fast: 150,
    normal: 250,
    slow: 400,
  },

  // Specific animation values
  pressScale: 0.97,
  fadeInDuration: 200,
  slideDistance: 20,
} as const;

// =============================================================================
// HAPTIC TYPES
// =============================================================================

export const hapticTypes = {
  light: "impactLight",
  medium: "impactMedium",
  heavy: "impactHeavy",
  success: "notificationSuccess",
  warning: "notificationWarning",
  error: "notificationError",
  selection: "selectionChanged",
} as const;

// =============================================================================
// EXPORT ALL AS DEFAULT
// =============================================================================

const glassTokens = {
  colors,
  gradients,
  typography,
  spacing,
  borderRadius,
  layout,
  shadows,
  glassCardStyles,
  blur,
  animations,
  hapticTypes,
} as const;

export default glassTokens;

// Type exports
export type GlassColors = typeof colors;
export type GlassGradients = typeof gradients;
export type GlassTypography = typeof typography;
export type GlassSpacing = typeof spacing;
export type GlassBorderRadius = typeof borderRadius;
