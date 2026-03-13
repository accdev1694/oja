/**
 * CircularBudgetDial - Two-arc SVG budget dial (200px default)
 *
 * Outer arc (indigo): planned total vs budget — prominent in planning mode
 * Inner arc (green→amber→red): actual spent vs budget — prominent in shopping mode
 *
 * Both arcs start at 6 o'clock and fill clockwise.
 * Over-budget: red overflow arc continues past 6 o'clock.
 */

import React, { useEffect } from 'react'
import { View, Text, StyleSheet, Pressable } from 'react-native'
import { MaterialCommunityIcons } from '@expo/vector-icons'
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withSequence,
  Easing,
} from 'react-native-reanimated'
import { colors, typography, spacing } from '@/lib/design/glassTokens'
import { DialSvgArcs } from './DialSvgArcs'

interface CircularBudgetDialProps {
  budget: number
  planned: number
  spent: number
  mode: string
  size?: number
  currency?: string
  onPress?: () => void
  storeName?: string
  storeColor?: string
  transitioning?: boolean
}

export function CircularBudgetDial({
  budget,
  planned,
  spent,
  mode,
  size = 200,
  currency = '£',
  onPress,
  storeName,
  storeColor,
  transitioning,
}: CircularBudgetDialProps) {
  const strokeWidth = 10
  const center = size / 2
  const outerRadius = (size - strokeWidth) / 2
  const innerRadius = outerRadius - strokeWidth - 4 // 4px gap between arcs

  const outerCircumference = 2 * Math.PI * outerRadius
  const innerCircumference = 2 * Math.PI * innerRadius

  // --- Curved store name: radius sits inside the inner arc ring ---
  const storeArcRadius = innerRadius - strokeWidth - 4
  const storeFontSize = size * 0.075
  // Angular width per character: approximate glyph width / arc radius
  const charAngle = (storeFontSize * 0.74) / storeArcRadius

  // Start at 6 o'clock (bottom) — SVG default is 3 o'clock, so rotate 90°
  const startRotation = 90

  const isPlanning = mode === 'active'
  const isFinished = mode === 'completed' || mode === 'archived'

  // "Left" is always relative to budget (the financial constraint)
  // In planning: over = planned > budget. In shopping: over = spent > budget.
  const remaining = budget - spent
  const isOverBudget = spent > budget
  const isPlannedOver = planned > budget

  // --- Arc ratios ---
  const plannedFillRatio = budget > 0 ? Math.min(planned / budget, 1) : 0
  const plannedOverRatio =
    budget > 0 ? Math.min(Math.max((planned - budget) / budget, 0), 1) : 0
  const spentFillRatio = budget > 0 ? Math.min(spent / budget, 1) : 0
  const spentOverRatio =
    budget > 0 ? Math.min(Math.max((spent - budget) / budget, 0), 1) : 0

  // --- Spent arc color (dynamic by ratio) ---
  const spentRatioForColor = budget > 0 ? spent / budget : 0
  const spentColor = spentRatioForColor > 1.0
    ? colors.semantic.danger
    : spentRatioForColor > 0.8
      ? colors.semantic.warning
      : colors.semantic.success

  // --- Opacity ---
  const outerFillOpacity = isFinished ? 0.3 : 0.5
  const innerFillOpacity = 1.0

  // --- Sentiment (unified - always based on spent vs budget) ---
  const getSentiment = () => {
    if (budget <= 0) return null
    const spentRatio = spent / budget
    const plannedRatio = planned / budget
    if (spentRatio > 1) return `Over budget by ${currency}${(spent - budget).toFixed(2)}`
    if (spent === 0 && plannedRatio > 1) return `Planned exceeds budget by ${currency}${(planned - budget).toFixed(2)}`
    if (spentRatio > 0.8) return 'Getting close — nearly there'
    if (spentRatio > 0.5) return 'On track — stay focused'
    if (spent > 0) return 'On track — doing well'
    if (plannedRatio > 0.8) return 'Tight fit — almost at your limit'
    if (plannedRatio > 0.5) return 'Fits your budget — looking good'
    return 'Fits your budget — lots of room'
  }
  const sentiment = getSentiment()
  const sentimentColor = isOverBudget
    ? colors.semantic.danger
    : spent > 0
      ? spentColor
      : isPlannedOver
        ? colors.semantic.danger
        : colors.accent.secondary

  // --- Remaining label color (always budget - spent) ---
  const remainingColor = isOverBudget
    ? colors.semantic.danger
    : colors.semantic.success

  // --- Planning "left" for the planned-vs-budget view ---
  const plannedRemaining = budget - planned
  const plannedRemainingColor = isPlannedOver
    ? colors.semantic.danger
    : colors.semantic.success

  // --- Animation config ---
  const arcConfig = { duration: 800, easing: Easing.out(Easing.cubic) }
  const opacityConfig = { duration: 400, easing: Easing.out(Easing.cubic) }

  // --- Shared values ---
  const animOuterFill = useSharedValue(0)
  const animOuterOver = useSharedValue(0)
  const animInnerFill = useSharedValue(0)
  const animInnerOver = useSharedValue(0)
  const animOuterOpacity = useSharedValue(1)
  const animInnerOpacity = useSharedValue(0)
  const transitionScale = useSharedValue(1)

  useEffect(() => {
    animOuterFill.value = withTiming(plannedFillRatio, arcConfig)
    animOuterOver.value = withTiming(plannedOverRatio, arcConfig)
    animInnerFill.value = withTiming(spentFillRatio, arcConfig)
    animInnerOver.value = withTiming(spentOverRatio, arcConfig)
    animOuterOpacity.value = withTiming(outerFillOpacity, opacityConfig)
    animInnerOpacity.value = withTiming(innerFillOpacity, opacityConfig)
  }, [
    plannedFillRatio,
    plannedOverRatio,
    spentFillRatio,
    spentOverRatio,
    outerFillOpacity,
    innerFillOpacity,
  ])

  // --- Transition entrance animation ---
  useEffect(() => {
    if (transitioning) {
      transitionScale.value = withSequence(
        withTiming(1.05, { duration: 300, easing: Easing.out(Easing.cubic) }),
        withTiming(1.0, { duration: 300, easing: Easing.inOut(Easing.cubic) })
      )
    }
  }, [transitioning])

  const transitionAnimStyle = useAnimatedStyle(() => ({
    transform: [{ scale: transitionScale.value }],
  }))

  const Wrapper = onPress ? Pressable : View

  return (
    <Wrapper
      onPress={onPress}
      style={[styles.container, { marginBottom: spacing.md }]}
    >
      <Animated.View style={[{ width: size, height: size }, transitionAnimStyle]}>
        <DialSvgArcs
          size={size}
          center={center}
          outerRadius={outerRadius}
          innerRadius={innerRadius}
          outerCircumference={outerCircumference}
          innerCircumference={innerCircumference}
          strokeWidth={strokeWidth}
          startRotation={startRotation}
          spentColor={spentColor}
          isPlanning={isPlanning}
          storeName={storeName}
          storeArcRadius={storeArcRadius}
          storeFontSize={storeFontSize}
          charAngle={charAngle}
          animOuterFill={animOuterFill}
          animOuterOver={animOuterOver}
          animInnerFill={animInnerFill}
          animInnerOver={animInnerOver}
          animOuterOpacity={animOuterOpacity}
          animInnerOpacity={animInnerOpacity}
        />

        {/* Pencil badge – top-left inside the dial */}
        {onPress && (
          <View
            style={[styles.editBadge, { top: size * 0.08, right: size * 0.16 }]}
          >
            <MaterialCommunityIcons
              name="pencil"
              size={14}
              color={colors.text.secondary}
            />
          </View>
        )}

        {/* Center text overlay */}
        <View style={[styles.centerText, { width: size, height: size }]}>
          {/* Budget label + amount */}
          <Text style={styles.budgetLabel}>Edit Budget</Text>
          <Text
            style={styles.budgetAmount}
            numberOfLines={1}
            adjustsFontSizeToFit
          >
            {currency}
            {budget.toFixed(2)}
          </Text>

          {isPlanning ? (
            <>
              {/* Planning: planned + left (relative to budget) */}
              <Text
                style={[styles.metricLabel, { color: colors.accent.secondary }]}
              >
                {currency}
                {planned.toFixed(2)} planned
              </Text>
              <Text
                style={[
                  styles.remainingLabel,
                  { color: plannedRemainingColor },
                ]}
              >
                {isPlannedOver
                  ? `${currency}${Math.abs(plannedRemaining).toFixed(2)} over`
                  : `${currency}${plannedRemaining.toFixed(2)} left`}
              </Text>
            </>
          ) : (
            <>
              {/* Shopping: planned (dim reference) + spent (active) + left */}
              <Text
                style={[styles.plannedRef, { color: colors.accent.secondary }]}
              >
                {currency}
                {planned.toFixed(2)} planned
              </Text>
              <Text style={[styles.metricLabel, { color: spentColor }]}>
                {currency}
                {spent.toFixed(2)} spent
              </Text>
              <Text style={[styles.remainingLabel, { color: remainingColor }]}>
                {isOverBudget
                  ? `${currency}${Math.abs(remaining).toFixed(2)} over`
                  : `${currency}${remaining.toFixed(2)} left`}
              </Text>
            </>
          )}
        </View>
      </Animated.View>
      {sentiment && (
        <Text style={[styles.sentiment, { color: sentimentColor }]}>
          {sentiment}
        </Text>
      )}
    </Wrapper>
  )
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
  },
  centerText: {
    position: 'absolute',
    top: 0,
    left: 0,
    justifyContent: 'center',
    alignItems: 'center',
    paddingBottom: 20,
  },
  budgetLabel: {
    fontSize: 9,
    fontWeight: '500',
    color: colors.text.tertiary,
    letterSpacing: 0.5,
    textTransform: 'uppercase',
    marginBottom: 4,
  },
  budgetAmount: {
    ...typography.numberMedium,
    color: colors.text.primary,
    fontWeight: '700',
  },
  plannedRef: {
    fontSize: 11,
    fontWeight: '500',
    lineHeight: 15,
    letterSpacing: 0.3,
    marginTop: 2,
    opacity: 0.7,
  },
  metricLabel: {
    fontSize: 13,
    fontWeight: '600',
    lineHeight: 18,
    letterSpacing: 0.3,
    marginTop: 1,
  },
  remainingLabel: {
    fontSize: 13,
    fontWeight: '600',
    lineHeight: 18,
    letterSpacing: 0.3,
    marginTop: 1,
  },
  sentiment: {
    ...typography.labelSmall,
    marginTop: spacing.sm,
    opacity: 0.85,
  },
  editBadge: {
    position: 'absolute',
    backgroundColor: 'rgba(255, 255, 255, 0.12)',
    borderRadius: 12,
    width: 24,
    height: 24,
    justifyContent: 'center',
    alignItems: 'center',
  },
})
