import 'dart:async';

import 'package:dio/dio.dart';
import 'package:flutter/material.dart';
import 'package:media_kit/media_kit.dart';
import 'package:media_kit_video/media_kit_video.dart';
import 'package:shared_preferences/shared_preferences.dart';
import 'package:url_launcher/url_launcher.dart';

import '../../../config/api_config.dart';
import '../../../core/auth/token_storage.dart';
import '../../../theme/app_colors.dart';
import '../../../theme/app_typography.dart';

const _kDriveQualityPrefKey = 'drive_quality_pref';
const _kDriveQualityAuto = 'auto';

/// SecureDrivePlayer — plays Google-Drive-hosted lectures through the
/// backend proxy at `/api/drive-stream/<contentId>`. The student never
/// sees the underlying Drive URL; the proxy verifies their session +
/// enrollment on every byte and Drive credentials never leave the server.
///
/// Migrated from video_player + chewie to media_kit (libmpv) so phone-
/// recorded HEVC clips with profiles the device's hardware decoder doesn't
/// understand still play via the bundled software decoders. APK grew
/// ~20 MB as a result; the trade-off is universal codec coverage.
class SecureDrivePlayer extends StatefulWidget {
  const SecureDrivePlayer({
    super.key,
    required this.contentId,
    this.title,
    this.aspectRatio = 16 / 9,
    this.autoplay = true,
    this.onEnded,
  });

  final String contentId;
  final String? title;
  final double aspectRatio;
  final bool autoplay;
  final VoidCallback? onEnded;

  @override
  State<SecureDrivePlayer> createState() => _SecureDrivePlayerState();
}

class _SecureDrivePlayerState extends State<SecureDrivePlayer> {
  Player? _player;
  VideoController? _controller;
  String? _error;
  bool _ready = false;
  bool _ended = false;
  String? _token;

  // Quality state — same shape as the previous implementation. Populated
  // from /api/content/<id>/variants on first load.
  List<String> _qualities = const [];
  String _currentQuality = _kDriveQualityAuto;

  StreamSubscription<String>? _errorSub;
  StreamSubscription<bool>? _completedSub;

  @override
  void initState() {
    super.initState();
    _bootstrap();
  }

  Future<void> _bootstrap() async {
    try {
      final token = await const TokenStorage().read();
      if (token == null || token.isEmpty) {
        if (mounted) {
          setState(() => _error = 'Not signed in — please log in again.');
        }
        return;
      }
      _token = token;

      final qualities = await _fetchAvailableQualities();
      final saved = await _loadQualityPref();
      _qualities = qualities;
      _currentQuality = qualities.contains(saved) ? saved : _kDriveQualityAuto;

      // Build the player + controller before opening media so the Video
      // widget can attach as soon as we mount.
      final player = Player(
        configuration: const PlayerConfiguration(
          // Keep titles short in libmpv's window-title prop (no-op on
          // Android but tidy on desktop).
          title: 'Gen-Z IITian',
          // Enable hardware decoding when available; libmpv falls back to
          // software when the hardware path can't handle the source.
        ),
      );
      _player = player;
      _controller = VideoController(player);

      _errorSub = player.stream.error.listen((msg) {
        if (!mounted || msg.isEmpty) return;
        setState(() => _error = _humanize(msg));
      });
      _completedSub = player.stream.completed.listen((done) {
        if (!mounted || !done || _ended) return;
        _ended = true;
        widget.onEnded?.call();
      });

      // Pre-flight probe so auth/Drive errors surface as clean strings
      // rather than the player spinning indefinitely.
      final probe = await _probeStream();
      if (probe != null) {
        if (mounted) setState(() => _error = probe);
        return;
      }

      await _openForQuality(_currentQuality, resume: Duration.zero);

      if (!mounted) return;
      setState(() => _ready = true);
    } catch (e) {
      if (mounted) setState(() => _error = _humanize(e));
    }
  }

  Future<void> _openForQuality(String quality, {required Duration resume}) async {
    final p = _player;
    if (p == null) return;
    final token = _token;
    if (token == null) return;
    final query = quality == _kDriveQualityAuto ? '' : '?quality=$quality';
    final url =
        '${ApiConfig.baseUrl}/api/drive-stream/${widget.contentId}$query';
    await p.open(
      Media(url, httpHeaders: {
        'Authorization': 'Bearer $token',
        'X-Requested-With': 'XMLHttpRequest',
      }),
      play: widget.autoplay || resume > Duration.zero,
    );
    if (resume > Duration.zero) {
      // Wait briefly for the player to settle, then seek.
      await Future<void>.delayed(const Duration(milliseconds: 250));
      await p.seek(resume);
    }
  }

  /// Quick auth/enrollment probe before we hand the URL to libmpv. Surfaces
  /// 401/403/404/502 as clear strings; null when the proxy is healthy.
  Future<String?> _probeStream() async {
    try {
      final token = _token ?? '';
      final url =
          '${ApiConfig.baseUrl}/api/drive-stream/${widget.contentId}';
      final dio = Dio(BaseOptions(
        connectTimeout: const Duration(seconds: 10),
        receiveTimeout: const Duration(seconds: 25),
        headers: {
          'Authorization': 'Bearer $token',
          'X-Requested-With': 'XMLHttpRequest',
          'Range': 'bytes=0-0',
        },
        validateStatus: (_) => true,
        responseType: ResponseType.bytes,
      ));
      final res = await dio.get<dynamic>(url);
      final s = res.statusCode ?? 0;
      if (s == 200 || s == 206) return null;
      if (s == 401) return 'Session expired — please sign in again.';
      if (s == 403) return "You don't have access to this lecture.";
      if (s == 404) return 'Lecture video not found.';
      if (s == 502) {
        return "Couldn't reach Google Drive right now. Try again in a moment.";
      }
      return 'Video unavailable (status $s).';
    } on DioException catch (e) {
      if (e.type == DioExceptionType.connectionTimeout ||
          e.type == DioExceptionType.receiveTimeout) {
        return 'Server is taking too long. Check your connection and try again.';
      }
      return e.message ?? 'Network error.';
    } catch (e) {
      return _humanize(e);
    }
  }

  Future<List<String>> _fetchAvailableQualities() async {
    try {
      final token = _token ?? '';
      final dio = Dio(BaseOptions(
        connectTimeout: const Duration(seconds: 10),
        receiveTimeout: const Duration(seconds: 15),
        headers: {
          'Authorization': 'Bearer $token',
          'X-Requested-With': 'XMLHttpRequest',
        },
        validateStatus: (_) => true,
      ));
      final res = await dio.get<dynamic>(
        '${ApiConfig.baseUrl}/api/content/${widget.contentId}/variants',
      );
      if (res.statusCode != 200) return const [];
      final data = res.data;
      if (data is! Map) return const [];
      final variants = data['variants'];
      if (variants is! Map) return const [];
      final labels = variants.keys.cast<String>().toList()
        ..sort((a, b) => _resolutionRank(b).compareTo(_resolutionRank(a)));
      return labels;
    } catch (_) {
      return const [];
    }
  }

  int _resolutionRank(String label) {
    final m = RegExp(r'(\d+)').firstMatch(label);
    return m == null ? 0 : int.tryParse(m.group(1)!) ?? 0;
  }

  Future<String> _loadQualityPref() async {
    try {
      final prefs = await SharedPreferences.getInstance();
      return prefs.getString(_kDriveQualityPrefKey) ?? _kDriveQualityAuto;
    } catch (_) {
      return _kDriveQualityAuto;
    }
  }

  Future<void> _saveQualityPref(String label) async {
    try {
      final prefs = await SharedPreferences.getInstance();
      await prefs.setString(_kDriveQualityPrefKey, label);
    } catch (_) {}
  }

  String _qualityDisplayLabel() {
    if (_currentQuality == _kDriveQualityAuto) return 'Auto';
    return _currentQuality;
  }

  Future<void> _showQualitySheet(BuildContext context) async {
    if (_qualities.isEmpty) return;
    final picked = await showModalBottomSheet<String>(
      context: context,
      backgroundColor: const Color(0xEE0B1020),
      isScrollControlled: true,
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(20)),
      ),
      builder: (_) => _DriveQualitySheet(
        current: _currentQuality,
        qualities: _qualities,
      ),
    );
    if (picked == null || picked == _currentQuality) return;
    await _switchQuality(picked);
  }

  Future<void> _switchQuality(String label) async {
    final p = _player;
    if (p == null) return;
    final resume = p.state.position;
    setState(() => _currentQuality = label);
    await _saveQualityPref(label);
    await _openForQuality(label, resume: resume);
  }

  String _humanize(Object? raw) {
    final s = raw?.toString() ?? 'Playback failed';
    final lower = s.toLowerCase();
    if (s.contains('401') || lower.contains('unauthorized')) {
      return 'Session expired — please sign in again.';
    }
    if (s.contains('403') || lower.contains('not enrolled')) {
      return "You don't have access to this lecture.";
    }
    if (s.contains('404')) return 'Lecture video not found.';
    if (s.contains('502') || s.contains('Drive')) {
      return "Couldn't fetch the video from Drive. Try again in a moment.";
    }
    return s.length > 200 ? '${s.substring(0, 200)}…' : s;
  }

  Future<void> _openInDrive(BuildContext context) async {
    try {
      final token = _token ?? await const TokenStorage().read();
      if (token == null || token.isEmpty) return;
      final dio = Dio(BaseOptions(
        connectTimeout: const Duration(seconds: 10),
        receiveTimeout: const Duration(seconds: 10),
        headers: {
          'Authorization': 'Bearer $token',
          'X-Requested-With': 'XMLHttpRequest',
        },
        validateStatus: (_) => true,
      ));
      final res = await dio.get<dynamic>(
        '${ApiConfig.baseUrl}/api/content/${widget.contentId}',
      );
      final raw =
          (res.data is Map ? res.data['videoUrl'] : null) as String?;
      if (raw == null || raw.isEmpty) {
        if (context.mounted) {
          ScaffoldMessenger.of(context).showSnackBar(
            const SnackBar(content: Text('No Drive link on this lecture.')),
          );
        }
        return;
      }
      final uri = Uri.tryParse(raw);
      if (uri == null) return;
      final ok = await launchUrl(uri, mode: LaunchMode.externalApplication);
      if (!ok && context.mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text("Couldn't open Drive.")),
        );
      }
    } catch (_) {/* best effort */}
  }

  @override
  void dispose() {
    _errorSub?.cancel();
    _completedSub?.cancel();
    _player?.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    if (_error != null) {
      return AspectRatio(
        aspectRatio: widget.aspectRatio,
        child: _ErrorView(
          message: _error!,
          onOpenInDrive: () => _openInDrive(context),
        ),
      );
    }
    final c = _controller;
    if (c == null || !_ready) {
      return AspectRatio(
        aspectRatio: widget.aspectRatio,
        child: Container(
          color: Colors.black,
          alignment: Alignment.center,
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              const SizedBox(
                width: 32,
                height: 32,
                child: CircularProgressIndicator(
                  strokeWidth: 2.5,
                  valueColor: AlwaysStoppedAnimation(Colors.white),
                ),
              ),
              const SizedBox(height: 12),
              Text(
                widget.title ?? 'Loading lecture…',
                maxLines: 1,
                overflow: TextOverflow.ellipsis,
                textAlign: TextAlign.center,
                style: AppTypography.bodyMuted.copyWith(
                  color: const Color(0xCCFFFFFF),
                  fontSize: 12,
                ),
              ),
            ],
          ),
        ),
      );
    }
    return AspectRatio(
      aspectRatio: widget.aspectRatio,
      child: MaterialVideoControlsTheme(
        normal: MaterialVideoControlsThemeData(
          seekBarPositionColor: AppColors.brand,
          seekBarThumbColor: AppColors.brand,
          buttonBarButtonSize: 24,
          buttonBarHeight: 56,
          speedUpFactor: 1.0,
          // Surface the quality picker alongside the speed picker so
          // students can switch resolution from the same controls strip.
          topButtonBar: _qualities.isEmpty
              ? const []
              : [
                  const Spacer(),
                  _QualityButton(
                    label: _qualityDisplayLabel(),
                    onTap: () => _showQualitySheet(context),
                  ),
                  const SizedBox(width: 8),
                ],
        ),
        fullscreen: MaterialVideoControlsThemeData(
          seekBarPositionColor: AppColors.brand,
          seekBarThumbColor: AppColors.brand,
          topButtonBar: _qualities.isEmpty
              ? const []
              : [
                  const Spacer(),
                  _QualityButton(
                    label: _qualityDisplayLabel(),
                    onTap: () => _showQualitySheet(context),
                  ),
                  const SizedBox(width: 8),
                ],
        ),
        child: Video(
          controller: c,
          aspectRatio: widget.aspectRatio,
          controls: AdaptiveVideoControls,
          fit: BoxFit.contain,
        ),
      ),
    );
  }
}

class _QualityButton extends StatelessWidget {
  const _QualityButton({required this.label, required this.onTap});
  final String label;
  final VoidCallback onTap;
  @override
  Widget build(BuildContext context) {
    return Material(
      color: const Color(0x33000000),
      borderRadius: BorderRadius.circular(8),
      child: InkWell(
        onTap: onTap,
        borderRadius: BorderRadius.circular(8),
        child: Padding(
          padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 6),
          child: Row(
            mainAxisSize: MainAxisSize.min,
            children: [
              const Icon(Icons.high_quality_outlined,
                  color: Colors.white, size: 16),
              const SizedBox(width: 4),
              Text(
                label,
                style: AppTypography.caption.copyWith(
                  color: Colors.white,
                  fontSize: 11.5,
                  fontWeight: FontWeight.w700,
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}

class _DriveQualitySheet extends StatelessWidget {
  const _DriveQualitySheet({
    required this.current,
    required this.qualities,
  });

  final String current;
  final List<String> qualities;

  @override
  Widget build(BuildContext context) {
    return SafeArea(
      top: false,
      child: Padding(
        padding: const EdgeInsets.fromLTRB(20, 14, 20, 18),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            Center(
              child: Container(
                width: 36,
                height: 4,
                decoration: BoxDecoration(
                  color: const Color(0x55FFFFFF),
                  borderRadius: BorderRadius.circular(2),
                ),
              ),
            ),
            const SizedBox(height: 12),
            Text(
              'Quality',
              style: AppTypography.h2.copyWith(
                fontSize: 17,
                color: AppColors.textInverse,
              ),
            ),
            const SizedBox(height: 10),
            _SheetRow(
              label: 'Auto',
              sub: 'Manager-recommended default',
              selected: current == _kDriveQualityAuto,
              onTap: () => Navigator.of(context).pop(_kDriveQualityAuto),
            ),
            for (final q in qualities)
              _SheetRow(
                label: q,
                sub: '',
                selected: current == q,
                onTap: () => Navigator.of(context).pop(q),
              ),
          ],
        ),
      ),
    );
  }
}

class _SheetRow extends StatelessWidget {
  const _SheetRow({
    required this.label,
    required this.sub,
    required this.selected,
    required this.onTap,
  });
  final String label;
  final String sub;
  final bool selected;
  final VoidCallback onTap;
  @override
  Widget build(BuildContext context) {
    return Material(
      color: selected ? const Color(0x224F46E5) : Colors.transparent,
      borderRadius: BorderRadius.circular(10),
      child: InkWell(
        onTap: onTap,
        borderRadius: BorderRadius.circular(10),
        child: Padding(
          padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 12),
          child: Row(
            children: [
              Icon(
                selected ? Icons.check_circle : Icons.radio_button_unchecked,
                color: selected ? AppColors.brand : const Color(0x99FFFFFF),
                size: 18,
              ),
              const SizedBox(width: 12),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      label,
                      style: AppTypography.title.copyWith(
                        fontSize: 14,
                        color: AppColors.textInverse,
                      ),
                    ),
                    if (sub.isNotEmpty)
                      Padding(
                        padding: const EdgeInsets.only(top: 1),
                        child: Text(
                          sub,
                          style: AppTypography.caption.copyWith(
                            color: const Color(0x99FFFFFF),
                            fontSize: 11,
                          ),
                        ),
                      ),
                  ],
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}

class _ErrorView extends StatelessWidget {
  const _ErrorView({required this.message, this.onOpenInDrive});
  final String message;
  final VoidCallback? onOpenInDrive;
  @override
  Widget build(BuildContext context) {
    return Container(
      color: Colors.black,
      alignment: Alignment.center,
      padding: const EdgeInsets.all(24),
      child: Column(
        mainAxisSize: MainAxisSize.min,
        children: [
          const Icon(Icons.error_outline, color: Colors.white70, size: 36),
          const SizedBox(height: 10),
          Text(message,
              textAlign: TextAlign.center,
              style: AppTypography.body.copyWith(color: Colors.white)),
          if (onOpenInDrive != null) ...[
            const SizedBox(height: 14),
            Material(
              color: AppColors.brand,
              borderRadius: BorderRadius.circular(10),
              child: InkWell(
                onTap: onOpenInDrive,
                borderRadius: BorderRadius.circular(10),
                child: Padding(
                  padding: const EdgeInsets.symmetric(
                      horizontal: 14, vertical: 9),
                  child: Row(
                    mainAxisSize: MainAxisSize.min,
                    children: [
                      const Icon(Icons.open_in_new,
                          color: Colors.white, size: 15),
                      const SizedBox(width: 6),
                      Text('Open in Google Drive',
                          style: AppTypography.title.copyWith(
                            color: Colors.white,
                            fontSize: 12.5,
                            fontWeight: FontWeight.w800,
                          )),
                    ],
                  ),
                ),
              ),
            ),
          ],
        ],
      ),
    );
  }
}
