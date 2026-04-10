/**
 * Admin user detail route — /admin/users/{id}
 *
 * Thin route wrapper. The error boundary and toast provider live in the
 * admin stack's `_layout.tsx` and wrap this route automatically, so all
 * this file does is read the param and hand it to UserDetailScreen.
 */
import React from "react";
import { View, Text } from "react-native";
import { useLocalSearchParams } from "expo-router";

import { GlassScreen, SimpleHeader, colors, spacing, typography } from "@/components/ui/glass";
import { UserDetailScreen } from "../components/UserDetailScreen";

export default function AdminUserDetailRoute() {
  const { id } = useLocalSearchParams<{ id: string }>();

  if (!id) {
    return (
      <GlassScreen>
        <SimpleHeader title="User Detail" showBack includeSafeArea />
        <View
          style={{
            flex: 1,
            alignItems: "center",
            justifyContent: "center",
            padding: spacing.xl,
          }}
        >
          <Text
            style={{
              ...typography.bodyLarge,
              color: colors.text.secondary,
              textAlign: "center",
            }}
          >
            No user ID provided.
          </Text>
        </View>
      </GlassScreen>
    );
  }

  return <UserDetailScreen userId={id} />;
}
