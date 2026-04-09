/**
 * Mutation-wrapping action handlers for the admin Users tab.
 * Extracted from UsersTab.tsx to keep that file under the 400-line limit.
 *
 * Every handler takes a `userId: string` argument, wraps a single Convex mutation
 * in a confirmation alert + toast + haptic feedback flow, and swallows errors
 * into user-visible toasts. None of them touch component-local selection state —
 * that stays in UsersTab.
 */
import { useCallback } from "react";
import * as Clipboard from "expo-clipboard";
import { useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import { safeHaptics } from "@/lib/haptics/safeHaptics";

interface UseUserActionsArgs {
  showAlert: (
    title: string,
    message: string,
    buttons: {
      text: string;
      style?: "cancel" | "default" | "destructive";
      onPress?: () => void | Promise<void>;
    }[]
  ) => void;
  showToast: (message: string, type: "success" | "error" | "info") => void;
}

export function useUserActions({ showAlert, showToast }: UseUserActionsArgs) {
  const toggleAdmin = useMutation(api.admin.toggleAdmin);
  const extendTrial = useMutation(api.admin.extendTrial);
  const adjustPoints = useMutation(api.admin.adjustPoints);
  const grantAccess = useMutation(api.admin.grantComplimentaryAccess);
  const downgradeSubscription = useMutation(api.admin.downgradeSubscription);
  const toggleSuspension = useMutation(api.admin.toggleSuspension);
  const generateToken = useMutation(api.impersonation.generateImpersonationToken);

  const handleImpersonate = useCallback(async (userId: string) => {
    try {
      const result = await generateToken({ userId: userId as Id<"users"> });
      const impersonateUrl = `oja://impersonate?token=${result.tokenValue}`;
      safeHaptics.success();
      showAlert(
        "Impersonation Ready",
        `User session token generated.\n\nDeep Link:\n${impersonateUrl}\n\nNote: This token expires in 1 hour.`,
        [
          {
            text: "Copy Link",
            onPress: async () => {
              try {
                await Clipboard.setStringAsync(impersonateUrl);
                showToast("Link copied to clipboard", "info");
              } catch (copyErr) {
                showToast((copyErr as Error).message || "Failed to copy link", "error");
              }
            },
          },
          { text: "Done", style: "cancel" },
        ]
      );
    } catch (e) { showToast((e as Error).message, "error"); }
  }, [generateToken, showAlert, showToast]);

  const handleToggleAdmin = useCallback(async (userId: string) => {
    try {
      const result = await toggleAdmin({ userId: userId as Id<"users"> });
      safeHaptics.success();
      showToast(result.isAdmin ? "Admin privileges granted" : "Admin privileges revoked", "success");
    } catch (error) {
      showToast((error as Error).message || "Failed to toggle admin status", "error");
    }
  }, [toggleAdmin, showToast]);

  const handleExtendTrial = useCallback(async (userId: string, days: number = 14) => {
    showAlert("Extend Trial", `Add ${days} days to trial?`, [
      { text: "Cancel", style: "cancel" },
      {
        text: "Extend",
        onPress: async () => {
          try {
            await extendTrial({ userId: userId as Id<"users">, days });
            safeHaptics.success();
            showToast(`Trial extended by ${days} days`, "success");
          } catch (error) {
            showToast((error as Error).message || "Failed to extend trial", "error");
          }
        },
      },
    ]);
  }, [extendTrial, showAlert, showToast]);

  const handleStartTrial = useCallback(async (userId: string) => {
    showAlert("Start Trial", "Start a fresh 7-day trial for this user?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Start Trial",
        onPress: async () => {
          try {
            await extendTrial({ userId: userId as Id<"users">, days: 7 });
            safeHaptics.success();
            showToast("7-day trial started", "success");
          } catch (error) {
            showToast((error as Error).message || "Failed to start trial", "error");
          }
        },
      },
    ]);
  }, [extendTrial, showAlert, showToast]);

  const handleDowngrade = useCallback(async (userId: string) => {
    showAlert(
      "Downgrade to Free",
      "End this user's premium access immediately?\n\nWARNING: This does NOT cancel the Stripe subscription. If the user is still being billed, you must cancel in the Stripe dashboard as well.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Downgrade",
          onPress: async () => {
            try {
              const result = await downgradeSubscription({ userId: userId as Id<"users"> });
              safeHaptics.warning();
              if (result.stripeCancelRequired) {
                showToast("Downgraded. Remember to cancel the Stripe subscription.", "info");
              } else {
                showToast("Subscription downgraded", "success");
              }
            } catch (error) {
              showToast((error as Error).message || "Failed to downgrade", "error");
            }
          },
        },
      ]
    );
  }, [downgradeSubscription, showAlert, showToast]);

  const handleAdjustPoints = useCallback(async (userId: string) => {
    showAlert("Adjust Points", "Add or remove points for this user:", [
      { text: "Cancel", style: "cancel" },
      {
        text: "+500 pts",
        onPress: async () => {
          try {
            await adjustPoints({ userId: userId as Id<"users">, amount: 500, reason: "Customer goodwill" });
            showToast("Added 500 points", "success");
          } catch (e) { showToast((e as Error).message, "error"); }
        },
      },
      {
        text: "-500 pts",
        onPress: async () => {
          try {
            await adjustPoints({ userId: userId as Id<"users">, amount: -500, reason: "Fraud correction" });
            showToast("Removed 500 points", "success");
          } catch (e) { showToast((e as Error).message, "error"); }
        },
      },
    ]);
  }, [adjustPoints, showAlert, showToast]);

  const handleGrantAccess = useCallback(async (userId: string) => {
    showAlert("Grant Premium", "Give free premium annual access?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Grant",
        onPress: async () => {
          try {
            await grantAccess({ userId: userId as Id<"users">, months: 12 });
            safeHaptics.success();
            showToast("Premium access granted", "success");
          } catch (error) {
            showToast((error as Error).message || "Failed to grant access", "error");
          }
        },
      },
    ]);
  }, [grantAccess, showAlert, showToast]);

  const handleToggleSuspension = useCallback(async (userId: string) => {
    try {
      await toggleSuspension({ userId: userId as Id<"users"> });
      safeHaptics.warning();
      showToast("User status updated", "success");
    } catch (error) {
      showToast((error as Error).message || "Failed to toggle suspension", "error");
    }
  }, [toggleSuspension, showToast]);

  return {
    handleImpersonate,
    handleToggleAdmin,
    handleExtendTrial,
    handleStartTrial,
    handleDowngrade,
    handleAdjustPoints,
    handleGrantAccess,
    handleToggleSuspension,
  };
}
