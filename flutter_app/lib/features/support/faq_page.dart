import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../core/auth/auth_providers.dart';
import '../../shared/widgets/neu_card.dart';
import '../../theme/app_colors.dart';
import '../../theme/app_typography.dart';
import '../../shared/widgets/app_refresh.dart';

/// GET /api/support/faq → [{ id, question, answer, order }] (order asc).
final faqProvider = FutureProvider<List<Map<String, dynamic>>>((ref) async {
  final api = ref.watch(apiClientProvider);
  final res = await api.get<dynamic>('/api/support/faq');
  final list = (res.data is List) ? res.data as List : const [];
  return [for (final j in list) j as Map<String, dynamic>];
});

class FaqPage extends ConsumerWidget {
  const FaqPage({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final async = ref.watch(faqProvider);
    return Scaffold(
      backgroundColor: AppColors.surface,
      appBar: AppBar(
        backgroundColor: AppColors.surface,
        elevation: 0,
        leading: IconButton(
          icon: const Icon(Icons.chevron_left, color: AppColors.textPrimary),
          onPressed: () => context.canPop() ? context.pop() : context.go('/more'),
        ),
        title: Text('FAQ', style: AppTypography.title),
      ),
      body: AppRefresh(
        onRefresh: () async => ref.invalidate(faqProvider),
        child: async.when(
          loading: () => const Center(child: CircularProgressIndicator()),
          error: (e, _) => _Error(message: e.toString()),
          data: (list) {
            if (list.isEmpty) return const _Empty();
            return ListView.separated(
              padding: const EdgeInsets.fromLTRB(16, 12, 16, 24),
              itemCount: list.length,
              separatorBuilder: (_, __) => const SizedBox(height: 10),
              itemBuilder: (_, i) => _FaqTile(faq: list[i]),
            );
          },
        ),
      ),
    );
  }
}

class _FaqTile extends StatefulWidget {
  const _FaqTile({required this.faq});
  final Map<String, dynamic> faq;
  @override
  State<_FaqTile> createState() => _FaqTileState();
}

class _FaqTileState extends State<_FaqTile> {
  bool _open = false;
  @override
  Widget build(BuildContext context) {
    final q = (widget.faq['question'] as String?) ?? '';
    final a = (widget.faq['answer'] as String?) ?? '';
    return NeuCard(
      onTap: () => setState(() => _open = !_open),
      padding: const EdgeInsets.all(14),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Expanded(
                child: Text(q,
                    style: AppTypography.title.copyWith(fontSize: 14.5)),
              ),
              AnimatedRotation(
                turns: _open ? 0.5 : 0,
                duration: const Duration(milliseconds: 180),
                child: const Icon(Icons.expand_more,
                    color: AppColors.textMuted),
              ),
            ],
          ),
          AnimatedCrossFade(
            firstChild: const SizedBox(width: double.infinity),
            secondChild: Padding(
              padding: const EdgeInsets.only(top: 8),
              child: Text(a, style: AppTypography.body),
            ),
            crossFadeState:
                _open ? CrossFadeState.showSecond : CrossFadeState.showFirst,
            duration: const Duration(milliseconds: 200),
          ),
        ],
      ),
    );
  }
}

class _Empty extends StatelessWidget {
  const _Empty();
  @override
  Widget build(BuildContext context) {
    return ListView(
      padding: const EdgeInsets.all(40),
      children: [
        const Icon(Icons.help_outline,
            color: AppColors.textMuted, size: 40),
        const SizedBox(height: 8),
        Text('No FAQs yet',
            style: AppTypography.title, textAlign: TextAlign.center),
        const SizedBox(height: 4),
        Text('Help articles will appear here.',
            style: AppTypography.bodyMuted, textAlign: TextAlign.center),
      ],
    );
  }
}

class _Error extends StatelessWidget {
  const _Error({required this.message});
  final String message;
  @override
  Widget build(BuildContext context) {
    return ListView(
      padding: const EdgeInsets.all(40),
      children: [
        const Icon(Icons.cloud_off, color: AppColors.textMuted, size: 40),
        const SizedBox(height: 8),
        Text('Could not load FAQs',
            style: AppTypography.title, textAlign: TextAlign.center),
        const SizedBox(height: 4),
        Text(message,
            style: AppTypography.bodyMuted, textAlign: TextAlign.center),
      ],
    );
  }
}
