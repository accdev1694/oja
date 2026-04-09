/**
 * Maps a user's effective subscription status to the admin actions the dashboard
 * should surface. Admins return `[]` so staff accounts don't get trial/premium
 * buttons offered against them.
 */
import type { ComponentProps } from "react";
import type { MaterialCommunityIcons } from "@expo/vector-icons";
import type { SubscriptionEffectiveStatus } from "../types";

export type ContextualActionKey =
  | "start_trial"
  | "extend_7"
  | "extend_14"
  | "grant_premium"
  | "downgrade";

export interface ContextualAction {
  key: ContextualActionKey;
  label: string;
  icon: ComponentProps<typeof MaterialCommunityIcons>["name"];
  danger?: boolean;
}

export function getContextualActions(
  status: SubscriptionEffectiveStatus | undefined
): ContextualAction[] {
  switch (status) {
    case "admin":
      // Admins bypass subscription gating entirely — no trial/premium actions apply.
      return [];
    case "free":
      return [
        { key: "start_trial", label: "Start Trial", icon: "clock-plus-outline" },
        { key: "grant_premium", label: "Grant Premium", icon: "crown" },
      ];
    case "trial":
      return [
        { key: "extend_7", label: "+7d Trial", icon: "clock-plus-outline" },
        { key: "extend_14", label: "+14d Trial", icon: "clock-plus-outline" },
        { key: "grant_premium", label: "Grant Premium", icon: "crown" },
      ];
    case "active":
      return [
        { key: "grant_premium", label: "Extend +12mo", icon: "crown" },
        { key: "downgrade", label: "Downgrade", icon: "arrow-down-circle-outline", danger: true },
      ];
    case "expired":
      return [
        { key: "start_trial", label: "New Trial", icon: "clock-plus-outline" },
        { key: "grant_premium", label: "Grant Premium", icon: "crown" },
      ];
    case "cancelled":
      return [
        { key: "grant_premium", label: "Reactivate", icon: "crown" },
      ];
    default:
      return [
        { key: "start_trial", label: "Start Trial", icon: "clock-plus-outline" },
        { key: "grant_premium", label: "Grant Premium", icon: "crown" },
      ];
  }
}
