import 'dart:math' as math;

import 'package:flutter/material.dart';

import '../../shared/utils/admin_content_url.dart';
import '../../theme/app_theme_tokens.dart';
import 'update_rich_text.dart';

class UpdateDialog extends StatefulWidget {
  const UpdateDialog({
    super.key,
    required this.update,
    required this.onDismiss,
  });
  final Map<String, dynamic> update;
  final Future<void> Function() onDismiss;

  @override
  State<UpdateDialog> createState() => _UpdateDialogState();
}

class _UpdateDialogState extends State<UpdateDialog> {
  bool _saving = false;
  String? _error;

  Future<void> _dismiss([String? link]) async {
    if (_saving) return;
    setState(() {
      _saving = true;
      _error = null;
    });
    try {
      await widget.onDismiss();
      if (mounted) Navigator.of(context).pop(link ?? '');
    } catch (_) {
      if (mounted) {
        setState(() {
          _saving = false;
          _error = 'Could not save. Check your connection and try again.';
        });
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    final update = widget.update;
    final imageUrl = resolveAdminContentUrl(update['imageUrl'] as String?);
    final ctaText = update['ctaText'] as String?;
    final ctaLink = update['ctaLink'] as String?;
    return PopScope(
      canPop: false,
      child: Dialog(
        insetPadding: const EdgeInsets.all(20),
        clipBehavior: Clip.antiAlias,
        backgroundColor: context.tokens.cardBg,
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(24)),
        child: ConstrainedBox(
          constraints: BoxConstraints(
              maxWidth: 600,
              maxHeight: MediaQuery.sizeOf(context).height * 0.85),
          child: Stack(
            children: [
              SingleChildScrollView(
                child: Column(
                  mainAxisSize: MainAxisSize.min,
                  crossAxisAlignment: CrossAxisAlignment.stretch,
                  children: [
                    if (imageUrl != null)
                      Image.network(imageUrl.toString(),
                          height: 210,
                          fit: BoxFit.contain,
                          errorBuilder: (_, __, ___) =>
                              const SizedBox.shrink()),
                    Padding(
                      padding: const EdgeInsets.all(24),
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.stretch,
                        children: [
                          Text(update['title']?.toString() ?? 'Update',
                              style: TextStyle(
                                  fontSize: 24,
                                  fontWeight: FontWeight.w800,
                                  color: context.tokens.textPrimary)),
                          const SizedBox(height: 16),
                          UpdateRichText(
                            content: update['content']?.toString() ?? '',
                            onLink: (link) => _dismiss(link),
                          ),
                          const SizedBox(height: 20),
                          if (_error != null) ...[
                            Text(_error!,
                                style: TextStyle(color: context.tokens.danger)),
                            const SizedBox(height: 12),
                          ],
                          if (ctaText != null &&
                              ctaText.isNotEmpty &&
                              ctaLink != null &&
                              ctaLink.isNotEmpty)
                            FilledButton(
                                onPressed:
                                    _saving ? null : () => _dismiss(ctaLink),
                                child: Text(ctaText)),
                          TextButton(
                              onPressed: _saving ? null : _dismiss,
                              child: Text(_saving ? 'Saving...' : 'Close')),
                          if (_error != null)
                            TextButton(
                              onPressed: () => Navigator.of(context).pop(),
                              child: const Text('Not now'),
                            ),
                        ],
                      ),
                    ),
                  ],
                ),
              ),
              if (const {'CONFETTI', 'PARTY_POPS', 'FESTIVAL'}
                  .contains(update['animation']))
                Positioned.fill(
                    child: IgnorePointer(
                        child:
                            _Celebration(type: update['animation'] as String))),
            ],
          ),
        ),
      ),
    );
  }
}

class _Celebration extends StatefulWidget {
  const _Celebration({required this.type});
  final String type;
  @override
  State<_Celebration> createState() => _CelebrationState();
}

class _CelebrationState extends State<_Celebration>
    with SingleTickerProviderStateMixin {
  late final _controller =
      AnimationController(vsync: this, duration: const Duration(seconds: 8))
        ..forward();
  @override
  void dispose() {
    _controller.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    if (MediaQuery.disableAnimationsOf(context)) return const SizedBox.shrink();
    return AnimatedBuilder(
        animation: _controller,
        builder: (_, __) => CustomPaint(
            painter: _CelebrationPainter(widget.type, _controller.value)));
  }
}

class _CelebrationPainter extends CustomPainter {
  _CelebrationPainter(this.type, this.progress);
  final String type;
  final double progress;
  @override
  void paint(Canvas canvas, Size size) {
    if (progress >= 1) return;
    const colors = [
      Colors.amber,
      Colors.pink,
      Colors.blue,
      Colors.green,
      Colors.purple
    ];
    for (var i = 0; i < (type == 'CONFETTI' ? 32 : 8); i++) {
      final phase = (progress * 2 - i * 0.025);
      if (phase < 0 || phase > 1) continue;
      final x = size.width * ((i * 0.618) % 1) + math.sin(phase * 8 + i) * 12;
      final y =
          type == 'FESTIVAL' ? size.height * (1 - phase) : size.height * phase;
      if (type == 'CONFETTI') {
        canvas.save();
        canvas.translate(x, y);
        canvas.rotate(phase * 8 + i);
        canvas.drawRect(const Rect.fromLTWH(0, 0, 6, 12),
            Paint()..color = colors[i % colors.length]);
        canvas.restore();
      } else {
        final painter = TextPainter(
            text: TextSpan(
                text:
                    type == 'FESTIVAL' ? '🏮' : ['🎉', '🎊', '✨', '🎈'][i % 4],
                style: const TextStyle(fontSize: 28)),
            textDirection: TextDirection.ltr)
          ..layout();
        painter.paint(canvas, Offset(x, y));
      }
    }
  }

  @override
  bool shouldRepaint(covariant _CelebrationPainter oldDelegate) =>
      oldDelegate.progress != progress || oldDelegate.type != type;
}
