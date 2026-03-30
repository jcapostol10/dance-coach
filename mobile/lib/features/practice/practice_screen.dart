import 'package:flutter/material.dart';
import '../../theme/app_theme.dart';

enum PracticeState { idle, countdown, recording, analyzing, results }

class PracticeScreen extends StatefulWidget {
  final String lessonId;

  const PracticeScreen({super.key, required this.lessonId});

  @override
  State<PracticeScreen> createState() => _PracticeScreenState();
}

class _PracticeScreenState extends State<PracticeScreen> {
  PracticeState _state = PracticeState.idle;
  int _countdownValue = 3;

  // Simulated results
  final _simulatedScores = [
    {'stepId': 1, 'name': 'Starting Position', 'score': 85.0, 'problems': <String>[]},
    {'stepId': 2, 'name': 'Rock Step', 'score': 72.0, 'problems': ['right_knee', 'left_hip']},
    {'stepId': 3, 'name': 'Side Step with Arms', 'score': 58.0, 'problems': ['right_shoulder', 'right_elbow']},
    {'stepId': 4, 'name': 'Body Roll', 'score': 65.0, 'problems': ['left_knee']},
  ];

  void _startRecording() async {
    setState(() => _state = PracticeState.countdown);

    for (int i = 3; i > 0; i--) {
      setState(() => _countdownValue = i);
      await Future.delayed(const Duration(seconds: 1));
    }

    setState(() => _state = PracticeState.recording);

    // Simulate recording for 3 seconds
    await Future.delayed(const Duration(seconds: 3));

    setState(() => _state = PracticeState.analyzing);

    // Simulate analysis
    await Future.delayed(const Duration(seconds: 2));

    setState(() => _state = PracticeState.results);
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
    switch (_state) {
      case PracticeState.idle:
        return _buildIdleState(context);
      case PracticeState.countdown:
        return _buildCountdownState();
      case PracticeState.recording:
        return _buildRecordingState();
      case PracticeState.analyzing:
        return _buildAnalyzingState();
      case PracticeState.results:
        return _buildResultsState(context);
    }
  }

  Widget _buildIdleState(BuildContext context) {
    return ListView(
      padding: const EdgeInsets.all(16),
      children: [
        Text('Record yourself and get AI feedback', style: Theme.of(context).textTheme.bodyMedium),
        const SizedBox(height: 24),

        // Camera placeholder
        Container(
          height: 300,
          decoration: BoxDecoration(
            color: const Color(0xFF1A1A22),
            borderRadius: BorderRadius.circular(12),
          ),
          child: const Center(
            child: Column(
              mainAxisSize: MainAxisSize.min,
              children: [
                Icon(Icons.videocam_outlined, size: 48, color: Color(0xFF8888A0)),
                SizedBox(height: 12),
                Text('Position yourself so your full body is visible', style: TextStyle(fontSize: 13, color: Color(0xFF8888A0))),
              ],
            ),
          ),
        ),
        const SizedBox(height: 20),

        ElevatedButton(
          onPressed: _startRecording,
          child: const Text('Start Recording'),
        ),
        const SizedBox(height: 24),

        // Instructions
        Card(
          child: Padding(
            padding: const EdgeInsets.all(16),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text('How Practice Mode Works', style: Theme.of(context).textTheme.titleMedium),
                const SizedBox(height: 16),
                ...['Position yourself so your full body is visible in the camera',
                    'Hit record and perform the dance moves you learned',
                    'AI will analyze your form and give you specific feedback',
                    'Practice again to improve your score',
                ].asMap().entries.map((e) => Padding(
                  padding: const EdgeInsets.only(bottom: 12),
                  child: Row(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Container(
                        width: 24, height: 24,
                        decoration: BoxDecoration(
                          shape: BoxShape.circle,
                          color: Theme.of(context).colorScheme.primary.withAlpha(26),
                        ),
                        child: Center(child: Text('${e.key + 1}', style: TextStyle(fontSize: 12, color: Theme.of(context).colorScheme.primary))),
                      ),
                      const SizedBox(width: 12),
                      Expanded(child: Text(e.value, style: Theme.of(context).textTheme.bodyMedium)),
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
          Text('Perform the dance moves', style: TextStyle(fontSize: 14, color: Colors.white.withAlpha(178))),
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
    final overall = _simulatedScores.fold<double>(0, (sum, s) => sum + (s['score'] as double)) / _simulatedScores.length;

    return ListView(
      padding: const EdgeInsets.all(16),
      children: [
        // Overall score
        Card(
          child: Padding(
            padding: const EdgeInsets.all(20),
            child: Column(
              children: [
                Text('Overall Score', style: Theme.of(context).textTheme.bodyMedium),
                const SizedBox(height: 8),
                Text(
                  '${overall.round()}',
                  style: TextStyle(fontSize: 48, fontWeight: FontWeight.bold, color: AppTheme.scoreColor(overall)),
                ),
                Text('/ 100', style: Theme.of(context).textTheme.bodySmall),
              ],
            ),
          ),
        ),
        const SizedBox(height: 16),

        Text('Per-Step Breakdown', style: Theme.of(context).textTheme.titleLarge),
        const SizedBox(height: 12),

        // Per-step scores
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
                          Text('Step ${s['stepId']}: ${s['name']}', style: Theme.of(context).textTheme.titleMedium),
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
                                child: Text(j.replaceAll('_', ' '), style: const TextStyle(fontSize: 10, color: Color(0xFFF59E0B))),
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
                      child: Text('${score.round()}/100', style: TextStyle(fontSize: 13, fontWeight: FontWeight.w600, color: AppTheme.scoreColor(score))),
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
                onPressed: () => setState(() => _state = PracticeState.idle),
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
