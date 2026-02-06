import 'package:flutter/physics.dart';

/// Oja Glass Design System - Animation Tokens
/// Ported from React Native Reanimated spring configs
abstract class OjaAnimations {
  // Durations (milliseconds)
  static const int instantMs = 100;
  static const int fastMs = 200;
  static const int normalMs = 300;
  static const int slowMs = 500;
  static const int celebrationMs = 600;

  // Durations (Duration objects)
  static const Duration instant = Duration(milliseconds: instantMs);
  static const Duration fast = Duration(milliseconds: fastMs);
  static const Duration normal = Duration(milliseconds: normalMs);
  static const Duration slow = Duration(milliseconds: slowMs);
  static const Duration celebration = Duration(milliseconds: celebrationMs);

  // Spring configurations for flutter_animate / physics
  static SpringDescription get gentleSpring => const SpringDescription(
        mass: 1.0,
        stiffness: 100,
        damping: 15,
      );

  static SpringDescription get bouncySpring => const SpringDescription(
        mass: 1.0,
        stiffness: 180,
        damping: 12,
      );

  static SpringDescription get snappySpring => const SpringDescription(
        mass: 1.0,
        stiffness: 400,
        damping: 30,
      );

  static SpringDescription get softSpring => const SpringDescription(
        mass: 1.0,
        stiffness: 80,
        damping: 20,
      );

  // Curves
  static const Curve defaultCurve = Curves.easeOutCubic;
  static const Curve enterCurve = Curves.easeOut;
  static const Curve exitCurve = Curves.easeIn;
  static const Curve emphasizedCurve = Curves.easeInOutCubic;
  static const Curve bounceCurve = Curves.elasticOut;

  // Stagger delays for list animations
  static const int staggerDelayMs = 50;
  static Duration staggerDelay(int index) =>
      Duration(milliseconds: staggerDelayMs * index);

  // Success check animation timing
  static const Duration successCheckDelay = Duration(milliseconds: 100);
  static const Duration successCheckDuration = celebration;

  // Haptic feedback delays
  static const Duration hapticDelay = Duration(milliseconds: 10);
}
