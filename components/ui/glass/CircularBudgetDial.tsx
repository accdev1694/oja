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
import Svg, { Circle, Line, Text as SvgText } from 'react-native-svg'
import { MaterialCommunityIcons } from '@expo/vector-icons'
import Animated, {
  useSharedValue,
  useAnimatedProps,
  withTiming,
  Easing,
} from 'react-native-reanimated'
import { colors, typography, spacing } from '@/lib/design/glassTokens'

const AnimatedCircle = Animated.createAnimatedComponent(Circle)

interface CircularBudgetDialProps {
  /** User-set spending limit */
  budget: number
  /** Sum of estimated prices for all items on the list */
  planned: number
  /** Cost of checked-off items (actualPrice || estimatedPrice fallback) */
  spent: number
  /** List status: determines which arc is prominent */
  mode: string
  /** Component outer dimension */
  size?: number
  /** Currency symbol */
  currency?: string
  /** Tap handler (edit budget) */
  onPress?: () => void
  /** Selected store display name */
  storeName?: string
  /** Store brand color */
  storeColor?: string
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
  const isShopping = mode === 'shopping'
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
  const getSpentColor = () => {
    if (budget <= 0) return colors.semantic.success
    const ratio = spent / budget
    if (ratio > 1.0) return colors.semantic.danger
    if (ratio > 0.8) return colors.semantic.warning
    return colors.semantic.success
  }
  const spentColor = getSpentColor()

  // --- Opacity per mode ---
  const outerFillOpacity = isPlanning ? 1.0 : isFinished ? 0.2 : 0.25
  const innerFillOpacity = isPlanning ? 0.0 : isFinished ? 0.7 : 1.0

  // --- Sentiment ---
  const getSentiment = () => {
    if (budget <= 0) return null

    if (isPlanning) {
      const ratio = planned / budget
      if (ratio > 1)
        return `Over budget by ${currency}${(planned - budget).toFixed(2)}`
      if (ratio > 0.8) return 'Tight fit — almost at your limit'
      if (ratio > 0.5) return 'Fits your budget — looking good'
      return 'Fits your budget — lots of room'
    }

    // Shopping / completed / archived
    const ratio = spent / budget
    if (ratio > 1)
      return `Over budget by ${currency}${(spent - budget).toFixed(2)}`
    if (ratio > 0.8) return 'Getting close — nearly there'
    if (ratio > 0.5) return 'On track — stay focused'
    return 'On track — doing well'
  }
  const sentiment = getSentiment()
  const sentimentColor = (isPlanning ? isPlannedOver : isOverBudget)
    ? colors.semantic.danger
    : isPlanning
      ? colors.accent.secondary
      : spentColor

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

  // --- Animated props for each arc ---
  const outerFillProps = useAnimatedProps(() => ({
    strokeDashoffset:
      outerCircumference - outerCircumference * animOuterFill.value,
    opacity: animOuterOpacity.value,
  }))

  const outerOverProps = useAnimatedProps(() => ({
    strokeDashoffset:
      outerCircumference - outerCircumference * animOuterOver.value,
    opacity: animOuterOpacity.value,
  }))

  const innerFillProps = useAnimatedProps(() => ({
    strokeDashoffset:
      innerCircumference - innerCircumference * animInnerFill.value,
    opacity: animInnerOpacity.value,
  }))

  const innerOverProps = useAnimatedProps(() => ({
    strokeDashoffset:
      innerCircumference - innerCircumference * animInnerOver.value,
    opacity: animInnerOpacity.value,
  }))

  // --- Separator tick positions ---
  const outerSepY1 = center + outerRadius - 4
  const outerSepY2 = center + outerRadius + 4
  const innerSepY1 = center + innerRadius - 4
  const innerSepY2 = center + innerRadius + 4

  const Wrapper = onPress ? Pressable : View

  return (
    <Wrapper
      onPress={onPress}
      style={[styles.container, { marginBottom: spacing.md }]}
    >
      <View style={{ width: size, height: size }}>
        <Svg width={size} height={size}>
          {/* ── Outer Arc System (planned) ── */}

          {/* Outer track */}
          <Circle
            cx={center}
            cy={center}
            r={outerRadius}
            stroke="rgba(255, 255, 255, 0.08)"
            strokeWidth={strokeWidth}
            fill="none"
          />
          {/* Outer fill — indigo */}
          <AnimatedCircle
            cx={center}
            cy={center}
            r={outerRadius}
            stroke={colors.accent.secondary}
            strokeWidth={strokeWidth}
            fill="none"
            strokeDasharray={`${outerCircumference} ${outerCircumference}`}
            strokeLinecap="round"
            rotation={startRotation}
            origin={`${center}, ${center}`}
            animatedProps={outerFillProps}
          />
          {/* Outer overflow — red */}
          <AnimatedCircle
            cx={center}
            cy={center}
            r={outerRadius}
            stroke={colors.semantic.danger}
            strokeWidth={strokeWidth}
            fill="none"
            strokeDasharray={`${outerCircumference} ${outerCircumference}`}
            strokeLinecap="round"
            rotation={startRotation}
            origin={`${center}, ${center}`}
            animatedProps={outerOverProps}
          />

          {/* ── Inner Arc System (spent) ── */}

          {/* Inner track — only visible when inner arc is active */}
          <AnimatedCircle
            cx={center}
            cy={center}
            r={innerRadius}
            stroke="rgba(255, 255, 255, 0.08)"
            strokeWidth={strokeWidth}
            fill="none"
            animatedProps={useAnimatedProps(() => ({
              opacity: animInnerOpacity.value,
            }))}
          />
          {/* Inner fill — green/amber/red */}
          <AnimatedCircle
            cx={center}
            cy={center}
            r={innerRadius}
            stroke={spentColor}
            strokeWidth={strokeWidth}
            fill="none"
            strokeDasharray={`${innerCircumference} ${innerCircumference}`}
            strokeLinecap="round"
            rotation={startRotation}
            origin={`${center}, ${center}`}
            animatedProps={innerFillProps}
          />
          {/* Inner overflow — red */}
          <AnimatedCircle
            cx={center}
            cy={center}
            r={innerRadius}
            stroke={colors.semantic.danger}
            strokeWidth={strokeWidth}
            fill="none"
            strokeDasharray={`${innerCircumference} ${innerCircumference}`}
            strokeLinecap="round"
            rotation={startRotation}
            origin={`${center}, ${center}`}
            animatedProps={innerOverProps}
          />

          {/* ── Separator ticks at 6 o'clock ── */}
          <Line
            x1={center}
            y1={outerSepY1}
            x2={center}
            y2={outerSepY2}
            stroke="rgba(255, 255, 255, 0.25)"
            strokeWidth={1.5}
            strokeLinecap="round"
          />
          {!isPlanning && (
            <Line
              x1={center}
              y1={innerSepY1}
              x2={center}
              y2={innerSepY2}
              stroke="rgba(255, 255, 255, 0.25)"
              strokeWidth={1.5}
              strokeLinecap="round"
            />
          )}
          {/* ── Store name curved along bottom ── */}
          {storeName &&
            storeName
              .toUpperCase()
              .split('')
              .map((char, i, arr) => {
                const totalAngle = (arr.length - 1) * charAngle
                const angle = Math.PI / 2 + totalAngle / 2 - i * charAngle
                const cx2 = center + storeArcRadius * Math.cos(angle)
                const cy2 = center + storeArcRadius * Math.sin(angle)
                const deg = (angle * 180) / Math.PI - 90
                return (
                  <SvgText
                    key={`${char}-${i}`}
                    x={cx2}
                    y={cy2}
                    fill={colors.semantic.fire}
                    fontSize={storeFontSize}
                    fontWeight="700"
                    textAnchor="middle"
                    alignmentBaseline="middle"
                    rotation={deg}
                    origin={`${cx2},${cy2}`}
                  >
                    {char}
                  </SvgText>
                )
              })}
        </Svg>

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
      </View>
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
