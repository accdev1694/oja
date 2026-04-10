/**
 * ExpandableSearchHeader
 *
 * Renders the pantry page's bottom-row subtitle alongside a collapsible
 * search pill. Tapping the magnify icon morphs the 36×36 icon into a
 * full-width search input that swallows the subtitle text. Tapping the
 * close icon contracts it back and clears the query.
 *
 * Mounted into <SimpleHeader subtitleElement={...} /> so the pill's right
 * edge lands 8px (bottomRow gap) to the left of the first rightElement
 * icon (cash-sync), matching the "right next to the refresh prices icon"
 * spec.
 */

import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  TextInput,
  Pressable,
  StyleSheet,
  View,
  useWindowDimensions,
} from "react-native";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import Animated, {
  FadeIn,
  FadeOut,
  Easing,
  useSharedValue,
  useAnimatedStyle,
  withTiming,
} from "react-native-reanimated";
import * as Haptics from "expo-haptics";

import {
  colors,
  typography,
  spacing,
  borderRadius,
} from "@/components/ui/glass";

// Width budget for SimpleHeader's rightElement (StockHeaderButtons):
//   3 icons × 36 + 2 gaps × spacing.sm = 124 on current tokens.
const RIGHT_ELEMENT_WIDTH = 124;
const HEADER_HORIZONTAL_PADDING = spacing.xl * 2;
const BOTTOM_ROW_GAP = spacing.sm;
const COLLAPSED_SIZE = 36;
const EXPAND_DURATION = 280;
const CONTRACT_DURATION = 260;

interface ExpandableSearchHeaderProps {
  subtitle: string;
  searchQuery: string;
  onSearchChange: (text: string) => void;
  placeholder?: string;
}

export const ExpandableSearchHeader = React.memo(function ExpandableSearchHeader({
  subtitle,
  searchQuery,
  onSearchChange,
  placeholder = "Search stock...",
}: ExpandableSearchHeaderProps) {
  const { width: windowWidth } = useWindowDimensions();
  const wrapperWidth = Math.max(
    COLLAPSED_SIZE,
    windowWidth - HEADER_HORIZONTAL_PADDING - BOTTOM_ROW_GAP - RIGHT_ELEMENT_WIDTH,
  );

  // Start expanded if the parent already has a non-empty query. Without this,
  // a parent re-mount (e.g. tab switch back to Stock) while `searchQuery` is
  // still set would hide the search UI but leave the list filtered — a
  // confusing state desync.
  const [isExpanded, setIsExpanded] = useState(() => searchQuery.length > 0);
  // When the component re-mounts with a pre-populated query (e.g. after a
  // tab switch back to Stock), initialize the pill at full width so the user
  // doesn't see it flash open.
  const widthSV = useSharedValue(searchQuery.length > 0 ? wrapperWidth : COLLAPSED_SIZE);
  const subtitleOpacitySV = useSharedValue(searchQuery.length > 0 ? 0 : 1);
  const inputRef = useRef<TextInput>(null);
  const focusTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Keep the expanded pill width in sync when the window resizes (e.g. device
  // rotation). Without this, the shared value stays at whatever pixel target
  // the last `withTiming` captured and the pill visibly clips after rotation.
  useEffect(() => {
    if (isExpanded) {
      widthSV.value = withTiming(wrapperWidth, {
        duration: 200,
        easing: Easing.out(Easing.cubic),
      });
    }
  }, [isExpanded, wrapperWidth, widthSV]);

  // Cleanup: cancel any pending focus timer on unmount so we never call
  // `.focus()` on a ref whose owner has gone away.
  useEffect(
    () => () => {
      if (focusTimerRef.current) {
        clearTimeout(focusTimerRef.current);
        focusTimerRef.current = null;
      }
    },
    [],
  );

  const toggle = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    if (isExpanded) {
      // Cancel any pending focus timer from a rapid expand→collapse tap so it
      // doesn't fire on an unmounted TextInput.
      if (focusTimerRef.current) {
        clearTimeout(focusTimerRef.current);
        focusTimerRef.current = null;
      }
      widthSV.value = withTiming(COLLAPSED_SIZE, {
        duration: CONTRACT_DURATION,
        easing: Easing.inOut(Easing.cubic),
      });
      subtitleOpacitySV.value = withTiming(1, { duration: 200 });
      onSearchChange("");
      inputRef.current?.blur();
      setIsExpanded(false);
    } else {
      widthSV.value = withTiming(wrapperWidth, {
        duration: EXPAND_DURATION,
        easing: Easing.out(Easing.cubic),
      });
      subtitleOpacitySV.value = withTiming(0, { duration: 160 });
      setIsExpanded(true);
      // Android occasionally drops `autoFocus` when the TextInput mounts
      // inside an animated container — force focus as a safety net. Clear
      // any pre-existing timer first in case of a rapid double-tap race.
      if (focusTimerRef.current) {
        clearTimeout(focusTimerRef.current);
      }
      focusTimerRef.current = setTimeout(() => {
        inputRef.current?.focus();
        focusTimerRef.current = null;
      }, 150);
    }
  }, [isExpanded, wrapperWidth, onSearchChange, widthSV, subtitleOpacitySV]);

  const pillAnimatedStyle = useAnimatedStyle(() => ({
    width: widthSV.value,
  }));

  const subtitleAnimatedStyle = useAnimatedStyle(() => ({
    opacity: subtitleOpacitySV.value,
  }));

  return (
    <View style={[styles.wrapper, { width: wrapperWidth }]}>
      <Animated.Text
        style={[styles.subtitle, subtitleAnimatedStyle]}
        numberOfLines={1}
        adjustsFontSizeToFit
        minimumFontScale={0.85}
        pointerEvents="none"
      >
        {subtitle}
      </Animated.Text>

      <Animated.View style={[styles.pill, pillAnimatedStyle]}>
        {isExpanded && (
          <Animated.View
            entering={FadeIn.duration(180).delay(120)}
            exiting={FadeOut.duration(100)}
            style={styles.inputWrapper}
          >
            <TextInput
              ref={inputRef}
              value={searchQuery}
              onChangeText={onSearchChange}
              placeholder={placeholder}
              placeholderTextColor={colors.text.tertiary}
              autoFocus
              returnKeyType="search"
              style={styles.input}
              accessibilityLabel="Search input"
            />
          </Animated.View>
        )}
        <Pressable
          onPress={toggle}
          hitSlop={8}
          style={styles.iconButton}
          accessibilityRole="button"
          accessibilityLabel={isExpanded ? "Close search" : "Search pantry"}
        >
          {isExpanded ? (
            <Animated.View
              key="close-icon"
              entering={FadeIn.duration(140)}
              exiting={FadeOut.duration(100)}
            >
              <MaterialCommunityIcons
                name="close"
                size={20}
                color={colors.accent.primary}
              />
            </Animated.View>
          ) : (
            <Animated.View
              key="magnify-icon"
              entering={FadeIn.duration(140)}
              exiting={FadeOut.duration(100)}
            >
              <MaterialCommunityIcons
                name="magnify"
                size={20}
                color={colors.accent.primary}
              />
            </Animated.View>
          )}
        </Pressable>
      </Animated.View>
    </View>
  );
});

const styles = StyleSheet.create({
  wrapper: {
    height: COLLAPSED_SIZE,
    position: "relative",
    justifyContent: "center",
  },
  subtitle: {
    ...typography.bodyMedium,
    fontSize: 12,
    lineHeight: 16,
    color: colors.text.secondary,
    position: "absolute",
    left: 0,
    // Reserve horizontal space for the collapsed pill (36px) plus gap so
    // the subtitle text never overlaps the tap target.
    right: COLLAPSED_SIZE + spacing.sm,
  },
  pill: {
    position: "absolute",
    right: 0,
    top: 0,
    height: COLLAPSED_SIZE,
    borderRadius: borderRadius.full,
    backgroundColor: `${colors.accent.primary}20`,
    borderWidth: 1,
    borderColor: `${colors.accent.primary}40`,
    flexDirection: "row",
    alignItems: "center",
    overflow: "hidden",
  },
  inputWrapper: {
    flex: 1,
    paddingLeft: spacing.md,
  },
  input: {
    ...typography.bodyMedium,
    fontSize: 14,
    color: colors.text.primary,
    height: COLLAPSED_SIZE,
    padding: 0,
    margin: 0,
    // Android-only: removes the extra intrinsic font padding that would
    // otherwise vertically offset the text inside the 36px pill. No-op on iOS.
    includeFontPadding: false,
  },
  iconButton: {
    width: COLLAPSED_SIZE,
    height: COLLAPSED_SIZE,
    alignItems: "center",
    justifyContent: "center",
  },
});
