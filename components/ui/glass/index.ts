/**
 * Glass UI Components - Barrel Export
 *
 * The Glass Design System for Oja app.
 * Import all glass components from this file.
 *
 * @example
 * import { GlassCard, GlassButton, colors } from '@/components/ui/glass';
 */

// =============================================================================
// CARD COMPONENTS
// =============================================================================

export {
  GlassCard,
  ElevatedGlassCard,
  SunkenGlassCard,
  BorderedGlassCard,
  type GlassCardProps,
  type GlassCardVariant,
  type GlassIntensity,
  type GlassBorderRadius,
  type GlassPadding,
} from "./GlassCard";

// =============================================================================
// BUTTON COMPONENTS
// =============================================================================

export {
  GlassButton,
  PrimaryButton,
  SecondaryButton,
  GhostButton,
  DangerButton,
  type GlassButtonProps,
  type GlassButtonVariant,
  type GlassButtonSize,
} from "./GlassButton";

// =============================================================================
// INPUT COMPONENTS
// =============================================================================

export {
  GlassInput,
  GlassSearchInput,
  type GlassInputProps,
  type GlassInputVariant,
  type GlassInputSize,
  type GlassSearchInputProps,
} from "./GlassInput";

// Use safe wrapper until dev build is rebuilt with native date picker module
export {
  SafeDateRangePicker as GlassDateRangePicker,
  type DateRange,
} from "./SafeDateRangePicker";

// =============================================================================
// CAPSULE SWITCHER
// =============================================================================

export {
  GlassCapsuleSwitcher,
  type GlassCapsuleSwitcherProps,
  type CapsuleTab,
} from "./GlassCapsuleSwitcher";

// =============================================================================
// LIST COMPONENTS
// =============================================================================

export {
  GlassListItem,
  GlassSettingsItem,
  GlassCheckItem,
  GlassCompactItem,
  type GlassListItemProps,
  type GlassListItemVariant,
} from "./GlassListItem";

// =============================================================================
// CHECKBOX COMPONENTS
// =============================================================================

export {
  GlassCheckbox,
  GlassCircularCheckbox,
  type GlassCheckboxProps,
  type GlassCheckboxSize,
} from "./GlassCheckbox";

// =============================================================================
// PROGRESS COMPONENTS
// =============================================================================

export {
  GlassProgressBar,
  BudgetProgressBar,
  type GlassProgressBarProps,
  type BudgetProgressBarProps,
  type BudgetStatus,
  type ProgressBarSize,
} from "./GlassProgressBar";

export { CircularBudgetDial } from "./CircularBudgetDial";

// =============================================================================
// NAVIGATION COMPONENTS
// =============================================================================

export {
  GlassTabBar,
  GlassTabIcon,
  TAB_CONFIG,
  TAB_BAR_HEIGHT,
  type TabConfig,
} from "./GlassTabBar";

export {
  GlassHeader,
  SimpleHeader,
  type GlassHeaderProps,
  type SimpleHeaderProps,
  type HeaderAction,
} from "./GlassHeader";

// =============================================================================
// BACKGROUND COMPONENTS
// =============================================================================

export {
  GradientBackground,
  GlassScreen,
  type GradientBackgroundProps,
  type GradientVariant,
} from "./GradientBackground";

// =============================================================================
// SKELETON / LOADING COMPONENTS
// =============================================================================

export {
  GlassSkeleton,
  SkeletonCard,
  SkeletonListItem,
  SkeletonStatCard,
  SkeletonPantryItem,
  type GlassSkeletonProps,
  type SkeletonVariant,
  type SkeletonCardProps,
  type SkeletonListItemProps,
  type SkeletonStatCardProps,
  type SkeletonPantryItemProps,
} from "./GlassSkeleton";

// =============================================================================
// ERROR / EMPTY STATE COMPONENTS
// =============================================================================

export {
  GlassErrorState,
  EmptyPantry,
  EmptyLists,
  EmptyListItems,
  EmptySearch,
  NoReceipts,
  type GlassErrorStateProps,
  type ErrorType,
  type EmptyStateProps,
} from "./GlassErrorState";

// =============================================================================
// ANIMATION COMPONENTS
// =============================================================================

export {
  AnimatedPressable,
  AnimatedListItem,
  AnimatedSection,
  AnimatedBadge,
  ShimmerEffect,
  PulseAnimation,
  SuccessCheck,
  animationPresets,
  type AnimatedPressableProps,
  type AnimatedListItemProps,
  type AnimatedSectionProps,
  type AnimatedBadgeProps,
  type ShimmerEffectProps,
  type PulseAnimationProps,
  type SuccessCheckProps,
} from "./GlassAnimations";

// =============================================================================
// COLLAPSIBLE COMPONENTS
// =============================================================================

export {
  GlassCollapsible,
  type GlassCollapsibleProps,
} from "./GlassCollapsible";

// =============================================================================
// MODAL COMPONENTS
// =============================================================================

export {
  GlassModal,
  type GlassModalProps,
} from "./GlassModal";

export { TrialNudgeBanner } from "./TrialNudgeBanner";
export { ImpersonationBanner } from "./ImpersonationBanner";
export { GuidedBorder } from "./GuidedBorder";

// =============================================================================
// ALERT / CONFIRM DIALOG
// =============================================================================

export {
  GlassAlertProvider,
  useGlassAlert,
  type AlertButton,
  type AlertConfig,
} from "./GlassAlert";

// =============================================================================
// TOAST COMPONENTS
// =============================================================================

export {
  GlassToast,
  type GlassToastProps,
} from "./GlassToast";

// =============================================================================
// DESIGN TOKENS
// =============================================================================

export {
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
  type GlassColors,
  type GlassGradients,
  type GlassTypography,
  type GlassSpacing,
  type GlassBorderRadius as BorderRadiusScale,
} from "@/lib/design/glassTokens";

// =============================================================================
// NETWORK STATUS COMPONENTS
// =============================================================================

export {
  OfflineBanner,
  type OfflineBannerProps,
} from "./OfflineBanner";

