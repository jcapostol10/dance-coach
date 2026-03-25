import 'package:flutter/material.dart';
import '../../models/lesson.dart';
import '../../theme/app_theme.dart';

// Placeholder lessons matching the web app
final _placeholderLessons = [
  Lesson(id: '1', title: 'Basic Hip-Hop Groove', description: 'Learn the fundamental hip-hop bounce and groove.', style: 'Hip-Hop', difficulty: 'Beginner', duration: 45, bpm: 95, isCurated: true),
  Lesson(id: '2', title: 'Salsa Basics — Cross Body Lead', description: 'Master the basic salsa step and cross body lead.', style: 'Salsa', difficulty: 'Beginner', duration: 60, bpm: 180, isCurated: true),
  Lesson(id: '3', title: 'Contemporary Flow Sequence', description: 'A flowing contemporary combination focusing on fluidity.', style: 'Contemporary', difficulty: 'Intermediate', duration: 90, bpm: 72, isCurated: true),
  Lesson(id: '4', title: 'K-Pop Choreography — Intro', description: 'Learn the opening sequence of a popular K-Pop routine.', style: 'K-Pop', difficulty: 'Intermediate', duration: 120, bpm: 128, isCurated: true),
  Lesson(id: '5', title: 'Breaking — Toprock Basics', description: 'Essential toprock steps for breaking.', style: 'Breaking', difficulty: 'Beginner', duration: 55, bpm: 110, isCurated: true),
  Lesson(id: '6', title: 'House Dance Foundations', description: 'Core house dance steps: jack, stomp, and lofting.', style: 'House', difficulty: 'Beginner', duration: 70, bpm: 124, isCurated: true),
];

class LibraryScreen extends StatelessWidget {
  const LibraryScreen({super.key});

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
          Text('Lesson Library', style: Theme.of(context).textTheme.headlineLarge),
          const SizedBox(height: 8),
          Text(
            'Choose a dance to learn. AI will break it down step by step.',
            style: Theme.of(context).textTheme.bodyMedium,
          ),
          const SizedBox(height: 20),
          ..._placeholderLessons.map((lesson) => _LessonCard(lesson: lesson)),
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
      width: 32,
      height: 32,
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

class _LessonCard extends StatelessWidget {
  final Lesson lesson;

  const _LessonCard({required this.lesson});

  @override
  Widget build(BuildContext context) {
    final diffColor = AppTheme.difficultyColors[lesson.difficulty] ?? Colors.grey;

    return Padding(
      padding: const EdgeInsets.only(bottom: 12),
      child: Card(
        child: InkWell(
          borderRadius: BorderRadius.circular(12),
          onTap: () => Navigator.pushNamed(context, '/learn/${lesson.id}'),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              // Thumbnail placeholder
              Container(
                height: 140,
                decoration: BoxDecoration(
                  color: const Color(0xFF1E1E2E),
                  borderRadius: const BorderRadius.vertical(top: Radius.circular(12)),
                ),
                child: Center(
                  child: Text(
                    lesson.title.split(' ').take(2).join(' '),
                    style: const TextStyle(fontSize: 22, fontWeight: FontWeight.w300, color: Color(0xFF555577)),
                  ),
                ),
              ),
              Padding(
                padding: const EdgeInsets.all(14),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    // Badges
                    Row(
                      children: [
                        _Badge(label: lesson.difficulty, color: diffColor),
                        const SizedBox(width: 8),
                        _Badge(label: lesson.style, color: Colors.white70),
                      ],
                    ),
                    const SizedBox(height: 10),
                    Text(lesson.title, style: Theme.of(context).textTheme.titleMedium),
                    const SizedBox(height: 8),
                    Text(
                      '${lesson.durationFormatted}  ·  ${lesson.bpm} BPM  ·  ${lesson.isCurated ? "Curated" : "User"}',
                      style: Theme.of(context).textTheme.bodySmall,
                    ),
                  ],
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}

class _Badge extends StatelessWidget {
  final String label;
  final Color color;

  const _Badge({required this.label, required this.color});

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
      decoration: BoxDecoration(
        color: color.withAlpha(26),
        borderRadius: BorderRadius.circular(20),
        border: Border.all(color: color.withAlpha(51)),
      ),
      child: Text(label, style: TextStyle(fontSize: 11, fontWeight: FontWeight.w600, color: color)),
    );
  }
}
