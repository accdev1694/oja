/**
 * AdminErrorBoundary — shared render-error recovery UI for every admin
 * screen. Catches render errors in children and shows a GlassScreen with
 * the error message and a "Try Again" button.
 *
 * Lives in its own file so every admin route (tabs screen + user detail
 * route + any future nested admin routes) can import and reuse it instead
 * of reimplementing the boundary per screen.
 */
import React from "react";
import { View, Text, Pressable } from "react-native";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { GlassScreen, colors, spacing } from "@/components/ui/glass";
import { adminStyles as styles } from "../styles";

interface AdminErrorBoundaryProps {
  children: React.ReactNode;
}

interface AdminErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

export class AdminErrorBoundary extends React.Component<
  AdminErrorBoundaryProps,
  AdminErrorBoundaryState
> {
  constructor(props: AdminErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error) {
    console.error("[AdminScreen] Error:", error.message);
  }

  render() {
    if (this.state.hasError) {
      return (
        <GlassScreen>
          <View style={styles.accessDenied}>
            <MaterialCommunityIcons
              name="alert-octagon"
              size={64}
              color={colors.semantic.danger}
            />
            <Text style={styles.accessTitle}>Something went wrong</Text>
            <Text style={styles.accessSubtext}>{this.state.error?.message}</Text>
            <Pressable
              style={[styles.actionBtn, { marginTop: spacing.lg, paddingHorizontal: 20 }]}
              onPress={() => this.setState({ hasError: false, error: null })}
              accessibilityRole="button"
              accessibilityLabel="Try again"
            >
              <Text style={styles.actionBtnText}>Try Again</Text>
            </Pressable>
          </View>
        </GlassScreen>
      );
    }
    return this.props.children;
  }
}
