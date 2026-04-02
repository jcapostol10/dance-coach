import 'dart:convert';
import 'package:http/http.dart' as http;
import '../models/lesson.dart';
import '../models/practice_score.dart';

class ApiService {
  static const String baseUrl = 'https://dance-coach.vercel.app/api';
  static const String _baseUrl = baseUrl;

  static String? _authEmail;

  void setAuthEmail(String? email) {
    _authEmail = email;
  }

  Map<String, String> get _headers {
    final headers = <String, String>{'Content-Type': 'application/json'};
    if (_authEmail != null) {
      headers['X-User-Email'] = _authEmail!;
    }
    return headers;
  }

  Future<List<Lesson>> getLessons({String? style, String? difficulty}) async {
    final params = <String, String>{};
    if (style != null) params['style'] = style;
    if (difficulty != null) params['difficulty'] = difficulty;

    final uri = Uri.parse('$_baseUrl/lessons').replace(queryParameters: params.isNotEmpty ? params : null);
    final response = await http.get(uri);

    if (response.statusCode == 200) {
      final List<dynamic> data = json.decode(response.body);
      return data.map((l) => Lesson.fromJson(l as Map<String, dynamic>)).toList();
    }
    throw Exception('Failed to load lessons: ${response.statusCode}');
  }

  Future<Lesson> getLesson(String id) async {
    final response = await http.get(Uri.parse('$_baseUrl/lessons/$id'));

    if (response.statusCode == 200) {
      final data = json.decode(response.body) as Map<String, dynamic>;
      return Lesson.fromJson(data);
    }
    throw Exception('Failed to load lesson: ${response.statusCode}');
  }

  Future<PracticeScore> submitFeedback({
    required String lessonId,
    required List<Map<String, dynamic>> keyframes,
  }) async {
    final response = await http.post(
      Uri.parse('$_baseUrl/feedback'),
      headers: _headers,
      body: json.encode({
        'lessonId': lessonId,
        'userKeyframes': keyframes,
      }),
    );

    if (response.statusCode == 200) {
      final data = json.decode(response.body) as Map<String, dynamic>;
      return PracticeScore.fromJson(data);
    }
    throw Exception('Failed to submit feedback: ${response.statusCode}');
  }

  Future<List<PracticeScore>> getScores(String userId) async {
    final response = await http.get(
      Uri.parse('$_baseUrl/feedback'),
      headers: _headers,
    );

    if (response.statusCode == 200) {
      final List<dynamic> data = json.decode(response.body);
      return data.map((s) => PracticeScore.fromJson(s as Map<String, dynamic>)).toList();
    }
    throw Exception('Failed to load scores: ${response.statusCode}');
  }

  Future<Lesson> updateLesson(String id, {String? title, String? style}) async {
    final body = <String, dynamic>{};
    if (title != null) body['title'] = title;
    if (style != null) body['style'] = style;

    final response = await http.patch(
      Uri.parse('$_baseUrl/lessons/$id'),
      headers: {'Content-Type': 'application/json'},
      body: json.encode(body),
    );

    if (response.statusCode == 200) {
      final data = json.decode(response.body) as Map<String, dynamic>;
      return Lesson.fromJson(data);
    }
    throw Exception('Failed to update lesson: ${response.statusCode}');
  }

  Future<void> deleteLesson(String id) async {
    final response = await http.delete(Uri.parse('$_baseUrl/lessons/$id'));

    if (response.statusCode != 200) {
      final data = json.decode(response.body) as Map<String, dynamic>;
      throw Exception(data['error'] ?? 'Failed to delete lesson');
    }
  }
}
