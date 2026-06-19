import 'dart:async';
import 'dart:io';

import 'package:dio/dio.dart';
import 'package:flutter/material.dart';
import 'package:flutter_pdfview/flutter_pdfview.dart';
import 'package:path_provider/path_provider.dart';

import '../../../config/api_config.dart';
import '../../../core/auth/token_storage.dart';
import '../../../theme/app_colors.dart';
import '../../../theme/app_typography.dart';

/// SecurePdfViewer — renders a Google-Drive-hosted lecture material (PDF)
/// fetched through `/api/drive-doc/<contentId>`. Architecture mirrors
/// [SecureDrivePlayer]: the proxy validates auth + enrollment on every byte
/// and the student never sees the underlying Drive URL.
///
/// flutter_pdfview can't attach HTTP headers natively, so we do a
/// download-then-render: stream the bytes to the app's private cache
/// directory with the JWT attached, then point the viewer at the local
/// file path. On dispose, the cached file is deleted so it can't be
/// exfiltrated via adb pull.
///
/// On Android the host activity must have FLAG_SECURE set (handled by the
/// route's WatchPage-equivalent wrapper, [SecurePdfPage]) so screenshots
/// and screen recording are blanked.
class SecurePdfViewer extends StatefulWidget {
  const SecurePdfViewer({
    super.key,
    required this.contentId,
    this.proxyEndpoint = 'drive-doc',
    this.title,
    this.watermark,
  });

  final String contentId;

  /// API path segment for the auth proxy. Two flavors today:
  ///   - `drive-doc`      → /api/drive-doc/<contentId>      (lecture pptUrl)
  ///   - `drive-material` → /api/drive-material/<materialId> (free Material)
  /// Both proxies enforce auth + enrollment server-side; the viewer doesn't
  /// care which one — it just downloads PDF bytes.
  final String proxyEndpoint;

  final String? title;

  /// Free-form text (typically the student's email) overlaid semi-
  /// transparently across the PDF surface. If a screenshot leaks past
  /// FLAG_SECURE, the watermark identifies the source account.
  final String? watermark;

  @override
  State<SecurePdfViewer> createState() => _SecurePdfViewerState();
}

class _SecurePdfViewerState extends State<SecurePdfViewer> {
  String? _localPath;
  String? _error;
  double _progress = 0.0;
  int? _totalBytes;
  int _currentPage = 0;
  int _pageCount = 0;
  CancelToken? _cancelToken;

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

      // Private app cache dir — not visible to the file manager, not
      // exposed to other apps, included in `adb backup` only if the app
      // opts in (we don't), and we delete the file on dispose anyway.
      final dir = await getApplicationCacheDirectory();
      final dst = File('${dir.path}/${widget.contentId}.pdf');
      // Wipe any stale copy from a previous run.
      if (await dst.exists()) {
        try {
          await dst.delete();
        } catch (_) {}
      }

      final url =
          '${ApiConfig.baseUrl}/api/${widget.proxyEndpoint}/${widget.contentId}';
      final dio = Dio(BaseOptions(
        connectTimeout: const Duration(seconds: 30),
        receiveTimeout: const Duration(minutes: 5),
        headers: {
          'Authorization': 'Bearer $token',
          'X-Requested-With': 'XMLHttpRequest',
          'Accept': 'application/pdf,*/*;q=0.5',
        },
        validateStatus: (_) => true,
      ));

      _cancelToken = CancelToken();
      final res = await dio.download(
        url,
        dst.path,
        cancelToken: _cancelToken,
        onReceiveProgress: (received, total) {
          if (!mounted) return;
          setState(() {
            _totalBytes = total > 0 ? total : null;
            _progress = total > 0 ? received / total : 0.0;
          });
        },
      );

      final status = res.statusCode ?? 0;
      if (status != 200 && status != 206) {
        try {
          await dst.delete();
        } catch (_) {}
        if (mounted) setState(() => _error = _httpError(status));
        return;
      }

      if (!await dst.exists() || await dst.length() == 0) {
        if (mounted) setState(() => _error = 'Empty file from server.');
        return;
      }

      if (!mounted) {
        try {
          await dst.delete();
        } catch (_) {}
        return;
      }
      setState(() => _localPath = dst.path);
    } on DioException catch (e) {
      if (CancelToken.isCancel(e)) return; // teardown
      if (mounted) setState(() => _error = _dioError(e));
    } catch (e) {
      if (mounted) setState(() => _error = e.toString());
    }
  }

  String _httpError(int status) {
    switch (status) {
      case 401:
        return 'Session expired — please sign in again.';
      case 403:
        return "You don't have access to this material.";
      case 404:
        return 'Material not found for this lecture.';
      case 502:
        return "Couldn't reach Google Drive right now. Try again in a moment.";
      default:
        return 'Material unavailable (status $status).';
    }
  }

  String _dioError(DioException e) {
    if (e.type == DioExceptionType.connectionTimeout ||
        e.type == DioExceptionType.receiveTimeout) {
      return 'Download timed out. Check your connection and try again.';
    }
    return e.message ?? 'Network error.';
  }

  @override
  void dispose() {
    _cancelToken?.cancel();
    // Wipe the cached PDF so it can't be exfiltrated via adb pull or a
    // file manager after the viewer closes. Best-effort.
    final path = _localPath;
    if (path != null) {
      Future.microtask(() async {
        try {
          await File(path).delete();
        } catch (_) {}
      });
    }
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: AppColors.bg,
      appBar: AppBar(
        backgroundColor: AppColors.surface,
        foregroundColor: AppColors.ink,
        elevation: 0,
        title: Text(
          widget.title ?? 'Material',
          maxLines: 1,
          overflow: TextOverflow.ellipsis,
          style: AppTypography.title.copyWith(fontSize: 15),
        ),
        actions: [
          if (_pageCount > 0)
            Padding(
              padding: const EdgeInsets.symmetric(horizontal: 12),
              child: Center(
                child: Text(
                  '${_currentPage + 1} / $_pageCount',
                  style: AppTypography.caption.copyWith(
                    color: AppColors.muted,
                    fontSize: 12,
                  ),
                ),
              ),
            ),
        ],
      ),
      body: _buildBody(),
    );
  }

  Widget _buildBody() {
    if (_error != null) {
      return Center(
        child: Padding(
          padding: const EdgeInsets.all(24),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              const Icon(Icons.error_outline,
                  color: AppColors.mute2, size: 40),
              const SizedBox(height: 10),
              Text("Couldn't open the material",
                  style: AppTypography.title.copyWith(fontSize: 14)),
              const SizedBox(height: 4),
              Text(_error!,
                  textAlign: TextAlign.center,
                  style: AppTypography.bodyMuted.copyWith(fontSize: 12.5)),
            ],
          ),
        ),
      );
    }

    final path = _localPath;
    if (path == null) {
      return _DownloadProgress(
        progress: _progress,
        totalBytes: _totalBytes,
        title: widget.title,
      );
    }

    return Stack(
      fit: StackFit.expand,
      children: [
        PDFView(
          filePath: path,
          enableSwipe: true,
          swipeHorizontal: false,
          autoSpacing: true,
          pageFling: true,
          pageSnap: true,
          fitPolicy: FitPolicy.WIDTH,
          // No tap-to-open behavior — keeps embedded URLs from escaping the
          // viewer to a browser (a small but real exfil vector).
          preventLinkNavigation: true,
          onRender: (pages) {
            if (!mounted) return;
            setState(() => _pageCount = pages ?? 0);
          },
          onPageChanged: (page, _) {
            if (!mounted) return;
            setState(() => _currentPage = page ?? 0);
          },
          onError: (msg) {
            if (!mounted) return;
            setState(() => _error = 'Failed to render PDF: $msg');
          },
        ),
        if ((widget.watermark ?? '').isNotEmpty)
          Positioned.fill(
            child: IgnorePointer(
              child: _Watermark(text: widget.watermark!),
            ),
          ),
      ],
    );
  }
}

class _DownloadProgress extends StatelessWidget {
  const _DownloadProgress({
    required this.progress,
    required this.totalBytes,
    required this.title,
  });
  final double progress;
  final int? totalBytes;
  final String? title;

  String _humanBytes(int? bytes) {
    if (bytes == null || bytes <= 0) return '';
    if (bytes < 1024 * 1024) {
      return '${(bytes / 1024).toStringAsFixed(0)} KB';
    }
    return '${(bytes / (1024 * 1024)).toStringAsFixed(1)} MB';
  }

  @override
  Widget build(BuildContext context) {
    final pct = progress.isFinite ? (progress * 100).clamp(0, 100) : 0;
    final size = _humanBytes(totalBytes);
    return Center(
      child: Padding(
        padding: const EdgeInsets.symmetric(horizontal: 32),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            SizedBox(
              width: 56,
              height: 56,
              child: CircularProgressIndicator(
                value: progress > 0 ? progress : null,
                strokeWidth: 3,
                color: AppColors.brand,
                backgroundColor: AppColors.line,
              ),
            ),
            const SizedBox(height: 16),
            Text(
              'Loading material',
              style: AppTypography.title.copyWith(fontSize: 14),
            ),
            const SizedBox(height: 4),
            Text(
              size.isEmpty
                  ? '${pct.toStringAsFixed(0)}%'
                  : '${pct.toStringAsFixed(0)}% · $size',
              style: AppTypography.bodyMuted.copyWith(fontSize: 12),
            ),
            if (title != null) ...[
              const SizedBox(height: 10),
              Text(
                title!,
                textAlign: TextAlign.center,
                maxLines: 2,
                overflow: TextOverflow.ellipsis,
                style: AppTypography.caption.copyWith(
                  color: AppColors.muted,
                  fontSize: 11.5,
                ),
              ),
            ],
          ],
        ),
      ),
    );
  }
}

/// Tiled, faintly-visible watermark layer painted over the PDF. Survives
/// camera-of-screen leaks (the actual screenshot path is already blocked
/// by FLAG_SECURE on Android).
class _Watermark extends StatelessWidget {
  const _Watermark({required this.text});
  final String text;

  @override
  Widget build(BuildContext context) {
    return LayoutBuilder(
      builder: (_, c) {
        const tileH = 140.0;
        const tileW = 280.0;
        final rows = (c.maxHeight / tileH).ceil() + 1;
        final cols = (c.maxWidth / tileW).ceil() + 1;
        final children = <Widget>[];
        for (var r = 0; r < rows; r++) {
          for (var col = 0; col < cols; col++) {
            children.add(Positioned(
              left: col * tileW - 80,
              top: r * tileH,
              child: Transform.rotate(
                angle: -0.45, // ~ -26°
                child: Text(
                  text,
                  style: const TextStyle(
                    color: Color(0x14000000), // ~8% black
                    fontSize: 14,
                    fontWeight: FontWeight.w700,
                    letterSpacing: 1.2,
                  ),
                ),
              ),
            ));
          }
        }
        return Stack(children: children);
      },
    );
  }
}
