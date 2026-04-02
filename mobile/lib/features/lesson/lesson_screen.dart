import 'package:flutter/material.dart';
import 'package:video_player/video_player.dart';
import '../../models/lesson.dart' as models;
import '../../services/api_service.dart';
import '../../theme/app_theme.dart';

class LessonScreen extends StatefulWidget {
  final String lessonId;

  const LessonScreen({super.key, required this.lessonId});

  @override
  State<LessonScreen> createState() => _LessonScreenState();
}

class _LessonScreenState extends State<LessonScreen> {
  late Future<models.Lesson> _lessonFuture;
  int _currentStep = 0;
  double _speed = 0.5;
  VideoPlayerController? _videoController;
  bool _deleting = false;
  bool _descriptionExpanded = false;
  bool _isPlaying = false;

  @override
  void initState() {
    super.initState();
    _lessonFuture = ApiService().getLesson(widget.lessonId);
    _lessonFuture.then((lesson) {
      _cachedSteps = lesson.steps;
      if (lesson.videoUrl != null && lesson.videoUrl!.isNotEmpty) {
        _initVideo(lesson.videoUrl!, lesson.steps);
      }
    });
  }

  void _initVideo(String url, List<models.Step> steps) {
    _videoController = VideoPlayerController.networkUrl(Uri.parse(url))
      ..initialize().then((_) {
        if (!mounted) return;
        _videoController!.setPlaybackSpeed(_speed);
        _videoController!.addListener(_onVideoTick);
        if (steps.isNotEmpty) {
          _videoController!.seekTo(
            Duration(milliseconds: (steps[0].startTime * 1000).round()),
          );
        }
        setState(() {});
      });
  }

  void _onVideoTick() {
    final ctrl = _videoController;
    if (ctrl == null || !ctrl.value.isInitialized) return;

    // Keep _isPlaying in sync
    final playing = ctrl.value.isPlaying;
    if (playing != _isPlaying) setState(() => _isPlaying = playing);

    // Loop within current step boundaries
    final steps = _cachedSteps;
    if (steps == null || _currentStep >= steps.length) return;
    final step = steps[_currentStep];
    final pos = ctrl.value.position.inMilliseconds / 1000.0;
    if (pos >= step.endTime) {
      ctrl.seekTo(Duration(milliseconds: (step.startTime * 1000).round()));
    }
  }

  List<models.Step>? _cachedSteps;

  void _seekToStep(List<models.Step> steps, int index) {
    _cachedSteps = steps;
    final ctrl = _videoController;
    if (ctrl == null || !ctrl.value.isInitialized) return;
    final step = steps[index];
    ctrl.pause();
    ctrl.seekTo(Duration(milliseconds: (step.startTime * 1000).round()));
    setState(() => _isPlaying = false);
  }

  void _togglePlay(List<models.Step> steps) {
    final ctrl = _videoController;
    if (ctrl == null || !ctrl.value.isInitialized) return;
    if (ctrl.value.isPlaying) {
      ctrl.pause();
    } else {
      final step = steps[_currentStep];
      final pos = ctrl.value.position.inMilliseconds / 1000.0;
      if (pos < step.startTime || pos >= step.endTime) {
        ctrl.seekTo(Duration(milliseconds: (step.startTime * 1000).round()));
      }
      ctrl.setPlaybackSpeed(_speed);
      ctrl.play();
    }
  }

  @override
  void dispose() {
    _videoController?.removeListener(_onVideoTick);
    _videoController?.dispose();
    super.dispose();
  }

  Future<void> _editTitle(String currentTitle) async {
    final controller = TextEditingController(text: currentTitle);
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

    if (newTitle == null || newTitle.isEmpty || newTitle == currentTitle || !mounted) return;

    try {
      await ApiService().updateLesson(widget.lessonId, title: newTitle);
      setState(() {
        _lessonFuture = ApiService().getLesson(widget.lessonId);
      });
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('Failed to update title: $e')),
        );
      }
    }
  }

  static const _allStyles = [
    'Hip-Hop', 'Salsa', 'Contemporary', 'K-Pop', 'Breaking', 'House',
    'Jazz', 'Ballet', 'Popping', 'Locking', 'Krumping', 'Waacking',
    'Bachata', 'Merengue', 'Cumbia', 'Cha-Cha', 'Samba', 'Reggaeton',
    'Waltz', 'Tango', 'Foxtrot', 'Shuffling', 'Modern', 'Lyrical',
    'Tap', 'Bollywood', 'Flamenco', 'Afrobeats', 'Dancehall',
    'Freestyle', 'Choreography', 'Line Dancing',
  ];

  Future<void> _editStyle(String? currentStyle) async {
    final newStyle = await showDialog<String>(
      context: context,
      builder: (ctx) {
        String selected = currentStyle ?? _allStyles.first;
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

    if (newStyle == null || newStyle == currentStyle || !mounted) return;

    try {
      await ApiService().updateLesson(widget.lessonId, style: newStyle);
      setState(() {
        _lessonFuture = ApiService().getLesson(widget.lessonId);
      });
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('Failed to update style: $e')),
        );
      }
    }
  }

  Future<void> _deleteLesson() async {
    final confirmed = await showDialog<bool>(
      context: context,
      builder: (ctx) => AlertDialog(
        title: const Text('Delete Lesson'),
        content: const Text(
          'This will permanently delete the lesson, its video, and all analysis data. Continue?',
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(ctx, false),
            child: const Text('Cancel'),
          ),
          TextButton(
            onPressed: () => Navigator.pop(ctx, true),
            style: TextButton.styleFrom(foregroundColor: Colors.redAccent),
            child: const Text('Delete'),
          ),
        ],
      ),
    );

    if (confirmed != true || !mounted) return;

    setState(() => _deleting = true);
    try {
      await ApiService().deleteLesson(widget.lessonId);
      if (mounted) {
        Navigator.pop(context, true); // true signals refresh needed
      }
    } catch (e) {
      if (mounted) {
        setState(() => _deleting = false);
        ScaffoldMessenger.of(
          context,
        ).showSnackBar(SnackBar(content: Text('Failed to delete: $e')));
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    return FutureBuilder<models.Lesson>(
      future: _lessonFuture,
      builder: (context, snapshot) {
        if (snapshot.connectionState == ConnectionState.waiting) {
          return Scaffold(
            appBar: AppBar(leading: const BackButton()),
            body: const Center(child: CircularProgressIndicator()),
          );
        }

        if (snapshot.hasError) {
          return Scaffold(
            appBar: AppBar(leading: const BackButton()),
            body: Center(
              child: Column(
                mainAxisSize: MainAxisSize.min,
                children: [
                  const Icon(
                    Icons.error_outline,
                    size: 48,
                    color: Colors.redAccent,
                  ),
                  const SizedBox(height: 12),
                  Text(
                    'Failed to load lesson',
                    style: Theme.of(context).textTheme.titleMedium,
                  ),
                  const SizedBox(height: 4),
                  Text(
                    '${snapshot.error}',
                    style: Theme.of(context).textTheme.bodySmall,
                  ),
                ],
              ),
            ),
          );
        }

        final lesson = snapshot.data!;
        final steps = lesson.steps;

        return Scaffold(
          appBar: AppBar(
            title: Text(lesson.title),
            leading: IconButton(
              icon: const Icon(Icons.arrow_back),
              onPressed: () => Navigator.pop(context),
            ),
            actions: [
              IconButton(
                icon: const Icon(Icons.edit_outlined),
                onPressed: () => _editTitle(lesson.title),
                tooltip: 'Edit title',
              ),
              IconButton(
                icon: _deleting
                    ? const SizedBox(
                        width: 20,
                        height: 20,
                        child: CircularProgressIndicator(strokeWidth: 2),
                      )
                    : const Icon(Icons.delete_outline, color: Colors.redAccent),
                onPressed: _deleting ? null : _deleteLesson,
              ),
            ],
          ),
          body: ListView(
            padding: const EdgeInsets.all(16),
            children: [
              // Lesson header badges
              Row(
                children: [
                  if (lesson.difficulty != null)
                    _Badge(
                      label: lesson.difficulty!,
                      color:
                          AppTheme.difficultyColors[lesson.difficulty] ??
                          Colors.grey,
                    ),
                  const SizedBox(width: 8),
                  GestureDetector(
                    onTap: () => _editStyle(lesson.style),
                    child: lesson.style != null
                        ? _Badge(label: lesson.style!, color: Colors.white70)
                        : const _Badge(label: '+ Add style', color: Colors.white38),
                  ),
                  if (lesson.bpm != null) ...[
                    const SizedBox(width: 8),
                    Text(
                      '${lesson.bpm!.round()} BPM',
                      style: Theme.of(context).textTheme.bodySmall,
                    ),
                  ],
                ],
              ),
              const SizedBox(height: 16),

              // Video player (full lesson — seek handled per-step below)
              ClipRRect(
                borderRadius: BorderRadius.circular(12),
                child: AspectRatio(
                  aspectRatio: _videoController?.value.isInitialized == true
                      ? _videoController!.value.aspectRatio
                      : 16 / 9,
                  child: _videoController?.value.isInitialized == true
                      ? Stack(
                          alignment: Alignment.center,
                          children: [
                            VideoPlayer(_videoController!),
                            GestureDetector(
                              onTap: () => _togglePlay(steps),
                              child: AnimatedOpacity(
                                opacity: _isPlaying ? 0.0 : 1.0,
                                duration: const Duration(milliseconds: 200),
                                child: Container(
                                  color: Colors.black38,
                                  child: const Center(
                                    child: Icon(Icons.play_arrow, size: 64, color: Colors.white),
                                  ),
                                ),
                              ),
                            ),
                            if (_isPlaying)
                              Positioned(
                                top: 8, right: 8,
                                child: Container(
                                  padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
                                  decoration: BoxDecoration(
                                    color: Colors.black54,
                                    borderRadius: BorderRadius.circular(6),
                                  ),
                                  child: Text(
                                    '${_speed}x',
                                    style: const TextStyle(fontSize: 11, color: Colors.white, fontFamily: 'monospace'),
                                  ),
                                ),
                              ),
                          ],
                        )
                      : Container(
                          color: const Color(0xFF1A1A22),
                          child: Center(
                            child: lesson.videoUrl != null
                                ? const CircularProgressIndicator()
                                : const Column(
                                    mainAxisSize: MainAxisSize.min,
                                    children: [
                                      Icon(Icons.videocam_off, size: 48, color: Color(0xFF8888A0)),
                                      SizedBox(height: 8),
                                      Text('No video available', style: TextStyle(fontSize: 12, color: Color(0xFF8888A0))),
                                    ],
                                  ),
                          ),
                        ),
                ),
              ),
              // Speed buttons
              if (lesson.videoUrl != null) ...[
                const SizedBox(height: 12),
                Row(
                  mainAxisAlignment: MainAxisAlignment.center,
                  children: [
                    Text('Speed', style: Theme.of(context).textTheme.bodySmall?.copyWith(color: const Color(0xFF8888A0))),
                    const SizedBox(width: 12),
                    for (final opt in const [
                      (value: 0.25, label: '0.25x'),
                      (value: 0.5,  label: '0.5x'),
                      (value: 0.75, label: '0.75x'),
                      (value: 1.0,  label: '1x'),
                    ])
                      Padding(
                        padding: const EdgeInsets.only(right: 6),
                        child: GestureDetector(
                          onTap: () {
                            setState(() => _speed = opt.value);
                            _videoController?.setPlaybackSpeed(opt.value);
                          },
                          child: AnimatedContainer(
                            duration: const Duration(milliseconds: 150),
                            padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
                            decoration: BoxDecoration(
                              color: _speed == opt.value
                                  ? Theme.of(context).colorScheme.primary
                                  : const Color(0xFF1A1A22),
                              borderRadius: BorderRadius.circular(8),
                            ),
                            child: Text(
                              opt.label,
                              style: TextStyle(
                                fontSize: 12,
                                fontFamily: 'monospace',
                                fontWeight: FontWeight.w600,
                                color: _speed == opt.value ? Colors.white : const Color(0xFF8888A0),
                              ),
                            ),
                          ),
                        ),
                      ),
                  ],
                ),
              ],
              const SizedBox(height: 24),

              // Steps section
              if (steps.isNotEmpty) ...[
                // Step-by-step header with speed control
                Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    Text(
                      'Step-by-Step Breakdown',
                      style: Theme.of(context).textTheme.titleLarge,
                    ),
                    Row(
                      children: [
                        Text(
                          '${_speed}x',
                          style: Theme.of(context).textTheme.bodySmall,
                        ),
                        const SizedBox(width: 4),
                        SizedBox(
                          width: 80,
                          child: Slider(
                            value: _speed,
                            min: 0.25,
                            max: 1.0,
                            divisions: 3,
                            onChanged: (v) {
                              setState(() => _speed = v);
                              _videoController?.setPlaybackSpeed(v);
                            },
                          ),
                        ),
                      ],
                    ),
                  ],
                ),
                const SizedBox(height: 12),

                // Step tabs
                SizedBox(
                  height: 72,
                  child: ListView.separated(
                    scrollDirection: Axis.horizontal,
                    itemCount: steps.length,
                    separatorBuilder: (_, _) => const SizedBox(width: 8),
                    itemBuilder: (context, i) {
                      final s = steps[i];
                      final isActive = i == _currentStep;
                      return GestureDetector(
                        onTap: () {
                          setState(() {
                            _currentStep = i;
                            _descriptionExpanded = false;
                          });
                          _seekToStep(steps, i);
                        },
                        child: Container(
                          padding: const EdgeInsets.symmetric(
                            horizontal: 14,
                            vertical: 8,
                          ),
                          decoration: BoxDecoration(
                            color: isActive
                                ? Theme.of(
                                    context,
                                  ).colorScheme.primary.withAlpha(26)
                                : const Color(0xFF1A1A22),
                            borderRadius: BorderRadius.circular(10),
                            border: Border.all(
                              color: isActive
                                  ? Theme.of(context).colorScheme.primary
                                  : const Color(0xFF2E2E3C),
                            ),
                          ),
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            mainAxisSize: MainAxisSize.min,
                            children: [
                              Text(
                                'Step ${s.id}',
                                style: TextStyle(
                                  fontSize: 12,
                                  fontWeight: FontWeight.w600,
                                  color: isActive
                                      ? Colors.white
                                      : const Color(0xFF8888A0),
                                ),
                              ),
                              Text(
                                s.name,
                                style: TextStyle(
                                  fontSize: 11,
                                  color: isActive
                                      ? Colors.white70
                                      : const Color(0xFF8888A0),
                                ),
                              ),
                            ],
                          ),
                        ),
                      );
                    },
                  ),
                ),
                const SizedBox(height: 16),

                // Current step detail card
                Builder(
                  builder: (context) {
                    final step = steps[_currentStep];
                    return Card(
                      child: Padding(
                        padding: const EdgeInsets.all(16),
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Row(
                              mainAxisAlignment: MainAxisAlignment.spaceBetween,
                              children: [
                                Expanded(
                                  child: Text(
                                    'Step ${step.id}: ${step.name}',
                                    style: Theme.of(
                                      context,
                                    ).textTheme.titleMedium,
                                  ),
                                ),
                                Container(
                                  padding: const EdgeInsets.symmetric(
                                    horizontal: 8,
                                    vertical: 4,
                                  ),
                                  decoration: BoxDecoration(
                                    borderRadius: BorderRadius.circular(6),
                                    border: Border.all(
                                      color: const Color(0xFF2E2E3C),
                                    ),
                                  ),
                                  child: Text(
                                    'Beats ${step.startBeat}–${step.endBeat}',
                                    style: const TextStyle(
                                      fontSize: 11,
                                      fontFamily: 'monospace',
                                    ),
                                  ),
                                ),
                              ],
                            ),
                            const SizedBox(height: 4),
                            // Collapsible movement breakdown
                            InkWell(
                              borderRadius: BorderRadius.circular(8),
                              onTap: () => setState(() => _descriptionExpanded = !_descriptionExpanded),
                              child: Padding(
                                padding: const EdgeInsets.symmetric(vertical: 10),
                                child: Row(
                                  children: [
                                    Text(
                                      'Movement Breakdown',
                                      style: Theme.of(context).textTheme.bodyMedium?.copyWith(
                                        fontWeight: FontWeight.w600,
                                      ),
                                    ),
                                    const Spacer(),
                                    AnimatedRotation(
                                      turns: _descriptionExpanded ? 0.5 : 0,
                                      duration: const Duration(milliseconds: 200),
                                      child: const Icon(Icons.keyboard_arrow_down, size: 20, color: Color(0xFF8888A0)),
                                    ),
                                  ],
                                ),
                              ),
                            ),
                            AnimatedCrossFade(
                              firstChild: const SizedBox.shrink(),
                              secondChild: Padding(
                                padding: const EdgeInsets.only(bottom: 12),
                                child: Text(
                                  step.description,
                                  style: Theme.of(context).textTheme.bodyMedium,
                                ),
                              ),
                              crossFadeState: _descriptionExpanded
                                  ? CrossFadeState.showSecond
                                  : CrossFadeState.showFirst,
                              duration: const Duration(milliseconds: 200),
                            ),
                            const Divider(),
                            const SizedBox(height: 8),

                            // Navigation
                            Row(
                              mainAxisAlignment: MainAxisAlignment.spaceBetween,
                              children: [
                                OutlinedButton(
                                  onPressed: _currentStep > 0
                                      ? () => setState(() => _currentStep--)
                                      : null,
                                  child: const Text('\u2190 Previous'),
                                ),
                                Text(
                                  '${_currentStep + 1} of ${steps.length}',
                                  style: Theme.of(context).textTheme.bodySmall,
                                ),
                                OutlinedButton(
                                  onPressed: _currentStep < steps.length - 1
                                      ? () => setState(() => _currentStep++)
                                      : null,
                                  child: const Text('Next \u2192'),
                                ),
                              ],
                            ),
                          ],
                        ),
                      ),
                    );
                  },
                ),
              ] else ...[
                // No steps
                Container(
                  padding: const EdgeInsets.symmetric(vertical: 48),
                  decoration: BoxDecoration(
                    borderRadius: BorderRadius.circular(12),
                    border: Border.all(
                      color: const Color(0xFF2E2E3C),
                      style: BorderStyle.solid,
                    ),
                  ),
                  child: Center(
                    child: Text(
                      lesson.isAnalyzed
                          ? 'No steps were detected for this video.'
                          : "This video hasn't been analyzed yet.",
                      style: Theme.of(context).textTheme.bodySmall,
                    ),
                  ),
                ),
              ],
              const SizedBox(height: 16),

              // Practice button
              ElevatedButton(
                onPressed: () => Navigator.pushNamed(
                  context,
                  '/practice/${widget.lessonId}',
                ),
                child: const Text('Practice This Dance'),
              ),
            ],
          ),
        );
      },
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
      child: Text(
        label,
        style: TextStyle(
          fontSize: 11,
          fontWeight: FontWeight.w600,
          color: color,
        ),
      ),
    );
  }
}
