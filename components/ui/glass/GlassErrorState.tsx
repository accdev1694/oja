/**
 * GlassErrorState - Consistent error display component
 *
 * Features:
 * - Multiple error types (generic, network, empty, auth, permission)
 * - Customizable icon, title, message
 * - Optional retry action
 * - Glass styling consistency
 *
 * @example
 * // Network error with retry
 * <GlassErrorState
 *   type="network"
 *   onRetry={() => refetch()}
 * />
 *
 * // Custom error
 * <GlassErrorState
 *   icon="alert-circle"
 *   title="Something went wrong"
 *   message="Please try again later"
 *   onRetry={handleRetry}
 * />
 */

import { View, Text, StyleSheet, ViewStyle } from "react-native";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { colors, typography, spacing, borderRadius } from "@/lib/design/glassTokens";
import { GlassButton } from "./GlassButton";
import { GlassCard } from "./GlassCard";

// =============================================================================
// TYPES
// =============================================================================

export type ErrorType =
  | "generic"
  | "network"
  | "empty"
  | "not-found"
  | "auth"
  | "permission"
  | "server";

export interface GlassErrorStateProps {
  /** Preset error type */
  type?: ErrorType;
  /** Custom icon name */
  icon?: keyof typeof MaterialCommunityIcons.glyphMap;
  /** Custom title */
  title?: string;
  /** Custom message */
  message?: string;
  /** Retry button handler */
  onRetry?: () => void;
  /** Retry button text */
  retryText?: string;
  /** Secondary action handler */
  onSecondaryAction?: () => void;
  /** Secondary button text */
  secondaryText?: string;
  /** Size variant */
  size?: "compact" | "default" | "large";
  /** Additional styles */
  style?: ViewStyle;
  /** Whether to show in a card */
  showCard?: boolean;
}

// =============================================================================
// ERROR TYPE PRESETS
// =============================================================================

interface ErrorPreset {
  icon: keyof typeof MaterialCommunityIcons.glyphMap;
  title: string;
  message: string;
  iconColor: string;
}

const ERROR_PRESETS: Record<ErrorType, ErrorPreset> = {
  generic: {
    icon: "alert-circle-outline",
    title: "Something went wrong",
    message: "An unexpected error occurred. Please try again.",
    iconColor: colors.semantic.danger,
  },
  network: {
    icon: "wifi-off",
    title: "No connection",
    message: "Please check your internet connection and try again.",
    iconColor: colors.semantic.warning,
  },
  empty: {
    icon: "inbox-outline",
    title: "Nothing here yet",
    message: "Let's get started — add your first item!",
    iconColor: colors.text.secondary,
  },
  "not-found": {
    icon: "magnify-close",
    title: "Not found",
    message: "We couldn't find what you're looking for.",
    iconColor: colors.text.secondary,
  },
  auth: {
    icon: "lock-outline",
    title: "Authentication required",
    message: "Please sign in to access this content.",
    iconColor: colors.semantic.warning,
  },
  permission: {
    icon: "shield-alert-outline",
    title: "Access denied",
    message: "You don't have permission to view this content.",
    iconColor: colors.semantic.danger,
  },
  server: {
    icon: "server-off",
    title: "Server error",
    message: "Our servers are having trouble. Please try again later.",
    iconColor: colors.semantic.danger,
  },
};

// =============================================================================
// SIZE PRESETS
// =============================================================================

const SIZE_PRESETS = {
  compact: {
    iconSize: 48,
    containerPadding: spacing.md,
    gap: spacing.sm,
    iconContainerSize: 72,
  },
  default: {
    iconSize: 64,
    containerPadding: spacing.xl,
    gap: spacing.md,
    iconContainerSize: 100,
  },
  large: {
    iconSize: 80,
    containerPadding: spacing["2xl"],
    gap: spacing.lg,
    iconContainerSize: 120,
  },
};

// =============================================================================
// ERROR STATE COMPONENT
// =============================================================================

export function GlassErrorState({
  type = "generic",
  icon,
  title,
  message,
  onRetry,
  retryText = "Try Again",
  onSecondaryAction,
  secondaryText,
  size = "default",
  style,
  showCard = false,
}: GlassErrorStateProps) {
  const preset = ERROR_PRESETS[type];
  const sizePreset = SIZE_PRESETS[size];

  const finalIcon = icon ?? preset.icon;
  const finalTitle = title ?? preset.title;
  const finalMessage = message ?? preset.message;
  const iconColor = preset.iconColor;

  const content = (
    <View
      style={[
        styles.container,
        { padding: sizePreset.containerPadding, gap: sizePreset.gap },
        style,
      ]}
    >
      {/* Icon Container */}
      <View
        style={[
          styles.iconContainer,
          {
            width: sizePreset.iconContainerSize,
            height: sizePreset.iconContainerSize,
            borderRadius: sizePreset.iconContainerSize / 2,
            backgroundColor: `${iconColor}20`,
          },
        ]}
      >
        <MaterialCommunityIcons
          name={finalIcon}
          size={sizePreset.iconSize}
          color={iconColor}
        />
      </View>

      {/* Title */}
      <Text
        style={[
          styles.title,
          size === "compact" && styles.titleCompact,
          size === "large" && styles.titleLarge,
        ]}
      >
        {finalTitle}
      </Text>

      {/* Message */}
      <Text
        style={[
          styles.message,
          size === "compact" && styles.messageCompact,
          size === "large" && styles.messageLarge,
        ]}
      >
        {finalMessage}
      </Text>

      {/* Actions */}
      {(onRetry || onSecondaryAction) && (
        <View style={styles.actions}>
          {onRetry && (
            <GlassButton
              variant="primary"
              size={size === "compact" ? "md" : "lg"}
              icon="refresh"
              onPress={onRetry}
            >
              {retryText}
            </GlassButton>
          )}
          {onSecondaryAction && secondaryText && (
            <GlassButton
              variant="ghost"
              size={size === "compact" ? "md" : "lg"}
              onPress={onSecondaryAction}
            >
              {secondaryText}
            </GlassButton>
          )}
        </View>
      )}
    </View>
  );

  if (showCard) {
    return (
      <GlassCard variant="standard" style={styles.card}>
        {content}
      </GlassCard>
    );
  }

  return content;
}

// =============================================================================
// EMPTY STATE VARIANTS
// =============================================================================

export interface EmptyStateProps {
  title?: string;
  message?: string;
  icon?: keyof typeof MaterialCommunityIcons.glyphMap;
  actionText?: string;
  onAction?: () => void;
  style?: ViewStyle;
}

export function EmptyPantry({ title, message, onAction, actionText, style }: EmptyStateProps) {
  return (
    <GlassErrorState
      type="empty"
      icon="package-variant"
      title={title ?? "Let's fill your pantry"}
      message={message ?? "What's in the kitchen? Add items to keep track of your stock. Most shoppers track 30+ items in their first week."}
      onRetry={onAction}
      retryText={actionText ?? "Add First Item"}
      style={style}
    />
  );
}

export function EmptyLists({ title, message, onAction, actionText, style }: EmptyStateProps) {
  return (
    <GlassErrorState
      type="empty"
      icon="clipboard-list-outline"
      title={title ?? "Ready for your first shop?"}
      message={message ?? "Create a list and set a budget — UK shoppers save an average of £35/month by tracking their spending."}
      onRetry={onAction}
      retryText={actionText ?? "Create List"}
      style={style}
    />
  );
}

export function EmptyListItems({ title, message, onAction, actionText, style }: EmptyStateProps) {
  return (
    <GlassErrorState
      type="empty"
      icon="cart-outline"
      title={title ?? "Your list is ready"}
      message={message ?? "Add items from your stock or type something new."}
      onRetry={onAction}
      retryText={actionText ?? "Add Items"}
      size="compact"
      style={style}
    />
  );
}

export function EmptySearch({ searchTerm, style }: { searchTerm?: string; style?: ViewStyle }) {
  return (
    <GlassErrorState
      type="not-found"
      icon="magnify-close"
      title="No results found"
      message={
        searchTerm
          ? `No items match "${searchTerm}"`
          : "Try adjusting your search or filters"
      }
      size="compact"
      style={style}
    />
  );
}

export function NoReceipts({ onAction, style }: EmptyStateProps) {
  return (
    <GlassErrorState
      type="empty"
      icon="receipt"
      title="No receipts yet"
      message="Scan a receipt after your shop — we'll track prices and help you save next time. Your prices help build better data for everyone."
      onRetry={onAction}
      retryText="Scan Receipt"
      style={style}
    />
  );
}

// =============================================================================
// STYLES
// =============================================================================

const styles = StyleSheet.create({
  container: {
    alignItems: "center",
    justifyContent: "center",
  },
  card: {
    margin: spacing.md,
  },
  iconContainer: {
    justifyContent: "center",
    alignItems: "center",
  },
  title: {
    ...typography.headlineMedium,
    color: colors.text.primary,
    textAlign: "center",
  },
  titleCompact: {
    ...typography.headlineSmall,
  },
  titleLarge: {
    ...typography.displaySmall,
  },
  message: {
    ...typography.bodyMedium,
    color: colors.text.secondary,
    textAlign: "center",
    maxWidth: 280,
    lineHeight: 22,
  },
  messageCompact: {
    ...typography.bodySmall,
    maxWidth: 240,
  },
  messageLarge: {
    ...typography.bodyLarge,
    maxWidth: 320,
    lineHeight: 26,
  },
  actions: {
    marginTop: spacing.sm,
    gap: spacing.sm,
    width: "100%",
    maxWidth: 280,
  },
});
