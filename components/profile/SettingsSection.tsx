import { View, Text, StyleSheet } from "react-native";

import {
  GlassCard,
  GlassButton,
  GlassCheckbox,
  AnimatedSection,
  colors,
  typography,
  spacing,
} from "@/components/ui/glass";

export function SettingsSection({
  convexUser,
  updateNotificationSettings,
  updateUser,
  setHintsEnabled,
  handleResetHints,
  hintsRef,
  animationDelay,
}) {
  return (
    <AnimatedSection animation="fadeInDown" duration={400} delay={animationDelay}>
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Settings</Text>
        <GlassCard variant="standard" style={{ padding: spacing.md }}>
          <View style={styles.settingRow}>
            <View style={styles.settingInfo}>
              <Text style={styles.settingTitle}>Enable Notifications</Text>
              <Text style={styles.settingSubtitle}>Master switch for all alerts</Text>
            </View>
            <GlassCheckbox
              checked={convexUser?.preferences?.notifications ?? true}
              onCheckedChange={(val) => updateNotificationSettings({ notifications: val })}
            />
          </View>

          {convexUser?.preferences?.notifications !== false && (
            <>
              <View style={styles.settingDivider} />
              <View style={styles.settingRow}>
                <View style={styles.settingInfo}>
                  <Text style={styles.settingTitle}>Stock Reminders</Text>
                  <Text style={styles.settingSubtitle}>Wed & Fri pantry checks</Text>
                </View>
                <GlassCheckbox
                  checked={convexUser?.preferences?.notificationSettings?.stockReminders ?? true}
                  onCheckedChange={(val) => updateNotificationSettings({ stockReminders: val })}
                />
              </View>

              <View style={styles.settingDivider} />
              <View style={styles.settingRow}>
                <View style={styles.settingInfo}>
                  <Text style={styles.settingTitle}>Nurture Messages</Text>
                  <Text style={styles.settingSubtitle}>Tips to get the most out of Oja</Text>
                </View>
                <GlassCheckbox
                  checked={convexUser?.preferences?.notificationSettings?.nurtureMessages ?? true}
                  onCheckedChange={(val) => updateNotificationSettings({ nurtureMessages: val })}
                />
              </View>

              <View style={styles.settingDivider} />
              <View style={styles.settingRow}>
                <View style={styles.settingInfo}>
                  <Text style={styles.settingTitle}>Quiet Hours (22:00 - 08:00)</Text>
                  <Text style={styles.settingSubtitle}>Pause alerts during the night</Text>
                </View>
                <GlassCheckbox
                  checked={convexUser?.preferences?.notificationSettings?.quietHours?.enabled ?? false}
                  onCheckedChange={(val) => updateNotificationSettings({
                    quietHours: {
                      enabled: val,
                      start: "22:00",
                      end: "08:00"
                    }
                  })}
                />
              </View>
              <View style={styles.settingDivider} />
              <View style={styles.settingRow} ref={hintsRef}>
                <View style={styles.settingInfo}>
                  <Text style={styles.settingTitle}>Tutorial Hints</Text>
                  <Text style={styles.settingSubtitle}>Helpful tips as you use Oja</Text>
                </View>
                <GlassCheckbox
                  checked={convexUser?.showTutorialHints ?? true}
                  onCheckedChange={(val) => {
                    setHintsEnabled(val);
                    updateUser({ showTutorialHints: val });
                  }}
                />
              </View>

              <View style={styles.settingDivider} />
              <View style={styles.settingRow}>
                <View style={styles.settingInfo}>
                  <Text style={styles.settingTitle}>Re-show All Hints</Text>
                  <Text style={styles.settingSubtitle}>Reset progress & see tips again</Text>
                </View>
                <GlassButton
                  variant="secondary"
                  size="sm"
                  onPress={handleResetHints}
                >
                  Reset
                </GlassButton>
              </View>
            </>
          )}
        </GlassCard>
      </View>
    </AnimatedSection>
  );
}

const styles = StyleSheet.create({
  section: {
    marginBottom: spacing.lg,
  },
  sectionTitle: {
    ...typography.labelLarge,
    color: colors.text.secondary,
    marginBottom: spacing.sm,
    marginLeft: spacing.xs,
  },
  settingRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: spacing.md,
  },
  settingInfo: {
    flex: 1,
  },
  settingTitle: {
    ...typography.bodyMedium,
    color: colors.text.primary,
    fontWeight: "600",
  },
  settingSubtitle: {
    ...typography.bodySmall,
    color: colors.text.tertiary,
    marginTop: 2,
  },
  settingDivider: {
    height: 1,
    backgroundColor: colors.glass.border,
    marginVertical: spacing.md,
  },
});
