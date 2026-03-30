import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'theme/app_theme.dart';
import 'services/api_service.dart';
import 'services/auth_service.dart';
import 'features/auth/login_screen.dart';
import 'features/library/library_screen.dart';
import 'features/lesson/lesson_screen.dart';
import 'features/practice/practice_screen.dart';
import 'features/dashboard/dashboard_screen.dart';
import 'features/upload/upload_screen.dart';

void main() {
  runApp(
    ChangeNotifierProvider(
      create: (_) => AuthService()..init(),
      child: const DanceCoachApp(),
    ),
  );
}

class DanceCoachApp extends StatelessWidget {
  const DanceCoachApp({super.key});

  @override
  Widget build(BuildContext context) {
    return MaterialApp(
      title: 'DanceCoach AI',
      debugShowCheckedModeBanner: false,
      theme: AppTheme.darkTheme,
      home: const AuthGate(),
      onGenerateRoute: (settings) {
        final uri = Uri.parse(settings.name ?? '/');

        if (uri.pathSegments.length == 2 && uri.pathSegments[0] == 'learn') {
          return MaterialPageRoute(
            builder: (_) => LessonScreen(lessonId: uri.pathSegments[1]),
          );
        }

        if (uri.pathSegments.length == 2 && uri.pathSegments[0] == 'practice') {
          return MaterialPageRoute(
            builder: (_) => PracticeScreen(lessonId: uri.pathSegments[1]),
          );
        }

        // Guest access to main shell
        if (settings.name == '/') {
          return MaterialPageRoute(builder: (_) => const MainShell());
        }

        return null;
      },
    );
  }
}

class AuthGate extends StatelessWidget {
  const AuthGate({super.key});

  @override
  Widget build(BuildContext context) {
    final auth = context.watch<AuthService>();

    if (auth.isLoading) {
      return const Scaffold(
        body: Center(child: CircularProgressIndicator()),
      );
    }

    if (auth.isSignedIn) {
      ApiService().setAuthEmail(auth.email);
      return const MainShell();
    }

    return const LoginScreen();
  }
}

class MainShell extends StatefulWidget {
  const MainShell({super.key});

  @override
  State<MainShell> createState() => _MainShellState();
}

class _MainShellState extends State<MainShell> {
  int _currentIndex = 0;

  @override
  Widget build(BuildContext context) {
    final auth = context.watch<AuthService>();
    final isAdmin = auth.isAdmin;

    final screens = [
      const LibraryScreen(),
      const DashboardScreen(),
      if (isAdmin) const UploadScreen(),
    ];

    // Clamp index if admin signs out while on upload tab
    if (_currentIndex >= screens.length) {
      _currentIndex = 0;
    }

    return Scaffold(
      appBar: AppBar(
        title: const Text('DanceCoach AI'),
        backgroundColor: Theme.of(context).scaffoldBackgroundColor,
        actions: [
          if (auth.isSignedIn)
            PopupMenuButton<String>(
              icon: auth.photoUrl != null
                  ? CircleAvatar(
                      radius: 14,
                      backgroundImage: NetworkImage(auth.photoUrl!),
                    )
                  : const Icon(Icons.account_circle),
              onSelected: (value) {
                if (value == 'signout') auth.signOut();
              },
              itemBuilder: (_) => [
                PopupMenuItem(
                  enabled: false,
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(auth.displayName,
                          style: const TextStyle(fontWeight: FontWeight.bold)),
                      Text(auth.email,
                          style: const TextStyle(fontSize: 12, color: Colors.grey)),
                      if (isAdmin)
                        const Padding(
                          padding: EdgeInsets.only(top: 4),
                          child: Text('Admin',
                              style: TextStyle(
                                  fontSize: 11,
                                  color: Colors.indigoAccent,
                                  fontWeight: FontWeight.w600)),
                        ),
                    ],
                  ),
                ),
                const PopupMenuDivider(),
                const PopupMenuItem(
                  value: 'signout',
                  child: Text('Sign out'),
                ),
              ],
            )
          else
            TextButton(
              onPressed: () {
                Navigator.of(context).pushAndRemoveUntil(
                  MaterialPageRoute(builder: (_) => const LoginScreen()),
                  (_) => false,
                );
              },
              child: const Text('Sign in'),
            ),
        ],
      ),
      body: screens[_currentIndex],
      bottomNavigationBar: NavigationBar(
        selectedIndex: _currentIndex,
        onDestinationSelected: (i) => setState(() => _currentIndex = i),
        backgroundColor: Theme.of(context).scaffoldBackgroundColor,
        indicatorColor: Theme.of(context).colorScheme.primary.withAlpha(51),
        destinations: [
          const NavigationDestination(
            icon: Icon(Icons.library_music_outlined),
            selectedIcon: Icon(Icons.library_music),
            label: 'Library',
          ),
          const NavigationDestination(
            icon: Icon(Icons.dashboard_outlined),
            selectedIcon: Icon(Icons.dashboard),
            label: 'Dashboard',
          ),
          if (isAdmin)
            const NavigationDestination(
              icon: Icon(Icons.upload_outlined),
              selectedIcon: Icon(Icons.upload),
              label: 'Upload',
            ),
        ],
      ),
    );
  }
}
