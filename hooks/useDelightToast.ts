/**
 * useDelightToast - Surprise & delight random positive messages
 * + Achievement unlock toast
 * + Personal best record detection
 */
import { useState, useCallback, useRef } from "react";

const DELIGHT_MESSAGES = [
  { message: "You're a budgeting superstar!", icon: "star-shooting", color: "#FFD700" },
  { message: "Smart shopping pays off!", icon: "lightbulb-on", color: "#00D4AA" },
  { message: "Every penny counts. Nice work!", icon: "piggy-bank", color: "#10B981" },
  { message: "Look at you, staying on track!", icon: "run-fast", color: "#6366F1" },
  { message: "Your future self thanks you!", icon: "heart", color: "#EF4444" },
  { message: "Budget boss mode: activated!", icon: "shield-check", color: "#00D4AA" },
  { message: "Consistency is your superpower!", icon: "lightning-bolt", color: "#F59E0B" },
  { message: "Shopping goals? Smashed!", icon: "arm-flex", color: "#3B82F6" },
];

const ACHIEVEMENT_MESSAGES: Record<string, { message: string; icon: string; color: string }> = {
  first_list: { message: "Achievement Unlocked: First List Created!", icon: "clipboard-check", color: "#00D4AA" },
  first_receipt: { message: "Achievement Unlocked: First Receipt Scanned!", icon: "receipt", color: "#6366F1" },
  budget_keeper: { message: "Achievement Unlocked: Budget Keeper!", icon: "target", color: "#10B981" },
  savings_starter: { message: "Achievement Unlocked: Savings Starter!", icon: "piggy-bank", color: "#F59E0B" },
  streak_master: { message: "Achievement Unlocked: Streak Master!", icon: "fire", color: "#FF6B35" },
  receipt_pro: { message: "Achievement Unlocked: Receipt Pro!", icon: "star", color: "#FFD700" },
  partner_up: { message: "Achievement Unlocked: Partner Up!", icon: "account-group", color: "#3B82F6" },
};

export interface ToastState {
  visible: boolean;
  message: string;
  icon: string;
  iconColor: string;
}

export function useDelightToast() {
  const [toast, setToast] = useState<ToastState>({
    visible: false,
    message: "",
    icon: "star",
    iconColor: "#00D4AA",
  });
  const actionCountRef = useRef(0);

  const dismiss = useCallback(() => {
    setToast((prev) => ({ ...prev, visible: false }));
  }, []);

  const showToast = useCallback((message: string, icon: string, iconColor: string) => {
    setToast({ visible: true, message, icon, iconColor });
  }, []);

  /**
   * Call on mundane actions (check item, add to list, etc.)
   * Shows a random positive message ~every 8th action
   */
  const onMundaneAction = useCallback(() => {
    actionCountRef.current += 1;
    // Show every 8th action with some randomness
    if (actionCountRef.current % 8 === 0 && Math.random() > 0.3) {
      const msg = DELIGHT_MESSAGES[Math.floor(Math.random() * DELIGHT_MESSAGES.length)];
      showToast(msg.message, msg.icon, msg.color);
    }
  }, [showToast]);

  /**
   * Show achievement unlock toast
   */
  const onAchievementUnlock = useCallback(
    (achievementType: string) => {
      const config = ACHIEVEMENT_MESSAGES[achievementType] || {
        message: "New Achievement Unlocked!",
        icon: "medal",
        color: "#FFD700",
      };
      showToast(config.message, config.icon, config.color);
    },
    [showToast]
  );

  /**
   * Show personal best record toast
   */
  const onNewRecord = useCallback(
    (recordType: string, value: string) => {
      const labels: Record<string, string> = {
        biggestSaving: "Biggest Single-Trip Saving",
        cheapestTrip: "Cheapest Trip Ever",
        mostItemsInTrip: "Most Items in One Trip",
        longestStreak: "Longest Budget Streak",
      };
      const label = labels[recordType] || "New Personal Best";
      showToast(`New Record: ${label} — ${value}!`, "trophy", "#FFD700");
    },
    [showToast]
  );

  return {
    toast,
    dismiss,
    showToast,
    onMundaneAction,
    onAchievementUnlock,
    onNewRecord,
  };
}
