import 'package:flutter/material.dart';

class AppTheme {
  // Brand coral — matches web oklch(0.70 0.20 12) ≈ #E8604C
  static const _primaryColor = Color(0xFFE8604C);
  static const _primaryDark = Color(0xFF1F1410); // dark primary-foreground

  // Surfaces — warm-tinted dark backgrounds (hue 280 matches web)
  static const _surfaceColor = Color(0xFF121218); // oklch(0.115 0.008 280)
  static const _cardColor = Color(0xFF1A1A22);    // oklch(0.155 0.012 280)
  static const _elevatedColor = Color(0xFF222230); // oklch(0.175 0.012 280)
  static const _borderColor = Color(0xFF2E2E3C);  // oklch(0.24 0.012 280)
  static const _mutedForeground = Color(0xFF8888A0); // oklch(0.60 0.015 280)

  static final darkTheme = ThemeData(
    brightness: Brightness.dark,
    scaffoldBackgroundColor: _surfaceColor,
    colorScheme: const ColorScheme.dark(
      primary: _primaryColor,
      surface: _surfaceColor,
      onSurface: Color(0xFFEEEEF2), // oklch(0.95 0.006 280)
      onPrimary: _primaryDark,
    ),
    cardTheme: const CardThemeData(
      color: _cardColor,
      shape: RoundedRectangleBorder(
        borderRadius: BorderRadius.all(Radius.circular(12)),
        side: BorderSide(color: _borderColor),
      ),
      elevation: 0,
    ),
    appBarTheme: AppBarTheme(
      backgroundColor: _surfaceColor.withAlpha(204), // 80% opacity
      foregroundColor: const Color(0xFFEEEEF2),
      elevation: 0,
      centerTitle: false,
    ),
    textTheme: const TextTheme(
      // Headings — tight tracking like web (-0.03em)
      headlineLarge: TextStyle(
        fontSize: 28, fontWeight: FontWeight.bold,
        color: Color(0xFFEEEEF2), letterSpacing: -0.84,
      ),
      headlineMedium: TextStyle(
        fontSize: 22, fontWeight: FontWeight.bold,
        color: Color(0xFFEEEEF2), letterSpacing: -0.66,
      ),
      titleLarge: TextStyle(
        fontSize: 18, fontWeight: FontWeight.w600,
        color: Color(0xFFEEEEF2), letterSpacing: -0.54,
      ),
      titleMedium: TextStyle(
        fontSize: 16, fontWeight: FontWeight.w600,
        color: Color(0xFFEEEEF2), letterSpacing: -0.48,
      ),
      // Body — generous line height like web (1.7)
      bodyLarge: TextStyle(fontSize: 16, color: Color(0xFFEEEEF2), height: 1.7),
      bodyMedium: TextStyle(fontSize: 14, color: _mutedForeground, height: 1.7),
      bodySmall: TextStyle(fontSize: 12, color: _mutedForeground, height: 1.7),
      labelSmall: TextStyle(fontSize: 11, fontWeight: FontWeight.w500, color: _mutedForeground),
    ),
    dividerColor: _borderColor,
    elevatedButtonTheme: ElevatedButtonThemeData(
      style: ElevatedButton.styleFrom(
        backgroundColor: _primaryColor,
        foregroundColor: _primaryDark,
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
        padding: const EdgeInsets.symmetric(horizontal: 24, vertical: 14),
        textStyle: const TextStyle(fontSize: 16, fontWeight: FontWeight.w600),
        elevation: 0,
      ),
    ),
    outlinedButtonTheme: OutlinedButtonThemeData(
      style: OutlinedButton.styleFrom(
        foregroundColor: const Color(0xFFEEEEF2),
        side: const BorderSide(color: _borderColor),
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
        padding: const EdgeInsets.symmetric(horizontal: 24, vertical: 14),
      ),
    ),
    chipTheme: ChipThemeData(
      backgroundColor: _cardColor,
      labelStyle: const TextStyle(fontSize: 12, color: Color(0xFFEEEEF2)),
      side: const BorderSide(color: _borderColor),
      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(20)),
    ),
    sliderTheme: const SliderThemeData(
      activeTrackColor: _primaryColor,
      inactiveTrackColor: _borderColor,
      thumbColor: _primaryColor,
    ),
    inputDecorationTheme: InputDecorationTheme(
      filled: true,
      fillColor: _elevatedColor,
      border: OutlineInputBorder(
        borderRadius: BorderRadius.circular(10),
        borderSide: const BorderSide(color: _borderColor),
      ),
      enabledBorder: OutlineInputBorder(
        borderRadius: BorderRadius.circular(10),
        borderSide: const BorderSide(color: _borderColor),
      ),
      focusedBorder: OutlineInputBorder(
        borderRadius: BorderRadius.circular(10),
        borderSide: const BorderSide(color: _primaryColor, width: 2),
      ),
    ),
    dialogTheme: DialogThemeData(
      backgroundColor: _cardColor,
      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
    ),
  );

  // Elevated surface for cards with more prominence
  static const elevatedSurface = _elevatedColor;

  static const difficultyColors = {
    'Beginner': Color(0xFF22C55E),
    'Intermediate': Color(0xFFF59E0B),
    'Advanced': Color(0xFFEF4444),
  };

  static Color scoreColor(double score) {
    if (score >= 80) return const Color(0xFF22C55E);
    if (score >= 65) return const Color(0xFFF59E0B);
    return const Color(0xFFEF4444);
  }
}
