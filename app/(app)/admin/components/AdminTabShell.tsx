/**
 * AdminTabShell — shared wrapper for admin tab content.
 *
 * Before this existed, every admin tab re-implemented its own ScrollView,
 * loading spinner, empty state, and section card styling. The result was
 * visual drift: PointsTab shipped with a local StyleSheet; other tabs used
 * `adminStyles`; padding and empty-state copy varied from tab to tab.
 *
 * AdminTabShell centralizes all of that. A tab only decides *what* to show;
 * the shell decides how the scroll container, loading spinner, empty state,
 * error card, and section headers look. The goal is that every tab in the
 * admin dashboard has identical rhythm — same padding, same scroll, same
 * skeleton, same section shape.
 *
 * Usage:
 *
 *     <AdminTabShell loading={data === undefined} empty={!data?.length}>
 *       <AdminTabShell.Section title="Overview" icon="view-dashboard">
 *         …content…
 *       </AdminTabShell.Section>
 *     </AdminTabShell>
 *
 * Exposed states (picked in priority order — only one renders at a time):
 *   - `loading`: centered ActivityIndicator
 *   - `error`:   error card with the error message
 *   - `empty`:   centered "nothing here" copy with optional action
 *   - default:   ScrollView with adminStyles.scrollContent padding
 */
import React, { ComponentProps } from "react";
import { View, Text, ScrollView, ActivityIndicator, Pressable } from "react-native";
import { MaterialCommunityIcons } from "@expo/vector-icons";

import { GlassCard, colors, spacing, typography } from "@/components/ui/glass";

import { adminStyles } from "../styles";

type IconName = ComponentProps<typeof MaterialCommunityIcons>["name"];

interface AdminTabShellProps {
  /** Show a loading spinner in place of children */
  loading?: boolean;
  /** Show an error card in place of children */
  error?: Error | string | null;
  /** Show an empty state in place of children */
  empty?: boolean;
  /** Copy for the empty state (default: "Nothing to show yet.") */
  emptyMessage?: string;
  /** Optional icon for the empty state */
  emptyIcon?: IconName;
  /** Optional action button for the empty state */
  emptyAction?: { label: string; onPress: () => void };
  /** Optional — unused when loading/error/empty state branches render. */
  children?: React.ReactNode;
}

function LoadingState() {
  return (
    <View style={adminStyles.loading}>
      <ActivityIndicator size="large" color={colors.accent.primary} />
    </View>
  );
}

function ErrorState({ error }: { error: Error | string }) {
  const message = typeof error === "string" ? error : error.message;
  return (
    <View
      style={{
        flex: 1,
        alignItems: "center",
        justifyContent: "center",
        padding: spacing.xl,
        gap: spacing.md,
      }}
    >
      <MaterialCommunityIcons
        name="alert-circle-outline"
        size={48}
        color={colors.semantic.danger}
      />
      <Text
        style={{
          ...typography.bodyLarge,
          color: colors.text.secondary,
          textAlign: "center",
        }}
      >
        {message}
      </Text>
    </View>
  );
}

function EmptyState({
  message,
  icon,
  action,
}: {
  message: string;
  icon?: IconName;
  action?: { label: string; onPress: () => void };
}) {
  return (
    <View
      style={{
        flex: 1,
        alignItems: "center",
        justifyContent: "center",
        padding: spacing.xl,
        gap: spacing.md,
      }}
    >
      {icon && (
        <MaterialCommunityIcons
          name={icon}
          size={48}
          color={colors.text.tertiary}
        />
      )}
      <Text style={adminStyles.emptyText}>{message}</Text>
      {action && (
        <Pressable
          onPress={action.onPress}
          accessibilityRole="button"
          accessibilityLabel={action.label}
          style={{
            paddingHorizontal: spacing.lg,
            paddingVertical: spacing.sm,
            borderRadius: 8,
            backgroundColor: colors.accent.primary,
          }}
        >
          <Text
            style={{
              ...typography.labelLarge,
              color: colors.text.primary,
            }}
          >
            {action.label}
          </Text>
        </Pressable>
      )}
    </View>
  );
}

interface SectionProps {
  title?: string;
  icon?: IconName;
  /** Render the children outside the default GlassCard wrap (for tabs that
   *  need custom layout inside a section). */
  bare?: boolean;
  children: React.ReactNode;
}

function Section({ title, icon, bare, children }: SectionProps) {
  const body = bare ? (
    <View style={{ marginBottom: spacing.md }}>{children}</View>
  ) : (
    <GlassCard style={adminStyles.section}>{children}</GlassCard>
  );

  if (!title) return body;

  return (
    <View>
      <View style={adminStyles.sectionHeader}>
        {icon && (
          <MaterialCommunityIcons
            name={icon}
            size={20}
            color={colors.accent.primary}
          />
        )}
        <Text style={adminStyles.sectionTitle}>{title}</Text>
      </View>
      {body}
    </View>
  );
}

export function AdminTabShell({
  loading,
  error,
  empty,
  emptyMessage = "Nothing to show yet.",
  emptyIcon,
  emptyAction,
  children,
}: AdminTabShellProps) {
  if (loading) return <LoadingState />;
  if (error) return <ErrorState error={error} />;
  if (empty) {
    return (
      <EmptyState message={emptyMessage} icon={emptyIcon} action={emptyAction} />
    );
  }

  return (
    <ScrollView
      style={adminStyles.scrollView}
      contentContainerStyle={adminStyles.scrollContent}
      showsVerticalScrollIndicator={false}
    >
      {children}
    </ScrollView>
  );
}

// Attach Section as a static member so call sites can write
// `<AdminTabShell.Section>` without a second import. Keeps tab files tidy.
AdminTabShell.Section = Section;
