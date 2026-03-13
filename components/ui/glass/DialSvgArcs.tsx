/**
 * DialSvgArcs - SVG arc rendering for CircularBudgetDial
 *
 * Renders the outer (planned) and inner (spent) arcs,
 * separator ticks, and curved store name text.
 */

import React from 'react'
import Svg, { Circle, Line, Text as SvgText } from 'react-native-svg'
import Animated, { useAnimatedProps, SharedValue } from 'react-native-reanimated'
import { colors } from '@/lib/design/glassTokens'

const AnimatedCircle = Animated.createAnimatedComponent(Circle)

export function DialSvgArcs({
  size,
  center,
  outerRadius,
  innerRadius,
  outerCircumference,
  innerCircumference,
  strokeWidth,
  startRotation,
  spentColor,
  isPlanning,
  storeName,
  storeArcRadius,
  storeFontSize,
  charAngle,
  animOuterFill,
  animOuterOver,
  animInnerFill,
  animInnerOver,
  animOuterOpacity,
  animInnerOpacity,
}: DialSvgArcsProps) {
  // Separator tick positions
  const outerSepY1 = center + outerRadius - 4
  const outerSepY2 = center + outerRadius + 4
  const innerSepY1 = center + innerRadius - 4
  const innerSepY2 = center + innerRadius + 4

  // Animated props for each arc
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

  const innerTrackProps = useAnimatedProps(() => ({
    opacity: animInnerOpacity.value,
  }))

  return (
    <Svg width={size} height={size}>
      {/* Outer Arc System (planned) */}

      {/* Outer track */}
      <Circle
        cx={center}
        cy={center}
        r={outerRadius}
        stroke="rgba(255, 255, 255, 0.08)"
        strokeWidth={strokeWidth}
        fill="none"
      />
      {/* Outer fill - indigo */}
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
      {/* Outer overflow - red */}
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

      {/* Inner Arc System (spent) */}

      {/* Inner track - only visible when inner arc is active */}
      <AnimatedCircle
        cx={center}
        cy={center}
        r={innerRadius}
        stroke="rgba(255, 255, 255, 0.08)"
        strokeWidth={strokeWidth}
        fill="none"
        animatedProps={innerTrackProps}
      />
      {/* Inner fill - green/amber/red */}
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
      {/* Inner overflow - red */}
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

      {/* Separator ticks at 6 o'clock */}
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

      {/* Store name curved along bottom */}
      {storeName &&
        storeName
          .toUpperCase()
          .split('')
          .map((char: string, i: number, arr: string[]) => {
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
  )
}
