import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../core/auth/auth_providers.dart';
import '../../shared/widgets/pdf/secure_pdf_viewer.dart';
import '../../shared/widgets/secure_window.dart';

/// Wrapper route for the PDF viewer. Owns the FLAG_SECURE lifecycle and
/// pulls the logged-in user's email so the watermark is anchored to a
/// specific account — same shape as the WatchPage wraps the video player.
///
/// Accepts EITHER:
///   - contentId  → reads Content.pptUrl via /api/drive-doc/<id>      (lectures)
///   - materialId → reads Material.fileUrl via /api/drive-material/<id> (free res)
class MaterialPage extends ConsumerStatefulWidget {
  const MaterialPage._({
    super.key,
    required this.id,
    required this.proxyEndpoint,
    this.title,
  });

  /// Lecture material flavor. `id` is a Content row id; the proxy reads
  /// `Content.pptUrl` and streams the bytes.
  factory MaterialPage.lecture({
    Key? key,
    required String contentId,
    String? title,
  }) =>
      MaterialPage._(
        key: key,
        id: contentId,
        proxyEndpoint: 'drive-doc',
        title: title,
      );

  /// Free-resource material flavor. `id` is a Material row id; the proxy
  /// reads `Material.fileUrl`.
  factory MaterialPage.material({
    Key? key,
    required String materialId,
    String? title,
  }) =>
      MaterialPage._(
        key: key,
        id: materialId,
        proxyEndpoint: 'drive-material',
        title: title,
      );

  final String id;
  final String proxyEndpoint;
  final String? title;

  /// Router glue: accepts `?materialId=<id>` (free-resources PDF) OR
  /// `?contentId=<id>` / `?id=<id>` (lecture material). The materialId path
  /// takes precedence when both are supplied.
  static MaterialPage? fromQuery(Map<String, String> query) {
    final materialId = query['materialId'];
    if (materialId != null && materialId.isNotEmpty) {
      return MaterialPage.material(
        materialId: materialId,
        title: query['title'],
      );
    }
    final contentId = query['contentId'] ?? query['id'];
    if (contentId == null || contentId.isEmpty) return null;
    return MaterialPage.lecture(
      contentId: contentId,
      title: query['title'],
    );
  }

  @override
  ConsumerState<MaterialPage> createState() => _MaterialPageState();
}

class _MaterialPageState extends ConsumerState<MaterialPage> {
  @override
  void initState() {
    super.initState();
    SecureWindow.enable();
  }

  @override
  void dispose() {
    SecureWindow.disable();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final user = ref.watch(authStateProvider).value;
    final watermark = user?.email ?? user?.name ?? 'Gen-Z IITian';
    return SecurePdfViewer(
      contentId: widget.id,
      proxyEndpoint: widget.proxyEndpoint,
      title: widget.title,
      watermark: watermark,
    );
  }
}
