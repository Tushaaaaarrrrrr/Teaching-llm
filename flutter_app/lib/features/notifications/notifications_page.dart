import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../core/auth/auth_providers.dart';
import '../../shared/widgets/neu_card.dart';
import '../../theme/app_colors.dart';
import '../../theme/app_shadows.dart';
import '../../theme/app_typography.dart';
import '../../shared/widgets/app_refresh.dart';

/// GET /api/notifications → list of recent notifications for the user.
/// Server returns up to 30 ordered by createdAt desc.
final notificationsProvider =
    FutureProvider<List<Map<String, dynamic>>>((ref) async {
  final api = ref.watch(apiClientProvider);
  final res = await api.get<dynamic>('/api/notifications');
  final list = (res.data is List) ? res.data as List : const [];
  return [for (final j in list) j as Map<String, dynamic>];
});

class NotificationsPage extends ConsumerWidget {
  const NotificationsPage({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final async = ref.watch(notificationsProvider);
    return Scaffold(
      backgroundColor: AppColors.surface,
      appBar: AppBar(
        backgroundColor: AppColors.surface,
        elevation: 0,
        leading: IconButton(
          icon: const Icon(Icons.chevron_left, color: AppColors.textPrimary),
          onPressed: () => context.canPop() ? context.pop() : context.go('/more'),
        ),
        title: Text('Notifications', style: AppTypography.title),
      ),
      body: AppRefresh(
        onRefresh: () async => ref.invalidate(notificationsProvider),
        child: async.when(
          loading: () => const Center(child: CircularProgressIndicator()),
          error: (e, _) => _Error(message: e.toString()),
          data: (list) {
            if (list.isEmpty) return const _Empty();
            return ListView.separated(
              padding: const EdgeInsets.fromLTRB(16, 12, 16, 24),
              itemCount: list.length,
              separatorBuilder: (_, __) => const SizedBox(height: 10),
              itemBuilder: (_, i) => _NotificationTile(n: list[i]),
            );
          },
        ),
      ),
    );
  }
}

class _NotificationTile extends StatelessWidget {
  const _NotificationTile({required this.n});
  final Map<String, dynamic> n;

  String _rel(String? iso) {
    if (iso == null) return '';
    final dt = DateTime.tryParse(iso)?.toLocal();
    if (dt == null) return '';
    final diff = DateTime.now().difference(dt);
    if (diff.inMinutes < 1) return 'just now';
    if (diff.inMinutes < 60) return '${diff.inMinutes}m ago';
    if (diff.inHours < 24) return '${diff.inHours}h ago';
    if (diff.inDays < 7) return '${diff.inDays}d ago';
    const months = [
      'Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'
    ];
    return '${months[dt.month - 1]} ${dt.day}';
  }

  IconData _icon(String? type) {
    switch (type) {
      case 'COURSE':
      case 'LECTURE':
        return Icons.menu_book_outlined;
      case 'LIVE':
      case 'SESSION':
        return Icons.live_tv_outlined;
      case 'ANNOUNCEMENT':
        return Icons.campaign_outlined;
      case 'EXAM':
        return Icons.quiz_outlined;
      case 'PAYMENT':
        return Icons.payments_outlined;
      default:
        return Icons.notifications_outlined;
    }
  }

  @override
  Widget build(BuildContext context) {
    final title = (n['title'] as String?) ?? 'Notification';
    final message = (n['message'] as String?) ?? '';
    final isRead = (n['isRead'] as bool?) ?? false;
    final type = n['type'] as String?;
    final created = n['createdAt'] as String?;
    return NeuCard(
      padding: const EdgeInsets.all(14),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Container(
            width: 40,
            height: 40,
            decoration: BoxDecoration(
              color: AppColors.primary.withOpacity(isRead ? 0.08 : 0.16),
              borderRadius: BorderRadius.circular(12),
              boxShadow: isRead ? null : AppShadows.pillGlow(AppColors.primary),
            ),
            alignment: Alignment.center,
            child: Icon(_icon(type), color: AppColors.primary, size: 18),
          ),
          const SizedBox(width: 12),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Row(
                  children: [
                    Expanded(
                      child: Text(title,
                          maxLines: 1,
                          overflow: TextOverflow.ellipsis,
                          style: AppTypography.title.copyWith(
                            fontSize: 14,
                            color: isRead
                                ? AppColors.textSecondary
                                : AppColors.textPrimary,
                          )),
                    ),
                    Text(_rel(created),
                        style: AppTypography.bodyMuted.copyWith(fontSize: 11)),
                  ],
                ),
                if (message.isNotEmpty) ...[
                  const SizedBox(height: 4),
                  Text(message,
                      maxLines: 3,
                      overflow: TextOverflow.ellipsis,
                      style: AppTypography.body
                          .copyWith(color: AppColors.textSecondary)),
                ],
              ],
            ),
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
        const Icon(Icons.notifications_none_outlined,
            color: AppColors.textMuted, size: 40),
        const SizedBox(height: 8),
        Text('No notifications yet',
            style: AppTypography.title, textAlign: TextAlign.center),
        const SizedBox(height: 4),
        Text("You're all caught up.",
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
        Text('Could not load notifications',
            style: AppTypography.title, textAlign: TextAlign.center),
        const SizedBox(height: 4),
        Text(message,
            style: AppTypography.bodyMuted, textAlign: TextAlign.center),
      ],
    );
  }
}
