# Flutter Mobile App Setup

## Prerequisites

1. Install Flutter SDK: https://docs.flutter.dev/get-started/install
2. Install Android Studio (for Android emulator) or Xcode (for iOS simulator)
3. Run `flutter doctor` to verify your setup

## Create the Flutter Project

```bash
cd dance-coach/mobile
flutter create --org com.dancecoach --project-name dance_coach .
```

## Key Dependencies (pubspec.yaml)

```yaml
dependencies:
  flutter:
    sdk: flutter
  google_mlkit_pose_detection: ^0.12.0   # MediaPipe pose estimation
  camera: ^0.11.0                         # Camera access
  video_player: ^2.9.0                    # Video playback
  soundtouch_flutter: ^0.1.0              # Audio time-stretching (or use just_audio)
  just_audio: ^0.9.40                     # Audio playback with speed control
  http: ^1.2.0                            # API communication
  provider: ^6.1.0                        # State management
  sqflite: ^2.4.0                         # Local SQLite cache
  path_provider: ^2.1.0                   # File system paths
```

## Project Structure

```
lib/
├── features/
│   ├── upload/          # Video capture + upload
│   ├── lesson/          # Step viewer, speed control
│   ├── practice/        # Camera + pose overlay + recording
│   └── feedback/        # Score display + suggestions
├── services/
│   ├── pose_service.dart    # MediaPipe wrapper
│   ├── audio_service.dart   # Speed control wrapper
│   └── api_service.dart     # Backend API client
├── models/
│   ├── lesson.dart
│   ├── step.dart
│   └── feedback.dart
└── main.dart
```

## Key Implementation Notes

### Pose Estimation (pose_service.dart)
- Use `google_mlkit_pose_detection` which wraps MediaPipe under the hood
- Process camera frames via `InputImage.fromBytes()` for real-time detection
- Draw skeleton overlay using `CustomPainter` on a `Stack` above the camera preview
- 33 landmarks are returned per frame — focus on KEY_JOINTS (shoulders, elbows, wrists, hips, knees, ankles)

### Camera + Skeleton Overlay
```dart
Stack(
  children: [
    CameraPreview(controller),        // Live camera feed
    CustomPaint(                       // Skeleton overlay
      painter: PosePainter(poses, imageSize),
      size: Size.infinite,
    ),
  ],
)
```

### Speed Control
- Use `just_audio` with `player.setSpeed(0.5)` for pitch-preserved slow-down
- Range: 0.25x to 1.0x
- SoundTouch integration available via platform channels if more control needed

### API Communication
- Base URL configured via environment: `AI_SERVICE_URL`
- Upload keyframes (not full video) to `/api/feedback` for scoring
- Fetch lessons from `/api/lessons`

## Backend Connection

The mobile app connects to the same Next.js API as the web app:
- `GET /api/lessons` — list lessons
- `GET /api/lessons/:id` — get lesson with steps
- `POST /api/feedback` — submit keyframes for scoring
- `POST /api/analyze` — trigger video analysis
