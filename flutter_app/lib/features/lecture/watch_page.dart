import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../core/auth/auth_providers.dart';
import '../../shared/widgets/drive/secure_drive_player.dart';
import '../../shared/widgets/secure_window.dart';
import '../../shared/widgets/video_watermark.dart';
import '../../shared/widgets/youtube/secure_youtube_player.dart';
import '../../shared/widgets/youtube/youtube_utils.dart';
import '../../theme/app_colors.dart';
import '../../theme/app_typography.dart';
import '../downloads/video_download_button.dart';

/// Shown by the router when /watch is opened without a usable source.
class MissingVideoPage extends StatelessWidget {
  const MissingVideoPage({super.key});

  @override
  Widget build(BuildContext context) {
    return const Scaffold(
      backgroundColor: Colors.black,
      body: Center(
        child: Text(
          'Missing or invalid video URL.',
          style: TextStyle(color: Colors.white),
        ),
      ),
    );
  }
}

/// What kind of video the WatchPage should render.
enum VideoSource { youtube, drive }

/// Renders a lecture in a black full-bleed scaffold with native anti-piracy protection.
class WatchPage extends ConsumerStatefulWidget {
  const WatchPage({
    super.key,
    required this.source,
    this.youtubeVideoId,
    this.driveContentId,
    this.title,
    this.courseId,
    this.courseName,
    this.localPath,
    this.isLive = false,
  }) : assert(
          (source == VideoSource.youtube && youtubeVideoId != null) ||
              (source == VideoSource.drive && driveContentId != null),
          'Need the right id for the chosen source',
        );

  final VideoSource source;
  final String? youtubeVideoId;
  final String? driveContentId;
  final String? title;
  final String? courseId;
  final String? courseName;
  final String? localPath;
  final bool isLive;

  /// Router glue — accepts both the new `?source=` shape and legacy query params.
  static WatchPage? fromQuery(Map<String, String> query) {
    final src = query['source']?.toLowerCase();
    final title = query['title'];
    final live = query['live'] == 'true' || query['live'] == '1';
    final courseId = query['courseId'];
    final courseName = query['courseName'];
    final localPath = query['localPath'];

    if (src == 'drive') {
      final contentId = query['contentId'] ?? query['id'];
      if (contentId == null || contentId.isEmpty) return null;
      return WatchPage(
        source: VideoSource.drive,
        driveContentId: contentId,
        title: title,
        courseId: courseId,
        courseName: courseName,
        localPath: localPath,
      );
    }

    // YouTube path — accept ?id=, ?url=, or sniff a Drive URL passed via ?url=
    final url = query['url'];
    if (url != null && _isDriveUrl(url)) {
      final contentId = query['contentId'] ?? query['id'];
      if (contentId == null || contentId.isEmpty) return null;
      return WatchPage(
        source: VideoSource.drive,
        driveContentId: contentId,
        title: title,
        courseId: courseId,
        courseName: courseName,
        localPath: localPath,
      );
    }

    final id = query['id'];
    final resolved =
        id ?? (url != null ? YouTubeUtils.extractVideoId(url) : null);
    if (resolved == null || resolved.isEmpty) return null;
    final hintedLive =
        live || (url != null && YouTubeUtils.isLikelyLive(url));
    return WatchPage(
      source: VideoSource.youtube,
      youtubeVideoId: resolved,
      title: title,
      courseId: courseId,
      courseName: courseName,
      isLive: hintedLive,
    );
  }

  static bool _isDriveUrl(String url) {
    final s = url.toLowerCase();
    return s.contains('drive.google.com') || s.contains('docs.google.com');
  }

  @override
  ConsumerState<WatchPage> createState() => _WatchPageState();
}

class _WatchPageState extends ConsumerState<WatchPage> {
  final GlobalKey _playerKey = GlobalKey();
  bool _isScreenLocked = false;
  bool _isCompleted = false;

  @override
  void initState() {
    super.initState();
    SecureWindow.enable();
    SystemChrome.setPreferredOrientations(const [
      DeviceOrientation.portraitUp,
      DeviceOrientation.landscapeLeft,
      DeviceOrientation.landscapeRight,
    ]);
  }

  @override
  void dispose() {
    SecureWindow.disable();
    SystemChrome.setPreferredOrientations(const [
      DeviceOrientation.portraitUp,
    ]);
    SystemChrome.setEnabledSystemUIMode(
      SystemUiMode.edgeToEdge,
      overlays: SystemUiOverlay.values,
    );
    super.dispose();
  }

  Future<void> _markCompleted() async {
    final contentId = widget.driveContentId;
    if (contentId == null || _isCompleted) return;

    try {
      final client = ref.read(apiClientProvider);
      await client.post('/api/lectures/progress', body: {
        'contentId': contentId,
        'status': 'COMPLETED',
      });
      if (mounted) {
        setState(() => _isCompleted = true);
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(
            content: Text('Lecture marked as completed!'),
            duration: Duration(seconds: 2),
            backgroundColor: Color(0xFF10B981),
          ),
        );
      }
    } catch (_) {
      // Progress queue handles offline/background sync
    }
  }

  Widget _buildPlayer() {
    switch (widget.source) {
      case VideoSource.youtube:
        return SecureYouTubePlayer(
          key: _playerKey,
          videoId: widget.youtubeVideoId!,
          isLive: widget.isLive,
          title: null,
          autoplay: true,
        );
      case VideoSource.drive:
        return SecureDrivePlayer(
          key: _playerKey,
          contentId: widget.driveContentId!,
          title: widget.title,
          localPathOverride: widget.localPath,
          aspectRatio: 16 / 9,
          autoplay: true,
        );
    }
  }

  @override
  Widget build(BuildContext context) {
    final isLandscape =
        MediaQuery.of(context).orientation == Orientation.landscape;
    final user = ref.watch(authStateProvider).value;
    final watermarkText = user != null
        ? '${user.name.isNotEmpty ? user.name : "Student"} • ${user.email}'
        : 'GenZ IITian • Protected';

    return Scaffold(
      backgroundColor: Colors.black,
      body: SafeArea(
        top: !isLandscape,
        bottom: !isLandscape,
        left: false,
        right: false,
        child: Stack(
          children: [
            Column(
              crossAxisAlignment: CrossAxisAlignment.stretch,
              children: [
                if (!isLandscape) ...[
                  _TopBar(
                    title: widget.title,
                    isLocked: _isScreenLocked,
                    onToggleLock: () =>
                        setState(() => _isScreenLocked = !_isScreenLocked),
                    onMarkCompleted:
                        widget.driveContentId != null ? _markCompleted : null,
                    isCompleted: _isCompleted,
                    driveContentId: widget.driveContentId,
                    courseId: widget.courseId,
                    courseName: widget.courseName,
                  ),
                  const SizedBox(height: 4),
                ],
                Expanded(
                  child: Center(
                    child: AspectRatio(
                      aspectRatio: 16 / 9,
                      child: Stack(
                        fit: StackFit.expand,
                        children: [
                          _buildPlayer(),
                          FloatingVideoWatermark(
                            userText: watermarkText,
                            opacity: 0.32,
                          ),
                          if (_isScreenLocked)
                            Positioned.fill(
                              child: Container(
                                color: Colors.transparent,
                              ),
                            ),
                        ],
                      ),
                    ),
                  ),
                ),
              ],
            ),
            // Floating unlock button when touch lock is active in landscape
            if (_isScreenLocked && isLandscape)
              Positioned(
                top: 16,
                right: 16,
                child: FloatingActionButton.small(
                  backgroundColor: Colors.black54,
                  foregroundColor: Colors.white,
                  onPressed: () => setState(() => _isScreenLocked = false),
                  child: const Icon(Icons.lock_open, size: 20),
                ),
              ),
          ],
        ),
      ),
    );
  }
}

class _TopBar extends StatelessWidget {
  const _TopBar({
    required this.title,
    required this.isLocked,
    required this.onToggleLock,
    this.onMarkCompleted,
    this.isCompleted = false,
    this.driveContentId,
    this.courseId,
    this.courseName,
  });

  final String? title;
  final bool isLocked;
  final VoidCallback onToggleLock;
  final VoidCallback? onMarkCompleted;
  final bool isCompleted;
  final String? driveContentId;
  final String? courseId;
  final String? courseName;

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.fromLTRB(8, 6, 12, 8),
      child: Row(
        children: [
          IconButton(
            color: AppColors.textInverse,
            icon: const Icon(Icons.chevron_left),
            onPressed: () {
              SystemChrome.setPreferredOrientations(
                  [DeviceOrientation.portraitUp]);
              SystemChrome.setEnabledSystemUIMode(SystemUiMode.edgeToEdge);
              if (context.canPop()) {
                context.pop();
              } else {
                context.go('/courses');
              }
            },
          ),
          Expanded(
            child: Text(
              title ?? 'Lecture',
              maxLines: 1,
              overflow: TextOverflow.ellipsis,
              style: AppTypography.title.copyWith(
                color: AppColors.textInverse,
                fontSize: 15,
              ),
            ),
          ),
          if (driveContentId != null)
            Padding(
              padding: const EdgeInsets.only(right: 4),
              child: VideoDownloadButton(
                contentId: driveContentId!,
                title: title ?? 'Lecture Video',
                courseId: courseId,
                courseName: courseName,
                compact: true,
              ),
            ),
          if (onMarkCompleted != null)
            IconButton(
              tooltip: isCompleted ? 'Completed' : 'Mark Completed',
              icon: Icon(
                isCompleted ? Icons.check_circle : Icons.check_circle_outline,
                color: isCompleted ? const Color(0xFF10B981) : Colors.white70,
                size: 22,
              ),
              onPressed: onMarkCompleted,
            ),
          IconButton(
            tooltip:
                isLocked ? 'Unlock Screen Controls' : 'Lock Screen Controls',
            icon: Icon(
              isLocked ? Icons.lock : Icons.lock_open,
              color: isLocked ? const Color(0xFFF59E0B) : Colors.white70,
              size: 22,
            ),
            onPressed: onToggleLock,
          ),
        ],
      ),
    );
  }
}
