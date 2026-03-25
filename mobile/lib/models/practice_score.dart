class StepScore {
  final int stepId;
  final double score;
  final List<String> problemJoints;

  StepScore({
    required this.stepId,
    required this.score,
    required this.problemJoints,
  });

  factory StepScore.fromJson(Map<String, dynamic> json) {
    return StepScore(
      stepId: json['stepId'] as int,
      score: (json['score'] as num).toDouble(),
      problemJoints: (json['problemJoints'] as List<dynamic>?)
              ?.map((j) => j as String)
              .toList() ??
          [],
    );
  }
}

class PracticeScore {
  final String id;
  final String lessonId;
  final double overallScore;
  final List<StepScore> stepScores;
  final DateTime createdAt;

  PracticeScore({
    required this.id,
    required this.lessonId,
    required this.overallScore,
    required this.stepScores,
    required this.createdAt,
  });

  factory PracticeScore.fromJson(Map<String, dynamic> json) {
    return PracticeScore(
      id: json['id'].toString(),
      lessonId: json['lessonId'].toString(),
      overallScore: (json['overallScore'] as num).toDouble(),
      stepScores: (json['stepScores'] as List<dynamic>?)
              ?.map((s) => StepScore.fromJson(s as Map<String, dynamic>))
              .toList() ??
          [],
      createdAt: DateTime.parse(json['createdAt'] as String),
    );
  }
}
