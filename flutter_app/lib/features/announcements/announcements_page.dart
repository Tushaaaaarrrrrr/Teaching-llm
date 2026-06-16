import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../core/auth/auth_providers.dart';
import '../../shared/widgets/sub_page_header.dart';
import '../../theme/app_colors.dart';
import '../../theme/app_typography.dart';
import '../../shared/widgets/app_refresh.dart';

/// GET /api/announcements → list of announcements with createdBy + course
/// joined. Sorted createdAt desc. Server returns student-visible global +
/// enrolled-course announcements.
final announcementsProvider =
    FutureProvider<List<Map<String, dynamic>>>((ref) async {
  final api = ref.watch(apiClientProvider);
  try {
    final res = await api.get<dynamic>('/api/announcements');
    final list = res.data is List ? res.data as List : const [];
    return [for (final j in list) j as Map<String, dynamic>];
  } catch (_) {
    return const [];
  }
});

class AnnouncementsPage extends ConsumerWidget {
  const AnnouncementsPage({super.key});

  String _rel(String? iso) {
    if (iso == null) return '';
    final dt = DateTime.tryParse(iso)?.toLocal();
    if (dt == null) return '';
    final diff = DateTime.now().difference(dt);
    if (diff.inMinutes < 60) return '${diff.inMinutes}m ago';
    if (diff.inHours < 24) return '${diff.inHours}h ago';
    if (diff.inDays < 7) return '${diff.inDays}d ago';
    const months = [
      'Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'
    ];
    return '${months[dt.month - 1]} ${dt.day}';
  }

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final async = ref.watch(announcementsProvider);
    return Scaffold(
      backgroundColor: AppColors.bg,
      body: SafeArea(
        bottom: false,
        child: AppRefresh(
          onRefresh: () async => ref.invalidate(announcementsProvider),
          child: async.when(
            loading: () => const Center(child: CircularProgressIndicator()),
            error: (e, _) => ListView(
              padding: const EdgeInsets.all(40),
              children: [
                const Icon(Icons.cloud_off,
                    color: AppColors.mute2, size: 40),
                const SizedBox(height: 8),
                Text('Could not load announcements',
                    style: AppTypography.title,
                    textAlign: TextAlign.center),
                const SizedBox(height: 4),
                Text(e.toString(),
                    style: AppTypography.bodyMuted,
                    textAlign: TextAlign.center),
              ],
            ),
            data: (list) => ListView(
              physics: const AlwaysScrollableScrollPhysics(),
              padding: const EdgeInsets.only(bottom: 24),
              children: [
                const SubPageHeader(
                  title: 'Announcements',
                  subtitle: 'Latest news & updates',
                ),
                const SizedBox(height: 14),
                if (list.isEmpty)
                  Padding(
                    padding: const EdgeInsets.all(40),
                    child: Column(
                      children: [
                        const Icon(Icons.campaign_outlined,
                            color: AppColors.mute2, size: 40),
                        const SizedBox(height: 8),
                        Text('Nothing announced yet',
                            style: AppTypography.title),
                        const SizedBox(height: 4),
                        Text('The team will post updates here.',
                            style: AppTypography.bodyMuted,
                            textAlign: TextAlign.center),
                      ],
                    ),
                  )
                else
                  Padding(
                    padding:
                        const EdgeInsets.symmetric(horizontal: 20),
                    child: Column(
                      children: [
                        for (final a in list) ...[
                          _AnnouncementCard(
                              a: a, rel: _rel(a['createdAt'] as String?)),
                          const SizedBox(height: 12),
                        ],
                      ],
                    ),
                  ),
              ],
            ),
          ),
        ),
      ),
    );
  }
}

class _AnnouncementCard extends StatelessWidget {
  const _AnnouncementCard({required this.a, required this.rel});
  final Map<String, dynamic> a;
  final String rel;
  @override
  Widget build(BuildContext context) {
    final title = (a['title'] as String?) ?? 'Announcement';
    final message = (a['message'] as String?) ?? '';
    final course = a['course'] as Map<String, dynamic>?;
    final author = (a['createdBy'] as Map?)?['name'] as String?;
    return Container(
      padding: const EdgeInsets.all(14),
      decoration: BoxDecoration(
        color: AppColors.surface,
        borderRadius: BorderRadius.circular(14),
        border: Border.all(color: AppColors.line),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Container(
                width: 36,
                height: 36,
                decoration: BoxDecoration(
                  color: AppColors.brandSoft,
                  borderRadius: BorderRadius.circular(10),
                ),
                child: const Icon(Icons.campaign,
                    color: AppColors.brand, size: 18),
              ),
              const SizedBox(width: 10),
              Expanded(
                child: Text(title,
                    style: AppTypography.title.copyWith(fontSize: 14)),
              ),
              Text(rel,
                  style: AppTypography.caption.copyWith(fontSize: 10.5)),
            ],
          ),
          if (message.isNotEmpty) ...[
            const SizedBox(height: 8),
            Text(message,
                style: AppTypography.body
                    .copyWith(fontSize: 12.5, height: 1.45)),
          ],
          if (course != null || author != null) ...[
            const SizedBox(height: 8),
            Wrap(
              spacing: 8,
              children: [
                if (course != null)
                  Container(
                    padding: const EdgeInsets.symmetric(
                        horizontal: 8, vertical: 3),
                    decoration: BoxDecoration(
                      color: AppColors.brandSoft,
                      borderRadius: BorderRadius.circular(6),
                    ),
                    child: Text(
                      (course['name'] as String?)?.toUpperCase() ?? '',
                      style: AppTypography.uppercase.copyWith(
                        color: AppColors.brand,
                        fontSize: 9.5,
                      ),
                    ),
                  ),
                if (author != null)
                  Text('— $author',
                      style: AppTypography.bodyMuted.copyWith(fontSize: 11)),
              ],
            ),
          ],
        ],
      ),
    );
  }
}
