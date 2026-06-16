import 'package:flutter/material.dart';

/// Tokens for the IITM BS DS redesign. Mirrors the `C.*` palette from
/// the design canvas (screens.jsx) one-to-one.
class AppColors {
  AppColors._();

  // Base surfaces
  static const Color bg = Color(0xFFF2F3F8);          // page bg (lavender-grey)
  static const Color surface = Color(0xFFFFFFFF);     // cards
  static const Color card2 = Color(0xFFFAFAFE);       // soft card alt
  static const Color sidebarBg = Color(0xFFE8EAF0);   // legacy

  // Text
  static const Color ink = Color(0xFF0B1020);
  static const Color ink2 = Color(0xFF3B4255);
  static const Color muted = Color(0xFF7A8194);
  static const Color mute2 = Color(0xFFA8AEBF);

  // Brand (indigo / violet)
  static const Color brand = Color(0xFF4F46E5);
  static const Color brandDk = Color(0xFF3F37C9);
  static const Color brandSoft = Color(0xFFEEF0FF);
  static const Color brandSft2 = Color(0xFFE4E6FF);

  // Accents
  static const Color green = Color(0xFF10B981);
  static const Color greenSft = Color(0xFFE7F8F1);
  static const Color amber = Color(0xFFF59E0B);
  static const Color amberSft = Color(0xFFFEF4E2);
  static const Color red = Color(0xFFEF4444);
  static const Color redSft = Color(0xFFFEECEC);

  // Lines
  static const Color line = Color(0xFFECEDF3);
  static const Color line2 = Color(0xFFE3E5EE);

  // Dark surfaces
  static const Color videoBg = Color(0xFF0E1230);

  // ── Legacy aliases (don't break code from earlier phases) ─────────
  static const Color primary = brand;
  static const Color primaryDark = brandDk;
  static const Color primaryLight = Color(0x144F46E5);
  static const Color accent = Color(0xFF6366F1);

  static const Color success = green;
  static const Color successLight = Color(0x1A10B981);
  static const Color warning = amber;
  static const Color warningLight = Color(0x1AF59E0B);
  static const Color danger = red;
  static const Color dangerLight = Color(0x1AEF4444);
  static const Color info = Color(0xFF3B82F6);

  static const Color textPrimary = ink;
  static const Color textSecondary = ink2;
  static const Color textMuted = muted;
  static const Color textInverse = Color(0xFFFFFFFF);

  static const Color neuLight = Color(0xFFFFFFFF);
  static const Color neuDark = Color(0xFFC5C7CF);

  static const Color cardWhite = surface;
  static const Color heroNavy = Color(0xFF0F172A);

  static const Color tabActive = brand;
  static const Color tabInactive = mute2;
}
