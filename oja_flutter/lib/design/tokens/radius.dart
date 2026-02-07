import 'package:flutter/material.dart';

/// Oja Glass Design System - Border Radius Tokens
abstract class OjaRadius {
  /// 4px - Extra small
  static const double xs = 4;

  /// 8px - Small
  static const double sm = 8;

  /// 12px - Medium
  static const double md = 12;

  /// 16px - Large
  static const double lg = 16;

  /// 20px - Extra large
  static const double xl = 20;

  /// 24px - Extra extra large
  static const double xxl = 24;

  /// 32px - Huge
  static const double xxxl = 32;

  /// 9999px - Full/Pill shape
  static const double full = 9999;

  // Common BorderRadius presets
  static BorderRadius get cardRadius => BorderRadius.circular(lg);
  static BorderRadius get buttonRadius => BorderRadius.circular(md);
  static BorderRadius get chipRadius => BorderRadius.circular(full);
  static BorderRadius get inputRadius => BorderRadius.circular(md);
  static BorderRadius get modalRadius => BorderRadius.circular(xxl);
  static BorderRadius get bottomSheetRadius => const BorderRadius.vertical(
        top: Radius.circular(xxl),
      );

  // Specific component radii
  static BorderRadius get budgetDialRadius => BorderRadius.circular(full);
  static BorderRadius get avatarRadius => BorderRadius.circular(full);
  static BorderRadius get badgeRadius => BorderRadius.circular(sm);
}
