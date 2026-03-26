import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../../services/auth_service.dart';

class LoginScreen extends StatelessWidget {
  const LoginScreen({super.key});

  @override
  Widget build(BuildContext context) {
    final auth = context.watch<AuthService>();
    final theme = Theme.of(context);

    return Scaffold(
      body: Center(
        child: Padding(
          padding: const EdgeInsets.symmetric(horizontal: 32),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              Container(
                width: 64,
                height: 64,
                decoration: BoxDecoration(
                  color: theme.colorScheme.primary,
                  borderRadius: BorderRadius.circular(16),
                ),
                child: const Center(
                  child: Text(
                    'DC',
                    style: TextStyle(
                      fontSize: 24,
                      fontWeight: FontWeight.bold,
                      color: Colors.white,
                    ),
                  ),
                ),
              ),
              const SizedBox(height: 24),
              Text(
                'DanceCoach AI',
                style: theme.textTheme.headlineSmall?.copyWith(
                  fontWeight: FontWeight.bold,
                ),
              ),
              const SizedBox(height: 8),
              Text(
                'Sign in to access your lessons and practice',
                style: theme.textTheme.bodyMedium?.copyWith(
                  color: theme.colorScheme.onSurface.withAlpha(153),
                ),
                textAlign: TextAlign.center,
              ),
              const SizedBox(height: 40),
              SizedBox(
                width: double.infinity,
                height: 48,
                child: OutlinedButton.icon(
                  onPressed: auth.isLoading
                      ? null
                      : () => auth.signInWithGoogle(),
                  icon: Image.network(
                    'https://developers.google.com/identity/images/g-logo.png',
                    height: 20,
                    width: 20,
                    errorBuilder: (_, _, _) =>
                        const Icon(Icons.login, size: 20),
                  ),
                  label: Text(
                    auth.isLoading ? 'Signing in...' : 'Continue with Google',
                    style: const TextStyle(fontSize: 15),
                  ),
                  style: OutlinedButton.styleFrom(
                    side: BorderSide(
                      color: theme.colorScheme.outline.withAlpha(102),
                    ),
                    shape: RoundedRectangleBorder(
                      borderRadius: BorderRadius.circular(10),
                    ),
                  ),
                ),
              ),
              const SizedBox(height: 16),
              SizedBox(
                width: double.infinity,
                height: 48,
                child: TextButton(
                  onPressed: () {
                    // Skip login — browse as guest
                    Navigator.of(context).pushReplacementNamed('/');
                  },
                  child: Text(
                    'Browse as Guest',
                    style: TextStyle(
                      color: theme.colorScheme.onSurface.withAlpha(153),
                    ),
                  ),
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}
