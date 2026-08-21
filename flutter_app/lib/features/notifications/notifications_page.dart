import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../core/auth/auth_providers.dart';
import '../../theme/app_shadows.dart';
import '../../theme/app_theme_tokens.dart';
import '../../shared/widgets/app_refresh.dart';

/// GET /api/notifications → list of recent notifications for the user.
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
    final tokens = context.tokens;

    return Scaffold(
      backgroundColor: tokens.bg,
      appBar: AppBar(
        backgroundColor: tokens.cardBg,
        surfaceTintColor: Colors.transparent,
        elevation: 0,
        leading: IconButton(
          icon: Icon(Icons.chevron_left, color: tokens.textPrimary),
          onPressed: () => context.canPop() ? context.pop() : context.go('/more'),
        ),
        title: Text(
          'Notifications',
          style: TextStyle(
            color: tokens.textPrimary,
            fontSize: 16,
            fontWeight: FontWeight.w800,
          ),
        ),
      ),
      body: AppRefresh(
        onRefresh: () async => ref.invalidate(notificationsProvider),
        child: async.when(
          loading: () => Center(
            child: CircularProgressIndicator(
              strokeWidth: 2,
              color: tokens.primaryAccent,
            ),
          ),
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
    final tokens = context.tokens;
    final title = (n['title'] as String?) ?? 'Notification';
    final message = (n['message'] as String?) ?? '';
    final isRead = (n['isRead'] as bool?) ?? false;
    final type = n['type'] as String?;
    final created = n['createdAt'] as String?;

    return Container(
      padding: const EdgeInsets.all(14),
      decoration: BoxDecoration(
        color: tokens.cardBg,
        borderRadius: BorderRadius.circular(14),
        border: Border.all(color: tokens.border),
      ),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Container(
            width: 40,
            height: 40,
            decoration: BoxDecoration(
              color: tokens.primaryAccent.withOpacity(isRead ? 0.08 : 0.16),
              borderRadius: BorderRadius.circular(12),
              boxShadow: isRead ? null : AppShadows.pillGlow(tokens.primaryAccent),
            ),
            alignment: Alignment.center,
            child: Icon(_icon(type), color: tokens.primaryAccent, size: 18),
          ),
          const SizedBox(width: 12),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Row(
                  children: [
                    Expanded(
                      child: Text(
                        title,
                        maxLines: 1,
                        overflow: TextOverflow.ellipsis,
                        style: TextStyle(
                          fontSize: 14,
                          fontWeight: isRead ? FontWeight.w600 : FontWeight.w800,
                          color: isRead ? tokens.textSecondary : tokens.textPrimary,
                        ),
                      ),
                    ),
                    Text(
                      _rel(created),
                      style: TextStyle(
                        fontSize: 11,
                        color: tokens.textMuted,
                      ),
                    ),
                  ],
                ),
                if (message.isNotEmpty) ...[
                  const SizedBox(height: 4),
                  Text(
                    message,
                    maxLines: 3,
                    overflow: TextOverflow.ellipsis,
                    style: TextStyle(
                      fontSize: 12.5,
                      height: 1.4,
                      color: tokens.textSecondary,
                    ),
                  ),
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
    final tokens = context.tokens;
    return ListView(
      padding: const EdgeInsets.all(40),
      children: [
        Icon(Icons.notifications_none_outlined,
            color: tokens.textMuted, size: 40),
        const SizedBox(height: 8),
        Text(
          'No notifications yet',
          style: TextStyle(
            fontSize: 16,
            fontWeight: FontWeight.w700,
            color: tokens.textPrimary,
          ),
          textAlign: TextAlign.center,
        ),
        const SizedBox(height: 4),
        Text(
          "You're all caught up.",
          style: TextStyle(
            fontSize: 13,
            color: tokens.textSecondary,
          ),
          textAlign: TextAlign.center,
        ),
      ],
    );
  }
}

class _Error extends StatelessWidget {
  const _Error({required this.message});
  final String message;

  @override
  Widget build(BuildContext context) {
    final tokens = context.tokens;
    return ListView(
      padding: const EdgeInsets.all(40),
      children: [
        Icon(Icons.cloud_off, color: tokens.textMuted, size: 40),
        const SizedBox(height: 8),
        Text(
          'Could not load notifications',
          style: TextStyle(
            fontSize: 16,
            fontWeight: FontWeight.w700,
            color: tokens.textPrimary,
          ),
          textAlign: TextAlign.center,
        ),
        const SizedBox(height: 4),
        Text(
          message,
          style: TextStyle(
            fontSize: 13,
            color: tokens.textSecondary,
          ),
          textAlign: TextAlign.center,
        ),
      ],
    );
  }
}
