import 'package:flutter/material.dart';

import '../tokens/colors.dart';
import '../tokens/typography.dart';
import '../tokens/radius.dart';

/// Oja App Theme - Glass Design System
abstract class AppTheme {
  /// Dark theme (primary theme for glass design)
  static ThemeData get darkTheme => ThemeData(
        useMaterial3: true,
        brightness: Brightness.dark,
        fontFamily: OjaTypography.fontFamily,

        // Color scheme
        colorScheme: const ColorScheme.dark(
          primary: OjaColors.accentTeal,
          onPrimary: OjaColors.backgroundStart,
          secondary: OjaColors.accentWarm,
          onSecondary: OjaColors.backgroundStart,
          surface: OjaColors.glassSurface,
          onSurface: OjaColors.textPrimary,
          error: OjaColors.error,
          onError: OjaColors.textPrimary,
        ),

        // Scaffold
        scaffoldBackgroundColor: Colors.transparent,

        // App bar
        appBarTheme: AppBarTheme(
          backgroundColor: Colors.transparent,
          elevation: 0,
          scrolledUnderElevation: 0,
          centerTitle: true,
          titleTextStyle: OjaTypography.headlineMedium,
          iconTheme: const IconThemeData(
            color: OjaColors.textPrimary,
          ),
        ),

        // Bottom navigation
        bottomNavigationBarTheme: const BottomNavigationBarThemeData(
          backgroundColor: OjaColors.glassSurface,
          selectedItemColor: OjaColors.accentTeal,
          unselectedItemColor: OjaColors.textMuted,
          type: BottomNavigationBarType.fixed,
          elevation: 0,
        ),

        // Cards
        cardTheme: CardTheme(
          color: OjaColors.glassSurface,
          elevation: 0,
          shape: RoundedRectangleBorder(
            borderRadius: OjaRadius.cardRadius,
            side: const BorderSide(
              color: OjaColors.glassBorder,
              width: 1,
            ),
          ),
        ),

        // Elevated buttons (primary CTAs)
        elevatedButtonTheme: ElevatedButtonThemeData(
          style: ElevatedButton.styleFrom(
            backgroundColor: OjaColors.accentTeal,
            foregroundColor: OjaColors.backgroundStart,
            elevation: 0,
            padding: const EdgeInsets.symmetric(horizontal: 24, vertical: 16),
            shape: RoundedRectangleBorder(
              borderRadius: OjaRadius.buttonRadius,
            ),
            textStyle: OjaTypography.labelLarge.copyWith(
              color: OjaColors.backgroundStart,
            ),
          ),
        ),

        // Outlined buttons (secondary)
        outlinedButtonTheme: OutlinedButtonThemeData(
          style: OutlinedButton.styleFrom(
            foregroundColor: OjaColors.textPrimary,
            elevation: 0,
            padding: const EdgeInsets.symmetric(horizontal: 24, vertical: 16),
            shape: RoundedRectangleBorder(
              borderRadius: OjaRadius.buttonRadius,
            ),
            side: const BorderSide(
              color: OjaColors.glassBorder,
              width: 1,
            ),
            textStyle: OjaTypography.labelLarge,
          ),
        ),

        // Text buttons
        textButtonTheme: TextButtonThemeData(
          style: TextButton.styleFrom(
            foregroundColor: OjaColors.accentTeal,
            textStyle: OjaTypography.labelLarge,
          ),
        ),

        // Input decoration
        inputDecorationTheme: InputDecorationTheme(
          filled: true,
          fillColor: OjaColors.glassSurface,
          border: OutlineInputBorder(
            borderRadius: OjaRadius.inputRadius,
            borderSide: const BorderSide(color: OjaColors.glassBorder),
          ),
          enabledBorder: OutlineInputBorder(
            borderRadius: OjaRadius.inputRadius,
            borderSide: const BorderSide(color: OjaColors.glassBorder),
          ),
          focusedBorder: OutlineInputBorder(
            borderRadius: OjaRadius.inputRadius,
            borderSide: const BorderSide(color: OjaColors.accentTeal, width: 2),
          ),
          errorBorder: OutlineInputBorder(
            borderRadius: OjaRadius.inputRadius,
            borderSide: const BorderSide(color: OjaColors.error),
          ),
          contentPadding:
              const EdgeInsets.symmetric(horizontal: 16, vertical: 16),
          hintStyle: OjaTypography.bodyMedium.copyWith(
            color: OjaColors.textMuted,
          ),
          labelStyle: OjaTypography.labelMedium,
        ),

        // Chips
        chipTheme: ChipThemeData(
          backgroundColor: OjaColors.glassSurface,
          selectedColor: OjaColors.accentTealSubtle,
          labelStyle: OjaTypography.labelMedium,
          shape: RoundedRectangleBorder(
            borderRadius: OjaRadius.chipRadius,
            side: const BorderSide(color: OjaColors.glassBorder),
          ),
          padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
        ),

        // Bottom sheet
        bottomSheetTheme: BottomSheetThemeData(
          backgroundColor: OjaColors.backgroundMiddle,
          shape: RoundedRectangleBorder(
            borderRadius: OjaRadius.bottomSheetRadius,
          ),
          elevation: 0,
        ),

        // Dialog
        dialogTheme: DialogTheme(
          backgroundColor: OjaColors.backgroundMiddle,
          elevation: 0,
          shape: RoundedRectangleBorder(
            borderRadius: OjaRadius.modalRadius,
            side: const BorderSide(color: OjaColors.glassBorder),
          ),
        ),

        // Snackbar
        snackBarTheme: SnackBarThemeData(
          backgroundColor: OjaColors.glassSurface,
          contentTextStyle: OjaTypography.bodyMedium,
          shape: RoundedRectangleBorder(
            borderRadius: OjaRadius.cardRadius,
          ),
          behavior: SnackBarBehavior.floating,
        ),

        // Divider
        dividerTheme: const DividerThemeData(
          color: OjaColors.glassBorderSubtle,
          thickness: 1,
          space: 1,
        ),

        // Progress indicators
        progressIndicatorTheme: const ProgressIndicatorThemeData(
          color: OjaColors.accentTeal,
          linearTrackColor: OjaColors.glassSurface,
          circularTrackColor: OjaColors.glassSurface,
        ),

        // Switch
        switchTheme: SwitchThemeData(
          thumbColor: WidgetStateProperty.resolveWith((states) {
            if (states.contains(WidgetState.selected)) {
              return OjaColors.accentTeal;
            }
            return OjaColors.textMuted;
          }),
          trackColor: WidgetStateProperty.resolveWith((states) {
            if (states.contains(WidgetState.selected)) {
              return OjaColors.accentTealSubtle;
            }
            return OjaColors.glassSurface;
          }),
        ),

        // Checkbox
        checkboxTheme: CheckboxThemeData(
          fillColor: WidgetStateProperty.resolveWith((states) {
            if (states.contains(WidgetState.selected)) {
              return OjaColors.accentTeal;
            }
            return Colors.transparent;
          }),
          checkColor: WidgetStateProperty.all(OjaColors.backgroundStart),
          shape: RoundedRectangleBorder(
            borderRadius: BorderRadius.circular(4),
          ),
          side: const BorderSide(color: OjaColors.glassBorder, width: 2),
        ),

        // List tile
        listTileTheme: const ListTileThemeData(
          contentPadding: EdgeInsets.symmetric(horizontal: 16, vertical: 8),
          iconColor: OjaColors.textSecondary,
          textColor: OjaColors.textPrimary,
        ),

        // Icon
        iconTheme: const IconThemeData(
          color: OjaColors.textPrimary,
          size: 24,
        ),

        // Text theme
        textTheme: TextTheme(
          displayLarge: OjaTypography.displayLarge,
          displayMedium: OjaTypography.displayMedium,
          displaySmall: OjaTypography.displaySmall,
          headlineLarge: OjaTypography.headlineLarge,
          headlineMedium: OjaTypography.headlineMedium,
          headlineSmall: OjaTypography.headlineSmall,
          titleLarge: OjaTypography.titleLarge,
          titleMedium: OjaTypography.titleMedium,
          titleSmall: OjaTypography.titleSmall,
          bodyLarge: OjaTypography.bodyLarge,
          bodyMedium: OjaTypography.bodyMedium,
          bodySmall: OjaTypography.bodySmall,
          labelLarge: OjaTypography.labelLarge,
          labelMedium: OjaTypography.labelMedium,
          labelSmall: OjaTypography.labelSmall,
        ),
      );
}
