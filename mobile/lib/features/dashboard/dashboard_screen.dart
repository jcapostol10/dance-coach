import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../../models/practice_score.dart';
import '../../services/api_service.dart';
import '../../services/auth_service.dart';
import '../../theme/app_theme.dart';

class DashboardScreen extends StatefulWidget {
  const DashboardScreen({super.key});

  @override
  State<DashboardScreen> createState() => _DashboardScreenState();
}

class _DashboardScreenState extends State<DashboardScreen> {
  List<PracticeScore>? _scores;
  bool _loading = true;
  String? _error;

  @override
  void initState() {
    super.initState();
    _loadScores();
  }

  Future<void> _loadScores() async {
    final auth = context.read<AuthService>();
    if (!auth.isSignedIn) {
      setState(() {
        _loading = false;
        _scores = [];
      });
      return;
    }

    try {
      final scores = await ApiService().getScores(auth.email);
      if (mounted) {
        setState(() {
          _scores = scores;
          _loading = false;
        });
      }
    } catch (e) {
      if (mounted) {
        setState(() {
          _error = e.toString();
          _loading = false;
          _scores = [];
        });
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    final scores = _scores ?? [];
    final totalSessions = scores.length;
    final avgScore = scores.isEmpty
        ? 0
        : (scores.fold<double>(0, (sum, s) => sum + s.overallScore) /
                scores.length)
            .round();
    final uniqueLessons = scores.map((s) => s.lessonId).toSet().length;

    return Scaffold(
      appBar: AppBar(
        title: const Row(
          children: [
            _Logo(),
            SizedBox(width: 8),
            Text('DanceCoach',
                style: TextStyle(fontWeight: FontWeight.bold, fontSize: 18)),
          ],
        ),
      ),
      body: _loading
          ? const Center(child: CircularProgressIndicator())
          : RefreshIndicator(
              onRefresh: _loadScores,
              child: ListView(
                padding: const EdgeInsets.all(16),
                children: [
                  Text('Dashboard',
                      style: Theme.of(context).textTheme.headlineLarge),
                  const SizedBox(height: 8),
                  Text("Track your progress and see how you're improving.",
                      style: Theme.of(context).textTheme.bodyMedium),
                  const Divider(height: 32),

                  // Stats row
                  Row(
                    children: [
                      Expanded(
                          child: _StatCard(
                              title: 'Lessons\nPracticed',
                              value: '$uniqueLessons')),
                      const SizedBox(width: 8),
                      Expanded(
                          child: _StatCard(
                              title: 'Average\nScore',
                              value: '$avgScore',
                              suffix: '/ 100')),
                      const SizedBox(width: 8),
                      Expanded(
                          child: _StatCard(
                              title: 'Practice\nSessions',
                              value: '$totalSessions')),
                    ],
                  ),
                  const SizedBox(height: 20),

                  // Recent sessions
                  Card(
                    child: Padding(
                      padding: const EdgeInsets.all(16),
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text('Recent Practice Sessions',
                              style: Theme.of(context).textTheme.titleMedium),
                          const SizedBox(height: 16),
                          if (scores.isEmpty)
                            const Padding(
                              padding: EdgeInsets.symmetric(vertical: 24),
                              child: Center(
                                child: Text(
                                  'No practice sessions yet.\nHead to a lesson and try Practice Mode!',
                                  textAlign: TextAlign.center,
                                  style: TextStyle(
                                      fontSize: 13, color: Color(0xFF8888A0)),
                                ),
                              ),
                            )
                          else
                            ...scores.asMap().entries.map((e) {
                              final idx = e.key;
                              final entry = e.value;
                              // Find improvement vs previous attempt on same lesson
                              final previous = scores
                                  .skip(idx + 1)
                                  .where((s) => s.lessonId == entry.lessonId)
                                  .firstOrNull;
                              final improvement = previous != null
                                  ? (entry.overallScore -
                                          previous.overallScore)
                                      .round()
                                  : 0;

                              return Column(
                                children: [
                                  Row(
                                    children: [
                                      Expanded(
                                        child: Column(
                                          crossAxisAlignment:
                                              CrossAxisAlignment.start,
                                          children: [
                                            Text(
                                              entry.lessonTitle ??
                                                  'Unknown Lesson',
                                              style: const TextStyle(
                                                  fontSize: 14,
                                                  fontWeight: FontWeight.w500,
                                                  color: Color(0xFFEEEEF2)),
                                            ),
                                            const SizedBox(height: 2),
                                            Text(
                                              '${entry.createdAt.year}-${entry.createdAt.month.toString().padLeft(2, '0')}-${entry.createdAt.day.toString().padLeft(2, '0')}',
                                              style: Theme.of(context)
                                                  .textTheme
                                                  .bodySmall,
                                            ),
                                          ],
                                        ),
                                      ),
                                      if (improvement > 0) ...[
                                        Text('+$improvement',
                                            style: const TextStyle(
                                                fontSize: 12,
                                                color: Color(0xFF22C55E))),
                                        const SizedBox(width: 10),
                                      ],
                                      Container(
                                        padding: const EdgeInsets.symmetric(
                                            horizontal: 10, vertical: 4),
                                        decoration: BoxDecoration(
                                          color: AppTheme.scoreColor(
                                                  entry.overallScore)
                                              .withAlpha(26),
                                          borderRadius:
                                              BorderRadius.circular(8),
                                          border: Border.all(
                                              color: AppTheme.scoreColor(
                                                      entry.overallScore)
                                                  .withAlpha(51)),
                                        ),
                                        child: Text(
                                          '${entry.overallScore.round()}/100',
                                          style: TextStyle(
                                              fontSize: 12,
                                              fontWeight: FontWeight.w600,
                                              color: AppTheme.scoreColor(
                                                  entry.overallScore)),
                                        ),
                                      ),
                                    ],
                                  ),
                                  if (idx < scores.length - 1)
                                    const Divider(height: 24),
                                ],
                              );
                            }),
                        ],
                      ),
                    ),
                  ),

                  if (_error != null) ...[
                    const SizedBox(height: 12),
                    Text('Could not load scores: $_error',
                        style: const TextStyle(
                            fontSize: 12, color: Color(0xFFEF4444))),
                  ],
                ],
              ),
            ),
    );
  }
}

class _Logo extends StatelessWidget {
  const _Logo();

  @override
  Widget build(BuildContext context) {
    return Container(
      width: 32,
      height: 32,
      decoration: BoxDecoration(
        color: Theme.of(context).colorScheme.primary,
        borderRadius: BorderRadius.circular(8),
      ),
      child: const Center(
        child: Text('DC',
            style: TextStyle(
                fontSize: 12,
                fontWeight: FontWeight.bold,
                color: Color(0xFF1F1410))),
      ),
    );
  }
}

class _StatCard extends StatelessWidget {
  final String title;
  final String value;
  final String? suffix;

  const _StatCard({required this.title, required this.value, this.suffix});

  @override
  Widget build(BuildContext context) {
    return Card(
      child: Padding(
        padding: const EdgeInsets.all(14),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(title, style: Theme.of(context).textTheme.bodySmall),
            const SizedBox(height: 8),
            Row(
              crossAxisAlignment: CrossAxisAlignment.baseline,
              textBaseline: TextBaseline.alphabetic,
              children: [
                Text(value,
                    style: const TextStyle(
                        fontSize: 28,
                        fontWeight: FontWeight.bold,
                        color: Color(0xFFEEEEF2))),
                if (suffix != null) ...[
                  const SizedBox(width: 4),
                  Text(suffix!,
                      style: Theme.of(context).textTheme.bodyMedium),
                ],
              ],
            ),
          ],
        ),
      ),
    );
  }
}
