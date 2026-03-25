import 'package:flutter/material.dart';
import '../../theme/app_theme.dart';

final _recentScores = [
  {'lesson': 'Basic Hip-Hop Groove', 'score': 78.0, 'date': '2026-03-24', 'improvement': 12},
  {'lesson': 'Salsa Basics', 'score': 65.0, 'date': '2026-03-23', 'improvement': 8},
  {'lesson': 'Basic Hip-Hop Groove', 'score': 66.0, 'date': '2026-03-22', 'improvement': 0},
];

class DashboardScreen extends StatelessWidget {
  const DashboardScreen({super.key});

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Row(
          children: [
            _Logo(),
            SizedBox(width: 8),
            Text('DanceCoach', style: TextStyle(fontWeight: FontWeight.bold, fontSize: 18)),
          ],
        ),
      ),
      body: ListView(
        padding: const EdgeInsets.all(16),
        children: [
          Text('Dashboard', style: Theme.of(context).textTheme.headlineLarge),
          const SizedBox(height: 8),
          Text("Track your progress and see how you're improving.", style: Theme.of(context).textTheme.bodyMedium),
          const Divider(height: 32),

          // Stats row
          Row(
            children: [
              Expanded(child: _StatCard(title: 'Lessons\nPracticed', value: '3')),
              const SizedBox(width: 8),
              Expanded(child: _StatCard(title: 'Average\nScore', value: '70', suffix: '/ 100')),
              const SizedBox(width: 8),
              Expanded(child: _StatCard(title: 'Practice\nSessions', value: '5')),
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
                  Text('Recent Practice Sessions', style: Theme.of(context).textTheme.titleMedium),
                  const SizedBox(height: 16),
                  ..._recentScores.asMap().entries.map((e) {
                    final entry = e.value;
                    final score = entry['score'] as double;
                    final improvement = entry['improvement'] as int;
                    return Column(
                      children: [
                        Row(
                          children: [
                            Expanded(
                              child: Column(
                                crossAxisAlignment: CrossAxisAlignment.start,
                                children: [
                                  Text(entry['lesson'] as String, style: const TextStyle(fontSize: 14, fontWeight: FontWeight.w500, color: Colors.white)),
                                  const SizedBox(height: 2),
                                  Text(entry['date'] as String, style: Theme.of(context).textTheme.bodySmall),
                                ],
                              ),
                            ),
                            if (improvement > 0) ...[
                              Text('+$improvement', style: const TextStyle(fontSize: 12, color: Color(0xFF22C55E))),
                              const SizedBox(width: 10),
                            ],
                            Container(
                              padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                              decoration: BoxDecoration(
                                color: AppTheme.scoreColor(score).withAlpha(26),
                                borderRadius: BorderRadius.circular(8),
                                border: Border.all(color: AppTheme.scoreColor(score).withAlpha(51)),
                              ),
                              child: Text('${score.round()}/100', style: TextStyle(fontSize: 12, fontWeight: FontWeight.w600, color: AppTheme.scoreColor(score))),
                            ),
                          ],
                        ),
                        if (e.key < _recentScores.length - 1)
                          const Divider(height: 24),
                      ],
                    );
                  }),
                ],
              ),
            ),
          ),
        ],
      ),
    );
  }
}

class _Logo extends StatelessWidget {
  const _Logo();

  @override
  Widget build(BuildContext context) {
    return Container(
      width: 32, height: 32,
      decoration: BoxDecoration(
        color: Theme.of(context).colorScheme.primary,
        borderRadius: BorderRadius.circular(8),
      ),
      child: const Center(
        child: Text('DC', style: TextStyle(fontSize: 12, fontWeight: FontWeight.bold, color: Colors.white)),
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
                Text(value, style: const TextStyle(fontSize: 28, fontWeight: FontWeight.bold, color: Colors.white)),
                if (suffix != null) ...[
                  const SizedBox(width: 4),
                  Text(suffix!, style: Theme.of(context).textTheme.bodyMedium),
                ],
              ],
            ),
          ],
        ),
      ),
    );
  }
}
