import 'package:flutter/material.dart';

import 'app_colors.dart';
import 'app_typography.dart';

class AppTheme {
  AppTheme._();

  // ── Dark palette ────────────────────────────────────────────
  // Single source of truth so screens can override per-widget if needed.
  // Kept separate from AppColors so AppColors stays light-only and existing
  // hard-coded references keep working (light cards on dark bg is fine and
  // matches the "elevated surface" pattern used by most modern apps).
  static const _darkBg = Color(0xFF0B1020);          // page bg
  static const _darkSurface = Color(0xFF1A1F38);     // cards/sheets
  static const _darkAppBarBg = Color(0xFF0B1020);
  static const _darkOnSurface = Color(0xFFE5E7EE);

  static ThemeData light() {
    final base = ThemeData.light(useMaterial3: true);

    return base.copyWith(
      scaffoldBackgroundColor: AppColors.bg,
      colorScheme: const ColorScheme.light(
        primary: AppColors.primary,
        secondary: AppColors.accent,
        surface: AppColors.cardWhite,
        onPrimary: AppColors.textInverse,
        onSurface: AppColors.textPrimary,
        error: AppColors.danger,
      ),
      textTheme: AppTypography.textTheme(base.textTheme).copyWith(
        displayLarge: AppTypography.h1,
        headlineMedium: AppTypography.h2,
        titleMedium: AppTypography.title,
        bodyMedium: AppTypography.body,
        bodySmall: AppTypography.bodyMuted,
        labelSmall: AppTypography.caption,
      ),
      appBarTheme: const AppBarTheme(
        backgroundColor: AppColors.bg,
        foregroundColor: AppColors.textPrimary,
        elevation: 0,
        scrolledUnderElevation: 0,
        centerTitle: false,
      ),
      splashFactory: NoSplash.splashFactory,
      highlightColor: Colors.transparent,
    );
  }

  static ThemeData dark() {
    final base = ThemeData.dark(useMaterial3: true);

    return base.copyWith(
      scaffoldBackgroundColor: _darkBg,
      colorScheme: const ColorScheme.dark(
        primary: AppColors.primary,
        secondary: AppColors.accent,
        surface: _darkSurface,
        onPrimary: AppColors.textInverse,
        onSurface: _darkOnSurface,
        error: AppColors.danger,
      ),
      textTheme: AppTypography.textTheme(base.textTheme).copyWith(
        displayLarge:
            AppTypography.h1.copyWith(color: _darkOnSurface),
        headlineMedium:
            AppTypography.h2.copyWith(color: _darkOnSurface),
        titleMedium:
            AppTypography.title.copyWith(color: _darkOnSurface),
        bodyMedium:
            AppTypography.body.copyWith(color: _darkOnSurface),
        bodySmall: AppTypography.bodyMuted,
        labelSmall: AppTypography.caption,
      ),
      appBarTheme: const AppBarTheme(
        backgroundColor: _darkAppBarBg,
        foregroundColor: _darkOnSurface,
        elevation: 0,
        scrolledUnderElevation: 0,
        centerTitle: false,
      ),
      splashFactory: NoSplash.splashFactory,
      highlightColor: Colors.transparent,
    );
  }
}
