import 'dart:convert';
import 'dart:io';
import 'package:flutter/material.dart';
import 'package:image_picker/image_picker.dart';
import 'package:http/http.dart' as http;

class UploadScreen extends StatefulWidget {
  const UploadScreen({super.key});

  @override
  State<UploadScreen> createState() => _UploadScreenState();
}

class _UploadScreenState extends State<UploadScreen> {
  static const _baseUrl = 'http://10.0.2.2:3000/api';

  File? _videoFile;
  String _title = '';
  String _style = 'Hip-Hop';
  String _difficulty = 'Beginner';
  String _status = '';
  bool _isProcessing = false;
  Map<String, dynamic>? _result;

  final _styles = [
    'Hip-Hop', 'Salsa', 'Contemporary', 'K-Pop', 'Breaking', 'House', 'Jazz', 'Ballet',
  ];
  final _difficulties = ['Beginner', 'Intermediate', 'Advanced'];

  Future<void> _pickVideo() async {
    final picker = ImagePicker();
    final video = await picker.pickVideo(source: ImageSource.gallery);
    if (video != null) {
      setState(() {
        _videoFile = File(video.path);
        if (_title.isEmpty) {
          _title = video.name.replaceAll(RegExp(r'\.[^.]+$'), '').replaceAll(RegExp(r'[-_]'), ' ');
        }
      });
    }
  }

  Future<void> _recordVideo() async {
    final picker = ImagePicker();
    final video = await picker.pickVideo(source: ImageSource.camera);
    if (video != null) {
      setState(() {
        _videoFile = File(video.path);
        if (_title.isEmpty) _title = 'Recorded Dance';
      });
    }
  }

  Future<void> _upload() async {
    if (_videoFile == null || _title.isEmpty) return;

    setState(() {
      _isProcessing = true;
      _status = 'Getting upload URL...';
      _result = null;
    });

    try {
      // Step 1: Get presigned URL
      final uploadRes = await http.post(
        Uri.parse('$_baseUrl/upload'),
        headers: {'Content-Type': 'application/json'},
        body: json.encode({
          'filename': _videoFile!.path.split('/').last,
          'contentType': 'video/mp4',
        }),
      );

      if (uploadRes.statusCode != 200) throw Exception('Failed to get upload URL');
      final uploadData = json.decode(uploadRes.body);

      // Step 2: Upload to R2
      final fileBytes = await _videoFile!.readAsBytes();
      final sizeMb = (fileBytes.length / 1024 / 1024).toStringAsFixed(1);
      setState(() => _status = 'Uploading $sizeMb MB...');

      final putRes = await http.put(
        Uri.parse(uploadData['uploadUrl']),
        headers: {'Content-Type': 'video/mp4'},
        body: fileBytes,
      );

      if (putRes.statusCode != 200) throw Exception('Failed to upload video');

      // Step 3: Create lesson
      setState(() => _status = 'Creating lesson...');
      final lessonRes = await http.post(
        Uri.parse('$_baseUrl/lessons'),
        headers: {'Content-Type': 'application/json'},
        body: json.encode({
          'id': uploadData['lessonId'],
          'title': _title,
          'style': _style,
          'difficulty': _difficulty,
          'videoUrl': uploadData['publicUrl'],
          'duration': 0,
        }),
      );

      if (lessonRes.statusCode != 201) throw Exception('Failed to create lesson');

      // Step 4: Analyze
      setState(() => _status = 'AI is analyzing — detecting beats, poses, moves...');
      final analyzeRes = await http.post(
        Uri.parse('$_baseUrl/analyze'),
        headers: {'Content-Type': 'application/json'},
        body: json.encode({'lessonId': uploadData['lessonId']}),
      );

      if (analyzeRes.statusCode != 200) {
        final err = json.decode(analyzeRes.body);
        throw Exception(err['error'] ?? 'Analysis failed');
      }

      final analysisData = json.decode(analyzeRes.body);
      setState(() {
        _result = analysisData['lesson'];
        _isProcessing = false;
        _status = '';
      });
    } catch (e) {
      setState(() {
        _isProcessing = false;
        _status = 'Error: $e';
      });
    }
  }

  void _reset() {
    setState(() {
      _videoFile = null;
      _title = '';
      _style = 'Hip-Hop';
      _difficulty = 'Beginner';
      _status = '';
      _isProcessing = false;
      _result = null;
    });
  }

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);

    if (_result != null) {
      return _buildResults(theme);
    }

    return SingleChildScrollView(
      padding: const EdgeInsets.all(16),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text('Upload Dance Video',
              style: theme.textTheme.headlineSmall
                  ?.copyWith(fontWeight: FontWeight.bold)),
          const SizedBox(height: 4),
          Text('Upload a video for AI analysis',
              style: theme.textTheme.bodySmall
                  ?.copyWith(color: theme.colorScheme.onSurface.withAlpha(153))),
          const SizedBox(height: 24),

          // Video picker
          GestureDetector(
            onTap: _isProcessing ? null : _pickVideo,
            child: Container(
              width: double.infinity,
              height: 160,
              decoration: BoxDecoration(
                border: Border.all(
                  color: _videoFile != null
                      ? Colors.green.withAlpha(128)
                      : theme.colorScheme.outline.withAlpha(77),
                  width: 2,
                ),
                borderRadius: BorderRadius.circular(12),
                color: _videoFile != null
                    ? Colors.green.withAlpha(13)
                    : Colors.transparent,
              ),
              child: _videoFile != null
                  ? Column(
                      mainAxisAlignment: MainAxisAlignment.center,
                      children: [
                        Icon(Icons.videocam, color: Colors.green[400], size: 32),
                        const SizedBox(height: 8),
                        Text(
                          _videoFile!.path.split('/').last,
                          style: TextStyle(
                              color: Colors.green[400], fontSize: 13),
                          textAlign: TextAlign.center,
                        ),
                        const SizedBox(height: 4),
                        Text(
                          '${(_videoFile!.lengthSync() / 1024 / 1024).toStringAsFixed(1)} MB',
                          style: theme.textTheme.bodySmall?.copyWith(
                              color: theme.colorScheme.onSurface.withAlpha(153)),
                        ),
                      ],
                    )
                  : Column(
                      mainAxisAlignment: MainAxisAlignment.center,
                      children: [
                        Icon(Icons.upload_file,
                            color: theme.colorScheme.onSurface.withAlpha(102),
                            size: 32),
                        const SizedBox(height: 8),
                        Text('Tap to select a video',
                            style: theme.textTheme.bodySmall?.copyWith(
                                color: theme.colorScheme.onSurface
                                    .withAlpha(153))),
                      ],
                    ),
            ),
          ),
          const SizedBox(height: 12),
          Row(
            children: [
              Expanded(
                child: OutlinedButton.icon(
                  onPressed: _isProcessing ? null : _pickVideo,
                  icon: const Icon(Icons.photo_library, size: 18),
                  label: const Text('Gallery'),
                ),
              ),
              const SizedBox(width: 12),
              Expanded(
                child: OutlinedButton.icon(
                  onPressed: _isProcessing ? null : _recordVideo,
                  icon: const Icon(Icons.videocam, size: 18),
                  label: const Text('Record'),
                ),
              ),
            ],
          ),
          const SizedBox(height: 24),

          // Title
          TextField(
            decoration: const InputDecoration(
              labelText: 'Title',
              hintText: 'e.g. Basic Hip-Hop Groove',
              border: OutlineInputBorder(),
            ),
            onChanged: (v) => _title = v,
            controller: TextEditingController(text: _title)
              ..selection = TextSelection.collapsed(offset: _title.length),
          ),
          const SizedBox(height: 16),

          // Style & Difficulty
          Row(
            children: [
              Expanded(
                child: DropdownButtonFormField<String>(
                  initialValue: _style,
                  decoration: const InputDecoration(
                    labelText: 'Style',
                    border: OutlineInputBorder(),
                  ),
                  items: _styles
                      .map((s) => DropdownMenuItem(value: s, child: Text(s)))
                      .toList(),
                  onChanged: (v) => setState(() => _style = v!),
                ),
              ),
              const SizedBox(width: 12),
              Expanded(
                child: DropdownButtonFormField<String>(
                  initialValue: _difficulty,
                  decoration: const InputDecoration(
                    labelText: 'Difficulty',
                    border: OutlineInputBorder(),
                  ),
                  items: _difficulties
                      .map((d) => DropdownMenuItem(value: d, child: Text(d)))
                      .toList(),
                  onChanged: (v) => setState(() => _difficulty = v!),
                ),
              ),
            ],
          ),
          const SizedBox(height: 24),

          // Status
          if (_status.isNotEmpty)
            Container(
              width: double.infinity,
              padding: const EdgeInsets.all(12),
              decoration: BoxDecoration(
                border: Border.all(
                    color: _status.startsWith('Error')
                        ? Colors.red.withAlpha(77)
                        : theme.colorScheme.outline.withAlpha(51)),
                borderRadius: BorderRadius.circular(8),
              ),
              child: Row(
                children: [
                  if (!_status.startsWith('Error'))
                    const SizedBox(
                      width: 16,
                      height: 16,
                      child: CircularProgressIndicator(strokeWidth: 2),
                    ),
                  if (_status.startsWith('Error'))
                    Icon(Icons.error_outline, size: 16, color: Colors.red[400]),
                  const SizedBox(width: 12),
                  Expanded(
                    child: Text(_status,
                        style: TextStyle(
                          fontSize: 13,
                          color: _status.startsWith('Error')
                              ? Colors.red[400]
                              : null,
                        )),
                  ),
                ],
              ),
            ),

          const SizedBox(height: 16),
          SizedBox(
            width: double.infinity,
            height: 48,
            child: FilledButton(
              onPressed:
                  _videoFile != null && _title.isNotEmpty && !_isProcessing
                      ? _upload
                      : null,
              child: Text(_isProcessing ? 'Processing...' : 'Upload & Analyze'),
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildResults(ThemeData theme) {
    final bpm = (_result!['bpm'] as num).toStringAsFixed(0);
    final steps = _result!['steps'] as List<dynamic>;
    final duration = (_result!['duration'] as num).toStringAsFixed(0);

    return SingleChildScrollView(
      padding: const EdgeInsets.all(16),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Icon(Icons.check_circle, color: Colors.green[400]),
              const SizedBox(width: 8),
              Text('Analysis Complete',
                  style: theme.textTheme.titleMedium
                      ?.copyWith(fontWeight: FontWeight.bold, color: Colors.green[400])),
            ],
          ),
          const SizedBox(height: 16),
          Row(
            children: [
              _statCard(theme, bpm, 'BPM'),
              const SizedBox(width: 8),
              _statCard(theme, '${steps.length}', 'Steps'),
              const SizedBox(width: 8),
              _statCard(theme, '${duration}s', 'Duration'),
            ],
          ),
          const SizedBox(height: 20),
          Text('Detected Steps',
              style: theme.textTheme.titleSmall
                  ?.copyWith(fontWeight: FontWeight.w600)),
          const SizedBox(height: 12),
          ...steps.asMap().entries.map((entry) {
            final i = entry.key;
            final step = entry.value as Map<String, dynamic>;
            return Container(
              margin: const EdgeInsets.only(bottom: 8),
              padding: const EdgeInsets.all(12),
              decoration: BoxDecoration(
                border: Border.all(color: theme.colorScheme.outline.withAlpha(51)),
                borderRadius: BorderRadius.circular(10),
              ),
              child: Row(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  CircleAvatar(
                    radius: 14,
                    backgroundColor: theme.colorScheme.primary.withAlpha(51),
                    child: Text('${i + 1}',
                        style: TextStyle(
                            fontSize: 12,
                            fontWeight: FontWeight.bold,
                            color: theme.colorScheme.primary)),
                  ),
                  const SizedBox(width: 12),
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(step['name'] ?? 'Step ${i + 1}',
                            style: const TextStyle(
                                fontWeight: FontWeight.w600, fontSize: 14)),
                        const SizedBox(height: 2),
                        Text(step['description'] ?? '',
                            style: theme.textTheme.bodySmall?.copyWith(
                                color: theme.colorScheme.onSurface
                                    .withAlpha(153))),
                      ],
                    ),
                  ),
                ],
              ),
            );
          }),
          const SizedBox(height: 16),
          SizedBox(
            width: double.infinity,
            height: 48,
            child: FilledButton(
              onPressed: _reset,
              child: const Text('Upload Another'),
            ),
          ),
        ],
      ),
    );
  }

  Widget _statCard(ThemeData theme, String value, String label) {
    return Expanded(
      child: Container(
        padding: const EdgeInsets.symmetric(vertical: 12),
        decoration: BoxDecoration(
          border: Border.all(color: theme.colorScheme.outline.withAlpha(51)),
          borderRadius: BorderRadius.circular(10),
        ),
        child: Column(
          children: [
            Text(value,
                style: const TextStyle(
                    fontSize: 22, fontWeight: FontWeight.bold)),
            const SizedBox(height: 2),
            Text(label,
                style: theme.textTheme.bodySmall?.copyWith(
                    color: theme.colorScheme.onSurface.withAlpha(153))),
          ],
        ),
      ),
    );
  }
}
