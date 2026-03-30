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
                  const Icon(Icons.library_music_outlined, size: 48, color: Color(0xFF8888A0)),
                  const SizedBox(height: 12),
                  Text('No lessons yet', style: Theme.of(context).textTheme.titleMedium),
                  const SizedBox(height: 4),
                  Text('Upload a dance video on the web app to get started.', style: Theme.of(context).textTheme.bodySmall),
                ],
              ),
            );
          }

          // Group by style (matching web)
          final grouped = <String, List<Lesson>>{};
          for (final lesson in lessons) {
            final style = lesson.style ?? 'Uncategorized';
            grouped.putIfAbsent(style, () => []);
            grouped[style]!.add(lesson);
          }
          final sortedStyles = grouped.keys.toList()
            ..sort((a, b) {
              if (a == 'Uncategorized') return 1;
              if (b == 'Uncategorized') return -1;
              return a.compareTo(b);
            });

          return RefreshIndicator(
            onRefresh: () async {
              _refresh();
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
                const SizedBox(height: 4),
                Text(
                  '${lessons.length} lesson${lessons.length != 1 ? 's' : ''} across ${sortedStyles.length} style${sortedStyles.length != 1 ? 's' : ''}',
                  style: Theme.of(context).textTheme.bodySmall,
                ),
                const SizedBox(height: 20),
                for (final style in sortedStyles) ...[
                  Row(
                    children: [
                      Text(style, style: Theme.of(context).textTheme.titleLarge?.copyWith(fontWeight: FontWeight.w600)),
                      const SizedBox(width: 8),
                      _Badge(label: '${grouped[style]!.length}', color: Colors.white54),
                    ],
                  ),
                  const SizedBox(height: 12),
                  ...grouped[style]!.map((lesson) => _LessonCard(
                    lesson: lesson,
                    onUpdated: _refresh,
                  )),
                  const SizedBox(height: 16),
                ],
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

const _allStyles = [
  'Hip-Hop', 'Salsa', 'Contemporary', 'K-Pop', 'Breaking', 'House',
  'Jazz', 'Ballet', 'Popping', 'Locking', 'Krumping', 'Waacking',
  'Bachata', 'Merengue', 'Cumbia', 'Cha-Cha', 'Samba', 'Reggaeton',
  'Waltz', 'Tango', 'Foxtrot', 'Shuffling', 'Modern', 'Lyrical',
  'Tap', 'Bollywood', 'Flamenco', 'Afrobeats', 'Dancehall',
  'Freestyle', 'Choreography', 'Line Dancing',
];

class _LessonCard extends StatefulWidget {
  final Lesson lesson;
  final VoidCallback onUpdated;

  const _LessonCard({required this.lesson, required this.onUpdated});

  @override
  State<_LessonCard> createState() => _LessonCardState();
}

class _LessonCardState extends State<_LessonCard> {
  late String _title;
  late String? _style;

  @override
  void initState() {
    super.initState();
    _title = widget.lesson.title;
    _style = widget.lesson.style;
  }

  Future<void> _editTitle() async {
    final controller = TextEditingController(text: _title);
    final newTitle = await showDialog<String>(
      context: context,
      builder: (ctx) => AlertDialog(
        title: const Text('Edit Title'),
        content: TextField(
          controller: controller,
          autofocus: true,
          decoration: const InputDecoration(
            labelText: 'Title',
            border: OutlineInputBorder(),
          ),
          onSubmitted: (v) => Navigator.pop(ctx, v.trim()),
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(ctx),
            child: const Text('Cancel'),
          ),
          TextButton(
            onPressed: () => Navigator.pop(ctx, controller.text.trim()),
            child: const Text('Save'),
          ),
        ],
      ),
    );

    if (newTitle == null || newTitle.isEmpty || newTitle == _title || !mounted) return;

    try {
      await ApiService().updateLesson(widget.lesson.id, title: newTitle);
      setState(() => _title = newTitle);
      widget.onUpdated();
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('Failed to update title: $e')),
        );
      }
    }
  }

  Future<void> _editStyle() async {
    final newStyle = await showDialog<String>(
      context: context,
      builder: (ctx) {
        String selected = _style ?? _allStyles.first;
        return AlertDialog(
          title: const Text('Change Style'),
          content: StatefulBuilder(
            builder: (context, setDialogState) => DropdownButtonFormField<String>(
              initialValue: _allStyles.contains(selected) ? selected : _allStyles.first,
              decoration: const InputDecoration(
                labelText: 'Style',
                border: OutlineInputBorder(),
              ),
              items: _allStyles.map((s) => DropdownMenuItem(value: s, child: Text(s))).toList(),
              onChanged: (v) => setDialogState(() => selected = v!),
            ),
          ),
          actions: [
            TextButton(
              onPressed: () => Navigator.pop(ctx),
              child: const Text('Cancel'),
            ),
            TextButton(
              onPressed: () => Navigator.pop(ctx, selected),
              child: const Text('Save'),
            ),
          ],
        );
      },
    );

    if (newStyle == null || newStyle == _style || !mounted) return;

    try {
      await ApiService().updateLesson(widget.lesson.id, style: newStyle);
      setState(() => _style = newStyle);
      widget.onUpdated();
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('Failed to update style: $e')),
        );
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    final lesson = widget.lesson;
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
                  color: const Color(0xFF1A1A22),
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
                          _title.split(' ').take(2).join(' '),
                          style: const TextStyle(fontSize: 22, fontWeight: FontWeight.w300, color: Color(0xFF8888A0)),
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
                        if (lesson.difficulty != null && _style != null)
                          const SizedBox(width: 8),
                        if (_style != null)
                          GestureDetector(
                            onTap: _editStyle,
                            child: _Badge(label: _style!, color: Colors.white70),
                          )
                        else
                          GestureDetector(
                            onTap: _editStyle,
                            child: const _Badge(label: '+ Add style', color: Colors.white38),
                          ),
                        if (!lesson.isAnalyzed) ...[
                          const SizedBox(width: 8),
                          _Badge(label: 'Not analyzed', color: Colors.orange),
                        ],
                      ],
                    ),
                    const SizedBox(height: 10),
                    Row(
                      children: [
                        Expanded(
                          child: Text(_title, style: Theme.of(context).textTheme.titleMedium),
                        ),
                        GestureDetector(
                          onTap: _editTitle,
                          child: Padding(
                            padding: const EdgeInsets.all(4),
                            child: Icon(
                              Icons.edit_outlined,
                              size: 18,
                              color: Theme.of(context).colorScheme.onSurface.withAlpha(128),
                            ),
                          ),
                        ),
                      ],
                    ),
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
