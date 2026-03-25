import 'package:flutter/material.dart';

class AppTheme {
  static const _primaryColor = Color(0xFF6366F1); // Indigo
  static const _surfaceColor = Color(0xFF0A0A0A);
  static const _cardColor = Color(0xFF141414);
  static const _borderColor = Color(0xFF262626);
  static const _mutedForeground = Color(0xFFA1A1AA);

  static final darkTheme = ThemeData(
    brightness: Brightness.dark,
    scaffoldBackgroundColor: _surfaceColor,
    colorScheme: const ColorScheme.dark(
      primary: _primaryColor,
      surface: _surfaceColor,
      onSurface: Colors.white,
      onPrimary: Colors.white,
    ),
    cardTheme: const CardThemeData(
      color: _cardColor,
      shape: RoundedRectangleBorder(
        borderRadius: BorderRadius.all(Radius.circular(12)),
        side: BorderSide(color: _borderColor),
      ),
      elevation: 0,
    ),
    appBarTheme: const AppBarTheme(
      backgroundColor: Color(0xCC0A0A0A),
      foregroundColor: Colors.white,
      elevation: 0,
      centerTitle: false,
    ),
    textTheme: const TextTheme(
      headlineLarge: TextStyle(fontSize: 28, fontWeight: FontWeight.bold, color: Colors.white),
      headlineMedium: TextStyle(fontSize: 22, fontWeight: FontWeight.bold, color: Colors.white),
      titleLarge: TextStyle(fontSize: 18, fontWeight: FontWeight.w600, color: Colors.white),
      titleMedium: TextStyle(fontSize: 16, fontWeight: FontWeight.w600, color: Colors.white),
      bodyLarge: TextStyle(fontSize: 16, color: Colors.white),
      bodyMedium: TextStyle(fontSize: 14, color: _mutedForeground),
      bodySmall: TextStyle(fontSize: 12, color: _mutedForeground),
      labelSmall: TextStyle(fontSize: 11, fontWeight: FontWeight.w500, color: _mutedForeground),
    ),
    dividerColor: _borderColor,
    elevatedButtonTheme: ElevatedButtonThemeData(
      style: ElevatedButton.styleFrom(
        backgroundColor: _primaryColor,
        foregroundColor: Colors.white,
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
        padding: const EdgeInsets.symmetric(horizontal: 24, vertical: 14),
        textStyle: const TextStyle(fontSize: 16, fontWeight: FontWeight.w600),
      ),
    ),
    outlinedButtonTheme: OutlinedButtonThemeData(
      style: OutlinedButton.styleFrom(
        foregroundColor: Colors.white,
        side: const BorderSide(color: _borderColor),
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
        padding: const EdgeInsets.symmetric(horizontal: 24, vertical: 14),
      ),
    ),
    chipTheme: ChipThemeData(
      backgroundColor: _cardColor,
      labelStyle: const TextStyle(fontSize: 12, color: Colors.white),
      side: const BorderSide(color: _borderColor),
      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(20)),
    ),
    sliderTheme: const SliderThemeData(
      activeTrackColor: _primaryColor,
      inactiveTrackColor: _borderColor,
      thumbColor: _primaryColor,
    ),
  );

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
