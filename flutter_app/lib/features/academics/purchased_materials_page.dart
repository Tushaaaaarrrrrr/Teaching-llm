import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:url_launcher/url_launcher.dart';

import '../../shared/widgets/app_refresh.dart';
import '../../shared/widgets/sub_page_header.dart';
import '../../theme/app_colors.dart';
import '../../theme/app_shadows.dart';
import '../../theme/app_typography.dart';
import 'free_resources_page.dart' show purchasedMaterialsProvider;

/// Simple list view of purchased note packs (StoreNoteAccess rows). Reuses
/// the same provider Free Resources already feeds from /api/free-resources/
/// purchased.
class PurchasedMaterialsPage extends ConsumerWidget {
  const PurchasedMaterialsPage({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final async = ref.watch(purchasedMaterialsProvider);
    return Scaffold(
      backgroundColor: AppColors.bg,
      body: SafeArea(
        bottom: false,
        child: Column(
          children: [
            const SubPageHeader(
              title: 'Purchased Materials',
              subtitle: 'Available for 30 days from purchase',
            ),
            const SizedBox(height: 12),
            Expanded(
              child: AppRefresh(
                onRefresh: () async =>
                    ref.invalidate(purchasedMaterialsProvider),
                child: async.when(
                  loading: () =>
                      const Center(child: CircularProgressIndicator()),
                  error: (e, _) => Center(
                    child: Padding(
                      padding: const EdgeInsets.all(24),
                      child: Text("Couldn't load purchases\n$e",
                          textAlign: TextAlign.center,
                          style: AppTypography.bodyMuted),
                    ),
                  ),
                  data: (list) {
                    if (list.isEmpty) {
                      return _Empty();
                    }
                    return ListView.separated(
                      padding: const EdgeInsets.fromLTRB(20, 8, 20, 24),
                      itemCount: list.length,
                      separatorBuilder: (_, __) =>
                          const SizedBox(height: 10),
                      itemBuilder: (_, i) {
                        final raw = list[i];
                        final m = raw is Map
                            ? Map<String, dynamic>.from(raw)
                            : <String, dynamic>{};
                        return _PurchaseRow(item: m);
                      },
                    );
                  },
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }
}

class _Empty extends StatelessWidget {
  @override
  Widget build(BuildContext context) {
    return Center(
      child: Padding(
        padding: const EdgeInsets.all(28),
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          mainAxisSize: MainAxisSize.min,
          children: [
            const Icon(Icons.shopping_bag_outlined,
                color: AppColors.mute2, size: 36),
            const SizedBox(height: 10),
            Text('Nothing purchased yet', style: AppTypography.title),
            const SizedBox(height: 4),
            Text(
              'Purchased note packs appear here. Browse the Store to add one.',
              textAlign: TextAlign.center,
              style: AppTypography.bodyMuted.copyWith(fontSize: 12),
            ),
          ],
        ),
      ),
    );
  }
}

class _PurchaseRow extends StatelessWidget {
  const _PurchaseRow({required this.item});
  final Map<String, dynamic> item;

  Future<void> _open(BuildContext context) async {
    final url = item['fileUrl'] as String?;
    if (url == null || url.isEmpty) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('No file attached to this purchase.')),
      );
      return;
    }
    final uri = Uri.tryParse(url);
    if (uri == null) return;
    final ok = await launchUrl(uri, mode: LaunchMode.externalApplication);
    if (!ok && context.mounted) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text("Couldn't open this file.")),
      );
    }
  }

  @override
  Widget build(BuildContext context) {
    final title = (item['title'] as String?) ?? 'Untitled';
    final purchasedAt = item['purchasedAt'] as String?;
    final description = (item['description'] as String?)?.trim();
    return Material(
      color: AppColors.surface,
      borderRadius: BorderRadius.circular(14),
      child: InkWell(
        onTap: () => _open(context),
        borderRadius: BorderRadius.circular(14),
        child: Container(
          padding: const EdgeInsets.all(14),
          decoration: BoxDecoration(
            borderRadius: BorderRadius.circular(14),
            border: Border.all(color: AppColors.line),
            boxShadow: AppShadows.sm,
          ),
          child: Row(
            children: [
              Container(
                width: 40,
                height: 40,
                decoration: BoxDecoration(
                  color: AppColors.amberSft,
                  borderRadius: BorderRadius.circular(12),
                ),
                child: const Icon(Icons.description_outlined,
                    color: AppColors.amber, size: 20),
              ),
              const SizedBox(width: 12),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(title,
                        maxLines: 2,
                        overflow: TextOverflow.ellipsis,
                        style:
                            AppTypography.title.copyWith(fontSize: 13.5)),
                    if (description != null && description.isNotEmpty) ...[
                      const SizedBox(height: 2),
                      Text(description,
                          maxLines: 1,
                          overflow: TextOverflow.ellipsis,
                          style: AppTypography.bodyMuted
                              .copyWith(fontSize: 11)),
                    ],
                    if (purchasedAt != null) ...[
                      const SizedBox(height: 2),
                      Text(_formatDate(purchasedAt),
                          style: AppTypography.caption.copyWith(
                            color: AppColors.muted,
                            fontSize: 10.5,
                          )),
                    ],
                  ],
                ),
              ),
              const Icon(Icons.chevron_right, color: AppColors.mute2),
            ],
          ),
        ),
      ),
    );
  }

  String _formatDate(String iso) {
    final dt = DateTime.tryParse(iso)?.toLocal();
    if (dt == null) return '';
    const months = [
      'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
      'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec',
    ];
    return 'Purchased ${months[dt.month - 1]} ${dt.day}, ${dt.year}';
  }
}
