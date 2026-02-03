import React, { createContext, useCallback, useContext, useState } from "react";
import { StyleSheet, Text, View } from "react-native";
import * as Haptics from "expo-haptics";
import { colors, spacing, typography } from "@/lib/design/glassTokens";
import { GlassButton } from "./GlassButton";
import { GlassModal } from "./GlassModal";

// ── Types ────────────────────────────────────────────────────────────

export interface AlertButton {
  text: string;
  style?: "default" | "cancel" | "destructive";
  onPress?: () => void;
}

export interface AlertConfig {
  title: string;
  message?: string;
  buttons?: AlertButton[];
}

interface AlertContextValue {
  alert: (title: string, message?: string, buttons?: AlertButton[]) => void;
}

// ── Context ──────────────────────────────────────────────────────────

const AlertContext = createContext<AlertContextValue | null>(null);

export function useGlassAlert() {
  const ctx = useContext(AlertContext);
  if (!ctx) {
    throw new Error("useGlassAlert must be used within <GlassAlertProvider>");
  }
  return ctx;
}

// ── Provider ─────────────────────────────────────────────────────────

export function GlassAlertProvider({ children }: { children: React.ReactNode }) {
  const [visible, setVisible] = useState(false);
  const [config, setConfig] = useState<AlertConfig>({ title: "" });

  const alert = useCallback(
    (title: string, message?: string, buttons?: AlertButton[]) => {
      setConfig({ title, message, buttons });
      setVisible(true);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
    },
    []
  );

  const handlePress = useCallback(
    (button?: AlertButton) => {
      setVisible(false);
      // Small delay so the modal dismisses before the callback runs
      if (button?.onPress) {
        setTimeout(button.onPress, 150);
      }
    },
    []
  );

  const buttons = config.buttons?.length
    ? config.buttons
    : [{ text: "OK", style: "default" as const }];

  // Determine layout: if exactly 2 buttons, show them side by side
  const isRow = buttons.length === 2;

  return (
    <AlertContext.Provider value={{ alert }}>
      {children}
      <GlassModal
        visible={visible}
        onClose={() => handlePress()}
        statusBarTranslucent
        maxWidth={320}
        contentStyle={styles.card}
      >
        <Text style={styles.title}>{config.title}</Text>
        {config.message ? (
          <Text style={styles.message}>{config.message}</Text>
        ) : null}

        <View style={[styles.buttonRow, !isRow && styles.buttonCol]}>
          {buttons.map((btn, i) => {
            const isCancel = btn.style === "cancel";
            const isDestructive = btn.style === "destructive";

            return (
              <GlassButton
                key={i}
                variant={
                  isDestructive
                    ? "danger"
                    : isCancel
                      ? "ghost"
                      : "primary"
                }
                size="md"
                onPress={() => handlePress(btn)}
                style={isRow ? styles.rowButton : styles.colButton}
              >
                {btn.text}
              </GlassButton>
            );
          })}
        </View>
      </GlassModal>
    </AlertContext.Provider>
  );
}

// ── Styles ────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  card: {
    gap: spacing.md,
    alignItems: "center",
  },
  title: {
    ...typography.headlineMedium,
    color: colors.text.primary,
    textAlign: "center",
  },
  message: {
    ...typography.bodyMedium,
    color: colors.text.secondary,
    textAlign: "center",
    lineHeight: 20,
  },
  buttonRow: {
    flexDirection: "row",
    gap: spacing.sm,
    marginTop: spacing.sm,
    width: "100%",
  },
  buttonCol: {
    flexDirection: "column",
  },
  rowButton: {
    flex: 1,
  },
  colButton: {
    width: "100%",
  },
});
