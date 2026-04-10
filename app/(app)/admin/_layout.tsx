/**
 * Admin stack layout.
 *
 * Every admin route (tabs screen at /admin, user detail at /admin/users/[id],
 * and any future nested admin screen) shares the same error boundary and
 * toast provider. Centralizing them here means individual routes don't need
 * to wrap themselves — they just render their content.
 *
 * The Stack uses `headerShown: false` because each route renders its own
 * SimpleHeader (so that header styling matches the rest of the app), and
 * `animation: "default"` so push/pop between the list and detail feels
 * native.
 */
import React from "react";
import { Stack } from "expo-router";

import { colors } from "@/components/ui/glass";

import { AdminErrorBoundary } from "./components/AdminErrorBoundary";
import { ToastProvider } from "./components/ToastProvider";

export default function AdminLayout() {
  return (
    <AdminErrorBoundary>
      <ToastProvider>
        <Stack
          screenOptions={{
            headerShown: false,
            contentStyle: { backgroundColor: colors.background.primary },
          }}
        />
      </ToastProvider>
    </AdminErrorBoundary>
  );
}
