import 'package:flutter/material.dart';
import '../../models/lesson.dart';
import '../../services/api_service.dart';
import '../../theme/app_theme.dart';

class LibraryScreen extends StatefulWidget {
  const LibraryScreen({super.key});

  @override
  State<LibraryScreen> createState() => _LibraryScreenState();
}

class _LibraryScreenState extends State<LibraryScreen> {
  late Future<List<Lesson>> _lessonsFuture;

  @override
  void initState() {
    super.initState();
    _lessonsFuture = ApiService().getLessons();
  }

  void _refresh() {
    setState(() {
      _lessonsFuture = ApiService().getLessons();
    });
  }

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
      body: FutureBuilder<List<Lesson>>(
        future: _lessonsFuture,
        builder: (context, snapshot) {
          if (snapshot.connectionState == ConnectionState.waiting) {
            return const Center(child: CircularProgressIndicator());
          }

          if (snapshot.hasError) {
            return Center(
              child: Column(
                mainAxisSize: MainAxisSize.min,
                children: [
                  const Icon(Icons.error_outline, size: 48, color: Colors.redAccent),
                  const SizedBox(height: 12),
                  Text('Failed to load lessons', style: Theme.of(context).textTheme.titleMedium),
                  const SizedBox(height: 4),
                  Text('${snapshot.error}', style: Theme.of(context).textTheme.bodySmall),
                  const SizedBox(height: 16),
                  OutlinedButton(onPressed: _refresh, child: const Text('Retry')),
                ],
              ),
            );
          }

          final lessons = snapshot.data!;

          if (lessons.isEmpty) {
            return Center(
              child: Column(
                mainAxisSize: MainAxisSize.min,
                children: [
                  const Icon(Icons.library_music_outlined, size: 48, color: Color(0xFF555577)),
                  const SizedBox(height: 12),
                  Text('No lessons yet', style: Theme.of(context).textTheme.titleMedium),
                  const SizedBox(height: 4),
                  Text('Upload a dance video on the web app to get started.', style: Theme.of(context).textTheme.bodySmall),
                ],
              ),
            );
          }

          return RefreshIndicator(
            onRefresh: () async {
              _refresh();
              // Wait for the future to complete
              await _lessonsFuture;
            },
            child: ListView(
              padding: const EdgeInsets.all(16),
              children: [
                Text('Lesson Library', style: Theme.of(context).textTheme.headlineLarge),
                const SizedBox(height: 8),
                Text(
                  'Choose a dance to learn. AI will break it down step by step.',
                  style: Theme.of(context).textTheme.bodyMedium,
                ),
                const SizedBox(height: 20),
                ...lessons.map((lesson) => _LessonCard(lesson: lesson)),
              ],
            ),
          );
        },
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
    final diffColor = lesson.difficulty != null
        ? (AppTheme.difficultyColors[lesson.difficulty] ?? Colors.grey)
        : Colors.grey;

    return Padding(
      padding: const EdgeInsets.only(bottom: 12),
      child: Card(
        child: InkWell(
          borderRadius: BorderRadius.circular(12),
          onTap: () => Navigator.pushNamed(context, '/learn/${lesson.id}'),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              // Thumbnail
              Container(
                height: 140,
                decoration: BoxDecoration(
                  color: const Color(0xFF1E1E2E),
                  borderRadius: const BorderRadius.vertical(top: Radius.circular(12)),
                  image: lesson.thumbnailUrl != null
                      ? DecorationImage(
                          image: NetworkImage(lesson.thumbnailUrl!),
                          fit: BoxFit.cover,
                        )
                      : null,
                ),
                child: lesson.thumbnailUrl == null
                    ? Center(
                        child: Text(
                          lesson.title.split(' ').take(2).join(' '),
                          style: const TextStyle(fontSize: 22, fontWeight: FontWeight.w300, color: Color(0xFF555577)),
                        ),
                      )
                    : null,
              ),
              Padding(
                padding: const EdgeInsets.all(14),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    // Badges
                    Row(
                      children: [
                        if (lesson.difficulty != null)
                          _Badge(label: lesson.difficulty!, color: diffColor),
                        if (lesson.difficulty != null && lesson.style != null)
                          const SizedBox(width: 8),
                        if (lesson.style != null)
                          _Badge(label: lesson.style!, color: Colors.white70),
                        if (!lesson.isAnalyzed) ...[
                          const SizedBox(width: 8),
                          _Badge(label: 'Not analyzed', color: Colors.orange),
                        ],
                      ],
                    ),
                    const SizedBox(height: 10),
                    Text(lesson.title, style: Theme.of(context).textTheme.titleMedium),
                    const SizedBox(height: 8),
                    Text(
                      [
                        lesson.durationFormatted,
                        if (lesson.bpm != null) '${lesson.bpm!.round()} BPM',
                        lesson.isCurated ? 'Curated' : 'User',
                      ].join('  ·  '),
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
