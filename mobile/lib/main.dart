import 'package:flutter/material.dart';
import 'theme/app_theme.dart';
import 'features/library/library_screen.dart';
import 'features/lesson/lesson_screen.dart';
import 'features/practice/practice_screen.dart';
import 'features/dashboard/dashboard_screen.dart';

void main() {
  runApp(const DanceCoachApp());
}

class DanceCoachApp extends StatelessWidget {
  const DanceCoachApp({super.key});

  @override
  Widget build(BuildContext context) {
    return MaterialApp(
      title: 'DanceCoach AI',
      debugShowCheckedModeBanner: false,
      theme: AppTheme.darkTheme,
      home: const MainShell(),
      onGenerateRoute: (settings) {
        final uri = Uri.parse(settings.name ?? '/');

        // /learn/:id
        if (uri.pathSegments.length == 2 && uri.pathSegments[0] == 'learn') {
          return MaterialPageRoute(
            builder: (_) => LessonScreen(lessonId: uri.pathSegments[1]),
          );
        }

        // /practice/:id
        if (uri.pathSegments.length == 2 && uri.pathSegments[0] == 'practice') {
          return MaterialPageRoute(
            builder: (_) => PracticeScreen(lessonId: uri.pathSegments[1]),
          );
        }

        return null;
      },
    );
  }
}

class MainShell extends StatefulWidget {
  const MainShell({super.key});

  @override
  State<MainShell> createState() => _MainShellState();
}

class _MainShellState extends State<MainShell> {
  int _currentIndex = 0;

  final _screens = const [
    LibraryScreen(),
    DashboardScreen(),
  ];

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      body: _screens[_currentIndex],
      bottomNavigationBar: NavigationBar(
        selectedIndex: _currentIndex,
        onDestinationSelected: (i) => setState(() => _currentIndex = i),
        backgroundColor: const Color(0xFF0A0A0A),
        indicatorColor: Theme.of(context).colorScheme.primary.withAlpha(51),
        destinations: const [
          NavigationDestination(
            icon: Icon(Icons.library_music_outlined),
            selectedIcon: Icon(Icons.library_music),
            label: 'Library',
          ),
          NavigationDestination(
            icon: Icon(Icons.dashboard_outlined),
            selectedIcon: Icon(Icons.dashboard),
            label: 'Dashboard',
          ),
        ],
      ),
    );
  }
}
