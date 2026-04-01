import 'dart:io';
import 'package:flutter/material.dart';
import 'package:image_picker/image_picker.dart';
import '../../theme/app_theme.dart';

enum PracticeState { idle, countdown, recording, processing, analyzing, results }

enum InputMode { record, upload }

class PracticeScreen extends StatefulWidget {
  final String lessonId;

  const PracticeScreen({super.key, required this.lessonId});

  @override
  State<PracticeScreen> createState() => _PracticeScreenState();
}

class _PracticeScreenState extends State<PracticeScreen> {
  PracticeState _state = PracticeState.idle;
  InputMode _inputMode = InputMode.record;
  int _countdownValue = 3;
  File? _uploadedVideo;
  String? _uploadError;

  final _simulatedScores = [
    {'stepId': 1, 'name': 'Starting Position', 'score': 85.0, 'problems': <String>[]},
    {'stepId': 2, 'name': 'Rock Step', 'score': 72.0, 'problems': ['right_knee', 'left_hip']},
    {'stepId': 3, 'name': 'Side Step with Arms', 'score': 58.0, 'problems': ['right_shoulder', 'right_elbow']},
    {'stepId': 4, 'name': 'Body Roll', 'score': 65.0, 'problems': ['left_knee']},
  ];

  Future<void> _pickVideo() async {
    setState(() => _uploadError = null);
    try {
      final picker = ImagePicker();
      final picked = await picker.pickVideo(source: ImageSource.gallery);
      if (picked == null) return;
      setState(() => _uploadedVideo = File(picked.path));
    } catch (e) {
      setState(() => _uploadError = 'Could not open video: $e');
    }
  }

  Future<void> _startRecording() async {
    setState(() => _state = PracticeState.countdown);

    for (int i = 3; i > 0; i--) {
      setState(() => _countdownValue = i);
      await Future.delayed(const Duration(seconds: 1));
    }

    setState(() => _state = PracticeState.recording);
    await Future.delayed(const Duration(seconds: 3));
    setState(() => _state = PracticeState.analyzing);
    await Future.delayed(const Duration(seconds: 2));
    setState(() => _state = PracticeState.results);
  }

  Future<void> _analyzeUpload() async {
    setState(() => _state = PracticeState.processing);
    await Future.delayed(const Duration(seconds: 2));
    setState(() => _state = PracticeState.analyzing);
    await Future.delayed(const Duration(seconds: 2));
    setState(() => _state = PracticeState.results);
  }

  void _reset() {
    setState(() {
      _state = PracticeState.idle;
      _uploadedVideo = null;
      _uploadError = null;
    });
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('Practice Mode'),
        leading: IconButton(
          icon: const Icon(Icons.arrow_back),
          onPressed: () => Navigator.pop(context),
        ),
      ),
      body: _buildBody(context),
    );
  }

  Widget _buildBody(BuildContext context) {
    return switch (_state) {
      PracticeState.idle => _buildIdleState(context),
      PracticeState.countdown => _buildCountdownState(),
      PracticeState.recording => _buildRecordingState(),
      PracticeState.processing => _buildProcessingState(),
      PracticeState.analyzing => _buildAnalyzingState(),
      PracticeState.results => _buildResultsState(context),
    };
  }

  Widget _buildIdleState(BuildContext context) {
    final theme = Theme.of(context);
    final primary = theme.colorScheme.primary;

    return ListView(
      padding: const EdgeInsets.all(16),
      children: [
        Text(
          'Choose how to practice',
          style: theme.textTheme.bodyMedium?.copyWith(color: theme.colorScheme.onSurface.withAlpha(153)),
        ),
        const SizedBox(height: 16),

        // Mode selector
        Row(
          children: [
            Expanded(child: _ModeCard(
              icon: Icons.videocam_outlined,
              label: 'Record yourself',
              subtitle: 'Use your camera live',
              selected: _inputMode == InputMode.record,
              onTap: () => setState(() => _inputMode = InputMode.record),
            )),
            const SizedBox(width: 12),
            Expanded(child: _ModeCard(
              icon: Icons.upload_file_outlined,
              label: 'Upload a video',
              subtitle: 'Analyze a recording',
              selected: _inputMode == InputMode.upload,
              onTap: () => setState(() => _inputMode = InputMode.upload),
            )),
          ],
        ),
        const SizedBox(height: 20),

        // Preview / placeholder area
        Container(
          height: 240,
          decoration: BoxDecoration(
            color: const Color(0xFF1A1A22),
            borderRadius: BorderRadius.circular(12),
            border: Border.all(color: Colors.white.withAlpha(13)),
          ),
          child: _inputMode == InputMode.upload && _uploadedVideo != null
              ? _UploadedVideoTile(file: _uploadedVideo!, primary: primary)
              : Center(
                  child: Column(
                    mainAxisSize: MainAxisSize.min,
                    children: [
                      Icon(
                        _inputMode == InputMode.record
                            ? Icons.videocam_outlined
                            : Icons.upload_file_outlined,
                        size: 48,
                        color: const Color(0xFF8888A0),
                      ),
                      const SizedBox(height: 12),
                      Text(
                        _inputMode == InputMode.record
                            ? 'Position yourself so your full body is visible'
                            : 'Select a video file to analyze',
                        style: const TextStyle(fontSize: 13, color: Color(0xFF8888A0)),
                        textAlign: TextAlign.center,
                      ),
                    ],
                  ),
                ),
        ),

        if (_uploadError != null) ...[
          const SizedBox(height: 8),
          Text(_uploadError!, style: TextStyle(fontSize: 12, color: theme.colorScheme.error)),
        ],

        const SizedBox(height: 16),

        if (_inputMode == InputMode.record)
          ElevatedButton.icon(
            onPressed: _startRecording,
            icon: const Icon(Icons.fiber_manual_record, size: 18),
            label: const Text('Start Recording'),
          )
        else if (_uploadedVideo == null)
          OutlinedButton.icon(
            onPressed: _pickVideo,
            icon: const Icon(Icons.upload_file_outlined, size: 18),
            label: const Text('Choose Video File'),
          )
        else
          Row(
            children: [
              Expanded(
                child: OutlinedButton(
                  onPressed: _pickVideo,
                  child: const Text('Change'),
                ),
              ),
              const SizedBox(width: 12),
              Expanded(
                child: ElevatedButton(
                  onPressed: _analyzeUpload,
                  child: const Text('Analyze'),
                ),
              ),
            ],
          ),

        const SizedBox(height: 24),

        // Instructions card
        Card(
          child: Padding(
            padding: const EdgeInsets.all(16),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text('How Practice Mode Works', style: theme.textTheme.titleMedium),
                const SizedBox(height: 16),
                ...[
                  'Choose to record live or upload an existing video',
                  'AI tracks your body with 33 pose landmarks',
                  'Perform or show the dance moves from the lesson',
                  'AI scores your form per step and gives specific feedback',
                ].indexed.map((e) => Padding(
                  padding: const EdgeInsets.only(bottom: 12),
                  child: Row(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Container(
                        width: 24, height: 24,
                        decoration: BoxDecoration(
                          shape: BoxShape.circle,
                          color: primary.withAlpha(26),
                        ),
                        child: Center(
                          child: Text(
                            '${e.$1 + 1}',
                            style: TextStyle(fontSize: 12, color: primary),
                          ),
                        ),
                      ),
                      const SizedBox(width: 12),
                      Expanded(child: Text(e.$2, style: theme.textTheme.bodyMedium)),
                    ],
                  ),
                )),
              ],
            ),
          ),
        ),
      ],
    );
  }

  Widget _buildCountdownState() {
    return Center(
      child: Text(
        '$_countdownValue',
        style: const TextStyle(fontSize: 96, fontWeight: FontWeight.bold, color: Colors.white),
      ),
    );
  }

  Widget _buildRecordingState() {
    return Center(
      child: Column(
        mainAxisSize: MainAxisSize.min,
        children: [
          Container(
            width: 16, height: 16,
            decoration: const BoxDecoration(shape: BoxShape.circle, color: Colors.red),
          ),
          const SizedBox(height: 16),
          const Text('Recording...', style: TextStyle(fontSize: 18, color: Colors.white)),
          const SizedBox(height: 8),
          Text(
            'Perform the dance moves',
            style: TextStyle(fontSize: 14, color: Colors.white.withAlpha(178)),
          ),
          const SizedBox(height: 32),
          ElevatedButton(
            onPressed: () async {
              setState(() => _state = PracticeState.analyzing);
              await Future.delayed(const Duration(seconds: 2));
              setState(() => _state = PracticeState.results);
            },
            child: const Text('Stop Recording'),
          ),
        ],
      ),
    );
  }

  Widget _buildProcessingState() {
    return Center(
      child: Column(
        mainAxisSize: MainAxisSize.min,
        children: [
          Container(
            width: 16, height: 16,
            decoration: BoxDecoration(shape: BoxShape.circle, color: Colors.blue.shade400),
          ),
          const SizedBox(height: 16),
          const Text('Processing video...', style: TextStyle(fontSize: 18, color: Colors.white)),
          const SizedBox(height: 8),
          Text(
            'Extracting pose data from your recording',
            style: TextStyle(fontSize: 14, color: Colors.white.withAlpha(178)),
          ),
        ],
      ),
    );
  }

  Widget _buildAnalyzingState() {
    return const Center(
      child: Column(
        mainAxisSize: MainAxisSize.min,
        children: [
          CircularProgressIndicator(),
          SizedBox(height: 16),
          Text('Analyzing your performance...', style: TextStyle(fontSize: 16, color: Colors.white)),
        ],
      ),
    );
  }

  Widget _buildResultsState(BuildContext context) {
    final overall = _simulatedScores.fold<double>(
      0, (sum, s) => sum + (s['score'] as double),
    ) / _simulatedScores.length;

    return ListView(
      padding: const EdgeInsets.all(16),
      children: [
        Card(
          child: Padding(
            padding: const EdgeInsets.all(20),
            child: Column(
              children: [
                Text('Overall Score', style: Theme.of(context).textTheme.bodyMedium),
                const SizedBox(height: 8),
                Text(
                  '${overall.round()}',
                  style: TextStyle(
                    fontSize: 48,
                    fontWeight: FontWeight.bold,
                    color: AppTheme.scoreColor(overall),
                  ),
                ),
                Text('/ 100', style: Theme.of(context).textTheme.bodySmall),
              ],
            ),
          ),
        ),
        const SizedBox(height: 16),
        Text('Per-Step Breakdown', style: Theme.of(context).textTheme.titleLarge),
        const SizedBox(height: 12),
        ..._simulatedScores.map((s) {
          final score = s['score'] as double;
          final problems = s['problems'] as List<String>;
          return Padding(
            padding: const EdgeInsets.only(bottom: 8),
            child: Card(
              child: Padding(
                padding: const EdgeInsets.all(14),
                child: Row(
                  children: [
                    Expanded(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text(
                            'Step ${s['stepId']}: ${s['name']}',
                            style: Theme.of(context).textTheme.titleMedium,
                          ),
                          if (problems.isNotEmpty) ...[
                            const SizedBox(height: 6),
                            Wrap(
                              spacing: 4,
                              children: problems.map((j) => Container(
                                padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 2),
                                decoration: BoxDecoration(
                                  color: const Color(0xFFF59E0B).withAlpha(26),
                                  borderRadius: BorderRadius.circular(12),
                                ),
                                child: Text(
                                  j.replaceAll('_', ' '),
                                  style: const TextStyle(fontSize: 10, color: Color(0xFFF59E0B)),
                                ),
                              )).toList(),
                            ),
                          ],
                        ],
                      ),
                    ),
                    Container(
                      padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
                      decoration: BoxDecoration(
                        color: AppTheme.scoreColor(score).withAlpha(26),
                        borderRadius: BorderRadius.circular(8),
                        border: Border.all(color: AppTheme.scoreColor(score).withAlpha(51)),
                      ),
                      child: Text(
                        '${score.round()}/100',
                        style: TextStyle(
                          fontSize: 13,
                          fontWeight: FontWeight.w600,
                          color: AppTheme.scoreColor(score),
                        ),
                      ),
                    ),
                  ],
                ),
              ),
            ),
          );
        }),
        const SizedBox(height: 16),
        Row(
          children: [
            Expanded(
              child: OutlinedButton(
                onPressed: _reset,
                child: const Text('Try Again'),
              ),
            ),
            const SizedBox(width: 12),
            Expanded(
              child: ElevatedButton(
                onPressed: () => Navigator.pop(context),
                child: const Text('Back to Lesson'),
              ),
            ),
          ],
        ),
      ],
    );
  }
}

class _ModeCard extends StatelessWidget {
  final IconData icon;
  final String label;
  final String subtitle;
  final bool selected;
  final VoidCallback onTap;

  const _ModeCard({
    required this.icon,
    required this.label,
    required this.subtitle,
    required this.selected,
    required this.onTap,
  });

  @override
  Widget build(BuildContext context) {
    final primary = Theme.of(context).colorScheme.primary;
    return GestureDetector(
      onTap: onTap,
      child: AnimatedContainer(
        duration: const Duration(milliseconds: 150),
        padding: const EdgeInsets.all(14),
        decoration: BoxDecoration(
          color: selected ? primary.withAlpha(13) : const Color(0xFF1A1A22),
          borderRadius: BorderRadius.circular(12),
          border: Border.all(
            color: selected ? primary.withAlpha(102) : Colors.white.withAlpha(20),
            width: selected ? 1.5 : 1,
          ),
        ),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Icon(icon, size: 24, color: selected ? primary : const Color(0xFF8888A0)),
            const SizedBox(height: 8),
            Text(
              label,
              style: TextStyle(
                fontSize: 13,
                fontWeight: FontWeight.w600,
                color: selected ? Colors.white : const Color(0xFFCCCCDD),
              ),
            ),
            const SizedBox(height: 2),
            Text(
              subtitle,
              style: const TextStyle(fontSize: 11, color: Color(0xFF8888A0)),
            ),
          ],
        ),
      ),
    );
  }
}

class _UploadedVideoTile extends StatelessWidget {
  final File file;
  final Color primary;

  const _UploadedVideoTile({required this.file, required this.primary});

  @override
  Widget build(BuildContext context) {
    final filename = file.path.split('/').last;
    return Column(
      mainAxisAlignment: MainAxisAlignment.center,
      children: [
        Icon(Icons.check_circle_outline, size: 40, color: primary),
        const SizedBox(height: 12),
        Padding(
          padding: const EdgeInsets.symmetric(horizontal: 16),
          child: Text(
            filename,
            style: const TextStyle(fontSize: 13, color: Color(0xFFCCCCDD)),
            textAlign: TextAlign.center,
            maxLines: 2,
            overflow: TextOverflow.ellipsis,
          ),
        ),
        const SizedBox(height: 8),
        Text(
          'Ready to analyze',
          style: TextStyle(fontSize: 12, color: primary.withAlpha(178)),
        ),
      ],
    );
  }
}
