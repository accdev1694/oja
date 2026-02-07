import 'package:flutter/material.dart';

/// Oja Glass Design System - Color Tokens
/// Ported from React Native glassTokens.ts
abstract class OjaColors {
  // Background gradient colors (deep blue)
  static const Color backgroundStart = Color(0xFF0D1528);
  static const Color backgroundMiddle = Color(0xFF1B2845);
  static const Color backgroundEnd = Color(0xFF101A2B);

  // Glass surface colors
  static const Color glassSurface = Color(0x1AFFFFFF); // 10% white
  static const Color glassSurfaceHover = Color(0x26FFFFFF); // 15% white
  static const Color glassBorder = Color(0x33FFFFFF); // 20% white
  static const Color glassBorderSubtle = Color(0x1AFFFFFF); // 10% white

  // Primary accent - Teal (CTAs only)
  static const Color accentTeal = Color(0xFF00D4AA);
  static const Color accentTealMuted = Color(0x8000D4AA); // 50% opacity
  static const Color accentTealSubtle = Color(0x3300D4AA); // 20% opacity

  // Warm accent - Celebrations & milestones
  static const Color accentWarm = Color(0xFFFFB088);
  static const Color accentWarmMuted = Color(0x80FFB088);
  static const Color accentWarmSubtle = Color(0x33FFB088);

  // Text colors
  static const Color textPrimary = Color(0xFFFFFFFF);
  static const Color textSecondary = Color(0xB3FFFFFF); // 70% white
  static const Color textMuted = Color(0x80FFFFFF); // 50% white
  static const Color textDisabled = Color(0x4DFFFFFF); // 30% white

  // Semantic colors
  static const Color success = Color(0xFF10B981);
  static const Color successSubtle = Color(0x3310B981);
  static const Color warning = Color(0xFFF59E0B);
  static const Color warningSubtle = Color(0x33F59E0B);
  static const Color error = Color(0xFFEF4444);
  static const Color errorSubtle = Color(0x33EF4444);
  static const Color info = Color(0xFF3B82F6);
  static const Color infoSubtle = Color(0x333B82F6);

  // Budget sentiment colors
  static const Color budgetHealthy = Color(0xFF10B981); // Green - lots of room
  static const Color budgetOnTrack = Color(0xFF00D4AA); // Teal - doing well
  static const Color budgetCaution = Color(0xFFF59E0B); // Amber - getting close
  static const Color budgetOver = Color(0xFFEF4444); // Red - over budget

  // Stock level colors
  static const Color stockFull = Color(0xFF10B981);
  static const Color stockLow = Color(0xFFF59E0B);
  static const Color stockOut = Color(0xFFEF4444);

  // Overlay colors
  static const Color overlay = Color(0x80000000); // 50% black
  static const Color overlayLight = Color(0x4D000000); // 30% black

  /// Returns the background gradient for app screens
  static LinearGradient get backgroundGradient => const LinearGradient(
        begin: Alignment.topCenter,
        end: Alignment.bottomCenter,
        colors: [backgroundStart, backgroundMiddle, backgroundEnd],
        stops: [0.0, 0.5, 1.0],
      );

  /// Returns budget color based on percentage spent
  static Color getBudgetColor(double percentSpent) {
    if (percentSpent < 0.5) return budgetHealthy;
    if (percentSpent < 0.75) return budgetOnTrack;
    if (percentSpent < 1.0) return budgetCaution;
    return budgetOver;
  }

  /// Returns stock color based on stock level
  static Color getStockColor(String stockLevel) {
    switch (stockLevel.toLowerCase()) {
      case 'stocked':
        return stockFull;
      case 'low':
        return stockLow;
      case 'out':
        return stockOut;
      default:
        return textMuted;
    }
  }
}
