/**
 * useDelightToast - Surprise & delight random positive messages
 * + Achievement unlock toast
 * + Personal best record detection
 */
import { useState, useCallback, useRef } from "react";

import { useCurrentUser } from "@/hooks/useCurrentUser";

function delightMessages(name?: string) {
  const n = name ? `${name}, you're` : "You're";
  const n2 = name ? `${name}, look` : "Look";
  return [
    { message: `${n} a budgeting superstar!`, icon: "star-shooting", color: "#FFD700" },
    { message: name ? `${name}, smart shopping pays off!` : "Smart shopping pays off!", icon: "lightbulb-on", color: "#00D4AA" },
    { message: name ? `${name}, every penny counts. Nice work!` : "Every penny counts. Nice work!", icon: "piggy-bank", color: "#10B981" },
    { message: `${n2} at you, staying on track!`, icon: "run-fast", color: "#6366F1" },
    { message: name ? `${name}, your future self thanks you!` : "Your future self thanks you!", icon: "heart", color: "#FF6B6B" },
    { message: name ? `${name}, budget boss mode: activated!` : "Budget boss mode: activated!", icon: "shield-check", color: "#00D4AA" },
    { message: name ? `${name}, consistency is your superpower!` : "Consistency is your superpower!", icon: "lightning-bolt", color: "#F59E0B" },
    { message: name ? `${name}, shopping goals? Smashed!` : "Shopping goals? Smashed!", icon: "arm-flex", color: "#3B82F6" },
  ];
}

function achievementMessages(name?: string) {
  const prefix = name ? `${name}, you've unlocked` : "Achievement Unlocked:";
  return {
    first_list: { message: `${prefix} First List Created!`, icon: "clipboard-check", color: "#00D4AA" },
    first_receipt: { message: `${prefix} First Receipt Scanned!`, icon: "receipt", color: "#6366F1" },
    budget_keeper: { message: `${prefix} Budget Keeper!`, icon: "target", color: "#10B981" },
    savings_starter: { message: `${prefix} Savings Starter!`, icon: "piggy-bank", color: "#F59E0B" },
    streak_master: { message: `${prefix} Streak Master!`, icon: "fire", color: "#FF6B35" },
    receipt_pro: { message: `${prefix} Receipt Pro!`, icon: "star", color: "#FFD700" },
    partner_up: { message: `${prefix} Partner Up!`, icon: "account-group", color: "#3B82F6" },
  } as Record<string, { message: string; icon: string; color: string }>;
}

export interface ToastState {
  visible: boolean;
  message: string;
  icon: string;
  iconColor: string;
}

export function useDelightToast() {
  const { firstName } = useCurrentUser();
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
      const messages = delightMessages(firstName);
      const msg = messages[Math.floor(Math.random() * messages.length)];
      showToast(msg.message, msg.icon, msg.color);
    }
  }, [showToast, firstName]);

  /**
   * Show achievement unlock toast
   */
  const onAchievementUnlock = useCallback(
    (achievementType: string) => {
      const messages = achievementMessages(firstName);
      const config = messages[achievementType] || {
        message: firstName ? `${firstName}, new achievement unlocked!` : "New Achievement Unlocked!",
        icon: "medal",
        color: "#FFD700",
      };
      showToast(config.message, config.icon, config.color);
    },
    [showToast, firstName]
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
      const prefix = firstName ? `${firstName}, new record` : "New Record";
      showToast(`${prefix}: ${label} — ${value}!`, "trophy", "#FFD700");
    },
    [showToast, firstName]
  );

  /**
   * Show points earned celebration toast
   */
  const onPointsEarned = useCallback(
    (points: number, streakBonus?: number) => {
      const total = points + (streakBonus || 0);
      const bonusSuffix = streakBonus ? ` (+${streakBonus} streak bonus!)` : "";
      const msg = firstName
        ? `${firstName}, you earned +${total} points!${bonusSuffix}`
        : `+${total} points earned!${bonusSuffix}`;
      showToast(msg, "star-circle", "#00D4AA");
    },
    [showToast, firstName]
  );

  /**
   * Show savings milestone celebration
   * Milestones: £10, £25, £50, £100, £250, £500
   */
  const onSavingsMilestone = useCallback(
    (totalSaved: number) => {
      const milestones = [500, 250, 100, 50, 25, 10];
      for (const m of milestones) {
        if (totalSaved >= m) {
          const cheer = m >= 100 ? "Incredible!" : m >= 50 ? "Amazing progress!" : "Keep going!";
          const msg = firstName
            ? `${firstName}, you've saved £${m}! ${cheer}`
            : `Milestone: £${m} saved! ${cheer}`;
          showToast(msg, "trophy", "#FFD700");
          return true;
        }
      }
      return false;
    },
    [showToast, firstName]
  );

  return {
    toast,
    dismiss,
    showToast,
    onMundaneAction,
    onAchievementUnlock,
    onNewRecord,
    onPointsEarned,
    onSavingsMilestone,
  };
}
