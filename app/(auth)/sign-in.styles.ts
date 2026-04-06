import { StyleSheet } from "react-native";
import { colors, typography, spacing, borderRadius } from "@/components/ui/glass";

export const styles = StyleSheet.create({
  flex: {
    flex: 1,
  },
  content: {
    flexGrow: 1,
    justifyContent: "center",
    paddingHorizontal: spacing.lg,
  },
  iconContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: `${colors.accent.primary}20`,
    justifyContent: "center",
    alignItems: "center",
    alignSelf: "center",
    marginBottom: spacing.lg,
  },
  logo: {
    width: 140,
    height: 97,
    alignSelf: "center",
    marginBottom: spacing.lg,
  },
  title: {
    ...typography.displaySmall,
    color: colors.text.primary,
    textAlign: "center",
    marginBottom: spacing.xs,
  },
  subtitle: {
    ...typography.bodyLarge,
    color: colors.text.secondary,
    textAlign: "center",
    marginBottom: spacing.xl,
  },
  errorCard: {
    marginBottom: spacing.md,
  },
  errorText: {
    ...typography.bodySmall,
    color: colors.accent.error,
  },
  forgotPassword: {
    alignSelf: "flex-end",
    marginTop: spacing.sm,
  },
  spacer: {
    height: spacing.lg,
  },
  divider: {
    flexDirection: "row",
    alignItems: "center",
    marginVertical: spacing.lg,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: colors.glass.border,
  },
  dividerText: {
    ...typography.bodySmall,
    color: colors.text.tertiary,
    marginHorizontal: spacing.md,
  },
  oauthContainer: {
    flexDirection: "row",
    gap: spacing.sm,
    marginBottom: spacing.md,
  },
  oauthButton: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: spacing.sm,
    backgroundColor: colors.glass.background,
    borderWidth: 1,
    borderColor: colors.glass.border,
    borderRadius: borderRadius.lg,
    paddingVertical: spacing.md,
  },
  oauthButtonText: {
    ...typography.bodyMedium,
    color: colors.text.primary,
    fontWeight: "600",
  },
  buttonDisabled: {
    opacity: 0.5,
  },
  footer: {
    flexDirection: "row",
    justifyContent: "center",
    marginTop: spacing.lg,
  },
  footerText: {
    ...typography.bodyMedium,
    color: colors.text.secondary,
  },
  linkText: {
    ...typography.bodyMedium,
    color: colors.accent.primary,
    fontWeight: "600",
  },
  backButton: {
    alignItems: "center",
    marginTop: spacing.md,
  },
  savedAccountCard: {
    marginBottom: spacing.sm,
  },
  savedAccountRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
  },
  savedAccountIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: `${colors.accent.primary}15`,
    justifyContent: "center",
    alignItems: "center",
  },
  savedAccountInfo: {
    flex: 1,
  },
  savedAccountEmail: {
    ...typography.bodyMedium,
    color: colors.text.primary,
    fontWeight: "600",
  },
  savedAccountMethod: {
    ...typography.bodySmall,
    color: colors.text.tertiary,
    marginTop: 2,
  },
});
