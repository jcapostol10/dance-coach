import 'package:flutter/material.dart';
import '../../models/lesson.dart' as models;
import '../../theme/app_theme.dart';

// Placeholder steps matching the web app
final _placeholderSteps = [
  models.Step(id: 1, name: 'Starting Position', description: 'Stand with feet shoulder-width apart, knees slightly bent. Arms relaxed at your sides. Weight centered between both feet.', startBeat: 1, endBeat: 4, startTime: 0.0, endTime: 1.6),
  models.Step(id: 2, name: 'Rock Step', description: 'Shift weight to right foot, then left. Add a subtle bounce on each shift. Keep your core engaged and shoulders loose.', startBeat: 5, endBeat: 8, startTime: 1.6, endTime: 3.2),
  models.Step(id: 3, name: 'Side Step with Arms', description: 'Step right foot to the side while bringing both arms up to shoulder height. Bring left foot to meet right. Arms swing naturally.', startBeat: 9, endBeat: 12, startTime: 3.2, endTime: 4.8),
  models.Step(id: 4, name: 'Body Roll', description: 'Starting from the chest, create a wave motion through your torso. Knees bend and straighten to complete the roll. Keep it smooth and controlled.', startBeat: 13, endBeat: 16, startTime: 4.8, endTime: 6.4),
];

class LessonScreen extends StatefulWidget {
  final String lessonId;

  const LessonScreen({super.key, required this.lessonId});

  @override
  State<LessonScreen> createState() => _LessonScreenState();
}

class _LessonScreenState extends State<LessonScreen> {
  int _currentStep = 0;
  double _speed = 1.0;

  @override
  Widget build(BuildContext context) {
    final step = _placeholderSteps[_currentStep];

    return Scaffold(
      appBar: AppBar(
        title: const Text('Basic Hip-Hop Groove'),
        leading: IconButton(
          icon: const Icon(Icons.arrow_back),
          onPressed: () => Navigator.pop(context),
        ),
      ),
      body: ListView(
        padding: const EdgeInsets.all(16),
        children: [
          // Lesson header
          Row(
            children: [
              _Badge(label: 'Beginner', color: AppTheme.difficultyColors['Beginner']!),
              const SizedBox(width: 8),
              _Badge(label: 'Hip-Hop', color: Colors.white70),
              const SizedBox(width: 8),
              Text('95 BPM', style: Theme.of(context).textTheme.bodySmall),
            ],
          ),
          const SizedBox(height: 16),

          // Video placeholder
          Container(
            height: 200,
            decoration: BoxDecoration(
              color: const Color(0xFF1A1A2E),
              borderRadius: BorderRadius.circular(12),
            ),
            child: const Center(
              child: Column(
                mainAxisSize: MainAxisSize.min,
                children: [
                  Icon(Icons.play_circle_outline, size: 48, color: Color(0xFF555577)),
                  SizedBox(height: 8),
                  Text('Video player', style: TextStyle(fontSize: 12, color: Color(0xFF555577))),
                ],
              ),
            ),
          ),
          const SizedBox(height: 24),

          // Step-by-step header with speed control
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Text('Step-by-Step Breakdown', style: Theme.of(context).textTheme.titleLarge),
              Row(
                children: [
                  Text('${_speed}x', style: Theme.of(context).textTheme.bodySmall),
                  const SizedBox(width: 4),
                  SizedBox(
                    width: 80,
                    child: Slider(
                      value: _speed,
                      min: 0.25,
                      max: 1.0,
                      divisions: 3,
                      onChanged: (v) => setState(() => _speed = v),
                    ),
                  ),
                ],
              ),
            ],
          ),
          const SizedBox(height: 12),

          // Step tabs
          SizedBox(
            height: 56,
            child: ListView.separated(
              scrollDirection: Axis.horizontal,
              itemCount: _placeholderSteps.length,
              separatorBuilder: (_, _) => const SizedBox(width: 8),
              itemBuilder: (context, i) {
                final s = _placeholderSteps[i];
                final isActive = i == _currentStep;
                return GestureDetector(
                  onTap: () => setState(() => _currentStep = i),
                  child: Container(
                    padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 8),
                    decoration: BoxDecoration(
                      color: isActive ? Theme.of(context).colorScheme.primary.withAlpha(26) : const Color(0xFF141414),
                      borderRadius: BorderRadius.circular(10),
                      border: Border.all(
                        color: isActive ? Theme.of(context).colorScheme.primary : const Color(0xFF262626),
                      ),
                    ),
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      mainAxisSize: MainAxisSize.min,
                      children: [
                        Text('Step ${s.id}', style: TextStyle(fontSize: 12, fontWeight: FontWeight.w600, color: isActive ? Colors.white : const Color(0xFFA1A1AA))),
                        Text(s.name, style: TextStyle(fontSize: 11, color: isActive ? Colors.white70 : const Color(0xFF71717A))),
                      ],
                    ),
                  ),
                );
              },
            ),
          ),
          const SizedBox(height: 16),

          // Current step detail card
          Card(
            child: Padding(
              padding: const EdgeInsets.all(16),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      Text('Step ${step.id}: ${step.name}', style: Theme.of(context).textTheme.titleMedium),
                      Container(
                        padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                        decoration: BoxDecoration(
                          borderRadius: BorderRadius.circular(6),
                          border: Border.all(color: const Color(0xFF262626)),
                        ),
                        child: Text('Beats ${step.startBeat}–${step.endBeat}', style: const TextStyle(fontSize: 11, fontFamily: 'monospace')),
                      ),
                    ],
                  ),
                  const SizedBox(height: 12),
                  Text(step.description, style: Theme.of(context).textTheme.bodyMedium),
                  const SizedBox(height: 16),

                  // Skeleton overlay placeholder
                  Container(
                    height: 180,
                    decoration: BoxDecoration(
                      color: const Color(0xFF1A1A2E),
                      borderRadius: BorderRadius.circular(10),
                    ),
                    child: const Center(
                      child: Text('Pose skeleton overlay will render here', style: TextStyle(fontSize: 12, color: Color(0xFF555577))),
                    ),
                  ),
                  const SizedBox(height: 16),
                  const Divider(),
                  const SizedBox(height: 8),

                  // Navigation
                  Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      OutlinedButton(
                        onPressed: _currentStep > 0 ? () => setState(() => _currentStep--) : null,
                        child: const Text('← Previous'),
                      ),
                      Text('${_currentStep + 1} of ${_placeholderSteps.length}', style: Theme.of(context).textTheme.bodySmall),
                      OutlinedButton(
                        onPressed: _currentStep < _placeholderSteps.length - 1 ? () => setState(() => _currentStep++) : null,
                        child: const Text('Next →'),
                      ),
                    ],
                  ),
                ],
              ),
            ),
          ),
          const SizedBox(height: 16),

          // Practice button
          ElevatedButton(
            onPressed: () => Navigator.pushNamed(context, '/practice/${widget.lessonId}'),
            child: const Text('Practice This Dance'),
          ),
        ],
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
