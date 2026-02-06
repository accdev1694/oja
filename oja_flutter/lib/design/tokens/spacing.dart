/// Oja Glass Design System - Spacing Tokens
/// Consistent spacing scale for margins, padding, and gaps
abstract class OjaSpacing {
  /// 2px - Micro spacing
  static const double xxxs = 2;

  /// 4px - Extra extra small
  static const double xxs = 4;

  /// 8px - Extra small
  static const double xs = 8;

  /// 12px - Small
  static const double sm = 12;

  /// 16px - Medium (base unit)
  static const double md = 16;

  /// 20px - Medium large
  static const double lg = 20;

  /// 24px - Large
  static const double xl = 24;

  /// 32px - Extra large
  static const double xxl = 32;

  /// 40px - Extra extra large
  static const double xxxl = 40;

  /// 48px - Huge
  static const double xxxxl = 48;

  /// 64px - Massive
  static const double xxxxxl = 64;

  // Common padding presets
  static const double cardPadding = md;
  static const double screenPadding = md;
  static const double sectionGap = xl;
  static const double itemGap = sm;
  static const double iconTextGap = xs;

  // Tab bar
  static const double tabBarHeight = 80;
  static const double tabBarPadding = xxs;

  // Safe area additions
  static const double bottomSafeArea = 34; // iPhone X+ home indicator
  static const double topSafeArea = 44; // Status bar
}
