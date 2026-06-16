import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:go_router/go_router.dart';

import '../../shared/widgets/drive/secure_drive_player.dart';
import '../../shared/widgets/secure_window.dart';
import '../../shared/widgets/youtube/secure_youtube_player.dart';
import '../../shared/widgets/youtube/youtube_utils.dart';
import '../../theme/app_colors.dart';
import '../../theme/app_typography.dart';

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

/// What kind of video the WatchPage should render. Determined either by an
/// explicit `?source=...` query param or by sniffing the URL pattern when a
/// raw `?url=` is supplied (Drive URLs map to drive; everything else falls
/// through to YouTube to preserve existing behavior).
/// Which player WatchPage renders. Public because it appears in the
/// WatchPage constructor signature; the router never instantiates this
/// directly — `WatchPage.fromQuery` is the only intended entry point.
enum VideoSource { youtube, drive }

/// Renders a lecture in a black full-bleed scaffold. Supports two sources:
///
///   • YouTube — `context.go('/watch?source=youtube&id=...&title=...')` or
///     the legacy `?url=<youtube link>` shape.
///   • Google Drive (via our auth-proxied stream) —
///     `context.go('/watch?source=drive&contentId=<lectureId>&title=...')`.
///
/// While mounted, the page sets `FLAG_SECURE` on the host activity to
/// deter casual screenshots / screen recordings of paid lectures.
class WatchPage extends StatefulWidget {
  const WatchPage({
    super.key,
    required this.source,
    this.youtubeVideoId,
    this.driveContentId,
    this.title,
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
  final bool isLive;

  /// Router glue — accepts both the new `?source=` shape and the legacy
  /// `?url=` / `?id=` query params so existing call-sites keep working.
  static WatchPage? fromQuery(Map<String, String> query) {
    final src = query['source']?.toLowerCase();
    final title = query['title'];
    final live = query['live'] == 'true' || query['live'] == '1';

    if (src == 'drive') {
      final contentId = query['contentId'] ?? query['id'];
      if (contentId == null || contentId.isEmpty) return null;
      return WatchPage(
        source: VideoSource.drive,
        driveContentId: contentId,
        title: title,
      );
    }

    // YouTube path — accept ?id=, ?url=, or sniff a Drive URL passed via ?url=
    final url = query['url'];
    if (url != null && _isDriveUrl(url)) {
      // Legacy call-site used ?url=<drive link>&id=<contentId> shape:
      // prefer the explicit contentId; otherwise the URL is useless because
      // the proxy needs the Content row id, not the Drive file id.
      final contentId = query['contentId'] ?? query['id'];
      if (contentId == null || contentId.isEmpty) return null;
      return WatchPage(
        source: VideoSource.drive,
        driveContentId: contentId,
        title: title,
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
      isLive: hintedLive,
    );
  }

  static bool _isDriveUrl(String url) {
    final s = url.toLowerCase();
    return s.contains('drive.google.com') || s.contains('docs.google.com');
  }

  @override
  State<WatchPage> createState() => _WatchPageState();
}

class _WatchPageState extends State<WatchPage> {
  // Keep the player in a single Element across orientation changes so its
  // state (playback position, controller, ExoPlayer surface) is preserved.
  // Without these keys, swapping between the portrait and landscape branches
  // of build() unmounts the player and the video restarts from t=0.
  final GlobalKey _playerKey = GlobalKey();

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
    // Hard-reset the screen back to the app's normal shape no matter how the
    // user leaves: tap our chevron, swipe back, hit the hardware back, or
    // exit fullscreen mid-way through.
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
          aspectRatio: 16 / 9,
          autoplay: true,
        );
    }
  }

  @override
  Widget build(BuildContext context) {
    final isLandscape =
        MediaQuery.of(context).orientation == Orientation.landscape;

    // ONE widget tree across both orientations. The same _buildPlayer() call
    // sits at the same position in the element tree, so Flutter keeps the
    // player's State alive when rotation flips orientation — no restart.
    return Scaffold(
      backgroundColor: Colors.black,
      body: SafeArea(
        top: !isLandscape,
        bottom: !isLandscape,
        left: false,
        right: false,
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            if (!isLandscape) ...[
              _TopBar(title: widget.title),
              const SizedBox(height: 4),
            ],
            Expanded(
              child: Center(
                child: AspectRatio(
                  aspectRatio: 16 / 9,
                  child: _buildPlayer(),
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }
}

class _TopBar extends StatelessWidget {
  const _TopBar({required this.title});
  final String? title;

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
        ],
      ),
    );
  }
}
