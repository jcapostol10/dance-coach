class Step {
  final int id;
  final String name;
  final String description;
  final int startBeat;
  final int endBeat;
  final double startTime;
  final double endTime;

  Step({
    required this.id,
    required this.name,
    required this.description,
    required this.startBeat,
    required this.endBeat,
    required this.startTime,
    required this.endTime,
  });

  factory Step.fromJson(Map<String, dynamic> json) {
    return Step(
      id: (json['stepNumber'] ?? json['id']) as int,
      name: json['name'] as String,
      description: json['description'] as String,
      startBeat: (json['startBeat'] as num).toInt(),
      endBeat: (json['endBeat'] as num).toInt(),
      startTime: (json['startTime'] as num).toDouble(),
      endTime: (json['endTime'] as num).toDouble(),
    );
  }
}

class Lesson {
  final String id;
  final String title;
  final String? description;
  final String? style;
  final String? difficulty;
  final String? videoUrl;
  final String? thumbnailUrl;
  final double duration;
  final double? bpm;
  final bool isCurated;
  final bool isAnalyzed;
  final List<Step> steps;

  Lesson({
    required this.id,
    required this.title,
    this.description,
    this.style,
    this.difficulty,
    this.videoUrl,
    this.thumbnailUrl,
    required this.duration,
    this.bpm,
    required this.isCurated,
    this.isAnalyzed = false,
    this.steps = const [],
  });

  factory Lesson.fromJson(Map<String, dynamic> json) {
    return Lesson(
      id: json['id'].toString(),
      title: json['title'] as String,
      description: json['description'] as String?,
      style: json['style'] as String?,
      difficulty: json['difficulty'] as String?,
      videoUrl: json['videoUrl'] as String?,
      thumbnailUrl: json['thumbnailUrl'] as String?,
      duration: (json['duration'] as num?)?.toDouble() ?? 0,
      bpm: (json['bpm'] as num?)?.toDouble(),
      isCurated: json['isCurated'] as bool? ?? false,
      isAnalyzed: json['analyzedAt'] != null,
      steps: (json['steps'] as List<dynamic>?)
              ?.map((s) => Step.fromJson(s as Map<String, dynamic>))
              .toList() ??
          [],
    );
  }

  String get durationFormatted {
    final totalSecs = duration.round();
    final minutes = totalSecs ~/ 60;
    final seconds = totalSecs % 60;
    if (seconds == 0) return '${minutes}m';
    return '${minutes}m ${seconds}s';
  }
}
