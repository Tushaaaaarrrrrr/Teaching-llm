import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../core/auth/auth_providers.dart';
import '../../shared/widgets/pdf/secure_pdf_viewer.dart';
import '../../shared/widgets/secure_window.dart';

/// Wrapper route for the PDF viewer. Owns the FLAG_SECURE lifecycle and
/// pulls the logged-in user's email so the watermark is anchored to a
/// specific account — same shape as the WatchPage wraps the video player.
class MaterialPage extends ConsumerStatefulWidget {
  const MaterialPage({
    super.key,
    required this.contentId,
    this.title,
  });

  final String contentId;
  final String? title;

  static MaterialPage? fromQuery(Map<String, String> query) {
    final id = query['contentId'] ?? query['id'];
    if (id == null || id.isEmpty) return null;
    return MaterialPage(contentId: id, title: query['title']);
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
    // Watermark with the student's email if we have it, falling back to a
    // generic label so the layer still discourages screen-photo leaks.
    final watermark = user?.email ?? user?.name ?? 'Gen-Z IITian';
    return SecurePdfViewer(
      contentId: widget.contentId,
      title: widget.title,
      watermark: watermark,
    );
  }
}
