import 'package:flutter/material.dart';
import 'colors.dart';

/// Oja Glass Design System - Typography Tokens
/// Ported from React Native glassTokens.ts
abstract class OjaTypography {
  static const String fontFamily = 'Inter';

  // Font weights
  static const FontWeight regular = FontWeight.w400;
  static const FontWeight medium = FontWeight.w500;
  static const FontWeight semiBold = FontWeight.w600;
  static const FontWeight bold = FontWeight.w700;

  // Display styles (large headers)
  static TextStyle get displayLarge => const TextStyle(
        fontFamily: fontFamily,
        fontSize: 32,
        fontWeight: bold,
        height: 1.2,
        color: OjaColors.textPrimary,
        letterSpacing: -0.5,
      );

  static TextStyle get displayMedium => const TextStyle(
        fontFamily: fontFamily,
        fontSize: 28,
        fontWeight: bold,
        height: 1.25,
        color: OjaColors.textPrimary,
        letterSpacing: -0.3,
      );

  static TextStyle get displaySmall => const TextStyle(
        fontFamily: fontFamily,
        fontSize: 24,
        fontWeight: semiBold,
        height: 1.3,
        color: OjaColors.textPrimary,
      );

  // Headline styles
  static TextStyle get headlineLarge => const TextStyle(
        fontFamily: fontFamily,
        fontSize: 22,
        fontWeight: semiBold,
        height: 1.3,
        color: OjaColors.textPrimary,
      );

  static TextStyle get headlineMedium => const TextStyle(
        fontFamily: fontFamily,
        fontSize: 20,
        fontWeight: semiBold,
        height: 1.35,
        color: OjaColors.textPrimary,
      );

  static TextStyle get headlineSmall => const TextStyle(
        fontFamily: fontFamily,
        fontSize: 18,
        fontWeight: semiBold,
        height: 1.4,
        color: OjaColors.textPrimary,
      );

  // Title styles
  static TextStyle get titleLarge => const TextStyle(
        fontFamily: fontFamily,
        fontSize: 16,
        fontWeight: semiBold,
        height: 1.4,
        color: OjaColors.textPrimary,
      );

  static TextStyle get titleMedium => const TextStyle(
        fontFamily: fontFamily,
        fontSize: 15,
        fontWeight: medium,
        height: 1.45,
        color: OjaColors.textPrimary,
      );

  static TextStyle get titleSmall => const TextStyle(
        fontFamily: fontFamily,
        fontSize: 14,
        fontWeight: medium,
        height: 1.45,
        color: OjaColors.textPrimary,
      );

  // Body styles
  static TextStyle get bodyLarge => const TextStyle(
        fontFamily: fontFamily,
        fontSize: 16,
        fontWeight: regular,
        height: 1.5,
        color: OjaColors.textPrimary,
      );

  static TextStyle get bodyMedium => const TextStyle(
        fontFamily: fontFamily,
        fontSize: 14,
        fontWeight: regular,
        height: 1.5,
        color: OjaColors.textPrimary,
      );

  static TextStyle get bodySmall => const TextStyle(
        fontFamily: fontFamily,
        fontSize: 13,
        fontWeight: regular,
        height: 1.5,
        color: OjaColors.textSecondary,
      );

  // Label styles
  static TextStyle get labelLarge => const TextStyle(
        fontFamily: fontFamily,
        fontSize: 14,
        fontWeight: medium,
        height: 1.4,
        color: OjaColors.textPrimary,
        letterSpacing: 0.1,
      );

  static TextStyle get labelMedium => const TextStyle(
        fontFamily: fontFamily,
        fontSize: 12,
        fontWeight: medium,
        height: 1.4,
        color: OjaColors.textSecondary,
        letterSpacing: 0.2,
      );

  static TextStyle get labelSmall => const TextStyle(
        fontFamily: fontFamily,
        fontSize: 11,
        fontWeight: medium,
        height: 1.4,
        color: OjaColors.textMuted,
        letterSpacing: 0.3,
      );

  // Caption style
  static TextStyle get caption => const TextStyle(
        fontFamily: fontFamily,
        fontSize: 12,
        fontWeight: regular,
        height: 1.4,
        color: OjaColors.textMuted,
      );

  // Price styles
  static TextStyle get priceMain => const TextStyle(
        fontFamily: fontFamily,
        fontSize: 20,
        fontWeight: bold,
        height: 1.2,
        color: OjaColors.textPrimary,
      );

  static TextStyle get priceEstimate => const TextStyle(
        fontFamily: fontFamily,
        fontSize: 14,
        fontWeight: medium,
        height: 1.3,
        color: OjaColors.textSecondary,
      );

  // Budget dial number
  static TextStyle get budgetNumber => const TextStyle(
        fontFamily: fontFamily,
        fontSize: 36,
        fontWeight: bold,
        height: 1.1,
        color: OjaColors.textPrimary,
      );
}
